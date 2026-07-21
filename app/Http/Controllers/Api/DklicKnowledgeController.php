<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AskDklicRequest;
use App\Http\Resources\DklicDocumentResource;
use App\Models\AuditLog;
use App\Models\DklicAcknowledgement;
use App\Models\DklicAiQuery;
use App\Models\DklicBookmark;
use App\Models\DklicDocument;
use App\Models\DklicRead;
use App\Models\User;
use Illuminate\Http\Request;

class DklicKnowledgeController extends Controller
{
    protected function audienceTag(User $user): string
    {
        return in_array($user->role, ['adlg', 'ddlg'], true) ? 'ADLG' : 'Secretary UC';
    }

    protected function baseQuery(User $user)
    {
        return DklicDocument::query()
            ->whereNull('archived_at')
            ->whereIn('audience', ['All', $this->audienceTag($user)])
            ->withExists([
                'bookmarks as bookmarked_exists' => fn ($q) => $q->where('user_id', $user->id),
                'acknowledgements as acknowledged_exists' => fn ($q) => $q->where('user_id', $user->id),
                'reads as read_exists' => fn ($q) => $q->where('user_id', $user->id),
            ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = $this->baseQuery($user)->with('uploader');

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

        $filter = $request->string('filter')->toString();
        if ($filter === 'urgent') {
            $query->where('priority', 'urgent');
        } elseif ($filter === 'bookmarked') {
            $query->whereHas('bookmarks', fn ($q) => $q->where('user_id', $user->id));
        } elseif ($filter === 'unread') {
            $query->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id));
        } elseif ($filter === 'recent') {
            $query->where('created_at', '>=', now()->subDays(7));
        }

        $documents = $query->get()->sortByDesc(fn ($d) => [$d->priority === 'urgent' ? 1 : 0, $d->published_at])->values();

        return DklicDocumentResource::collection($documents);
    }

    public function view(Request $request, DklicDocument $document)
    {
        $this->markRead($document, $request->user());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DKLIC_VIEW',
            'entity_type' => 'DklicDocument',
            'entity_id' => $document->id,
            'note' => "Document viewed: {$document->title}",
        ]);

        return response()->noContent();
    }

    public function download(Request $request, DklicDocument $document)
    {
        $this->markRead($document, $request->user());
        $document->increment('download_count');

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DKLIC_DOWNLOAD',
            'entity_type' => 'DklicDocument',
            'entity_id' => $document->id,
            'note' => "Downloaded: {$document->title}",
        ]);

        return response()->noContent();
    }

    public function toggleBookmark(Request $request, DklicDocument $document)
    {
        $user = $request->user();
        $bookmark = DklicBookmark::where('dklic_document_id', $document->id)->where('user_id', $user->id)->first();

        if ($bookmark) {
            $bookmark->delete();
            $bookmarked = false;
        } else {
            DklicBookmark::create(['dklic_document_id' => $document->id, 'user_id' => $user->id]);
            $bookmarked = true;
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'DKLIC_BOOKMARK',
            'entity_type' => 'DklicDocument',
            'entity_id' => $document->id,
            'note' => ($bookmarked ? 'Bookmarked: ' : 'Removed bookmark: ').$document->title,
        ]);

        return response()->json(['bookmarked' => $bookmarked]);
    }

    public function acknowledge(Request $request, DklicDocument $document)
    {
        $user = $request->user();
        $this->markRead($document, $user);

        DklicAcknowledgement::firstOrCreate(
            ['dklic_document_id' => $document->id, 'user_id' => $user->id],
            ['acknowledged_at' => now()]
        );

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'DKLIC_ACK',
            'entity_type' => 'DklicDocument',
            'entity_id' => $document->id,
            'note' => "Acknowledged: {$document->title} by {$user->name}",
        ]);

        return new DklicDocumentResource($this->baseQuery($user)->with('uploader')->findOrFail($document->id));
    }

    public function askAi(AskDklicRequest $request)
    {
        $user = $request->user();
        $query = $request->string('query')->toString();
        $q = strtolower($query);
        $words = array_filter(preg_split('/\s+/', $q), fn ($w) => strlen($w) >= 3);

        $docs = $this->baseQuery($user)->get();

        $ranked = $docs->map(function (DklicDocument $doc) use ($words) {
            $score = 0;
            $title = strtolower($doc->title);
            $subject = strtolower($doc->subject);
            $category = strtolower($doc->category);
            $content = strtolower($doc->content_text ?? '');
            $description = strtolower($doc->description ?? '');
            $tags = array_map('strtolower', $doc->tags ?? []);

            foreach ($words as $w) {
                if (str_contains($title, $w)) $score += 3;
                if (str_contains($subject, $w)) $score += 2;
                if (collect($tags)->contains(fn ($t) => str_contains($t, $w))) $score += 2;
                if ($content && str_contains($content, $w)) $score += 1;
                if ($description && str_contains($description, $w)) $score += 1;
                if (str_contains($category, $w)) $score += 1;
            }
            if ($doc->priority === 'urgent') $score += 0.5;

            return ['doc' => $doc, 'score' => $score];
        })->filter(fn ($x) => $x['score'] > 0)->sortByDesc('score')->values();

        DklicAiQuery::create([
            'user_id' => $user->id,
            'query' => $query,
            'matched_document_ids' => $ranked->take(3)->pluck('doc.id')->values()->all(),
        ]);

        if ($ranked->isEmpty()) {
            return response()->json([
                'answer' => "I searched the entire DKLIC Knowledge Repository but could not find any official document relevant to your query:\n\n\"{$query}\"\n\nThis topic may not yet be covered by an uploaded official document. Please ask the Super Administrator to upload the relevant Rules, Gazette, or Circular.\n\nI am only able to answer from authenticated, officially uploaded documents. I cannot generate any answer from external knowledge or personal interpretation.",
                'sources' => [],
            ]);
        }

        $topDocs = $ranked->take(3);
        $primary = $topDocs->first()['doc'];

        $answer = "Based on the DKLIC Knowledge Repository:\n\n";

        $contentExcerpt = '';
        if ($primary->content_text) {
            $longWords = array_filter(preg_split('/\s+/', $q), fn ($w) => strlen($w) > 3);
            $sentences = preg_split('/\.(?=\s)/', $primary->content_text);
            $relevant = array_values(array_filter($sentences, function ($s) use ($longWords) {
                $sLower = strtolower($s);
                foreach ($longWords as $w) {
                    if (str_contains($sLower, $w)) return true;
                }
                return false;
            }));
            $relevant = array_slice($relevant, 0, 4);
            if ($relevant) $contentExcerpt = trim(implode('. ', $relevant)).'.';
        }

        $answer .= "📋 SOURCE: {$primary->title}";
        if ($primary->reference_no) $answer .= " [{$primary->reference_no}]";
        $answer .= " ({$primary->category})\n\n";

        if ($contentExcerpt) {
            $answer .= "Relevant Provisions:\n{$contentExcerpt}\n\n";
        } elseif ($primary->description) {
            $answer .= "{$primary->description}\n\n";
        }

        if ($topDocs->count() > 1) {
            $answer .= "🔗 Related Documents:\n";
            foreach ($topDocs->skip(1) as $x) {
                $d = $x['doc'];
                $answer .= '• '.$d->title.($d->reference_no ? " [{$d->reference_no}]" : '')." ({$d->category})\n";
            }
            $answer .= "\n";
        }

        $answer .= 'ℹ️ This response is sourced exclusively from official documents in the LGCD Knowledge Repository. Ref: '.($primary->reference_no ?: $primary->category);
        if ($primary->issue_date) $answer .= ' | Issued: '.$primary->issue_date->toDateString();
        if ($primary->version) $answer .= " | Version: {$primary->version}";

        return response()->json([
            'answer' => $answer,
            'sources' => $topDocs->map(fn ($x) => [
                'id' => $x['doc']->id,
                'title' => $x['doc']->title,
                'reference_no' => $x['doc']->reference_no,
                'category' => $x['doc']->category,
            ])->values(),
        ]);
    }

    protected function markRead(DklicDocument $document, User $user): void
    {
        $read = DklicRead::firstOrCreate(
            ['dklic_document_id' => $document->id, 'user_id' => $user->id],
            ['read_at' => now()]
        );

        if ($read->wasRecentlyCreated) {
            $document->increment('view_count');
        }
    }
}
