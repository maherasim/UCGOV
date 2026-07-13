<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UnionCouncilResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tehsil_id' => $this->tehsil_id,
            'uc_no' => $this->uc_no,
            'name' => $this->name,
            'code' => $this->code,
            'address' => $this->address,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'geofence_radius' => $this->geofence_radius,
            'active' => $this->active,
            'secretary' => $this->whenLoaded('secretaryProfile', fn () => $this->secretaryProfile?->user?->name),
            'secretary_id' => $this->whenLoaded('secretaryProfile', fn () => $this->secretaryProfile?->user_id),
        ];
    }
}
