<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\DailyReport;
use App\Models\District;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Division-wide overview for the Director Local Government — read-only, Attendance/Reports
 * only (no case data; DG has no access to the Divorce/Khula registry).
 */
class DgDashboardController extends Controller
{
    public function index(Request $request)
    {
        $divisionId = $request->user()->dgProfile->division_id;

        $ucIds = UnionCouncil::whereHas('tehsil.district', fn ($q) => $q->where('division_id', $divisionId))->pluck('id');

        $totalSecretaries = User::where('role', 'sec')
            ->whereHas('secretaryProfile.unionCouncil', fn ($q) => $q->whereIn('union_council_id', $ucIds))
            ->count();

        $today = Carbon::today()->toDateString();
        $markedToday = AttendanceRecord::whereIn('union_council_id', $ucIds)
            ->where('attendance_date', $today)
            ->count();

        return response()->json([
            'kpis' => [
                'districts' => District::where('division_id', $divisionId)->count(),
                'tehsils' => Tehsil::whereHas('district', fn ($q) => $q->where('division_id', $divisionId))->count(),
                'union_councils' => $ucIds->count(),
                'secretaries' => $totalSecretaries,
                'attendance_marked_today' => $markedToday,
                'attendance_rate_today' => $totalSecretaries ? round(($markedToday / $totalSecretaries) * 100) : 0,
                'reports_pending_review' => DailyReport::whereIn('union_council_id', $ucIds)->where('reviewed', false)->count(),
            ],
            'attendance_trend' => $this->attendanceTrend($ucIds, $totalSecretaries),
        ]);
    }

    /** Daily marked-attendance rate across this division's secretaries, last 14 days. */
    protected function attendanceTrend($ucIds, int $total): array
    {
        $start = Carbon::today()->subDays(13);

        $counts = AttendanceRecord::whereIn('union_council_id', $ucIds)
            ->where('attendance_date', '>=', $start->toDateString())
            ->selectRaw('attendance_date, count(*) as marked')
            ->groupBy('attendance_date')
            ->pluck('marked', 'attendance_date');

        $days = [];
        for ($d = $start->copy(); $d->lte(Carbon::today()); $d->addDay()) {
            $marked = (int) ($counts[$d->toDateString()] ?? 0);
            $days[] = [
                'date' => $d->toDateString(),
                'rate' => $total ? round(($marked / $total) * 100) : 0,
            ];
        }

        return $days;
    }
}
