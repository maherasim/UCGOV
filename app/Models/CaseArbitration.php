<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseArbitration extends Model
{
    protected $fillable = [
        'dv_case_id',
        'husband_rep_name',
        'husband_rep_cnic',
        'husband_rep_phone',
        'husband_rep_designation',
        'wife_rep_name',
        'wife_rep_cnic',
        'wife_rep_phone',
        'wife_rep_designation',
        'constituted_at',
    ];

    protected function casts(): array
    {
        return [
            'constituted_at' => 'datetime',
        ];
    }

    public function dvCase(): BelongsTo
    {
        return $this->belongsTo(DvCase::class);
    }
}
