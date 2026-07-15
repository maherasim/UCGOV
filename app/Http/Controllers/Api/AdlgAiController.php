<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AskAdlgAiRequest;
use App\Http\Resources\DvCaseResource;
use App\Models\AttendanceRecord;
use App\Models\DailyReport;
use App\Models\DvCase;
use App\Models\Newsletter;
use App\Models\Tehsil;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * A rule-based "AI Assistant" that answers questions about the ADLG's own dashboard data —
 * keyword-matched against computed stats, same approach as DKLIC's search (no real LLM),
 * ported from the prototype's getAIAnswer(). Distinct from DKLIC: this reads live
 * attendance/case/report/secretary data scoped to the ADLG's own tehsil, not documents.
 */
class AdlgAiController extends Controller
{
    public function ask(AskAdlgAiRequest $request)
    {
        $tehsil = $request->user()->adlgProfile->tehsil;
        $q = strtolower($request->string('question')->toString());

        return response()->json(['answer' => $this->answer($q, $tehsil, $request->user())]);
    }

    protected function answer(string $q, Tehsil $tehsil, User $adlg): string
    {
        $ucs = UnionCouncil::where('tehsil_id', $tehsil->id)->where('active', true)->get();

        if (str_contains($q, 'uc') || str_contains($q, 'union council')) {
            if (str_contains($q, 'how many') || str_contains($q, 'count') || str_contains($q, 'total')) {
                $assigned = $ucs->filter(fn ($uc) => $uc->secretaryProfile !== null)->count();

                return "🏛 In Tehsil {$tehsil->name}, there are <b>{$ucs->count()} Union Councils</b>. {$assigned} have an assigned Secretary, ".
                    ($ucs->count() - $assigned).' are currently vacant.';
            }
            if (str_contains($q, 'vacant') || str_contains($q, 'empty') || str_contains($q, 'no secret')) {
                $vacant = $ucs->filter(fn ($uc) => $uc->secretaryProfile === null);
                if ($vacant->isEmpty()) {
                    return "✅ All {$ucs->count()} UCs have an assigned Secretary.";
                }

                return '⚠️ <b>'.$vacant->count().' vacant UCs</b>:<br>'.
                    $vacant->map(fn ($uc) => "· UC #{$uc->uc_no} {$uc->name}")->implode('<br>');
            }
            if (str_contains($q, 'list') || str_contains($q, 'show') || str_contains($q, 'all')) {
                $rows = $ucs->take(10)->map(fn ($uc) => "UC #{$uc->uc_no} {$uc->name}".($uc->secretaryProfile ? ' ✓' : ' ⏳'));

                return "🏛 <b>Your {$ucs->count()} UCs:</b><br>".$rows->implode('<br>').
                    ($ucs->count() > 10 ? '<br>…and '.($ucs->count() - 10).' more' : '');
            }
        }

        if (str_contains($q, 'attend')) {
            $today = Carbon::today()->toDateString();
            $records = AttendanceRecord::whereIn('union_council_id', $ucs->pluck('id'))
                ->where('attendance_date', $today)
                ->get();
            $inside = $records->where('inside_geofence', true)->count();
            $outside = $records->where('inside_geofence', false)->count();
            $late = $records->where('status', 'late')->count();

            return "📊 <b>Today's Attendance</b><br>✔ Inside geofence: {$inside}<br>⚠️ Outside geofence: {$outside}<br>".
                "⏳ Late: {$late}<br>Total checked in: {$records->count()} of {$ucs->count()} UCs";
        }

        if (str_contains($q, 'divorce') || str_contains($q, 'khula') || str_contains($q, 'case')) {
            $cases = DvCase::whereIn('union_council_id', $ucs->pluck('id'))->get(['id', 'status', 'receipt_date']);
            $active = $cases->whereIn('status', DvCaseResource::ACTIVE_STATUSES);
            $urgent = $active->filter(function ($c) {
                $deadline = Carbon::parse($c->receipt_date)->addDays(90)->startOfDay();
                $daysRemaining = (int) ceil(($deadline->timestamp - Carbon::today()->timestamp) / 86400);

                return $daysRemaining > 0 && $daysRemaining <= 3;
            })->count();

            return '⚖️ <b>Case Registry</b><br>'.
                "Total cases: {$cases->count()}<br>Active: {$active->count()}<br>".
                "🚨 Urgent (≤3 days): {$urgent}<br>Disposed: ".($cases->count() - $active->count());
        }

        if (str_contains($q, 'report')) {
            $reports = DailyReport::whereIn('union_council_id', $ucs->pluck('id'))->get(['id', 'reviewed']);
            $pending = $reports->where('reviewed', false)->count();

            return '📋 <b>Reports</b><br>'.
                "Total submitted: {$reports->count()}<br>Pending review: {$pending}<br>Reviewed: ".($reports->count() - $pending);
        }

        if (str_contains($q, 'secret') || str_contains($q, 'profile')) {
            $secretaries = User::where('role', 'sec')
                ->whereHas('secretaryProfile.unionCouncil', fn ($qq) => $qq->where('tehsil_id', $tehsil->id))
                ->with('secretaryProfile.unionCouncil')
                ->get();

            $lines = $secretaries->take(5)->map(fn ($s) => "· {$s->name} (UC {$s->secretaryProfile?->unionCouncil?->uc_no})");

            return '👤 <b>Secretary Profiles</b><br>'.
                "Assigned: {$secretaries->count()} of {$ucs->count()} UCs<br>".
                ($secretaries->count() ? $lines->implode('<br>') : 'No secretaries assigned yet.');
        }

        if (str_contains($q, 'newsletter') || str_contains($q, 'directive')) {
            $newsletters = Newsletter::with(['responses' => fn ($qq) => $qq->where('adlg_id', $adlg->id)])->latest('published_at')->get();
            $lines = $newsletters->take(3)->map(fn ($n) => '· '.$n->subject.' ('.($n->responses->isNotEmpty() ? '✓ Responded' : 'Pending').')');

            return '📰 <b>Newsletters</b><br>'.
                "Total received: {$newsletters->count()}<br>".
                ($newsletters->count() ? $lines->implode('<br>') : 'No newsletters yet.');
        }

        if (str_contains($q, 'geofence') || str_contains($q, 'gps') || str_contains($q, 'location')) {
            $withGeo = $ucs->filter(fn ($uc) => $uc->lat && $uc->lng)->count();

            return '📍 <b>Geofence Status</b><br>'.
                "UCs with geofence set: {$withGeo} of {$ucs->count()}<br>UCs without geofence: ".($ucs->count() - $withGeo);
        }

        if (str_contains($q, 'tehsil') || str_contains($q, 'district') || str_contains($q, 'division')) {
            $secretaryCount = User::where('role', 'sec')
                ->whereHas('secretaryProfile.unionCouncil', fn ($qq) => $qq->where('tehsil_id', $tehsil->id))
                ->count();

            return '🏙️ <b>Your Jurisdiction</b><br>'.
                "Tehsil: {$tehsil->name}<br>District: ".($tehsil->district?->name ?? '—').
                '<br>Division: '.($tehsil->district?->division?->name ?? '—').
                "<br>Total UCs: {$ucs->count()}<br>Registered Secretaries: {$secretaryCount}";
        }

        if (str_contains($q, 'help') || str_contains($q, 'what can')) {
            return 'I can answer questions about:<br>🏛 UC list &amp; vacancies<br>📊 Attendance summary<br>⚖️ Divorce/Khula cases<br>'.
                '📋 Reports status<br>👤 Secretary profiles<br>📍 Geofence status<br>📰 Newsletters<br>🏙️ Tehsil/District info<br><br>'.
                'Just ask in plain English!';
        }

        return "I couldn't find a specific answer in your dashboard data. Try asking about: UCs, attendance, cases, reports, secretaries, or geofence. Type <b>help</b> for all topics.";
    }
}
