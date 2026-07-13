<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DklicAcknowledgement extends Model
{
    protected $fillable = [
        'dklic_document_id',
        'user_id',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'acknowledged_at' => 'datetime',
        ];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(DklicDocument::class, 'dklic_document_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
