<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DgPerforma extends Model
{
    protected $fillable = [
        'dg_id',
        'division_id',
        'title',
        'description',
        'mode',
        'report_type',
        'deadline',
        'excel_template_path',
        'target_all_adlgs',
    ];

    protected function casts(): array
    {
        return [
            'deadline' => 'date',
            'target_all_adlgs' => 'boolean',
        ];
    }

    public function dg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dg_id');
    }

    public function division(): BelongsTo
    {
        return $this->belongsTo(Division::class);
    }

    public function fields(): HasMany
    {
        return $this->hasMany(DgPerformaField::class)->orderBy('sort_order');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(DgPerformaResponse::class);
    }

    public function targetedAdlgs(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'dg_performa_targets', 'dg_performa_id', 'adlg_id');
    }
}
