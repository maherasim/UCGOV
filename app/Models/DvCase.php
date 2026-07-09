<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DvCase extends Model
{
    protected $table = 'dv_cases';

    protected $fillable = [
        'case_no',
        'type',
        'status',
        'union_council_id',
        'secretary_id',
        'adlg_id',
        'divorcer_name',
        'divorcer_cnic',
        'divorcer_phone',
        'respondent_name',
        'respondent_cnic',
        'respondent_phone',
        'address',
        'receipt_date',
        'attachment_ok',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'receipt_date' => 'date',
            'attachment_ok' => 'boolean',
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

    public function notice(): HasOne
    {
        return $this->hasOne(CaseNotice::class);
    }

    public function arbitration(): HasOne
    {
        return $this->hasOne(CaseArbitration::class);
    }

    public function decision(): HasOne
    {
        return $this->hasOne(CaseDecision::class);
    }

    public function timeline(): HasMany
    {
        return $this->hasMany(CaseTimelineEvent::class)->orderBy('event_date');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(CaseNotification::class);
    }
}
