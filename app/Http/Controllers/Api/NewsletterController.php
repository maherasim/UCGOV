<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreNewsletterRequest;
use App\Http\Resources\NewsletterResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\Newsletter;
use App\Models\User;
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

        return NewsletterResource::collection($newsletters);
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
}
