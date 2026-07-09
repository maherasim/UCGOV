<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Newsletter extends Model
{
    protected $fillable = [
        'published_by',
        'subject',
        'body',
        'priority',
        'attachment_path',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function options(): HasMany
    {
        return $this->hasMany(NewsletterOption::class)->orderBy('sort_order');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(NewsletterResponse::class);
    }
}
