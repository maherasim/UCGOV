<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tehsil extends Model
{
    protected $fillable = [
        'district_id',
        'name',
        'adlg_activated',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'adlg_activated' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function unionCouncils(): HasMany
    {
        return $this->hasMany(UnionCouncil::class);
    }

    public function adlgProfiles(): HasMany
    {
        return $this->hasMany(AdlgProfile::class);
    }

    public function performas(): HasMany
    {
        return $this->hasMany(Performa::class);
    }
}
