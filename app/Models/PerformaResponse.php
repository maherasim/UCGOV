<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerformaResponse extends Model
{
    protected $fillable = [
        'performa_id',
        'secretary_id',
        'type',
        'file_path',
        'response_date',
    ];

    protected function casts(): array
    {
        return [
            'response_date' => 'date',
        ];
    }

    public function performa(): BelongsTo
    {
        return $this->belongsTo(Performa::class);
    }

    public function secretary(): BelongsTo
    {
        return $this->belongsTo(User::class, 'secretary_id');
    }

    public function values(): HasMany
    {
        return $this->hasMany(PerformaResponseValue::class);
    }
}
