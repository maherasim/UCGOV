<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DeathCaseResource extends JsonResource
{
    public const STATUS_LABELS = [
        'FORWARDED' => 'Forwarded to ADLG',
        'PENDING_DDLG_APPROVAL' => 'Pending DDLG Committee Approval',
        'APPROVED' => 'Approved — Ready to Register',
        'REJECTED' => 'Rejected',
        'RETURNED' => 'Returned for Correction',
        'REGISTERED' => 'Death Registered',
    ];

    public const CATEGORY_LABELS = [
        '1-7' => '1–7 Years (Domestic)',
        '7+' => 'Over 7 Years (Court Decree)',
        'ABROAD' => 'Pakistani Abroad (6+ Months)',
    ];

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'death_id' => $this->death_id,
            'status' => $this->status,
            'status_label' => self::STATUS_LABELS[$this->status] ?? $this->status,
            'category' => $this->category,
            'category_label' => self::CATEGORY_LABELS[$this->category] ?? $this->category,
            'locked' => $this->locked,

            'union_council' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->name),
            'union_council_id' => $this->union_council_id,
            'tehsil' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->relationLoaded('tehsil') ? $this->unionCouncil->tehsil?->name : null),
            'secretary' => $this->whenLoaded('secretary', fn () => $this->secretary?->name),
            'adlg' => $this->whenLoaded('adlg', fn () => $this->adlg?->name),
            'ddlg' => $this->whenLoaded('ddlg', fn () => $this->ddlg?->name),

            'date_of_death' => $this->date_of_death?->toDateString(),
            'age_at_application' => (float) $this->age_at_application,
            'delay_reason' => $this->delay_reason,

            'deceased' => [
                'name' => $this->deceased_name,
                'gender' => $this->deceased_gender,
                'cnic' => $this->deceased_cnic,
                'cause_of_death' => $this->cause_of_death,
                'place_of_death' => $this->place_of_death,
                'burial_place' => $this->burial_place,
            ],

            'applicant' => [
                'name' => $this->applicant_name,
                'cnic' => $this->applicant_cnic,
                'relation' => $this->applicant_relation,
                'address' => $this->applicant_address,
                'phone' => $this->applicant_phone,
            ],

            'court_decree' => $this->category === '7+' ? [
                'decree_no' => $this->court_decree_no,
                'decree_date' => $this->court_decree_date?->toDateString(),
                'court_name' => $this->court_name,
            ] : null,

            'abroad' => $this->category === 'ABROAD' ? [
                'country_of_death' => $this->country_of_death,
                'passport_no' => $this->passport_no,
            ] : null,

            'secretary_remarks' => $this->secretary_remarks,

            'adlg_observations' => $this->adlg_observations,
            'adlg_order_no' => $this->adlg_order_no,
            'ddlg_observations' => $this->ddlg_observations,
            'ddlg_order_no' => $this->ddlg_order_no,

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
