<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DvCaseResource;
use App\Models\AuditLog;
use App\Models\DvCase;
use App\Models\Newsletter;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdlgDashboardController extends Controller
{
    public function index(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $ucIds = UnionCouncil::where('tehsil_id', $tehsilId)->pluck('id');

        $cases = DvCase::whereIn('union_council_id', $ucIds)->get(['id', 'status', 'receipt_date']);
        $activeCases = $cases->whereIn('status', DvCaseResource::ACTIVE_STATUSES);
        $urgentCount = $activeCases->filter(function ($c) {
            $deadline = Carbon::parse($c->receipt_date)->addDays(90)->startOfDay();
            $daysRemaining = (int) ceil(($deadline->timestamp - Carbon::today()->timestamp) / 86400);

            return $daysRemaining > 0 && $daysRemaining <= 3;
        })->count();

        return response()->json([
            'kpis' => [
                'union_councils' => $ucIds->count(),
                'secretaries' => User::where('role', 'sec')
                    ->whereHas('secretaryProfile.unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
                    ->count(),
                'vacant_ucs' => UnionCouncil::where('tehsil_id', $tehsilId)->whereDoesntHave('secretaryProfile')->count(),
                'total_cases' => $cases->count(),
                'active_cases' => $activeCases->count(),
                'urgent_cases' => $urgentCount,
                'disposed_cases' => $cases->count() - $activeCases->count(),
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
        ]);
    }
}
