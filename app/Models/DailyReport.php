<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyReport extends Model
{
    protected $fillable = [
        'secretary_id',
        'union_council_id',
        'report_date',
        'remarks',
        'nikah_count',
        'birth_count',
        'death_count',
        'complaint_count',
        'custom_fields',
        'attachment_path',
        'reviewed',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'custom_fields' => 'array',
            'reviewed' => 'boolean',
            'reviewed_at' => 'datetime',
        ];
    }

    public function secretary(): BelongsTo
    {
        return $this->belongsTo(User::class, 'secretary_id');
    }

    public function unionCouncil(): BelongsTo
    {
        return $this->belongsTo(UnionCouncil::class);
    }
}
