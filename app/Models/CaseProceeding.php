<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseProceeding extends Model
{
    protected $fillable = [
        'dv_case_id',
        'proc_no',
        'date',
        'venue',
        'chairman_name',
        'petitioner_present',
        'respondent_present',
        'petitioner_biometric',
        'respondent_biometric',
        'pet_rep_name',
        'pet_rep_cnic',
        'res_rep_name',
        'res_rep_cnic',
        'pet_statement',
        'res_statement',
        'reconciliation',
        'adjourned',
        'adjourn_reason',
        'next_hearing_date',
        'notice_issued',
        'notice_ref',
        'notice_date',
        'notice_details',
        'adlg_observation',
        'adlg_direction',
        'recorded_by',
        'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'petitioner_present' => 'boolean',
            'respondent_present' => 'boolean',
            'petitioner_biometric' => 'boolean',
            'respondent_biometric' => 'boolean',
            'adjourned' => 'boolean',
            'next_hearing_date' => 'date',
            'notice_issued' => 'boolean',
            'notice_date' => 'date',
            'recorded_at' => 'datetime',
        ];
    }

    public function dvCase(): BelongsTo
    {
        return $this->belongsTo(DvCase::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
