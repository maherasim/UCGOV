<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DklicDocument extends Model
{
    protected $fillable = [
        'uploaded_by',
        'title',
        'category',
        'subject',
        'description',
        'content_text',
        'reference_no',
        'issue_date',
        'effective_date',
        'version',
        'audience',
        'priority',
        'ack_required',
        'tags',
        'file_path',
        'published_at',
        'archived_at',
        'download_count',
        'view_count',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'ack_required' => 'boolean',
            'issue_date' => 'date',
            'effective_date' => 'date',
            'published_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function bookmarks(): HasMany
    {
        return $this->hasMany(DklicBookmark::class);
    }

    public function acknowledgements(): HasMany
    {
        return $this->hasMany(DklicAcknowledgement::class);
    }

    public function reads(): HasMany
    {
        return $this->hasMany(DklicRead::class);
    }
}
