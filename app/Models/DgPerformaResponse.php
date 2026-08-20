<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DgPerformaResponse extends Model
{
    protected $fillable = [
        'dg_performa_id',
        'adlg_id',
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
        return $this->belongsTo(DgPerforma::class, 'dg_performa_id');
    }

    public function adlg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adlg_id');
    }

    public function values(): HasMany
    {
        return $this->hasMany(DgPerformaResponseValue::class, 'dg_performa_response_id');
    }
}
