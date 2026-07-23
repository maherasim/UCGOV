<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeathCase extends Model
{
    protected $fillable = [
        'death_id',
        'status',
        'category',
        'union_council_id',
        'secretary_id',
        'adlg_id',
        'ddlg_id',
        'date_of_death',
        'age_at_application',
        'delay_reason',
        'deceased_name',
        'deceased_gender',
        'deceased_cnic',
        'cause_of_death',
        'place_of_death',
        'burial_place',
        'applicant_name',
        'applicant_cnic',
        'applicant_relation',
        'applicant_address',
        'applicant_phone',
        'secretary_remarks',
        'adlg_observations',
        'adlg_order_no',
        'ddlg_observations',
        'ddlg_order_no',
        'court_decree_no',
        'court_decree_date',
        'court_name',
        'country_of_death',
        'passport_no',
        'certificate_no',
        'certificate_date',
        'certificate_remarks',
        'locked',
        'locked_at',
    ];

    protected function casts(): array
    {
        return [
            'date_of_death' => 'date',
            'age_at_application' => 'decimal:1',
            'court_decree_date' => 'date',
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
        return $this->hasMany(DeathDocument::class);
    }

    public function timeline(): HasMany
    {
        return $this->hasMany(DeathTimelineEvent::class)->orderBy('event_date');
    }
}
