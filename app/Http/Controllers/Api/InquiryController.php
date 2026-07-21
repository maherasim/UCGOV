<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreInquiryRequest;
use App\Http\Requests\Api\UploadInquiryReportRequest;
use App\Http\Resources\InquiryResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\Inquiry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InquiryController extends Controller
{
    public function index()
    {
        $inquiries = Inquiry::with(['adlg', 'unionCouncil'])->latest('submitted_at')->get();

        return InquiryResource::collection($inquiries);
    }

    public function show(Inquiry $inquiry)
    {
        return new InquiryResource($inquiry->load(['adlg', 'unionCouncil']));
    }

    public function uploadReport(UploadInquiryReportRequest $request, Inquiry $inquiry)
    {
        $reportPath = $request->file('report_file')->store('inquiry-reports', 'public');

        DB::transaction(function () use ($request, $inquiry, $reportPath) {
            $inquiry->update([
                'status' => 'DRAFTED',
                'report_file_path' => $reportPath,
                'report_remarks' => $request->input('report_remarks'),
                'drafted_at' => now(),
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'INQ_DRAFTED',
                'entity_type' => 'Inquiry',
                'entity_id' => $inquiry->id,
                'note' => "Report drafted by SA for: {$inquiry->subject}",
            ]);

            CaseNotification::create([
                'to_user_id' => $inquiry->adlg_id,
                'from_user_id' => $request->user()->id,
                'type' => 'INQ_DRAFTED',
                'message' => "Your inquiry report is ready! Subject: \"{$inquiry->subject}\" ({$inquiry->ref}). Download it from your Inquiry tab.",
            ]);
        });

        return new InquiryResource($inquiry->fresh(['adlg', 'unionCouncil']));
    }

    public function indexForAdlg(Request $request)
    {
        $inquiries = Inquiry::where('adlg_id', $request->user()->id)
            ->with('unionCouncil')
            ->latest('submitted_at')
            ->get();

        return InquiryResource::collection($inquiries);
    }

    /**
     * District oversight for DDLG — every inquiry filed by an ADLG in their district,
     * plus any inquiries the DDLG has filed themselves (the "adlg_id" column is really
     * just "requester_id"; store() below works unchanged for a DDLG-filed inquiry too).
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;
        $userId = $request->user()->id;

        $inquiries = Inquiry::with(['adlg', 'unionCouncil'])
            ->where(function ($q) use ($districtId, $userId) {
                $q->where('adlg_id', $userId)
                    ->orWhereHas('adlg.adlgProfile.tehsil', fn ($t) => $t->where('district_id', $districtId));
            })
            ->latest('submitted_at')
            ->get();

        return InquiryResource::collection($inquiries);
    }

    public function store(StoreInquiryRequest $request)
    {
        $filePath = $request->file('file')->store('inquiries', 'public');
        $ref = 'INQ-' . now()->year . '-' . str_pad((string) (Inquiry::count() + 1), 3, '0', STR_PAD_LEFT);

        $inquiry = Inquiry::create([
            'ref' => $ref,
            'subject' => $request->string('subject')->toString(),
            'adlg_id' => $request->user()->id,
            'union_council_id' => $request->input('union_council_id'),
            'remarks' => $request->string('remarks')->toString(),
            'file_path' => $filePath,
            'status' => 'PENDING',
            'submitted_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'INQ_SUBMITTED',
            'entity_type' => 'Inquiry',
            'entity_id' => $inquiry->id,
            'note' => "Inquiry \"{$inquiry->subject}\" submitted by {$request->user()->name}",
        ]);

        $saIds = User::where('role', 'sa')->pluck('id');
        foreach ($saIds as $saId) {
            CaseNotification::create([
                'to_user_id' => $saId,
                'from_user_id' => $request->user()->id,
                'type' => 'INQ_REQUEST',
                'message' => "New inquiry request from {$request->user()->name}: \"{$inquiry->subject}\" — Ref: {$ref}.",
            ]);
        }

        return new InquiryResource($inquiry->load(['adlg', 'unionCouncil']));
    }
}
