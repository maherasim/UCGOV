<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeathDocument extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'death_case_id',
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

    public function deathCase(): BelongsTo
    {
        return $this->belongsTo(DeathCase::class);
    }
}
