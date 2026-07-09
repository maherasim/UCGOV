<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\District;
use App\Models\DvCase;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use App\Models\User;

class DashboardController extends Controller
{
    public function index()
    {
        return response()->json([
            'kpis' => [
                'districts' => District::count(),
                'adlgs' => User::where('role', 'adlg')->count(),
                'union_councils' => UnionCouncil::count(),
                'secretaries' => User::where('role', 'sec')->count(),
                'dv_cases' => DvCase::count(),
            ],
            'recent_audit' => AuditLog::with('user')->latest()->take(10)->get()->map(fn (AuditLog $a) => [
                'id' => $a->id,
                'action' => $a->action,
                'note' => $a->note,
                'user' => $a->user?->name,
                'created_at' => $a->created_at,
            ]),
        ]);
    }
}
