<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class UnionCouncil extends Model
{
    protected $fillable = [
        'tehsil_id',
        'uc_no',
        'name',
        'code',
        'address',
        'lat',
        'lng',
        'geofence_radius',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'decimal:7',
            'lng' => 'decimal:7',
            'active' => 'boolean',
        ];
    }

    public function tehsil(): BelongsTo
    {
        return $this->belongsTo(Tehsil::class);
    }

    public function secretaryProfile(): HasOne
    {
        return $this->hasOne(SecretaryProfile::class);
    }

    public function secretaryCharges(): HasMany
    {
        return $this->hasMany(SecretaryUcCharge::class);
    }

    public function dvCases(): HasMany
    {
        return $this->hasMany(DvCase::class);
    }
}
