<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UploadInquiryReportRequest;
use App\Http\Resources\InquiryResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\Inquiry;
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
}
