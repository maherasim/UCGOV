<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class DvCaseResource extends JsonResource
{
    public const STATUS_LABELS = [
        'SUBMITTED' => 'Submitted to ADLG',
        'SEEN' => 'Seen by ADLG',
        'NOTICE_ISSUED' => 'Notice Issued',
        'ARB_CONSTITUTED' => 'Arbitration Constituted',
        'IN_PROCEEDINGS' => 'In Proceedings',
        'DISPOSED_RECONCILED' => 'Disposed — Reconciled',
        'DISPOSED_EFFECTIVE' => 'Disposed — Effective',
        'FILED_NON_RESPONSE' => 'Filed — Non-Response',
    ];

    public const ACTIVE_STATUSES = ['SUBMITTED', 'SEEN', 'NOTICE_ISSUED', 'ARB_CONSTITUTED', 'IN_PROCEEDINGS'];

    public function toArray(Request $request): array
    {
        // Unambiguous by construction (unlike Carbon's signed diffInDays direction):
        // positive = days left until the 90-day deadline, negative = overdue.
        $deadline = Carbon::parse($this->receipt_date)->addDays(90)->startOfDay();
        $daysRemaining = (int) ceil(($deadline->timestamp - Carbon::today()->timestamp) / 86400);
        $isActive = in_array($this->status, self::ACTIVE_STATUSES, true);

        return [
            'id' => $this->id,
            'case_no' => $this->case_no,
            'type' => $this->type,
            'status' => $this->status,
            'status_label' => self::STATUS_LABELS[$this->status] ?? $this->status,
            'union_council' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->name),
            'union_council_id' => $this->union_council_id,
            'secretary' => $this->whenLoaded('secretary', fn () => $this->secretary?->name),
            'adlg' => $this->whenLoaded('adlg', fn () => $this->adlg?->name),
            'divorcer_name' => $this->divorcer_name,
            'divorcer_cnic' => $this->divorcer_cnic,
            'divorcer_phone' => $this->divorcer_phone,
            'respondent_name' => $this->respondent_name,
            'respondent_cnic' => $this->respondent_cnic,
            'respondent_phone' => $this->respondent_phone,
            'marriage_date' => $this->marriage_date?->toDateString(),
            'nikah_registrar' => $this->nikah_registrar,
            'mahr_amount' => $this->mahr_amount,
            'children_count' => $this->children_count,
            'address' => $this->address,
            'receipt_date' => $this->receipt_date?->toDateString(),
            'days_remaining' => $isActive ? $daysRemaining : null,
            'is_urgent' => $isActive && $daysRemaining > 0 && $daysRemaining <= 3,
            'attachment_ok' => $this->attachment_ok,
            'attachment_url' => $this->attachment_path ? Storage::disk('public')->url($this->attachment_path) : null,
            'remarks' => $this->remarks,
            // Note: PHP's `&&` always coerces to bool (unlike JS's value-preserving short-circuit) —
            // ternaries here are required to actually return the array instead of `true`/`false`.
            'notice' => $this->whenLoaded('notice', fn () => $this->notice ? [
                'notice_no' => $this->notice->notice_no,
                'issue_date' => $this->notice->issue_date?->toDateString(),
                'hearing_date' => $this->notice->hearing_date?->toDateString(),
            ] : null),
            'arbitration' => $this->whenLoaded('arbitration', fn () => $this->arbitration ? [
                'husband_rep_name' => $this->arbitration->husband_rep_name,
                'husband_rep_designation' => $this->arbitration->husband_rep_designation,
                'wife_rep_name' => $this->arbitration->wife_rep_name,
                'wife_rep_designation' => $this->arbitration->wife_rep_designation,
                'constituted_at' => $this->arbitration->constituted_at,
            ] : null),
            'decision' => $this->whenLoaded('decision', fn () => $this->decision ? [
                'type' => $this->decision->type,
                'order_no' => $this->decision->order_no,
                'decided_at' => $this->decision->decided_at?->toDateString(),
                'remarks' => $this->decision->remarks,
            ] : null),
            'timeline' => $this->whenLoaded('timeline', fn () => $this->timeline->map(fn ($t) => [
                'stage' => $t->stage,
                'event_date' => $t->event_date?->toDateString(),
                'note' => $t->note,
                'actor' => $t->actor?->name,
            ])),
            'proceedings_count' => $this->whenCounted('proceedings'),
            'proceedings' => $this->whenLoaded('proceedings', fn () => $this->proceedings->map(fn ($p) => [
                'id' => $p->id,
                'proc_no' => $p->proc_no,
                'date' => $p->date?->toDateString(),
                'venue' => $p->venue,
                'chairman_name' => $p->chairman_name,
                'petitioner_present' => $p->petitioner_present,
                'respondent_present' => $p->respondent_present,
                'petitioner_biometric' => $p->petitioner_biometric,
                'respondent_biometric' => $p->respondent_biometric,
                'petitioner_photo_url' => $p->petitioner_photo_path ? Storage::disk('public')->url($p->petitioner_photo_path) : null,
                'respondent_photo_url' => $p->respondent_photo_path ? Storage::disk('public')->url($p->respondent_photo_path) : null,
                'pet_rep_name' => $p->pet_rep_name,
                'res_rep_name' => $p->res_rep_name,
                'pet_statement' => $p->pet_statement,
                'res_statement' => $p->res_statement,
                'reconciliation' => $p->reconciliation,
                'adjourned' => $p->adjourned,
                'adjourn_reason' => $p->adjourn_reason,
                'next_hearing_date' => $p->next_hearing_date?->toDateString(),
                'notice_issued' => $p->notice_issued,
                'notice_ref' => $p->notice_ref,
                'notice_date' => $p->notice_date?->toDateString(),
                'notice_details' => $p->notice_details,
                'recorded_by' => $p->recorder?->name,
                'recorded_at' => $p->recorded_at?->toIso8601String(),
            ])),
        ];
    }
}
