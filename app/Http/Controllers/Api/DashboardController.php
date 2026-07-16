<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AuditLog;
use App\Models\District;
use App\Models\Division;
use App\Models\DvCase;
use App\Models\Inquiry;
use App\Models\LbrCase;
use App\Models\Newsletter;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use App\Models\User;
use App\Support\GeoBounds;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $tehsilsTotal = Tehsil::count();
        $tehsilsActivated = Tehsil::where('adlg_activated', true)->count();
        $activeCaseStatuses = ['SUBMITTED', 'SEEN', 'NOTICE_ISSUED', 'ARB_CONSTITUTED'];

        return response()->json([
            'kpis' => [
                'divisions' => Division::count(),
                'districts' => District::count(),
                'tehsils' => $tehsilsTotal,
                'union_councils' => UnionCouncil::count(),
                'adlgs' => User::where('role', 'adlg')->count(),
                'secretaries' => User::where('role', 'sec')->count(),
                'vacant_ucs' => UnionCouncil::whereDoesntHave('secretaryProfile')->count(),
                'adlg_coverage_pct' => $tehsilsTotal ? round(($tehsilsActivated / $tehsilsTotal) * 100) : 0,
                'dv_cases' => DvCase::count(),
                'active_cases' => DvCase::whereIn('status', $activeCaseStatuses)->count(),
                'newsletters' => Newsletter::count(),
                'pending_inquiries' => Inquiry::where('status', 'PENDING')->count(),
            ],
            'adlg_coverage' => [
                'activated' => $tehsilsActivated,
                'total' => $tehsilsTotal,
            ],
            'recent_audit' => AuditLog::with('user')->latest()->take(15)->get()->map(fn (AuditLog $a) => [
                'id' => $a->id,
                'action' => $a->action,
                'note' => $a->note,
                'user' => $a->user?->name,
                'created_at' => $a->created_at,
            ]),
            'recent_adlgs' => User::where('role', 'adlg')
                ->with('adlgProfile.tehsil')
                ->latest()
                ->take(5)
                ->get()
                ->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'tehsil' => $u->adlgProfile?->tehsil?->name,
                    'active' => $u->active,
                    'created_at' => $u->created_at,
                ]),
            'today_attendance' => $this->todayAttendance(),
            'attendance_trend' => $this->attendanceTrend(),
            'case_pipeline' => $this->casePipeline(),
            'case_disposition' => $this->caseDisposition(),
            'daily_trend' => $this->dailyTrend(),
            'vacant_by_district' => $this->vacantByDistrict(),
            'uc_map' => $this->ucMap(),
        ]);
    }

    /**
     * A province-shaped constellation of every geocoded UC — plotting real lat/lng
     * naturally traces Punjab's outline without needing map tiles or a maps API key.
     * status: 0 = vacant, 1 = covered, 2 = covered AND the secretary checked in today.
     */
    protected function ucMap(): array
    {
        $today = Carbon::today()->toDateString();
        $checkedInTodayUcIds = AttendanceRecord::where('attendance_date', $today)->pluck('union_council_id')->unique();

        $ucs = UnionCouncil::whereNotNull('lat')
            ->whereNotNull('lng')
            ->with('secretaryProfile:id,union_council_id')
            ->get(['id', 'lat', 'lng'])
            ->all();

        $ucs = GeoBounds::filterOutliers($ucs, fn (UnionCouncil $uc) => (float) $uc->lat, fn (UnionCouncil $uc) => (float) $uc->lng);

        return array_values(array_map(function (UnionCouncil $uc) use ($checkedInTodayUcIds) {
            $status = ! $uc->secretaryProfile ? 0 : ($checkedInTodayUcIds->contains($uc->id) ? 2 : 1);

            return [round((float) $uc->lat, 3), round((float) $uc->lng, 3), $status];
        }, $ucs));
    }

    protected function todayAttendance(): array
    {
        $total = User::where('role', 'sec')->count();
        $marked = AttendanceRecord::where('attendance_date', Carbon::today()->toDateString())->count();

        return [
            'marked' => $marked,
            'total' => $total,
            'rate' => $total ? round(($marked / $total) * 100) : 0,
        ];
    }

    /** Daily marked-attendance rate across all secretaries, last 14 days. */
    protected function attendanceTrend(): array
    {
        $total = User::where('role', 'sec')->count();
        $start = Carbon::today()->subDays(13);

        $counts = AttendanceRecord::where('attendance_date', '>=', $start->toDateString())
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

    /** Current stage distribution of Divorce/Khula cases — where the caseload actually sits. */
    protected function casePipeline(): array
    {
        $counts = DvCase::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $disposed = ['DISPOSED_RECONCILED', 'DISPOSED_EFFECTIVE', 'FILED_NON_RESPONSE'];

        return [
            ['key' => 'SUBMITTED', 'label' => 'Submitted', 'count' => (int) ($counts['SUBMITTED'] ?? 0)],
            ['key' => 'SEEN', 'label' => 'Seen by ADLG', 'count' => (int) ($counts['SEEN'] ?? 0)],
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

    /** How disposed cases actually resolved — the outcome mix. */
    protected function caseDisposition(): array
    {
        $counts = DvCase::whereIn('status', ['DISPOSED_RECONCILED', 'DISPOSED_EFFECTIVE', 'FILED_NON_RESPONSE'])
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            ['key' => 'DISPOSED_RECONCILED', 'label' => 'Reconciled', 'count' => (int) ($counts['DISPOSED_RECONCILED'] ?? 0)],
            ['key' => 'DISPOSED_EFFECTIVE', 'label' => 'Effective', 'count' => (int) ($counts['DISPOSED_EFFECTIVE'] ?? 0)],
            ['key' => 'FILED_NON_RESPONSE', 'label' => 'Non-Response', 'count' => (int) ($counts['FILED_NON_RESPONSE'] ?? 0)],
        ];
    }

    /** New Divorce/Khula cases vs new Birth Registration cases per day, last 14 days. */
    protected function dailyTrend(): array
    {
        $start = Carbon::today()->subDays(13);

        $dv = DvCase::where('receipt_date', '>=', $start->toDateString())
            ->selectRaw('receipt_date as d, count(*) as total')
            ->groupBy('d')
            ->pluck('total', 'd');

        $lbr = LbrCase::where('created_at', '>=', $start->startOfDay())
            ->selectRaw('DATE(created_at) as d, count(*) as total')
            ->groupBy('d')
            ->pluck('total', 'd');

        $days = [];
        for ($d = $start->copy(); $d->lte(Carbon::today()); $d->addDay()) {
            $key = $d->toDateString();
            $days[] = [
                'date' => $key,
                'dv_cases' => (int) ($dv[$key] ?? 0),
                'lbr_cases' => (int) ($lbr[$key] ?? 0),
            ];
        }

        return $days;
    }

    /** Top districts by vacant (no secretary) Union Councils — where coverage gaps actually are. */
    protected function vacantByDistrict(): array
    {
        return UnionCouncil::whereDoesntHave('secretaryProfile')
            ->with('tehsil.district')
            ->get()
            ->groupBy(fn (UnionCouncil $uc) => $uc->tehsil?->district?->name ?? 'Unknown')
            ->map(fn ($group, $district) => ['district' => $district, 'count' => $group->count()])
            ->sortByDesc('count')
            ->take(8)
            ->values()
            ->all();
    }
}
