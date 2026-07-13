<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DklicDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $this->category,
            'subject' => $this->subject,
            'description' => $this->description,
            'reference_no' => $this->reference_no,
            'issue_date' => $this->issue_date?->toDateString(),
            'effective_date' => $this->effective_date?->toDateString(),
            'version' => $this->version,
            'audience' => $this->audience,
            'priority' => $this->priority,
            'ack_required' => $this->ack_required,
            'tags' => $this->tags ?? [],
            'file_url' => Storage::disk('public')->url($this->file_path),
            'format' => strtoupper(pathinfo($this->file_path, PATHINFO_EXTENSION)),
            'download_count' => $this->download_count,
            'view_count' => $this->view_count,
            'uploaded_by' => $this->uploader?->name,
            'published_at' => $this->published_at?->toIso8601String(),
            'archived' => $this->archived_at !== null,
            'archived_at' => $this->archived_at?->toIso8601String(),
            'bookmarked' => (bool) $this->bookmarked_exists,
            'acknowledged' => (bool) $this->acknowledged_exists,
            'read' => (bool) $this->read_exists,
        ];
    }
}
