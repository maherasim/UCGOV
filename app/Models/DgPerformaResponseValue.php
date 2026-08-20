<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DgPerformaResponseValue extends Model
{
    protected $fillable = [
        'dg_performa_response_id',
        'dg_performa_field_id',
        'value',
    ];

    public function response(): BelongsTo
    {
        return $this->belongsTo(DgPerformaResponse::class, 'dg_performa_response_id');
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(DgPerformaField::class, 'dg_performa_field_id');
    }
}
