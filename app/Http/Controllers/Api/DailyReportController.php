<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDailyReportRequest;
use App\Http\Resources\DailyReportResource;
use App\Models\AuditLog;
use App\Models\DailyReport;
use Illuminate\Http\Request;

class DailyReportController extends Controller
{
    public function store(StoreDailyReportRequest $request)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;

        $report = DailyReport::create([
            'secretary_id' => $user->id,
            'union_council_id' => $uc->id,
            'report_date' => now()->toDateString(),
            'remarks' => $request->string('remarks')->toString(),
            'nikah_count' => $request->integer('nikah_count'),
            'birth_count' => $request->integer('birth_count'),
            'death_count' => $request->integer('death_count'),
            'complaint_count' => $request->integer('complaint_count'),
            'reviewed' => false,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'REPORT_SUBMITTED',
            'entity_type' => 'DailyReport',
            'entity_id' => $report->id,
            'note' => "Daily report submitted by {$user->name}",
        ]);

        return new DailyReportResource($report->load(['secretary', 'unionCouncil']));
    }

    public function myHistory(Request $request)
    {
        $reports = DailyReport::where('secretary_id', $request->user()->id)
            ->latest('report_date')
            ->take(30)
            ->get();

        return DailyReportResource::collection($reports);
    }

    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $reports = DailyReport::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['secretary', 'unionCouncil'])
            ->latest('report_date')
            ->take(200)
            ->get();

        return DailyReportResource::collection($reports);
    }

    public function markReviewed(Request $request, DailyReport $report)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        abort_unless($report->unionCouncil->tehsil_id === $tehsilId, 403);

        $report->update(['reviewed' => true, 'reviewed_at' => now()]);

        return new DailyReportResource($report->load(['secretary', 'unionCouncil']));
    }
}
