<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRecord extends Model
{
    protected $fillable = [
        'secretary_id',
        'union_council_id',
        'attendance_date',
        'check_in_time',
        'status',
        'inside_geofence',
        'biometric_verified',
        'lat',
        'lng',
        'distance_meters',
        'photo_path',
        'device_gmail',
    ];

    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'inside_geofence' => 'boolean',
            'biometric_verified' => 'boolean',
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
        ];
    }

    public function secretary(): BelongsTo
    {
        return $this->belongsTo(User::class, 'secretary_id');
    }

    public function unionCouncil(): BelongsTo
    {
        return $this->belongsTo(UnionCouncil::class);
    }
}
