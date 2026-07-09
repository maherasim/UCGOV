<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerformaField extends Model
{
    protected $fillable = [
        'performa_id',
        'label',
        'type',
        'sort_order',
    ];

    public function performa(): BelongsTo
    {
        return $this->belongsTo(Performa::class);
    }

    public function values(): HasMany
    {
        return $this->hasMany(PerformaResponseValue::class);
    }
}
