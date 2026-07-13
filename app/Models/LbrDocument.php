<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LbrDocument extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'lbr_case_id',
        'doc_key',
        'label',
        'file_path',
        'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'uploaded_at' => 'datetime',
        ];
    }

    public function lbrCase(): BelongsTo
    {
        return $this->belongsTo(LbrCase::class);
    }
}
