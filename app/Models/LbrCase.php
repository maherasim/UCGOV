<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LbrCase extends Model
{
    protected $fillable = [
        'lbr_id',
        'status',
        'category',
        'union_council_id',
        'secretary_id',
        'adlg_id',
        'dob',
        'age_at_application',
        'delay_reason',
        'child_name',
        'child_gender',
        'child_birth_place',
        'child_birth_type',
        'child_hospital',
        'applicant_name',
        'applicant_cnic',
        'applicant_relation',
        'applicant_father_name',
        'applicant_mother_name',
        'applicant_address',
        'applicant_phone',
        'secretary_remarks',
        'adlg_observations',
        'adlg_order_no',
        'ddlg_id',
        'ddlg_observations',
        'certificate_no',
        'certificate_date',
        'certificate_remarks',
        'locked',
        'locked_at',
    ];

    protected function casts(): array
    {
        return [
            'dob' => 'date',
            'age_at_application' => 'decimal:1',
            'certificate_date' => 'date',
            'locked' => 'boolean',
            'locked_at' => 'datetime',
        ];
    }

    public function unionCouncil(): BelongsTo
    {
        return $this->belongsTo(UnionCouncil::class);
    }

    public function secretary(): BelongsTo
    {
        return $this->belongsTo(User::class, 'secretary_id');
    }

    public function adlg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adlg_id');
    }

    public function ddlg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ddlg_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(LbrDocument::class);
    }

    public function timeline(): HasMany
    {
        return $this->hasMany(LbrTimelineEvent::class)->orderBy('event_date');
    }
}
