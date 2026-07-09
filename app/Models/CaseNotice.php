<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseNotice extends Model
{
    protected $fillable = [
        'dv_case_id',
        'notice_no',
        'issue_date',
        'hearing_date',
        'attachment_ok',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'hearing_date' => 'date',
            'attachment_ok' => 'boolean',
        ];
    }

    public function dvCase(): BelongsTo
    {
        return $this->belongsTo(DvCase::class);
    }
}
