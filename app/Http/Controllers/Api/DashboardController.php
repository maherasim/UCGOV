<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\District;
use App\Models\Division;
use App\Models\DvCase;
use App\Models\Inquiry;
use App\Models\Newsletter;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use App\Models\User;

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
        ]);
    }
}
