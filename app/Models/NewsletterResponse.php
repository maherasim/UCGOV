<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NewsletterResponse extends Model
{
    protected $fillable = [
        'newsletter_id',
        'adlg_id',
        'newsletter_option_id',
        'remarks',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
        ];
    }

    public function newsletter(): BelongsTo
    {
        return $this->belongsTo(Newsletter::class);
    }

    public function adlg(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adlg_id');
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(NewsletterOption::class, 'newsletter_option_id');
    }
}
