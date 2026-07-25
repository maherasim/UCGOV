<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RegisterLbrCertificateRequest;
use App\Http\Requests\Api\ResubmitLbrCaseRequest;
use App\Http\Requests\Api\ReviewLbrCaseRequest;
use App\Http\Requests\Api\StoreLbrCaseRequest;
use App\Http\Resources\LbrCaseResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\DdlgProfile;
use App\Models\LbrCase;
use App\Models\LbrDocument;
use App\Models\LbrTimelineEvent;
use App\Support\Concerns\StylesExcelSheets;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LbrCaseController extends Controller
{
    use StylesExcelSheets;

    protected const STATUS_TONE = [
        'FORWARDED' => 'info',
        'PENDING_DDLG_APPROVAL' => 'info',
        'APPROVED' => 'success',
        'REJECTED' => 'danger',
        'RETURNED' => 'warning',
        'REGISTERED' => 'success',
    ];

    public const DOC_LABELS = [
        'cnic' => 'Applicant CNIC (copy)',
        'slip' => 'Hospital Birth Slip',
        'vacc' => 'Vaccination Card',
        'bform' => 'Child B-Form / CNIC / Smart Card / Passport',
        'photo1' => 'Child Photograph (1st)',
        'photo2' => 'Child Photograph (2nd)',
        'forma' => 'Form A',
    ];

    protected function relations(): array
    {
        return ['unionCouncil.tehsil', 'secretary', 'adlg', 'ddlg', 'documents', 'timeline.actor'];
    }

    public function indexForSecretary(Request $request)
    {
        $ucId = $request->user()->secretaryProfile->union_council_id;

        $cases = LbrCase::where('union_council_id', $ucId)
            ->with(['unionCouncil', 'secretary', 'adlg'])
            ->latest('created_at')
            ->get();

        return LbrCaseResource::collection($cases);
    }

    public function showForSecretary(Request $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnUc($request, $lbrCase);

        return new LbrCaseResource($lbrCase->load($this->relations()));
    }

    public function storeForSecretary(StoreLbrCaseRequest $request)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;

        $dob = Carbon::parse($request->input('dob'));
        $age = round($dob->floatDiffInYears(now()), 1);

        $lbrId = 'LBR-'.now()->year.'-'.str_pad((string) (LbrCase::count() + 1), 4, '0', STR_PAD_LEFT);

        $case = DB::transaction(function () use ($request, $user, $uc, $dob, $age, $lbrId) {
            $case = LbrCase::create([
                'lbr_id' => $lbrId,
                'status' => 'FORWARDED',
                'category' => $request->string('category')->toString(),
                'union_council_id' => $uc->id,
                'secretary_id' => $user->id,
                'adlg_id' => optional($uc->tehsil->adlgProfiles()->first())->user_id,
                'dob' => $dob->toDateString(),
                'age_at_application' => $age,
                'delay_reason' => $request->string('delay_reason')->toString(),
                'child_name' => $request->string('child_name')->toString(),
                'child_gender' => $request->string('child_gender')->toString(),
                'child_birth_place' => $request->input('child_birth_place'),
                'child_birth_type' => $request->input('child_birth_type', 'Hospital'),
                'child_hospital' => $request->input('child_hospital'),
                'applicant_name' => $request->string('applicant_name')->toString(),
                'applicant_cnic' => $request->string('applicant_cnic')->toString(),
                'applicant_relation' => $request->input('applicant_relation', 'Father'),
                'applicant_father_name' => $request->input('applicant_father_name'),
                'applicant_mother_name' => $request->input('applicant_mother_name'),
                'applicant_address' => $request->input('applicant_address'),
                'applicant_phone' => $request->input('applicant_phone'),
                'secretary_remarks' => $request->input('secretary_remarks'),
            ]);

            $this->storeLbrDocuments($case, $request);

            LbrTimelineEvent::create([
                'lbr_case_id' => $case->id,
                'stage' => 'FORWARDED',
                'event_date' => now()->toDateString(),
                'actor_user_id' => $user->id,
                'note' => "Application submitted. LBR-ID: {$lbrId}. Forwarded electronically to ADLG.",
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'LBR_SUBMITTED',
                'entity_type' => 'LbrCase',
                'entity_id' => $case->id,
                'note' => "LBR case submitted: {$lbrId} by {$user->name}",
            ]);

            return $case;
        });

        return new LbrCaseResource($case->load($this->relations()));
    }

    protected function storeLbrDocuments(LbrCase $case, Request $request): void
    {
        foreach (self::DOC_LABELS as $key => $label) {
            if ($request->hasFile("documents.{$key}")) {
                $path = $request->file("documents.{$key}")->store('lbr-documents', 'public');
                LbrDocument::updateOrCreate(
                    ['lbr_case_id' => $case->id, 'doc_key' => $key],
                    ['label' => $label, 'file_path' => $path, 'uploaded_at' => now()]
                );
            }
        }
    }

    /**
     * Secretary corrects and resubmits a RETURNED case (from either ADLG or DDLG) —
     * re-enters the pipeline from the top. Works for both categories since the full
     * document set is always collected upfront now (Rule 5/12 — no two-stage pattern).
     */
    public function resubmit(ResubmitLbrCaseRequest $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnUc($request, $lbrCase);
        abort_unless($lbrCase->status === 'RETURNED', 422, 'This case is not awaiting resubmission.');

        $user = $request->user();
        $dob = Carbon::parse($request->input('dob'));
        $age = round($dob->floatDiffInYears(now()), 1);

        DB::transaction(function () use ($request, $lbrCase, $user, $dob, $age) {
            $lbrCase->update([
                'status' => 'FORWARDED',
                'dob' => $dob->toDateString(),
                'age_at_application' => $age,
                'delay_reason' => $request->string('delay_reason')->toString(),
                'child_name' => $request->string('child_name')->toString(),
                'child_gender' => $request->string('child_gender')->toString(),
                'child_birth_place' => $request->input('child_birth_place'),
                'child_birth_type' => $request->input('child_birth_type', 'Hospital'),
                'child_hospital' => $request->input('child_hospital'),
                'applicant_name' => $request->string('applicant_name')->toString(),
                'applicant_cnic' => $request->string('applicant_cnic')->toString(),
                'applicant_relation' => $request->input('applicant_relation', 'Father'),
                'applicant_father_name' => $request->input('applicant_father_name'),
                'applicant_mother_name' => $request->input('applicant_mother_name'),
                'applicant_address' => $request->input('applicant_address'),
                'applicant_phone' => $request->input('applicant_phone'),
                'secretary_remarks' => $request->input('secretary_remarks'),
            ]);

            $this->storeLbrDocuments($lbrCase, $request);

            LbrTimelineEvent::create([
                'lbr_case_id' => $lbrCase->id,
                'stage' => 'FORWARDED',
                'event_date' => now()->toDateString(),
                'actor_user_id' => $user->id,
                'note' => 'Resubmitted after correction. Forwarded electronically to ADLG.',
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'LBR_RESUBMITTED',
                'entity_type' => 'LbrCase',
                'entity_id' => $lbrCase->id,
                'note' => "{$lbrCase->lbr_id} resubmitted by {$user->name}",
            ]);

            if ($lbrCase->adlg_id) {
                CaseNotification::create([
                    'to_user_id' => $lbrCase->adlg_id,
                    'from_user_id' => $user->id,
                    'type' => 'LBR_RESUBMITTED',
                    'message' => "{$user->name} resubmitted {$lbrCase->lbr_id} — {$lbrCase->child_name} after correction.",
                ]);
            }
        });

        return new LbrCaseResource($lbrCase->fresh($this->relations()));
    }

    public function registerCertificate(RegisterLbrCertificateRequest $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnUc($request, $lbrCase);
        abort_unless($lbrCase->status === 'APPROVED', 422, 'ADLG approval is required before registration.');
        abort_if($lbrCase->locked, 422, 'This case file is locked.');

        DB::transaction(function () use ($request, $lbrCase) {
            $lbrCase->update([
                'certificate_no' => $request->string('certificate_no')->toString(),
                'certificate_date' => $request->input('certificate_date'),
                'certificate_remarks' => $request->input('certificate_remarks'),
                'status' => 'REGISTERED',
                'locked' => true,
                'locked_at' => now(),
            ]);

            LbrTimelineEvent::create([
                'lbr_case_id' => $lbrCase->id,
                'stage' => 'REGISTERED',
                'event_date' => $request->input('certificate_date'),
                'actor_user_id' => $request->user()->id,
                'note' => "Birth Certificate {$request->string('certificate_no')} issued. File locked. LBR-ID permanently linked.",
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'LBR_REGISTERED',
                'entity_type' => 'LbrCase',
                'entity_id' => $lbrCase->id,
                'note' => "Birth Certificate {$request->string('certificate_no')} issued for {$lbrCase->lbr_id}. File locked.",
            ]);
        });

        return new LbrCaseResource($lbrCase->fresh($this->relations()));
    }

    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $query = LbrCase::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['unionCouncil', 'secretary', 'adlg']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return LbrCaseResource::collection($query->latest('created_at')->get());
    }

    public function showForAdlg(Request $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnTehsil($request, $lbrCase);

        return new LbrCaseResource($lbrCase->load($this->relations()));
    }

    /**
     * Read-only, own-district view for DDLG — the full LBR registry across every
     * tehsil in their district, for browsing/oversight. The one action DDLG can take
     * is reviewByDdlg(), gated separately to PENDING_DDLG_APPROVAL cases.
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $query = LbrCase::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['unionCouncil.tehsil', 'secretary', 'adlg']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return LbrCaseResource::collection($query->latest('created_at')->get());
    }

    public function showForDdlg(Request $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnDistrict($request, $lbrCase);

        return new LbrCaseResource($lbrCase->load($this->relations()));
    }

    /**
     * ADLG's review. For 1–7 years (Rule 4) this IS the final decision — Approve
     * registers-ready immediately. For 7+ years (Rule 5), ADLG only inquires and
     * recommends: Approve forwards to DDLG, who makes the actual final decision.
     */
    public function review(ReviewLbrCaseRequest $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnTehsil($request, $lbrCase);
        abort_unless($lbrCase->status === 'FORWARDED', 422, 'This case has already been decided.');

        $needsDdlg = $lbrCase->category === '7+';

        DB::transaction(function () use ($request, $lbrCase, $needsDdlg) {
            $action = $request->string('action')->toString();
            $newStatus = $action === 'APPROVED' && $needsDdlg ? 'PENDING_DDLG_APPROVAL' : $action;

            $lbrCase->update([
                'status' => $newStatus,
                'adlg_id' => $request->user()->id,
                'adlg_observations' => $request->string('observations')->toString(),
                'adlg_order_no' => $action === 'APPROVED' && ! $needsDdlg ? $request->input('order_no') : $lbrCase->adlg_order_no,
            ]);

            $messages = [
                'APPROVED' => $needsDdlg
                    ? 'Forwarded to DDLG for final approval. ADLG remarks: '.$request->string('observations')
                    : 'Application APPROVED by ADLG. Order: '.$request->input('order_no'),
                'REJECTED' => 'Application REJECTED by ADLG. Reason: '.$request->string('observations'),
                'RETURNED' => 'Returned for Correction by ADLG. Reason: '.$request->string('observations'),
            ];

            LbrTimelineEvent::create([
                'lbr_case_id' => $lbrCase->id,
                'stage' => $newStatus,
                'event_date' => now()->toDateString(),
                'actor_user_id' => $request->user()->id,
                'note' => $messages[$action],
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'LBR_'.$action,
                'entity_type' => 'LbrCase',
                'entity_id' => $lbrCase->id,
                'note' => "{$lbrCase->lbr_id} {$action} by ADLG",
            ]);

            if ($action === 'APPROVED' && $needsDdlg) {
                $districtId = $lbrCase->unionCouncil->tehsil->district_id;
                $ddlgId = optional(DdlgProfile::where('district_id', $districtId)->first())->user_id;

                if ($ddlgId) {
                    CaseNotification::create([
                        'to_user_id' => $ddlgId,
                        'from_user_id' => $request->user()->id,
                        'type' => 'LBR_DDLG_PENDING',
                        'message' => "ADLG forwarded a birth registration (over 7 years) for final approval: {$lbrCase->lbr_id} — {$lbrCase->child_name} ({$lbrCase->unionCouncil->name}).",
                    ]);
                }
            } elseif ($action !== 'APPROVED') {
                CaseNotification::create([
                    'to_user_id' => $lbrCase->secretary_id,
                    'from_user_id' => $request->user()->id,
                    'type' => 'LBR_'.$action,
                    'message' => $action === 'REJECTED'
                        ? "Your birth registration application {$lbrCase->lbr_id} — {$lbrCase->child_name} was rejected."
                        : "Your birth registration application {$lbrCase->lbr_id} — {$lbrCase->child_name} was returned for correction.",
                ]);
            }
        });

        return new LbrCaseResource($lbrCase->fresh($this->relations()));
    }

    /**
     * DDLG's final decision (Rule 5) on a 7+ year case the ADLG has recommended.
     * Approve unlocks registration for the secretary; Reject is terminal; Return
     * sends it back to the secretary to correct and resubmit.
     */
    public function reviewByDdlg(ReviewLbrCaseRequest $request, LbrCase $lbrCase)
    {
        $this->authorizeOwnDistrict($request, $lbrCase);
        abort_unless($lbrCase->status === 'PENDING_DDLG_APPROVAL', 422, 'This case is not awaiting DDLG approval.');

        DB::transaction(function () use ($request, $lbrCase) {
            $action = $request->string('action')->toString();

            $lbrCase->update([
                'status' => $action,
                'ddlg_id' => $request->user()->id,
                'ddlg_observations' => $request->string('observations')->toString(),
                'ddlg_order_no' => $action === 'APPROVED' ? $request->input('order_no') : null,
            ]);

            $messages = [
                'APPROVED' => 'Application finally APPROVED by DDLG. Order: '.$request->input('order_no'),
                'REJECTED' => 'Application REJECTED by DDLG. Reason: '.$request->string('observations'),
                'RETURNED' => 'Returned for correction by DDLG. Reason: '.$request->string('observations'),
            ];

            LbrTimelineEvent::create([
                'lbr_case_id' => $lbrCase->id,
                'stage' => $action,
                'event_date' => now()->toDateString(),
                'actor_user_id' => $request->user()->id,
                'note' => $messages[$action],
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'LBR_DDLG_'.$action,
                'entity_type' => 'LbrCase',
                'entity_id' => $lbrCase->id,
                'note' => "{$lbrCase->lbr_id} {$action} by DDLG",
            ]);

            CaseNotification::create([
                'to_user_id' => $lbrCase->secretary_id,
                'from_user_id' => $request->user()->id,
                'type' => 'LBR_DDLG_'.$action,
                'message' => match ($action) {
                    'APPROVED' => "DDLG approved {$lbrCase->lbr_id} — {$lbrCase->child_name}. You may now register the certificate.",
                    'REJECTED' => "Your birth registration application {$lbrCase->lbr_id} — {$lbrCase->child_name} was rejected by DDLG.",
                    'RETURNED' => "Your birth registration application {$lbrCase->lbr_id} — {$lbrCase->child_name} was returned for correction by DDLG.",
                },
            ]);
        });

        return new LbrCaseResource($lbrCase->fresh($this->relations()));
    }

    public function notesheet(Request $request, LbrCase $lbrCase)
    {
        if ($request->user()->role === 'adlg') {
            $this->authorizeOwnTehsil($request, $lbrCase);
        } elseif ($request->user()->role === 'ddlg') {
            $this->authorizeOwnDistrict($request, $lbrCase);
        } else {
            $this->authorizeOwnUc($request, $lbrCase);
        }

        $lbrCase->load($this->relations());
        $statusLabel = LbrCaseResource::STATUS_LABELS[$lbrCase->status] ?? $lbrCase->status;
        $docLabels = self::DOC_LABELS;

        $pdf = Pdf::loadView('pdf.lbr-notesheet', compact('lbrCase', 'statusLabel', 'docLabels'))->setPaper('a4');
        $filename = "Notesheet_{$lbrCase->lbr_id}.pdf";

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'LBR_NOTESHEET_DOWNLOADED',
            'entity_type' => 'LbrCase',
            'entity_id' => $lbrCase->id,
            'note' => "Notesheet downloaded: {$lbrCase->lbr_id}",
        ]);

        return $pdf->download($filename);
    }

    /**
     * Three sheets: a status/UC "Registry Summary" (color-coded to match the on-screen
     * badges), a "Case Detail" sheet with every field the case actually has (not just
     * the handful the old CSV carried), and a "Case Timeline" sheet — one row per stage
     * transition across every case, the full audit trail that was previously invisible
     * outside the app. Respects the same status filter as the on-screen list.
     */
    public function export(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $query = LbrCase::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['unionCouncil.tehsil', 'secretary', 'adlg', 'documents', 'timeline.actor']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $cases = $query->latest('created_at')->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('UC Governance Platform')->setTitle('Birth Registration (LBR) Report');

        $this->buildLbrSummarySheet($spreadsheet->getActiveSheet(), $cases, $request);
        $this->buildLbrDetailSheet($spreadsheet->createSheet(), $cases);
        $this->buildLbrTimelineSheet($spreadsheet->createSheet(), $cases);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'LBR_Registry_'.now()->toDateString().'.xlsx');
    }

    /**
     * Same styled workbook as export(), scoped to every UC across every tehsil in the
     * DDLG's district instead of a single tehsil.
     */
    public function exportForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $query = LbrCase::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['unionCouncil.tehsil', 'secretary', 'adlg', 'documents', 'timeline.actor']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $cases = $query->latest('created_at')->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Birth Registration (LBR) Report');

        $this->buildLbrSummarySheet($spreadsheet->getActiveSheet(), $cases, $request);
        $this->buildLbrDetailSheet($spreadsheet->createSheet(), $cases);
        $this->buildLbrTimelineSheet($spreadsheet->createSheet(), $cases);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'LBR_Registry_'.now()->toDateString().'.xlsx');
    }

    protected function buildLbrSummarySheet(Worksheet $sheet, $cases, Request $request): void
    {
        $sheet->setTitle('Registry Summary');

        $scope = $request->user()->role === 'ddlg' ? 'district' : 'tehsil';
        $subtitle = "All Birth Registration cases in this {$scope}".($request->filled('status')
            ? ' · Status filter: '.(LbrCaseResource::STATUS_LABELS[$request->string('status')->toString()] ?? $request->string('status'))
            : '');
        $this->xlTitleBanner($sheet, 'UC Governance Platform — Birth Registration Summary', $subtitle, 3);

        $headerRow = 4;
        foreach (['Status', 'Cases', 'Share'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:C{$headerRow}");

        $total = $cases->count();
        $byStatus = $cases->countBy('status');
        $row = $headerRow + 1;
        foreach (LbrCaseResource::STATUS_LABELS as $status => $label) {
            $count = $byStatus->get($status, 0);
            $sheet->setCellValue("A{$row}", $label);
            $this->xlStatusCell($sheet, "B{$row}", (string) $count, self::STATUS_TONE[$status] ?? 'neutral');
            $sheet->setCellValue("C{$row}", $total ? round($count / $total * 100).'%' : '0%');
            $row++;
        }
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->setCellValue("B{$row}", $total);
        $sheet->getStyle("A{$row}:C{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:C{$row}")->getBorders()->getTop()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);
        $this->xlAutoSize($sheet, ['A', 'B', 'C']);
        $this->xlBorderAndFilter($sheet, "A{$headerRow}:C{$headerRow}", "A{$headerRow}:C{$row}", freezeBelowHeader: false);

        // Second block: per-UC breakdown, a few rows below the status table.
        $ucHeaderRow = $row + 3;
        foreach (['UC No', 'UC Name', 'Total Cases', 'Registered'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $ucHeaderRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$ucHeaderRow}:D{$ucHeaderRow}");

        $byUc = $cases->groupBy('union_council_id');
        $r = $ucHeaderRow + 1;
        foreach ($byUc as $ucCases) {
            $uc = $ucCases->first()->unionCouncil;
            $sheet->setCellValue("A{$r}", $uc->uc_no);
            $sheet->setCellValue("B{$r}", $uc->name);
            $sheet->setCellValue("C{$r}", $ucCases->count());
            $sheet->setCellValue("D{$r}", $ucCases->where('status', 'REGISTERED')->count());
            $r++;
        }
        if ($r > $ucHeaderRow + 1) {
            $this->xlBorderAndFilter($sheet, "A{$ucHeaderRow}:D{$ucHeaderRow}", "A{$ucHeaderRow}:D".($r - 1), freezeBelowHeader: false);
        }
    }

    protected function buildLbrDetailSheet(Worksheet $sheet, $cases): void
    {
        $sheet->setTitle('Case Detail');

        $headers = [
            'LBR-ID', 'Status', 'Category', 'UC', 'Tehsil', 'Child Name', 'Gender', 'DOB', 'Age at Application',
            'Birth Place', 'Birth Type', 'Hospital', 'Applicant', 'Applicant CNIC', 'Relation', 'Phone',
            'Secretary', 'ADLG', 'Applied', 'Certificate No.', 'Certificate Date', 'Documents',
        ];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, [
            'A' => 14, 'B' => 14, 'C' => 10, 'D' => 20, 'E' => 16, 'F' => 20, 'G' => 9, 'H' => 12, 'I' => 10,
            'J' => 16, 'K' => 12, 'L' => 18, 'M' => 20, 'N' => 16, 'O' => 12, 'P' => 14,
            'Q' => 18, 'R' => 18, 'S' => 12, 'T' => 14, 'U' => 14, 'V' => 24,
        ]);

        $row = 2;
        foreach ($cases as $c) {
            $sheet->setCellValue("A{$row}", $c->lbr_id);
            $this->xlStatusCell($sheet, "B{$row}", LbrCaseResource::STATUS_LABELS[$c->status] ?? $c->status, self::STATUS_TONE[$c->status] ?? 'neutral');
            $sheet->setCellValue("C{$row}", $c->category === '1-7' ? '1–7 Years' : 'Over 7 Years');
            $sheet->setCellValue("D{$row}", $c->unionCouncil->name);
            $sheet->setCellValue("E{$row}", $c->unionCouncil->tehsil?->name);
            $sheet->setCellValue("F{$row}", $c->child_name);
            $sheet->setCellValue("G{$row}", $c->child_gender);
            $sheet->setCellValue("H{$row}", $c->dob?->toDateString());
            $sheet->setCellValue("I{$row}", $c->age_at_application);
            $sheet->setCellValue("J{$row}", $c->child_birth_place);
            $sheet->setCellValue("K{$row}", $c->child_birth_type);
            $sheet->setCellValue("L{$row}", $c->child_hospital);
            $sheet->setCellValue("M{$row}", $c->applicant_name);
            $sheet->setCellValue("N{$row}", $c->applicant_cnic);
            $sheet->setCellValue("O{$row}", $c->applicant_relation);
            $sheet->setCellValue("P{$row}", $c->applicant_phone);
            $sheet->setCellValue("Q{$row}", $c->secretary?->name);
            $sheet->setCellValue("R{$row}", $c->adlg?->name);
            $sheet->setCellValue("S{$row}", $c->created_at->toDateString());
            $sheet->setCellValue("T{$row}", $c->certificate_no);
            $sheet->setCellValue("U{$row}", $c->certificate_date?->toDateString());

            if ($c->documents->isNotEmpty()) {
                $first = $c->documents->first();
                $this->xlHyperlink($sheet, "V{$row}", \Illuminate\Support\Facades\Storage::disk('public')->url($first->file_path), $c->documents->count().' file(s) — view first');
            } else {
                $sheet->setCellValue("V{$row}", 'None uploaded');
            }

            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }

    protected function buildLbrTimelineSheet(Worksheet $sheet, $cases): void
    {
        $sheet->setTitle('Case Timeline');

        foreach (['LBR-ID', 'Child Name', 'Stage', 'Event Date', 'Actor', 'Note'] as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $this->xlHeaderRow($sheet, 'A1:F1');
        $this->xlColumnWidths($sheet, ['A' => 14, 'B' => 20, 'C' => 18, 'D' => 12, 'E' => 20, 'F' => 40]);

        $row = 2;
        foreach ($cases as $c) {
            foreach ($c->timeline as $event) {
                $sheet->setCellValue("A{$row}", $c->lbr_id);
                $sheet->setCellValue("B{$row}", $c->child_name);
                $sheet->setCellValue("C{$row}", $event->stage);
                $sheet->setCellValue("D{$row}", $event->event_date?->toDateString());
                $sheet->setCellValue("E{$row}", $event->actor?->name ?? 'System');
                $sheet->setCellValue("F{$row}", $event->note);
                $row++;
            }
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, 'A1:F1', "A1:F{$lastRow}");
        }
    }

    protected function authorizeOwnUc(Request $request, LbrCase $lbrCase): void
    {
        $ucId = $request->user()->secretaryProfile->union_council_id;
        abort_unless($lbrCase->union_council_id === $ucId, 403);
    }

    protected function authorizeOwnTehsil(Request $request, LbrCase $lbrCase): void
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        abort_unless($lbrCase->unionCouncil->tehsil_id === $tehsilId, 403);
    }

    protected function authorizeOwnDistrict(Request $request, LbrCase $lbrCase): void
    {
        $districtId = $request->user()->ddlgProfile->district_id;
        abort_unless($lbrCase->unionCouncil->tehsil->district_id === $districtId, 403);
    }
}
