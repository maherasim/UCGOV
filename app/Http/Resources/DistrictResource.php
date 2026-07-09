<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DistrictResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'division_id' => $this->division_id,
            'name' => $this->name,
            'division' => $this->whenLoaded('division', fn () => $this->division->name),
            'tehsils_count' => $this->whenCounted('tehsils'),
        ];
    }
}
