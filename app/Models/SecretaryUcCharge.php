<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecretaryUcCharge extends Model
{
    protected $fillable = [
        'secretary_profile_id',
        'union_council_id',
        'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
        ];
    }

    public function secretaryProfile(): BelongsTo
    {
        return $this->belongsTo(SecretaryProfile::class);
    }

    public function unionCouncil(): BelongsTo
    {
        return $this->belongsTo(UnionCouncil::class);
    }
}
