<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DgPerformaField extends Model
{
    protected $fillable = [
        'dg_performa_id',
        'label',
        'type',
        'sort_order',
    ];

    public function performa(): BelongsTo
    {
        return $this->belongsTo(DgPerforma::class, 'dg_performa_id');
    }

    public function values(): HasMany
    {
        return $this->hasMany(DgPerformaResponseValue::class);
    }
}
