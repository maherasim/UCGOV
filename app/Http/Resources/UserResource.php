<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'role' => $this->role,
            'name' => $this->name,
            'username' => $this->username,
            'email' => $this->email,
            'phone' => $this->phone,
            'cnic' => $this->cnic,
            'avatar_url' => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
            'active' => $this->active,
            'bio_enrolled' => $this->bio_enrolled,
            'first_login' => $this->first_login,
            'last_login_at' => $this->last_login_at,
            'adlg_profile' => $this->whenLoaded('adlgProfile', fn () => [
                'tehsil_id' => $this->adlgProfile->tehsil_id,
                'tehsil' => $this->whenLoaded('adlgProfile', fn () => $this->adlgProfile->tehsil?->name),
                'grade' => $this->adlgProfile->grade,
            ]),
            'secretary_profile' => $this->whenLoaded('secretaryProfile', fn () => [
                'union_council_id' => $this->secretaryProfile->union_council_id,
                'union_council' => $this->secretaryProfile->unionCouncil?->name,
                'father_name' => $this->secretaryProfile->father_name,
                'geofence_set' => $this->secretaryProfile->unionCouncil
                    ? ($this->secretaryProfile->unionCouncil->lat !== null && $this->secretaryProfile->unionCouncil->lng !== null)
                    : null,
            ]),
        ];
    }
}
