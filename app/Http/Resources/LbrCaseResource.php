<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class LbrCaseResource extends JsonResource
{
    public const STATUS_LABELS = [
        'FORWARDED' => 'Forwarded to ADLG',
        'APPROVED' => 'Approved',
        'REJECTED' => 'Rejected',
        'RETURNED' => 'Returned for Correction',
        'REGISTERED' => 'Birth Registered',
        'PENDING_DELAY_APPROVAL' => 'Pending ADLG Delay Approval',
        'PENDING_DDLG_APPROVAL' => 'Pending DDLG Final Approval',
        'DELAY_APPROVED' => 'Delay Approved — Complete Application',
        'DELAY_RETURNED' => 'Delay Request Returned',
    ];

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lbr_id' => $this->lbr_id,
            'status' => $this->status,
            'status_label' => self::STATUS_LABELS[$this->status] ?? $this->status,
            'category' => $this->category,
            'category_label' => $this->category === '1-7' ? '1–7 Years' : 'Over 7 Years',
            'locked' => $this->locked,

            'union_council' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->name),
            'union_council_id' => $this->union_council_id,
            'tehsil' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->relationLoaded('tehsil') ? $this->unionCouncil->tehsil?->name : null),
            'secretary' => $this->whenLoaded('secretary', fn () => $this->secretary?->name),
            'adlg' => $this->whenLoaded('adlg', fn () => $this->adlg?->name),
            'ddlg' => $this->whenLoaded('ddlg', fn () => $this->ddlg?->name),

            'dob' => $this->dob?->toDateString(),
            'age_at_application' => (float) $this->age_at_application,
            'delay_reason' => $this->delay_reason,

            'child' => [
                'name' => $this->child_name,
                'gender' => $this->child_gender,
                'birth_place' => $this->child_birth_place,
                'birth_type' => $this->child_birth_type,
                'hospital' => $this->child_hospital,
            ],

            'applicant' => [
                'name' => $this->applicant_name,
                'cnic' => $this->applicant_cnic,
                'relation' => $this->applicant_relation,
                'father_name' => $this->applicant_father_name,
                'mother_name' => $this->applicant_mother_name,
                'address' => $this->applicant_address,
                'phone' => $this->applicant_phone,
            ],

            'secretary_remarks' => $this->secretary_remarks,

            'adlg_observations' => $this->adlg_observations,
            'adlg_order_no' => $this->adlg_order_no,
            'ddlg_observations' => $this->ddlg_observations,

            'certificate' => $this->certificate_no ? [
                'certificate_no' => $this->certificate_no,
                'certificate_date' => $this->certificate_date?->toDateString(),
                'certificate_remarks' => $this->certificate_remarks,
            ] : null,

            'documents' => $this->whenLoaded('documents', fn () => $this->documents->map(fn ($d) => [
                'doc_key' => $d->doc_key,
                'label' => $d->label,
                'file_url' => Storage::disk('public')->url($d->file_path),
                'uploaded_at' => $d->uploaded_at?->toIso8601String(),
            ])),

            'timeline' => $this->whenLoaded('timeline', fn () => $this->timeline->map(fn ($t) => [
                'stage' => $t->stage,
                'event_date' => $t->event_date?->toDateString(),
                'note' => $t->note,
                'actor' => $t->actor?->name,
            ])),

            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
