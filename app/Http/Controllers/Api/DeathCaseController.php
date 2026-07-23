<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RegisterDeathCertificateRequest;
use App\Http\Requests\Api\ResubmitDeathCaseRequest;
use App\Http\Requests\Api\ReviewDeathCaseRequest;
use App\Http\Requests\Api\StoreDeathCaseRequest;
use App\Http\Resources\DeathCaseResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\DdlgProfile;
use App\Models\DeathCase;
use App\Models\DeathDocument;
use App\Models\DeathTimelineEvent;
use App\Support\Concerns\StylesExcelSheets;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Late Death Registration (LDR), mirroring the LBR module's actor/status vocabulary
 * but with a materially simpler flow: Rule 12 requires the FULL document set upfront
 * (no birth-style "delay approval first, documents later" two-stage pattern), and
 * unlike birth's Rule 4, even the 1–7 year bucket needs DDLG (as committee convener)
 * — only the 7+ year bucket (Rule 13, court decree) skips DDLG entirely, since a
 * court decree is a judicial fact, not an administrative committee decision.
 */
class DeathCaseController extends Controller
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
        'affidavit' => 'Affidavit (Stamp Paper Rs. 300, 2 Witnesses)',
        'cnic_deceased' => 'CNIC / Birth Certificate of Deceased',
        'cnic_applicant' => 'Applicant CNIC (copy)',
        'death_slip' => 'Hospital Death Slip (Cause of Death)',
        'burial_slip' => 'Burial Slip (Graveyard Committee)',
        'court_decree' => 'Court Decree (Copy)',
        'passport_copy' => 'Passport Copy',
        'visa_copy' => 'Visa Copy',
        'other_doc' => 'Other Supporting Document',
    ];

    protected const REQUIRED_DOC_KEYS = ['affidavit', 'cnic_deceased', 'cnic_applicant'];

    protected function relations(): array
    {
        return ['unionCouncil.tehsil', 'secretary', 'adlg', 'ddlg', 'documents', 'timeline.actor'];
    }

    public function indexForSecretary(Request $request)
    {
        $ucId = $request->user()->secretaryProfile->union_council_id;

        $cases = DeathCase::where('union_council_id', $ucId)
            ->with(['unionCouncil', 'secretary', 'adlg'])
            ->latest('created_at')
            ->get();

        return DeathCaseResource::collection($cases);
    }

    public function showForSecretary(Request $request, DeathCase $deathCase)
    {
        $this->authorizeOwnUc($request, $deathCase);

        return new DeathCaseResource($deathCase->load($this->relations()));
    }

    public function storeForSecretary(StoreDeathCaseRequest $request)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;

        $dod = Carbon::parse($request->input('date_of_death'));
        $age = round($dod->floatDiffInYears(now()), 1);

        $deathId = 'LDR-'.now()->year.'-'.str_pad((string) (DeathCase::count() + 1), 4, '0', STR_PAD_LEFT);
        $adlgId = optional($uc->tehsil->adlgProfiles()->first())->user_id;

        $case = DB::transaction(function () use ($request, $user, $uc, $dod, $age, $deathId, $adlgId) {
            $case = DeathCase::create([
                'death_id' => $deathId,
                'status' => 'FORWARDED',
                'category' => $request->string('category')->toString(),
                'union_council_id' => $uc->id,
                'secretary_id' => $user->id,
                'adlg_id' => $adlgId,
                'date_of_death' => $dod->toDateString(),
                'age_at_application' => $age,
                'delay_reason' => $request->string('delay_reason')->toString(),
                'deceased_name' => $request->string('deceased_name')->toString(),
                'deceased_gender' => $request->string('deceased_gender')->toString(),
                'deceased_cnic' => $request->input('deceased_cnic'),
                'cause_of_death' => $request->input('cause_of_death'),
                'place_of_death' => $request->input('place_of_death'),
                'burial_place' => $request->input('burial_place'),
                'applicant_name' => $request->string('applicant_name')->toString(),
                'applicant_cnic' => $request->string('applicant_cnic')->toString(),
                'applicant_relation' => $request->string('applicant_relation')->toString(),
                'applicant_address' => $request->input('applicant_address'),
                'applicant_phone' => $request->input('applicant_phone'),
                'secretary_remarks' => $request->input('secretary_remarks'),
                'court_decree_no' => $request->input('court_decree_no'),
                'court_decree_date' => $request->input('court_decree_date'),
                'court_name' => $request->input('court_name'),
                'country_of_death' => $request->input('country_of_death'),
                'passport_no' => $request->input('passport_no'),
            ]);

            $this->storeDeathDocuments($case, $request);

            DeathTimelineEvent::create([
                'death_case_id' => $case->id,
                'stage' => 'FORWARDED',
                'event_date' => now()->toDateString(),
                'actor_user_id' => $user->id,
                'note' => "Application submitted. LDR-ID: {$deathId}. Forwarded electronically to ADLG.",
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'LDR_SUBMITTED',
                'entity_type' => 'DeathCase',
                'entity_id' => $case->id,
                'note' => "Death registration case submitted: {$deathId} by {$user->name}",
            ]);

            if ($adlgId) {
                CaseNotification::create([
                    'to_user_id' => $adlgId,
                    'from_user_id' => $user->id,
                    'type' => 'LDR_SUBMITTED',
                    'message' => "{$user->name} submitted a late death registration case for review ({$deathId} — {$case->deceased_name}).",
                ]);
            }

            return $case;
        });

        return new DeathCaseResource($case->load($this->relations()));
    }

    protected function storeDeathDocuments(DeathCase $case, Request $request): void
    {
        foreach (self::DOC_LABELS as $key => $label) {
            if ($request->hasFile("documents.{$key}")) {
                $path = $request->file("documents.{$key}")->store('death-documents', 'public');
                DeathDocument::updateOrCreate(
                    ['death_case_id' => $case->id, 'doc_key' => $key],
                    ['label' => $label, 'file_path' => $path, 'uploaded_at' => now()]
                );
            }
        }
    }

    /**
     * Secretary corrects and resubmits a RETURNED case (regardless of whether it was
     * ADLG or DDLG that returned it) — re-enters the pipeline from the top, exactly
     * like LBR's DELAY_RETURNED → resubmit → PENDING_DELAY_APPROVAL pattern.
     */
    public function resubmit(ResubmitDeathCaseRequest $request, DeathCase $deathCase)
    {
        $this->authorizeOwnUc($request, $deathCase);
        abort_unless($deathCase->status === 'RETURNED', 422, 'This case is not awaiting resubmission.');

        $user = $request->user();
        $dod = Carbon::parse($request->input('date_of_death'));
        $age = round($dod->floatDiffInYears(now()), 1);

        DB::transaction(function () use ($request, $deathCase, $user, $dod, $age) {
            $deathCase->update([
                'status' => 'FORWARDED',
                'date_of_death' => $dod->toDateString(),
                'age_at_application' => $age,
                'delay_reason' => $request->string('delay_reason')->toString(),
                'deceased_name' => $request->string('deceased_name')->toString(),
                'deceased_gender' => $request->string('deceased_gender')->toString(),
                'deceased_cnic' => $request->input('deceased_cnic'),
                'cause_of_death' => $request->input('cause_of_death'),
                'place_of_death' => $request->input('place_of_death'),
                'burial_place' => $request->input('burial_place'),
                'applicant_name' => $request->string('applicant_name')->toString(),
                'applicant_cnic' => $request->string('applicant_cnic')->toString(),
                'applicant_relation' => $request->string('applicant_relation')->toString(),
                'applicant_address' => $request->input('applicant_address'),
                'applicant_phone' => $request->input('applicant_phone'),
                'secretary_remarks' => $request->input('secretary_remarks'),
                'court_decree_no' => $request->input('court_decree_no'),
                'court_decree_date' => $request->input('court_decree_date'),
                'court_name' => $request->input('court_name'),
                'country_of_death' => $request->input('country_of_death'),
                'passport_no' => $request->input('passport_no'),
            ]);

            $this->storeDeathDocuments($deathCase, $request);

            DeathTimelineEvent::create([
                'death_case_id' => $deathCase->id,
                'stage' => 'FORWARDED',
                'event_date' => now()->toDateString(),
                'actor_user_id' => $user->id,
                'note' => 'Resubmitted after correction. Forwarded electronically to ADLG.',
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'LDR_RESUBMITTED',
                'entity_type' => 'DeathCase',
                'entity_id' => $deathCase->id,
                'note' => "{$deathCase->death_id} resubmitted by {$user->name}",
            ]);

            if ($deathCase->adlg_id) {
                CaseNotification::create([
                    'to_user_id' => $deathCase->adlg_id,
                    'from_user_id' => $user->id,
                    'type' => 'LDR_RESUBMITTED',
                    'message' => "{$user->name} resubmitted {$deathCase->death_id} — {$deathCase->deceased_name} after correction.",
                ]);
            }
        });

        return new DeathCaseResource($deathCase->fresh($this->relations()));
    }

    public function registerCertificate(RegisterDeathCertificateRequest $request, DeathCase $deathCase)
    {
        $this->authorizeOwnUc($request, $deathCase);
        abort_unless($deathCase->status === 'APPROVED', 422, 'Approval is required before registration.');
        abort_if($deathCase->locked, 422, 'This case file is locked.');

        DB::transaction(function () use ($request, $deathCase) {
            $deathCase->update([
                'certificate_no' => $request->string('certificate_no')->toString(),
                'certificate_date' => $request->input('certificate_date'),
                'certificate_remarks' => $request->input('certificate_remarks'),
                'status' => 'REGISTERED',
                'locked' => true,
                'locked_at' => now(),
            ]);

            DeathTimelineEvent::create([
                'death_case_id' => $deathCase->id,
                'stage' => 'REGISTERED',
                'event_date' => $request->input('certificate_date'),
                'actor_user_id' => $request->user()->id,
                'note' => "Death Certificate {$request->string('certificate_no')} issued. File locked. LDR-ID permanently linked.",
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'LDR_REGISTERED',
                'entity_type' => 'DeathCase',
                'entity_id' => $deathCase->id,
                'note' => "Death Certificate {$request->string('certificate_no')} issued for {$deathCase->death_id}. File locked.",
            ]);
        });

        return new DeathCaseResource($deathCase->fresh($this->relations()));
    }

    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $query = DeathCase::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['unionCouncil', 'secretary', 'adlg']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return DeathCaseResource::collection($query->latest('created_at')->get());
    }

    public function showForAdlg(Request $request, DeathCase $deathCase)
    {
        $this->authorizeOwnTehsil($request, $deathCase);

        return new DeathCaseResource($deathCase->load($this->relations()));
    }

    /**
     * ADLG's review. For the 7+ bucket (court decree, Rule 13) this IS the final
     * decision — no DDLG involved. For 1–7 and ABROAD (Rule 12) ADLG is only the
     * committee's "Member/Secretary": Approve here forwards to DDLG (the committee's
     * convener) for the actual decision, it does not register anything itself.
     */
    public function review(ReviewDeathCaseRequest $request, DeathCase $deathCase)
    {
        $this->authorizeOwnTehsil($request, $deathCase);
        abort_unless($deathCase->status === 'FORWARDED', 422, 'This case has already been decided.');

        $needsDdlg = $deathCase->category !== '7+';

        DB::transaction(function () use ($request, $deathCase, $needsDdlg) {
            $action = $request->string('action')->toString();
            $newStatus = $action === 'APPROVED' && $needsDdlg ? 'PENDING_DDLG_APPROVAL' : $action;

            $deathCase->update([
                'status' => $newStatus,
                'adlg_id' => $request->user()->id,
                'adlg_observations' => $request->string('observations')->toString(),
                'adlg_order_no' => $action === 'APPROVED' && ! $needsDdlg ? $request->input('order_no') : $deathCase->adlg_order_no,
            ]);

            $messages = [
                'APPROVED' => $needsDdlg
                    ? 'Forwarded to DDLG committee for final approval. ADLG remarks: '.$request->string('observations')
                    : 'Court decree confirmed and APPROVED by ADLG. Order: '.$request->input('order_no'),
                'REJECTED' => 'Application REJECTED by ADLG. Reason: '.$request->string('observations'),
                'RETURNED' => 'Returned for Correction by ADLG. Reason: '.$request->string('observations'),
            ];

            DeathTimelineEvent::create([
                'death_case_id' => $deathCase->id,
                'stage' => $newStatus,
                'event_date' => now()->toDateString(),
                'actor_user_id' => $request->user()->id,
                'note' => $messages[$action],
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'LDR_'.$action,
                'entity_type' => 'DeathCase',
                'entity_id' => $deathCase->id,
                'note' => "{$deathCase->death_id} {$action} by ADLG",
            ]);

            if ($action === 'APPROVED' && $needsDdlg) {
                $districtId = $deathCase->unionCouncil->tehsil->district_id;
                $ddlgId = optional(DdlgProfile::where('district_id', $districtId)->first())->user_id;

                if ($ddlgId) {
                    CaseNotification::create([
                        'to_user_id' => $ddlgId,
                        'from_user_id' => $request->user()->id,
                        'type' => 'LDR_DDLG_PENDING',
                        'message' => "ADLG forwarded a late death registration case for committee approval: {$deathCase->death_id} — {$deathCase->deceased_name} ({$deathCase->unionCouncil->name}).",
                    ]);
                }
            } else {
                CaseNotification::create([
                    'to_user_id' => $deathCase->secretary_id,
                    'from_user_id' => $request->user()->id,
                    'type' => 'LDR_'.$newStatus,
                    'message' => match (true) {
                        $newStatus === 'APPROVED' => "Your death registration case {$deathCase->death_id} — {$deathCase->deceased_name} was approved. You may now register the certificate.",
                        $action === 'REJECTED' => "Your death registration case {$deathCase->death_id} — {$deathCase->deceased_name} was rejected.",
                        default => "Your death registration case {$deathCase->death_id} — {$deathCase->deceased_name} was returned for correction.",
                    },
                ]);
            }
        });

        return new DeathCaseResource($deathCase->fresh($this->relations()));
    }

    /**
     * Read-only, own-district view for DDLG — full LDR registry across the district.
     * The one action is reviewByDdlg(), the committee's final decision on 1–7 and
     * ABROAD cases the ADLG has forwarded.
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $query = DeathCase::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['unionCouncil.tehsil', 'secretary', 'adlg']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return DeathCaseResource::collection($query->latest('created_at')->get());
    }

    public function showForDdlg(Request $request, DeathCase $deathCase)
    {
        $this->authorizeOwnDistrict($request, $deathCase);

        return new DeathCaseResource($deathCase->load($this->relations()));
    }

    /**
     * DDLG's committee decision (Rule 12(3)/(4)/(6)): Approve unlocks registration
     * for the secretary; Reject is terminal in-app (the formal Rule 12(8) appeal to
     * the Divisional committee stays a manual, offline process — no Divisional
     * Director role exists in this system); Return sends it back to the secretary.
     */
    public function reviewByDdlg(ReviewDeathCaseRequest $request, DeathCase $deathCase)
    {
        $this->authorizeOwnDistrict($request, $deathCase);
        abort_unless($deathCase->status === 'PENDING_DDLG_APPROVAL', 422, 'This case is not awaiting DDLG committee approval.');

        DB::transaction(function () use ($request, $deathCase) {
            $action = $request->string('action')->toString();

            $deathCase->update([
                'status' => $action,
                'ddlg_id' => $request->user()->id,
                'ddlg_observations' => $request->string('observations')->toString(),
                'ddlg_order_no' => $action === 'APPROVED' ? $request->input('order_no') : null,
            ]);

            $messages = [
                'APPROVED' => 'Committee APPROVED late registration. Secretary may now register the certificate. Remarks: '.$request->string('observations'),
                'REJECTED' => 'Committee REJECTED the application. Reason: '.$request->string('observations'),
                'RETURNED' => 'Returned for correction by DDLG committee. Reason: '.$request->string('observations'),
            ];

            DeathTimelineEvent::create([
                'death_case_id' => $deathCase->id,
                'stage' => $action,
                'event_date' => now()->toDateString(),
                'actor_user_id' => $request->user()->id,
                'note' => $messages[$action],
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'LDR_DDLG_'.$action,
                'entity_type' => 'DeathCase',
                'entity_id' => $deathCase->id,
                'note' => "{$deathCase->death_id} {$action} by DDLG committee",
            ]);

            CaseNotification::create([
                'to_user_id' => $deathCase->secretary_id,
                'from_user_id' => $request->user()->id,
                'type' => 'LDR_DDLG_'.$action,
                'message' => match ($action) {
                    'APPROVED' => "DDLG committee approved {$deathCase->death_id} — {$deathCase->deceased_name}. You may now register the certificate.",
                    'REJECTED' => "Your death registration case {$deathCase->death_id} — {$deathCase->deceased_name} was rejected by the DDLG committee.",
                    'RETURNED' => "Your death registration case {$deathCase->death_id} — {$deathCase->deceased_name} was returned for correction by the DDLG committee.",
                },
            ]);
        });

        return new DeathCaseResource($deathCase->fresh($this->relations()));
    }

    public function notesheet(Request $request, DeathCase $deathCase)
    {
        if ($request->user()->role === 'adlg') {
            $this->authorizeOwnTehsil($request, $deathCase);
        } elseif ($request->user()->role === 'ddlg') {
            $this->authorizeOwnDistrict($request, $deathCase);
        } else {
            $this->authorizeOwnUc($request, $deathCase);
        }

        $deathCase->load($this->relations());
        $statusLabel = DeathCaseResource::STATUS_LABELS[$deathCase->status] ?? $deathCase->status;
        $docLabels = self::DOC_LABELS;
        $requiredDocKeys = self::REQUIRED_DOC_KEYS;

        $pdf = Pdf::loadView('pdf.death-notesheet', compact('deathCase', 'statusLabel', 'docLabels', 'requiredDocKeys'))->setPaper('a4');
        $filename = "Notesheet_{$deathCase->death_id}.pdf";

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'LDR_NOTESHEET_DOWNLOADED',
            'entity_type' => 'DeathCase',
            'entity_id' => $deathCase->id,
            'note' => "Notesheet downloaded: {$deathCase->death_id}",
        ]);

        return $pdf->download($filename);
    }

    public function export(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $query = DeathCase::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['unionCouncil.tehsil', 'secretary', 'adlg', 'documents', 'timeline.actor']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $cases = $query->latest('created_at')->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Late Death Registration Report');

        $this->buildDeathSummarySheet($spreadsheet->getActiveSheet(), $cases, $request);
        $this->buildDeathDetailSheet($spreadsheet->createSheet(), $cases);
        $this->buildDeathTimelineSheet($spreadsheet->createSheet(), $cases);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'LDR_Registry_'.now()->toDateString().'.xlsx');
    }

    public function exportForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $query = DeathCase::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['unionCouncil.tehsil', 'secretary', 'adlg', 'documents', 'timeline.actor']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $cases = $query->latest('created_at')->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Late Death Registration Report');

        $this->buildDeathSummarySheet($spreadsheet->getActiveSheet(), $cases, $request);
        $this->buildDeathDetailSheet($spreadsheet->createSheet(), $cases);
        $this->buildDeathTimelineSheet($spreadsheet->createSheet(), $cases);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'LDR_Registry_'.now()->toDateString().'.xlsx');
    }

    protected function buildDeathSummarySheet(Worksheet $sheet, $cases, Request $request): void
    {
        $sheet->setTitle('Registry Summary');

        $scope = $request->user()->role === 'ddlg' ? 'district' : 'tehsil';
        $subtitle = "All Late Death Registration cases in this {$scope}".($request->filled('status')
            ? ' · Status filter: '.(DeathCaseResource::STATUS_LABELS[$request->string('status')->toString()] ?? $request->string('status'))
            : '');
        $this->xlTitleBanner($sheet, 'Union Council Management System — Late Death Registration Summary', $subtitle, 3);

        $headerRow = 4;
        foreach (['Status', 'Cases', 'Share'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:C{$headerRow}");

        $total = $cases->count();
        $byStatus = $cases->countBy('status');
        $row = $headerRow + 1;
        foreach (DeathCaseResource::STATUS_LABELS as $status => $label) {
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

    protected function buildDeathDetailSheet(Worksheet $sheet, $cases): void
    {
        $sheet->setTitle('Case Detail');

        $headers = [
            'LDR-ID', 'Status', 'Category', 'UC', 'Tehsil', 'Deceased Name', 'Gender', 'Date of Death', 'Age at Application',
            'Cause of Death', 'Applicant', 'Applicant CNIC', 'Relation', 'Phone',
            'Secretary', 'ADLG', 'DDLG', 'Applied', 'Certificate No.', 'Certificate Date', 'Documents',
        ];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, [
            'A' => 14, 'B' => 20, 'C' => 20, 'D' => 20, 'E' => 16, 'F' => 20, 'G' => 9, 'H' => 12, 'I' => 10,
            'J' => 18, 'K' => 20, 'L' => 16, 'M' => 12, 'N' => 14,
            'O' => 18, 'P' => 18, 'Q' => 18, 'R' => 12, 'S' => 14, 'T' => 14, 'U' => 24,
        ]);

        $row = 2;
        foreach ($cases as $c) {
            $sheet->setCellValue("A{$row}", $c->death_id);
            $this->xlStatusCell($sheet, "B{$row}", DeathCaseResource::STATUS_LABELS[$c->status] ?? $c->status, self::STATUS_TONE[$c->status] ?? 'neutral');
            $sheet->setCellValue("C{$row}", DeathCaseResource::CATEGORY_LABELS[$c->category] ?? $c->category);
            $sheet->setCellValue("D{$row}", $c->unionCouncil->name);
            $sheet->setCellValue("E{$row}", $c->unionCouncil->tehsil?->name);
            $sheet->setCellValue("F{$row}", $c->deceased_name);
            $sheet->setCellValue("G{$row}", $c->deceased_gender);
            $sheet->setCellValue("H{$row}", $c->date_of_death?->toDateString());
            $sheet->setCellValue("I{$row}", $c->age_at_application);
            $sheet->setCellValue("J{$row}", $c->cause_of_death);
            $sheet->setCellValue("K{$row}", $c->applicant_name);
            $sheet->setCellValue("L{$row}", $c->applicant_cnic);
            $sheet->setCellValue("M{$row}", $c->applicant_relation);
            $sheet->setCellValue("N{$row}", $c->applicant_phone);
            $sheet->setCellValue("O{$row}", $c->secretary?->name);
            $sheet->setCellValue("P{$row}", $c->adlg?->name);
            $sheet->setCellValue("Q{$row}", $c->ddlg?->name);
            $sheet->setCellValue("R{$row}", $c->created_at->toDateString());
            $sheet->setCellValue("S{$row}", $c->certificate_no);
            $sheet->setCellValue("T{$row}", $c->certificate_date?->toDateString());

            if ($c->documents->isNotEmpty()) {
                $first = $c->documents->first();
                $this->xlHyperlink($sheet, "U{$row}", \Illuminate\Support\Facades\Storage::disk('public')->url($first->file_path), $c->documents->count().' file(s) — view first');
            } else {
                $sheet->setCellValue("U{$row}", 'None uploaded');
            }

            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }

    protected function buildDeathTimelineSheet(Worksheet $sheet, $cases): void
    {
        $sheet->setTitle('Case Timeline');

        foreach (['LDR-ID', 'Deceased Name', 'Stage', 'Event Date', 'Actor', 'Note'] as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $this->xlHeaderRow($sheet, 'A1:F1');
        $this->xlColumnWidths($sheet, ['A' => 14, 'B' => 20, 'C' => 22, 'D' => 12, 'E' => 20, 'F' => 40]);

        $row = 2;
        foreach ($cases as $c) {
            foreach ($c->timeline as $event) {
                $sheet->setCellValue("A{$row}", $c->death_id);
                $sheet->setCellValue("B{$row}", $c->deceased_name);
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

    protected function authorizeOwnUc(Request $request, DeathCase $deathCase): void
    {
        $ucId = $request->user()->secretaryProfile->union_council_id;
        abort_unless($deathCase->union_council_id === $ucId, 403);
    }

    protected function authorizeOwnTehsil(Request $request, DeathCase $deathCase): void
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        abort_unless($deathCase->unionCouncil->tehsil_id === $tehsilId, 403);
    }

    protected function authorizeOwnDistrict(Request $request, DeathCase $deathCase): void
    {
        $districtId = $request->user()->ddlgProfile->district_id;
        abort_unless($deathCase->unionCouncil->tehsil->district_id === $districtId, 403);
    }
}
