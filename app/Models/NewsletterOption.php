<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NewsletterOption extends Model
{
    protected $fillable = [
        'newsletter_id',
        'label',
        'sort_order',
    ];

    public function newsletter(): BelongsTo
    {
        return $this->belongsTo(Newsletter::class);
    }
}
