<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MovementLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'secretary' => $this->whenLoaded('secretary', fn () => $this->secretary->name),
            'union_council' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->name),
            'tehsil' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->relationLoaded('tehsil') ? $this->unionCouncil->tehsil?->name : null),
            'district' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->relationLoaded('tehsil') && $this->unionCouncil->tehsil?->relationLoaded('district')
                ? $this->unionCouncil->tehsil->district?->name
                : null),
            'reason' => $this->reason,
            'details' => $this->details,
            'distance_meters' => $this->distance_meters,
            'occurred_at' => $this->occurred_at,
        ];
    }
}
