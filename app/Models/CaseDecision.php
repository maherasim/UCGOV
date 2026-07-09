<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseDecision extends Model
{
    protected $fillable = [
        'dv_case_id',
        'type',
        'order_no',
        'decided_at',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'decided_at' => 'date',
        ];
    }

    public function dvCase(): BelongsTo
    {
        return $this->belongsTo(DvCase::class);
    }
}
