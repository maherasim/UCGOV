<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SecretaryProfile extends Model
{
    protected $fillable = [
        'user_id',
        'union_council_id',
        'father_name',
        'profile_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'profile_completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function unionCouncil(): BelongsTo
    {
        return $this->belongsTo(UnionCouncil::class);
    }

    public function additionalCharges(): HasMany
    {
        return $this->hasMany(SecretaryUcCharge::class);
    }
}
