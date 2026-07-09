<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseNotification extends Model
{
    protected $fillable = [
        'to_user_id',
        'from_user_id',
        'type',
        'dv_case_id',
        'message',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function dvCase(): BelongsTo
    {
        return $this->belongsTo(DvCase::class);
    }
}
