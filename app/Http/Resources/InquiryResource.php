<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class InquiryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ref' => $this->ref,
            'subject' => $this->subject,
            'remarks' => $this->remarks,
            'status' => $this->status,
            'file_url' => $this->file_path ? Storage::disk('public')->url($this->file_path) : null,
            'report_file_url' => $this->report_file_path ? Storage::disk('public')->url($this->report_file_path) : null,
            'report_remarks' => $this->report_remarks,
            'adlg' => $this->whenLoaded('adlg', fn () => $this->adlg->name),
            'union_council' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil?->name),
            'submitted_at' => $this->submitted_at,
            'drafted_at' => $this->drafted_at,
        ];
    }
}
