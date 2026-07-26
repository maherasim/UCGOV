<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportFieldDefinitionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'active' => $this->active,
            'adlg' => $this->whenLoaded('adlg', fn () => $this->adlg?->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
