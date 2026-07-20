<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DailyReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'secretary' => $this->whenLoaded('secretary', fn () => $this->secretary->name),
            'union_council' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->name),
            'report_date' => $this->report_date?->toDateString(),
            'remarks' => $this->remarks,
            'nikah_count' => $this->nikah_count,
            'birth_count' => $this->birth_count,
            'death_count' => $this->death_count,
            'complaint_count' => $this->complaint_count,
            'custom_fields' => $this->custom_fields ?? [],
            'attachment_url' => $this->attachment_path ? Storage::disk('public')->url($this->attachment_path) : null,
            'reviewed' => $this->reviewed,
            'reviewed_at' => $this->reviewed_at,
        ];
    }
}
