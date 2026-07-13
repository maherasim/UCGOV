<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DklicAiQuery extends Model
{
    protected $fillable = [
        'user_id',
        'query',
        'matched_document_ids',
    ];

    protected function casts(): array
    {
        return [
            'matched_document_ids' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
