<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inquiry extends Model
{
    protected $fillable = [
        'ref',
        'subject',
        'adlg_id',
        'union_council_id',
        'remarks',
        'file_path',
        'status',
        'report_file_path',
        'report_remarks',
        'submitted_at',
        'drafted_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'drafted_at' => 'datetime',
        ];
    }

    public function adlg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adlg_id');
    }

    public function unionCouncil(): BelongsTo
    {
        return $this->belongsTo(UnionCouncil::class);
    }
}
