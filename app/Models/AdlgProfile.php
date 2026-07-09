<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdlgProfile extends Model
{
    protected $fillable = [
        'user_id',
        'tehsil_id',
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

    public function tehsil(): BelongsTo
    {
        return $this->belongsTo(Tehsil::class);
    }
}
