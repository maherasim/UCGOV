<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LbrTimelineEvent extends Model
{
    protected $fillable = [
        'lbr_case_id',
        'stage',
        'event_date',
        'actor_user_id',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
        ];
    }

    public function lbrCase(): BelongsTo
    {
        return $this->belongsTo(LbrCase::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
