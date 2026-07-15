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
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DvCaseController extends Controller
{
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

    public function export(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $cases = DvCase::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with('unionCouncil')
            ->withCount('proceedings')
            ->latest('receipt_date')
            ->get();

        $rows = ['Case No,Type,UC,Tehsil,Petitioner,Pet CNIC,Respondent,Res CNIC,App Date,Status,Hearings'];
        foreach ($cases as $c) {
            $rows[] = implode(',', [
                $c->case_no,
                $c->type,
                '"'.$c->unionCouncil->name.'"',
                '"'.($c->unionCouncil->tehsil?->name ?? '').'"',
                '"'.str_replace('"', '""', $c->divorcer_name).'"',
                $c->divorcer_cnic,
                '"'.str_replace('"', '""', $c->respondent_name).'"',
                $c->respondent_cnic,
                $c->receipt_date->toDateString(),
                $c->status,
                $c->proceedings_count,
            ]);
        }

        $csv = implode("\n", $rows);
        $filename = 'Arbitration_Registry_'.now()->toDateString().'.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
