<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Performa extends Model
{
    protected $fillable = [
        'adlg_id',
        'tehsil_id',
        'title',
        'description',
        'mode',
        'report_type',
        'deadline',
        'excel_template_path',
    ];

    protected function casts(): array
    {
        return [
            'deadline' => 'date',
        ];
    }

    public function adlg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adlg_id');
    }

    public function tehsil(): BelongsTo
    {
        return $this->belongsTo(Tehsil::class);
    }

    public function fields(): HasMany
    {
        return $this->hasMany(PerformaField::class)->orderBy('sort_order');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(PerformaResponse::class);
    }
}
