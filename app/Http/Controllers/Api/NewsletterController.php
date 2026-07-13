<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RespondNewsletterRequest;
use App\Http\Requests\Api\StoreNewsletterRequest;
use App\Http\Resources\NewsletterResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\Newsletter;
use App\Models\NewsletterResponse;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class NewsletterController extends Controller
{
    public function index()
    {
        $newsletters = Newsletter::with('options')
            ->withCount('responses')
            ->latest('published_at')
            ->get();

        $totalAdlgs = User::where('role', 'adlg')->count();

        return NewsletterResource::collection($newsletters)->additional([
            'meta' => ['total_adlgs' => $totalAdlgs],
        ]);
    }

    public function responses(Newsletter $newsletter)
    {
        $responses = $newsletter->responses()
            ->with(['adlg.adlgProfile.tehsil', 'option'])
            ->latest('responded_at')
            ->get();

        return $responses->map(fn (NewsletterResponse $r) => [
            'id' => $r->id,
            'adlg_name' => $r->adlg?->name,
            'tehsil' => $r->adlg?->adlgProfile?->tehsil?->name,
            'option' => $r->option?->label,
            'remarks' => $r->remarks,
            'responded_at' => $r->responded_at,
        ]);
    }

    public function store(StoreNewsletterRequest $request)
    {
        $attachmentPath = $request->hasFile('attachment')
            ? $request->file('attachment')->store('newsletters', 'public')
            : null;

        $newsletter = DB::transaction(function () use ($request, $attachmentPath) {
            $newsletter = Newsletter::create([
                'published_by' => $request->user()->id,
                'subject' => $request->string('subject')->toString(),
                'body' => $request->string('body')->toString(),
                'priority' => $request->string('priority')->toString(),
                'attachment_path' => $attachmentPath,
                'published_at' => now(),
            ]);

            foreach ($request->input('options') as $index => $label) {
                $newsletter->options()->create(['label' => $label, 'sort_order' => $index]);
            }

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'NL_PUBLISHED',
                'entity_type' => 'Newsletter',
                'entity_id' => $newsletter->id,
                'note' => "\"{$newsletter->subject}\" published to all ADLGs",
            ]);

            $adlgIds = User::where('role', 'adlg')->pluck('id');
            foreach ($adlgIds as $adlgId) {
                CaseNotification::create([
                    'to_user_id' => $adlgId,
                    'from_user_id' => $request->user()->id,
                    'type' => 'NEWSLETTER',
                    'message' => "New directive from Super Admin: \"{$newsletter->subject}\" — please respond via your Newsletters tab.",
                ]);
            }

            return $newsletter;
        });

        return new NewsletterResource($newsletter->load('options'));
    }

    public function indexForAdlg(Request $request)
    {
        $adlgId = $request->user()->id;

        $newsletters = Newsletter::with(['options', 'responses' => fn ($q) => $q->where('adlg_id', $adlgId)])
            ->latest('published_at')
            ->get();

        return $newsletters->map(fn (Newsletter $n) => [
            'id' => $n->id,
            'subject' => $n->subject,
            'body' => $n->body,
            'priority' => $n->priority,
            'attachment_url' => $n->attachment_path ? Storage::disk('public')->url($n->attachment_path) : null,
            'options' => $n->options->map(fn ($o) => ['id' => $o->id, 'label' => $o->label]),
            'published_at' => $n->published_at,
            'my_response' => $n->responses->first() ? [
                'option_id' => $n->responses->first()->newsletter_option_id,
                'remarks' => $n->responses->first()->remarks,
                'responded_at' => $n->responses->first()->responded_at,
            ] : null,
        ]);
    }

    public function respond(RespondNewsletterRequest $request, Newsletter $newsletter)
    {
        $adlgId = $request->user()->id;

        $response = $newsletter->responses()->updateOrCreate(
            ['adlg_id' => $adlgId],
            [
                'newsletter_option_id' => $request->integer('newsletter_option_id'),
                'remarks' => $request->input('remarks'),
                'responded_at' => now(),
            ]
        );

        AuditLog::create([
            'user_id' => $adlgId,
            'action' => 'NL_RESPONDED',
            'entity_type' => 'Newsletter',
            'entity_id' => $newsletter->id,
            'note' => "{$request->user()->name} responded to \"{$newsletter->subject}\"",
        ]);

        return response()->json(['id' => $response->id]);
    }
}
