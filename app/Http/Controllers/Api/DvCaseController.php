<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AddProceedingRequest;
use App\Http\Requests\Api\ConstituteArbitrationRequest;
use App\Http\Requests\Api\IssueNoticeRequest;
use App\Http\Requests\Api\PassDecisionRequest;
use App\Http\Requests\Api\StoreDvCaseRequest;
use App\Http\Resources\DvCaseResource;
use App\Models\AuditLog;
use App\Models\CaseArbitration;
use App\Models\CaseDecision;
use App\Models\CaseNotice;
use App\Models\CaseNotification;
use App\Models\CaseProceeding;
use App\Models\CaseTimelineEvent;
use App\Models\DvCase;
use App\Support\Concerns\StylesExcelSheets;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DvCaseController extends Controller
{
    use StylesExcelSheets;

    protected const STATUS_TONE = [
        'SUBMITTED' => 'info',
        'SEEN' => 'warning',
        'NOTICE_ISSUED' => 'warning',
        'ARB_CONSTITUTED' => 'warning',
        'IN_PROCEEDINGS' => 'warning',
        'DISPOSED_RECONCILED' => 'success',
        'DISPOSED_EFFECTIVE' => 'danger',
        'FILED_NON_RESPONSE' => 'neutral',
    ];

    public function index(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $query = DvCase::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['unionCouncil', 'secretary']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return DvCaseResource::collection($query->latest('receipt_date')->get());
    }

    public function show(Request $request, DvCase $case)
    {
        $this->authorizeOwnTehsil($request, $case);

        return new DvCaseResource(
            $case->load(['unionCouncil', 'secretary', 'adlg', 'notice', 'arbitration', 'decision', 'timeline.actor', 'proceedings.recorder'])
        );
    }

    /**
     * Read-only, own-district view for DDLG — every case across every tehsil in their
     * district, for oversight. DDLG has no action endpoints on this module.
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $query = DvCase::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['unionCouncil.tehsil', 'secretary']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return DvCaseResource::collection($query->latest('receipt_date')->get());
    }

    public function showForDdlg(Request $request, DvCase $case)
    {
        $this->authorizeOwnDistrict($request, $case);

        return new DvCaseResource(
            $case->load(['unionCouncil.tehsil', 'secretary', 'adlg', 'notice', 'arbitration', 'decision', 'timeline.actor', 'proceedings.recorder'])
        );
    }

    public function markSeen(Request $request, DvCase $case)
    {
        $this->authorizeOwnTehsil($request, $case);
        abort_unless($case->status === 'SUBMITTED', 422, 'Case must be Submitted to mark as Seen.');

        DB::transaction(function () use ($request, $case) {
            $case->update(['status' => 'SEEN', 'adlg_id' => $request->user()->id]);

            CaseTimelineEvent::create([
                'dv_case_id' => $case->id,
                'stage' => 'SEEN',
                'event_date' => now()->toDateString(),
                'actor_user_id' => $request->user()->id,
                'note' => 'Reviewed by ADLG',
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'CASE_SEEN',
                'entity_type' => 'DvCase',
                'entity_id' => $case->id,
                'note' => "{$case->case_no} marked as Seen",
            ]);

            CaseNotification::create([
                'to_user_id' => $case->secretary_id,
                'from_user_id' => $request->user()->id,
                'type' => 'CASE_SEEN',
                'dv_case_id' => $case->id,
                'message' => "Your case {$case->case_no} has been reviewed by ADLG.",
            ]);
        });

        return new DvCaseResource($case->fresh(['unionCouncil', 'secretary', 'adlg']));
    }

    public function issueNotice(IssueNoticeRequest $request, DvCase $case)
    {
        $this->authorizeOwnTehsil($request, $case);
        abort_unless($case->status === 'SEEN', 422, 'Case must be Seen before a notice can be issued.');

        DB::transaction(function () use ($request, $case) {
            $case->update(['status' => 'NOTICE_ISSUED']);

            CaseNotice::create([
                'dv_case_id' => $case->id,
                'notice_no' => $request->string('notice_no')->toString(),
                'issue_date' => $request->input('issue_date'),
                'hearing_date' => $request->input('hearing_date'),
                'attachment_ok' => true,
            ]);

            CaseTimelineEvent::create([
                'dv_case_id' => $case->id,
                'stage' => 'NOTICE_ISSUED',
                'event_date' => $request->input('issue_date'),
                'actor_user_id' => $request->user()->id,
                'note' => 'Notice issued to parties',
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'NOTICE_ISSUED',
                'entity_type' => 'DvCase',
                'entity_id' => $case->id,
                'note' => "Notice issued for {$case->case_no}",
            ]);

            CaseNotification::create([
                'to_user_id' => $case->secretary_id,
                'from_user_id' => $request->user()->id,
                'type' => 'NOTICE_ISSUED',
                'dv_case_id' => $case->id,
                'message' => "Notice issued for {$case->case_no}. Arbitration can now be constituted.",
            ]);
        });

        return new DvCaseResource($case->fresh(['unionCouncil', 'secretary', 'adlg', 'notice']));
    }

    public function passDecision(PassDecisionRequest $request, DvCase $case)
    {
        $this->authorizeOwnTehsil($request, $case);
        abort_unless(
            in_array($case->status, ['ARB_CONSTITUTED', 'IN_PROCEEDINGS'], true),
            422,
            'Arbitration must be constituted before a decision can be passed.'
        );

        DB::transaction(function () use ($request, $case) {
            $type = $request->string('type')->toString();
            $case->update(['status' => $type]);

            CaseDecision::create([
                'dv_case_id' => $case->id,
                'type' => $type,
                'order_no' => $request->string('order_no')->toString(),
                'decided_at' => now()->toDateString(),
                'remarks' => $request->input('remarks'),
            ]);

            CaseTimelineEvent::create([
                'dv_case_id' => $case->id,
                'stage' => $type,
                'event_date' => now()->toDateString(),
                'actor_user_id' => $request->user()->id,
                'note' => $request->input('remarks') ?: DvCaseResource::STATUS_LABELS[$type],
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'DECISION_PASSED',
                'entity_type' => 'DvCase',
                'entity_id' => $case->id,
                'note' => "{$case->case_no} — " . DvCaseResource::STATUS_LABELS[$type],
            ]);

            CaseNotification::create([
                'to_user_id' => $case->secretary_id,
                'from_user_id' => $request->user()->id,
                'type' => 'DECISION_PASSED',
                'dv_case_id' => $case->id,
                'message' => "Final decision passed for {$case->case_no}: " . DvCaseResource::STATUS_LABELS[$type],
            ]);
        });

        return new DvCaseResource($case->fresh(['unionCouncil', 'secretary', 'adlg', 'decision']));
    }

    protected function authorizeOwnTehsil(Request $request, DvCase $case): void
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        abort_unless($case->unionCouncil->tehsil_id === $tehsilId, 403);
    }

    protected function authorizeOwnDistrict(Request $request, DvCase $case): void
    {
        $districtId = $request->user()->ddlgProfile->district_id;
        abort_unless($case->unionCouncil->tehsil->district_id === $districtId, 403);
    }

    public function indexForSecretary(Request $request)
    {
        $ucId = $request->user()->secretaryProfile->union_council_id;

        $query = DvCase::where('union_council_id', $ucId)->with(['unionCouncil', 'secretary']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return DvCaseResource::collection($query->latest('receipt_date')->get());
    }

    public function showForSecretary(Request $request, DvCase $case)
    {
        $this->authorizeOwnUc($request, $case);

        return new DvCaseResource(
            $case->load(['unionCouncil', 'secretary', 'adlg', 'notice', 'arbitration', 'decision', 'timeline.actor', 'proceedings.recorder'])
        );
    }

    public function storeForSecretary(StoreDvCaseRequest $request)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;

        $attachmentPath = $request->hasFile('attachment')
            ? $request->file('attachment')->store('case-attachments', 'public')
            : null;

        $case = DB::transaction(function () use ($request, $user, $uc, $attachmentPath) {
            $case = DvCase::create([
                ...collect($request->validated())->except('attachment')->all(),
                'status' => 'SUBMITTED',
                'union_council_id' => $uc->id,
                'secretary_id' => $user->id,
                'adlg_id' => optional($uc->tehsil->adlgProfiles()->first())->user_id,
                'attachment_ok' => $attachmentPath !== null,
                'attachment_path' => $attachmentPath,
            ]);

            CaseTimelineEvent::create([
                'dv_case_id' => $case->id,
                'stage' => 'SUBMITTED',
                'event_date' => $case->receipt_date,
                'actor_user_id' => $user->id,
                'note' => 'Case submitted to ADLG',
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'CASE_CREATED',
                'entity_type' => 'DvCase',
                'entity_id' => $case->id,
                'note' => "{$case->case_no} submitted by {$user->name}",
            ]);

            if ($case->adlg_id) {
                CaseNotification::create([
                    'to_user_id' => $case->adlg_id,
                    'from_user_id' => $user->id,
                    'type' => 'CASE_CREATED',
                    'dv_case_id' => $case->id,
                    'message' => "New {$case->type} case {$case->case_no} submitted by {$user->name} ({$uc->name}).",
                ]);
            }

            return $case;
        });

        return new DvCaseResource($case->load(['unionCouncil', 'secretary']));
    }

    public function constituteArbitration(ConstituteArbitrationRequest $request, DvCase $case)
    {
        $this->authorizeOwnUc($request, $case);
        abort_unless(
            in_array($case->status, ['NOTICE_ISSUED', 'IN_PROCEEDINGS'], true),
            422,
            'Notice must be issued before arbitration can be constituted.'
        );

        DB::transaction(function () use ($request, $case) {
            if ($case->status !== 'IN_PROCEEDINGS') {
                $case->update(['status' => 'ARB_CONSTITUTED']);
            }

            CaseArbitration::create([
                'dv_case_id' => $case->id,
                ...$request->validated(),
                'constituted_at' => now(),
            ]);

            CaseTimelineEvent::create([
                'dv_case_id' => $case->id,
                'stage' => 'ARB_CONSTITUTED',
                'event_date' => now()->toDateString(),
                'actor_user_id' => $request->user()->id,
                'note' => 'Arbitration Council constituted',
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'ARB_CONSTITUTED',
                'entity_type' => 'DvCase',
                'entity_id' => $case->id,
                'note' => "{$case->case_no} arbitration council formed",
            ]);

            if ($case->adlg_id) {
                CaseNotification::create([
                    'to_user_id' => $case->adlg_id,
                    'from_user_id' => $request->user()->id,
                    'type' => 'ARB_CONSTITUTED',
                    'dv_case_id' => $case->id,
                    'message' => "Arbitration Council constituted for {$case->case_no} by {$request->user()->name}.",
                ]);
            }
        });

        return new DvCaseResource($case->fresh(['unionCouncil', 'secretary', 'adlg', 'arbitration']));
    }

    protected function authorizeOwnUc(Request $request, DvCase $case): void
    {
        $ucId = $request->user()->secretaryProfile->union_council_id;
        abort_unless($case->union_council_id === $ucId, 403);
    }

    protected function authorizeAccess(Request $request, DvCase $case): void
    {
        if ($request->user()->role === 'adlg') {
            $this->authorizeOwnTehsil($request, $case);
        } else {
            $this->authorizeOwnUc($request, $case);
        }
    }

    public function addProceeding(AddProceedingRequest $request, DvCase $case)
    {
        $this->authorizeAccess($request, $case);
        abort_unless(
            in_array($case->status, ['NOTICE_ISSUED', 'ARB_CONSTITUTED', 'IN_PROCEEDINGS'], true),
            422,
            'Proceedings can only be recorded once a notice has been issued.'
        );

        $proceeding = DB::transaction(function () use ($request, $case) {
            $procNo = 'PR-'.$case->case_no.'-'.str_pad((string) ($case->proceedings()->count() + 1), 2, '0', STR_PAD_LEFT);

            $proceeding = CaseProceeding::create([
                'dv_case_id' => $case->id,
                'proc_no' => $procNo,
                'date' => $request->input('date'),
                'venue' => $request->input('venue', 'UC Office'),
                'chairman_name' => $request->user()->name,
                'petitioner_present' => $request->boolean('petitioner_present'),
                'respondent_present' => $request->boolean('respondent_present'),
                'petitioner_biometric' => $request->boolean('petitioner_biometric'),
                'respondent_biometric' => $request->boolean('respondent_biometric'),
                'petitioner_photo_path' => $request->hasFile('petitioner_photo')
                    ? $request->file('petitioner_photo')->store('case-party-photos', 'public')
                    : null,
                'respondent_photo_path' => $request->hasFile('respondent_photo')
                    ? $request->file('respondent_photo')->store('case-party-photos', 'public')
                    : null,
                'pet_rep_name' => $request->input('pet_rep_name'),
                'pet_rep_cnic' => $request->input('pet_rep_cnic'),
                'res_rep_name' => $request->input('res_rep_name'),
                'res_rep_cnic' => $request->input('res_rep_cnic'),
                'pet_statement' => $request->input('pet_statement'),
                'res_statement' => $request->input('res_statement'),
                'reconciliation' => $request->input('reconciliation'),
                'adjourned' => $request->boolean('adjourned'),
                'adjourn_reason' => $request->boolean('adjourned') ? $request->input('adjourn_reason') : null,
                'next_hearing_date' => $request->boolean('adjourned') ? $request->input('next_hearing_date') : null,
                'notice_issued' => $request->boolean('notice_issued'),
                'notice_ref' => $request->boolean('notice_issued') ? $request->input('notice_ref') : null,
                'notice_date' => $request->boolean('notice_issued') ? $request->input('notice_date') : null,
                'notice_details' => $request->boolean('notice_issued') ? $request->input('notice_details') : null,
                'recorded_by' => $request->user()->id,
                'recorded_at' => now(),
            ]);

            if (in_array($case->status, ['NOTICE_ISSUED', 'ARB_CONSTITUTED'], true)) {
                $case->update(['status' => 'IN_PROCEEDINGS']);
            }

            CaseTimelineEvent::create([
                'dv_case_id' => $case->id,
                'stage' => 'IN_PROCEEDINGS',
                'event_date' => $request->input('date'),
                'actor_user_id' => $request->user()->id,
                'note' => "Hearing recorded ({$procNo})",
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'PROCEEDING_RECORDED',
                'entity_type' => 'DvCase',
                'entity_id' => $case->id,
                'note' => "{$case->case_no} — hearing {$procNo} recorded",
            ]);

            return $proceeding;
        });

        return new DvCaseResource($case->fresh(['unionCouncil', 'secretary', 'adlg', 'notice', 'arbitration', 'decision', 'timeline.actor', 'proceedings.recorder']));
    }

    public function notesheet(Request $request, DvCase $case)
    {
        $this->authorizeAccess($request, $case);
        $case->load(['unionCouncil.tehsil.district', 'timeline.actor', 'proceedings.recorder', 'decision']);

        $deadline = \Illuminate\Support\Carbon::parse($case->receipt_date)->addDays(90)->startOfDay();
        $daysRemaining = (int) ceil(($deadline->timestamp - \Illuminate\Support\Carbon::today()->timestamp) / 86400);
        $statusLabel = DvCaseResource::STATUS_LABELS[$case->status] ?? $case->status;

        $pdf = Pdf::loadView('pdf.dv-notesheet', compact('case', 'statusLabel', 'daysRemaining'))->setPaper('a4');
        $filename = "Notesheet_{$case->case_no}.pdf";

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'NOTESHEET_DOWNLOADED',
            'entity_type' => 'DvCase',
            'entity_id' => $case->id,
            'note' => "Notesheet downloaded: {$case->case_no}",
        ]);

        return $pdf->download($filename);
    }

    public function fullCaseFile(Request $request, DvCase $case)
    {
        $this->authorizeAccess($request, $case);
        $case->load(['unionCouncil.tehsil.district', 'timeline.actor', 'proceedings.recorder', 'arbitration', 'decision']);

        $statusLabel = DvCaseResource::STATUS_LABELS[$case->status] ?? $case->status;

        $pdf = Pdf::loadView('pdf.dv-case-file', compact('case', 'statusLabel'))->setPaper('a4');
        $filename = "{$case->case_no}_Complete_Case_File.pdf";

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'CASE_FILE_DOWNLOADED',
            'entity_type' => 'DvCase',
            'entity_id' => $case->id,
            'note' => "Full case file downloaded: {$case->case_no}",
        ]);

        return $pdf->download($filename);
    }

    /**
     * "Case Summary" (status distribution, colored to match the on-screen timeline
     * stepper) + "Case Detail" (every field the case has — notice, arbitration,
     * decision, not just the handful the old CSV carried) + "Hearing Proceedings"
     * (one row per recorded hearing across every case). Respects the same status
     * filter as the on-screen list.
     */
    public function export(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $query = DvCase::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['unionCouncil.tehsil', 'secretary', 'adlg', 'notice', 'arbitration', 'decision', 'proceedings']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $cases = $query->latest('receipt_date')->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('UC Governance Platform')->setTitle('Divorce/Khula Registry Report');

        $this->buildDvSummarySheet($spreadsheet->getActiveSheet(), $cases, $request);
        $this->buildDvDetailSheet($spreadsheet->createSheet(), $cases);
        $this->buildDvProceedingsSheet($spreadsheet->createSheet(), $cases);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Arbitration_Registry_'.now()->toDateString().'.xlsx');
    }

    protected function buildDvSummarySheet(Worksheet $sheet, $cases, Request $request): void
    {
        $sheet->setTitle('Case Summary');

        $subtitle = 'All Divorce/Khula cases in this tehsil'.($request->filled('status')
            ? ' · Status filter: '.(DvCaseResource::STATUS_LABELS[$request->string('status')->toString()] ?? $request->string('status'))
            : '');
        $this->xlTitleBanner($sheet, 'UC Governance Platform — Divorce/Khula Registry Summary', $subtitle, 3);

        $headerRow = 4;
        foreach (['Status', 'Cases', 'Share'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:C{$headerRow}");

        $total = $cases->count();
        $byStatus = $cases->countBy('status');
        $row = $headerRow + 1;
        foreach (DvCaseResource::STATUS_LABELS as $status => $label) {
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
    }

    protected function buildDvDetailSheet(Worksheet $sheet, $cases): void
    {
        $sheet->setTitle('Case Detail');

        $headers = [
            'Case No', 'Type', 'Status', 'UC', 'Tehsil', 'Petitioner', 'Pet. CNIC', 'Pet. Phone',
            'Respondent', 'Res. CNIC', 'Res. Phone', 'Marriage Date', 'Applied', 'Notice No.',
            'Notice Hearing', 'Arbitration Constituted', 'Decision Order No.', 'Decision Date',
            'Secretary', 'ADLG', 'Hearings',
        ];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, [
            'A' => 14, 'B' => 10, 'C' => 20, 'D' => 20, 'E' => 16, 'F' => 20, 'G' => 16, 'H' => 14,
            'I' => 20, 'J' => 16, 'K' => 14, 'L' => 14, 'M' => 12, 'N' => 14, 'O' => 14, 'P' => 16,
            'Q' => 16, 'R' => 14, 'S' => 18, 'T' => 18, 'U' => 10,
        ]);

        $row = 2;
        foreach ($cases as $c) {
            $sheet->setCellValue("A{$row}", $c->case_no);
            $sheet->setCellValue("B{$row}", ucfirst($c->type));
            $this->xlStatusCell($sheet, "C{$row}", DvCaseResource::STATUS_LABELS[$c->status] ?? $c->status, self::STATUS_TONE[$c->status] ?? 'neutral');
            $sheet->setCellValue("D{$row}", $c->unionCouncil->name);
            $sheet->setCellValue("E{$row}", $c->unionCouncil->tehsil?->name);
            $sheet->setCellValue("F{$row}", $c->divorcer_name);
            $sheet->setCellValue("G{$row}", $c->divorcer_cnic);
            $sheet->setCellValue("H{$row}", $c->divorcer_phone);
            $sheet->setCellValue("I{$row}", $c->respondent_name);
            $sheet->setCellValue("J{$row}", $c->respondent_cnic);
            $sheet->setCellValue("K{$row}", $c->respondent_phone);
            $sheet->setCellValue("L{$row}", $c->marriage_date?->toDateString());
            $sheet->setCellValue("M{$row}", $c->receipt_date->toDateString());
            $sheet->setCellValue("N{$row}", $c->notice?->notice_no);
            $sheet->setCellValue("O{$row}", $c->notice?->hearing_date?->toDateString());
            $sheet->setCellValue("P{$row}", $c->arbitration?->constituted_at?->toDateString());
            $sheet->setCellValue("Q{$row}", $c->decision?->order_no);
            $sheet->setCellValue("R{$row}", $c->decision?->decided_at?->toDateString());
            $sheet->setCellValue("S{$row}", $c->secretary?->name);
            $sheet->setCellValue("T{$row}", $c->adlg?->name);
            $sheet->setCellValue("U{$row}", $c->proceedings->count());

            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }

    protected function buildDvProceedingsSheet(Worksheet $sheet, $cases): void
    {
        $sheet->setTitle('Hearing Proceedings');

        $headers = ['Case No', 'Hearing #', 'Date', 'Venue', 'Chairman', 'Petitioner', 'Respondent', 'Reconciliation', 'Adjourned'];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, ['A' => 14, 'B' => 10, 'C' => 12, 'D' => 16, 'E' => 16, 'F' => 14, 'G' => 14, 'H' => 30, 'I' => 24]);

        $row = 2;
        foreach ($cases as $c) {
            foreach ($c->proceedings as $i => $p) {
                $sheet->setCellValue("A{$row}", $c->case_no);
                $sheet->setCellValue("B{$row}", $i + 1);
                $sheet->setCellValue("C{$row}", $p->date?->toDateString());
                $sheet->setCellValue("D{$row}", $p->venue);
                $sheet->setCellValue("E{$row}", $p->chairman_name);
                $this->xlStatusCell($sheet, "F{$row}", $p->petitioner_present ? 'Present' : 'Absent', $p->petitioner_present ? 'success' : 'danger');
                $this->xlStatusCell($sheet, "G{$row}", $p->respondent_present ? 'Present' : 'Absent', $p->respondent_present ? 'success' : 'danger');
                $sheet->setCellValue("H{$row}", $p->reconciliation);
                $sheet->setCellValue("I{$row}", $p->adjourned ? "Adjourned to {$p->next_hearing_date?->toDateString()}: {$p->adjourn_reason}" : '—');
                $row++;
            }
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }
}
