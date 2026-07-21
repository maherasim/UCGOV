<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DvCaseResource;
use App\Models\AttendanceRecord;
use App\Models\AuditLog;
use App\Models\DvCase;
use App\Models\LbrCase;
use App\Models\Newsletter;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DdlgDashboardController extends Controller
{
    public function index(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $ucIds = UnionCouncil::whereHas('tehsil', fn ($q) => $q->where('district_id', $districtId))->pluck('id');

        $cases = DvCase::whereIn('union_council_id', $ucIds)->get(['id', 'status', 'receipt_date']);
        $activeCases = $cases->whereIn('status', DvCaseResource::ACTIVE_STATUSES);
        $urgentCount = $activeCases->filter(function ($c) {
            $deadline = Carbon::parse($c->receipt_date)->addDays(90)->startOfDay();
            $daysRemaining = (int) ceil(($deadline->timestamp - Carbon::today()->timestamp) / 86400);

            return $daysRemaining > 0 && $daysRemaining <= 3;
        })->count();

        return response()->json([
            'kpis' => [
                'tehsils' => Tehsil::where('district_id', $districtId)->count(),
                'adlgs' => User::where('role', 'adlg')
                    ->whereHas('adlgProfile.tehsil', fn ($q) => $q->where('district_id', $districtId))
                    ->count(),
                'union_councils' => $ucIds->count(),
                'secretaries' => User::where('role', 'sec')
                    ->whereHas('secretaryProfile.unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
                    ->count(),
                'vacant_ucs' => UnionCouncil::whereIn('id', $ucIds)->whereDoesntHave('secretaryProfile')->count(),
                'total_cases' => $cases->count(),
                'active_cases' => $activeCases->count(),
                'urgent_cases' => $urgentCount,
                'disposed_cases' => $cases->count() - $activeCases->count(),
                'lbr_pending_my_approval' => LbrCase::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
                    ->where('status', 'PENDING_DDLG_APPROVAL')
                    ->count(),
                'pending_newsletters' => Newsletter::whereDoesntHave(
                    'responses',
                    fn ($q) => $q->where('adlg_id', $request->user()->id)
                )->count(),
            ],
            'recent_audit' => AuditLog::where('user_id', $request->user()->id)
                ->latest()
                ->take(10)
                ->get()
                ->map(fn (AuditLog $a) => [
                    'id' => $a->id,
                    'action' => $a->action,
                    'note' => $a->note,
                    'user' => $request->user()->name,
                    'created_at' => $a->created_at,
                ]),
            'today_attendance' => $this->todayAttendance($ucIds),
            'attendance_trend' => $this->attendanceTrend($ucIds),
            'case_pipeline' => $this->casePipeline($cases),
            'case_disposition' => $this->caseDisposition($cases),
        ]);
    }

    protected function todayAttendance($ucIds): array
    {
        $total = User::where('role', 'sec')
            ->whereHas('secretaryProfile.unionCouncil', fn ($q) => $q->whereIn('union_council_id', $ucIds))
            ->count();

        $marked = AttendanceRecord::whereIn('union_council_id', $ucIds)
            ->where('attendance_date', Carbon::today()->toDateString())
            ->count();

        return [
            'marked' => $marked,
            'total' => $total,
            'rate' => $total ? round(($marked / $total) * 100) : 0,
        ];
    }

    /** Daily marked-attendance rate across this district's secretaries, last 14 days. */
    protected function attendanceTrend($ucIds): array
    {
        $total = User::where('role', 'sec')
            ->whereHas('secretaryProfile.unionCouncil', fn ($q) => $q->whereIn('union_council_id', $ucIds))
            ->count();

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

    /** Current stage distribution of this district's Divorce/Khula cases. */
    protected function casePipeline($cases): array
    {
        $counts = $cases->countBy('status');
        $disposed = ['DISPOSED_RECONCILED', 'DISPOSED_EFFECTIVE', 'FILED_NON_RESPONSE'];

        return [
            ['key' => 'SUBMITTED', 'label' => 'Submitted', 'count' => (int) ($counts['SUBMITTED'] ?? 0)],
            ['key' => 'SEEN', 'label' => 'Seen', 'count' => (int) ($counts['SEEN'] ?? 0)],
            ['key' => 'NOTICE_ISSUED', 'label' => 'Notice Issued', 'count' => (int) ($counts['NOTICE_ISSUED'] ?? 0)],
            [
                'key' => 'PROCEEDINGS',
                'label' => 'Arbitration / Proceedings',
                'count' => (int) ($counts['ARB_CONSTITUTED'] ?? 0) + (int) ($counts['IN_PROCEEDINGS'] ?? 0),
            ],
            [
                'key' => 'DISPOSED',
                'label' => 'Disposed',
                'count' => collect($disposed)->sum(fn ($s) => (int) ($counts[$s] ?? 0)),
            ],
        ];
    }

    /** How this district's disposed cases actually resolved. */
    protected function caseDisposition($cases): array
    {
        $counts = $cases->whereIn('status', ['DISPOSED_RECONCILED', 'DISPOSED_EFFECTIVE', 'FILED_NON_RESPONSE'])->countBy('status');

        return [
            ['key' => 'DISPOSED_RECONCILED', 'label' => 'Reconciled', 'count' => (int) ($counts['DISPOSED_RECONCILED'] ?? 0)],
            ['key' => 'DISPOSED_EFFECTIVE', 'label' => 'Effective', 'count' => (int) ($counts['DISPOSED_EFFECTIVE'] ?? 0)],
            ['key' => 'FILED_NON_RESPONSE', 'label' => 'Non-Response', 'count' => (int) ($counts['FILED_NON_RESPONSE'] ?? 0)],
        ];
    }
}
