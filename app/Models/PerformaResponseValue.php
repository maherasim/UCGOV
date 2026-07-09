<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformaResponseValue extends Model
{
    protected $fillable = [
        'performa_response_id',
        'performa_field_id',
        'value',
    ];

    public function response(): BelongsTo
    {
        return $this->belongsTo(PerformaResponse::class, 'performa_response_id');
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(PerformaField::class, 'performa_field_id');
    }
}
