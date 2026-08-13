<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DgProfile extends Model
{
    protected $fillable = [
        'user_id',
        'division_id',
        'grade',
        'father_name',
        'profile_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'profile_completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function division(): BelongsTo
    {
        return $this->belongsTo(Division::class);
    }
}
