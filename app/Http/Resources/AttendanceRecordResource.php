<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'secretary' => $this->whenLoaded('secretary', fn () => $this->secretary->name),
            'union_council' => $this->whenLoaded('unionCouncil', fn () => $this->unionCouncil->name),
            'attendance_date' => $this->attendance_date?->toDateString(),
            'check_in_time' => $this->check_in_time,
            'status' => $this->status,
            'inside_geofence' => $this->inside_geofence,
            'biometric_verified' => $this->biometric_verified,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'distance_meters' => $this->distance_meters,
        ];
    }
}
