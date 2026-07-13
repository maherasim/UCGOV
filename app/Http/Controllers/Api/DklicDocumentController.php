<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDklicDocumentRequest;
use App\Http\Resources\DklicDocumentResource;
use App\Models\AuditLog;
use App\Models\DklicAcknowledgement;
use App\Models\DklicAiQuery;
use App\Models\DklicDocument;
use Illuminate\Http\Request;

class DklicDocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = DklicDocument::query()->with('uploader');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('reference_no', 'like', "%{$search}%")
                    ->orWhereJsonContains('tags', $search);
            });
        }

        if ($category = $request->string('category')->toString()) {
            $query->where('category', $category);
        }

        if ($audience = $request->string('audience')->toString()) {
            $query->whereIn('audience', [$audience, 'All']);
        }

        if ($request->boolean('urgent_only')) {
            $query->where('priority', 'urgent');
        }

        $documents = $query->latest('published_at')->get();

        $allDocs = DklicDocument::query();

        return DklicDocumentResource::collection($documents)->additional([
            'meta' => [
                'total' => (clone $allDocs)->count(),
                'urgent' => (clone $allDocs)->where('priority', 'urgent')->count(),
                'acknowledged' => DklicAcknowledgement::count(),
                'pending_ack' => (clone $allDocs)->where('ack_required', true)->count(),
                'ai_queries' => DklicAiQuery::count(),
                'categories' => (clone $allDocs)->distinct('category')->count('category'),
            ],
        ]);
    }

    public function store(StoreDklicDocumentRequest $request)
    {
        $filePath = $request->file('file')->store('dklic-documents', 'public');

        $document = DklicDocument::create([
            'uploaded_by' => $request->user()->id,
            'title' => $request->string('title')->toString(),
            'category' => $request->string('category')->toString(),
            'subject' => $request->string('subject')->toString(),
            'description' => $request->input('description'),
            'content_text' => $request->input('content_text'),
            'reference_no' => $request->input('reference_no'),
            'issue_date' => $request->input('issue_date'),
            'effective_date' => $request->input('effective_date'),
            'version' => $request->input('version', '1.0'),
            'audience' => $request->string('audience')->toString(),
            'priority' => $request->string('priority')->toString(),
            'ack_required' => $request->boolean('ack_required'),
            'tags' => $request->input('tags', []),
            'file_path' => $filePath,
            'published_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DKLIC_UPLOAD',
            'entity_type' => 'DklicDocument',
            'entity_id' => $document->id,
            'note' => "Published: {$document->title} ({$document->category})",
        ]);

        return new DklicDocumentResource($document->load('uploader'));
    }

    public function archive(Request $request, DklicDocument $document)
    {
        $document->update(['archived_at' => $document->archived_at ? null : now()]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $document->archived_at ? 'DKLIC_ARCHIVE' : 'DKLIC_UNARCHIVE',
            'entity_type' => 'DklicDocument',
            'entity_id' => $document->id,
            'note' => ($document->archived_at ? 'Archived: ' : 'Unarchived: ').$document->title,
        ]);

        return new DklicDocumentResource($document->load('uploader'));
    }

    public function export()
    {
        $documents = DklicDocument::query()->latest('created_at')->get();

        $rows = ["Doc ID,Title,Category,Subject,Ref No.,Issue Date,Effective Date,Priority,Audience,Version,Views,Downloads,Ack Required,Archived,Created"];
        foreach ($documents as $d) {
            $rows[] = implode(',', [
                $d->id,
                '"'.str_replace('"', '""', $d->title).'"',
                '"'.$d->category.'"',
                '"'.str_replace('"', '""', $d->subject).'"',
                '"'.($d->reference_no ?? '').'"',
                $d->issue_date?->toDateString(),
                $d->effective_date?->toDateString(),
                $d->priority,
                '"'.$d->audience.'"',
                $d->version,
                $d->view_count,
                $d->download_count,
                $d->ack_required ? 'Yes' : 'No',
                $d->archived_at ? 'Yes' : 'No',
                $d->created_at->toDateString(),
            ]);
        }

        $csv = implode("\n", $rows);
        $filename = 'DKLIC_Repository_'.now()->toDateString().'.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
