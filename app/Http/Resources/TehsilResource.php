<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TehsilResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'district_id' => $this->district_id,
            'division_id' => $this->whenLoaded('district', fn () => $this->district->division_id),
            'district' => $this->whenLoaded('district', fn () => $this->district->name),
            'division' => $this->whenLoaded('district', fn () => $this->district->division?->name),
            'adlg_activated' => $this->adlg_activated,
            'active' => $this->active,
            'union_councils_count' => $this->whenCounted('unionCouncils'),
            'created_at' => $this->created_at,
        ];
    }
}
