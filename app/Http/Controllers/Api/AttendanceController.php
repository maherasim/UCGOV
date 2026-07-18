<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LogMovementRequest;
use App\Http\Requests\Api\MarkAttendanceRequest;
use App\Http\Requests\Api\UpdateLiveLocationRequest;
use App\Http\Resources\AttendanceRecordResource;
use App\Http\Resources\MovementLogResource;
use App\Models\AttendanceRecord;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\MovementLog;
use App\Models\SecretaryProfile;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Laravel\Passkeys\Actions\GenerateVerificationOptions;
use Laravel\Passkeys\Actions\VerifyPasskey;
use Laravel\Passkeys\Support\WebAuthn;

class AttendanceController extends Controller
{
    /**
     * Haversine great-circle distance in meters — same formula the prototype used client-side.
     */
    protected function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): int
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return (int) round($earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a)));
    }

    /**
     * Verification challenge for the mark-in ceremony — scoped to the secretary's own
     * enrolled credential(s) so only their fingerprint/Face ID can satisfy it.
     */
    public function webauthnOptions(Request $request, GenerateVerificationOptions $generate)
    {
        $user = $request->user();

        if (! $user->hasPasskeysEnabled()) {
            throw ValidationException::withMessages([
                'credential' => 'No fingerprint is enrolled on this account. Please contact your ADLG.',
            ]);
        }

        $options = $generate($user);
        $request->session()->put('passkey.verification_options', WebAuthn::toJson($options));

        return response()->json(['options' => WebAuthn::toBrowserArray($options)]);
    }

    public function markIn(MarkAttendanceRequest $request, VerifyPasskey $verifyPasskey)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;
        $today = Carbon::today()->toDateString();

        if (AttendanceRecord::where('secretary_id', $user->id)->where('attendance_date', $today)->exists()) {
            throw ValidationException::withMessages(['lat' => 'Attendance already marked for today.']);
        }

        // Verifies the WebAuthn assertion against this secretary's own enrolled
        // credential — throws (422) if the fingerprint doesn't match, is stale, or
        // was replayed. Nothing below runs unless this genuinely succeeds.
        $verifyPasskey($request->credential(), $request->verificationOptions(), $user);

        $distance = ($uc->lat && $uc->lng)
            ? $this->distanceMeters((float) $uc->lat, (float) $uc->lng, $request->float('lat'), $request->float('lng'))
            : null;
        $insideGeofence = $distance !== null && $distance <= $uc->geofence_radius;

        $now = Carbon::now();
        $status = $now->format('H:i') > '09:15' ? 'late' : 'present';

        $record = AttendanceRecord::create([
            'secretary_id' => $user->id,
            'union_council_id' => $uc->id,
            'attendance_date' => $today,
            'check_in_time' => $now->format('H:i:s'),
            'status' => $status,
            'inside_geofence' => $insideGeofence,
            'biometric_verified' => true,
            'lat' => $request->float('lat'),
            'lng' => $request->float('lng'),
            'distance_meters' => $distance,
            'device_gmail' => $user->email,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'ATTENDANCE_MARKED',
            'entity_type' => 'AttendanceRecord',
            'entity_id' => $record->id,
            'note' => "{$user->name} marked attendance ({$status}, " . ($insideGeofence ? 'inside' : 'outside') . ' geofence)',
        ]);

        $this->markCrossUcAttendance($user, $uc);

        return new AttendanceRecordResource($record->load(['secretary', 'unionCouncil']));
    }

    /**
     * A secretary holding "additional charge" of other UCs (see SecretaryController) doesn't
     * check in separately at each one — marking attendance at their primary UC auto-logs a
     * covering remark on every additional-charge UC too. Ported from the prototype's
     * markCrossUCAttendance / Feature 3.
     */
    protected function markCrossUcAttendance(User $user, UnionCouncil $primaryUc): void
    {
        $charges = $user->secretaryProfile->additionalCharges()->with('unionCouncil')->get();
        if ($charges->isEmpty()) {
            return;
        }

        $adlg = User::where('role', 'adlg')
            ->whereHas('adlgProfile', fn ($q) => $q->where('tehsil_id', $primaryUc->tehsil_id))
            ->first();

        foreach ($charges as $charge) {
            $chargedUc = $charge->unionCouncil;
            if (! $chargedUc) {
                continue;
            }

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'CROSS_UC_ATTENDANCE',
                'entity_type' => 'UnionCouncil',
                'entity_id' => $chargedUc->id,
                'note' => "Attendance submitted in UC {$primaryUc->name} (Additional charge)",
            ]);

            if ($adlg) {
                CaseNotification::create([
                    'to_user_id' => $adlg->id,
                    'from_user_id' => $user->id,
                    'type' => 'CROSS_ATT',
                    'message' => "📍 {$user->name} marked attendance in {$primaryUc->name}. Auto-remark added to UC {$chargedUc->name}.",
                ]);
            }
        }
    }

    public function myHistory(Request $request)
    {
        $records = AttendanceRecord::where('secretary_id', $request->user()->id)
            ->with('unionCouncil')
            ->latest('attendance_date')
            ->take(30)
            ->get();

        return AttendanceRecordResource::collection($records);
    }

    public function logMovement(LogMovementRequest $request)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;

        $distance = ($uc->lat && $uc->lng && $request->filled('lat') && $request->filled('lng'))
            ? $this->distanceMeters((float) $uc->lat, (float) $uc->lng, $request->float('lat'), $request->float('lng'))
            : 0;

        $log = MovementLog::create([
            'secretary_id' => $user->id,
            'union_council_id' => $uc->id,
            'reason' => $request->string('reason')->toString(),
            'details' => $request->input('details'),
            'distance_meters' => $distance,
            'occurred_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'MOVEMENT_LOGGED',
            'entity_type' => 'MovementLog',
            'entity_id' => $log->id,
            'note' => "{$user->name} logged movement ({$request->string('reason')})",
        ]);

        return new MovementLogResource($log->load(['secretary', 'unionCouncil']));
    }

    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $records = AttendanceRecord::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['secretary', 'unionCouncil'])
            ->latest('attendance_date')
            ->take(200)
            ->get();

        return AttendanceRecordResource::collection($records);
    }

    public function movementIndexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $logs = MovementLog::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['secretary', 'unionCouncil'])
            ->latest('occurred_at')
            ->take(200)
            ->get();

        return MovementLogResource::collection($logs);
    }

    /**
     * Secretary-side location ping, sent periodically while the Attendance page is open
     * during working hours. Mirrors the prototype's watchPosition callback: stores the
     * latest position for the ADLG's live map and reports whether the secretary has
     * stepped outside their UC's geofence, so the frontend can prompt for a movement reason.
     */
    public function updateLiveLocation(UpdateLiveLocationRequest $request)
    {
        $user = $request->user();
        $profile = $user->secretaryProfile;
        $uc = $profile->unionCouncil;

        $profile->update([
            'live_lat' => $request->float('lat'),
            'live_lng' => $request->float('lng'),
            'live_accuracy_meters' => $request->input('accuracy'),
            'live_updated_at' => now(),
        ]);

        $distance = ($uc && $uc->lat && $uc->lng)
            ? $this->distanceMeters((float) $uc->lat, (float) $uc->lng, $request->float('lat'), $request->float('lng'))
            : null;
        $insideGeofence = $distance === null || $distance <= $uc->geofence_radius;

        return response()->json([
            'inside_geofence' => $insideGeofence,
            'distance_meters' => $distance,
        ]);
    }

    /**
     * ADLG-side live map feed — the prototype plots these as a simple relative scatter
     * (min/max lat/lng normalised to a percentage grid), not a real map tile layer, so this
     * just returns raw coordinates plus a "fresh" flag (updated in the last 5 minutes).
     */
    public function liveLocations(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $profiles = SecretaryProfile::whereNotNull('live_updated_at')
            ->whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['user', 'unionCouncil'])
            ->get();

        $now = now();

        return response()->json([
            'data' => $profiles->map(fn (SecretaryProfile $p) => [
                'secretary_id' => $p->user_id,
                'name' => $p->user->name,
                'union_council_id' => $p->union_council_id,
                'union_council' => $p->unionCouncil?->name,
                'lat' => (float) $p->live_lat,
                'lng' => (float) $p->live_lng,
                'accuracy_meters' => $p->live_accuracy_meters,
                'last_seen_at' => $p->live_updated_at,
                'fresh' => $p->live_updated_at->diffInMinutes($now) < 5,
            ])->values(),
        ]);
    }

    /**
     * Per-UC attendance snapshot for today — one row per UC in the ADLG's tehsil, whether or
     * not that UC's secretary checked in. Mirrors the prototype's 10AM popup export.
     */
    public function analyticsExportForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        $today = Carbon::today()->toDateString();

        $ucs = UnionCouncil::where('tehsil_id', $tehsilId)->where('active', true)->orderBy('uc_no')->get();

        $todayRecords = AttendanceRecord::whereIn('union_council_id', $ucs->pluck('id'))
            ->where('attendance_date', $today)
            ->with('secretary')
            ->get()
            ->keyBy('union_council_id');

        $rows = ['UC No,UC Name,Secretary,Check-in Time,Status,Geofence,Biometric,GPS Lat,GPS Lng'];
        foreach ($ucs as $uc) {
            $rec = $todayRecords->get($uc->id);
            $rows[] = implode(',', [
                $uc->uc_no,
                '"'.str_replace('"', '""', $uc->name).'"',
                $rec ? '"'.str_replace('"', '""', $rec->secretary->name).'"' : 'Absent',
                $rec ? $rec->check_in_time : '---',
                $rec ? $rec->status : 'Absent',
                $rec ? ($rec->inside_geofence ? 'Inside' : 'Outside') : 'N/A',
                $rec ? ($rec->biometric_verified ? 'Yes' : 'No') : 'N/A',
                $rec ? $rec->lat : '',
                $rec ? $rec->lng : '',
            ]);
        }

        $present = $todayRecords->count();
        $insideGeofence = $todayRecords->filter(fn ($r) => $r->inside_geofence)->count();
        $rows[] = '';
        $rows[] = 'SUMMARY';
        $rows[] = 'Total UCs,'.$ucs->count();
        $rows[] = 'Present,'.$present;
        $rows[] = 'Absent,'.($ucs->count() - $present);
        $rows[] = 'Inside Geofence,'.$insideGeofence;
        $rows[] = 'Outside Geofence,'.($present - $insideGeofence);
        $rows[] = 'Attendance Rate,'.($ucs->count() ? round($present / $ucs->count() * 100) : 0).'%';

        $csv = implode("\n", $rows);
        $filename = 'Attendance_Analytics_'.$today.'.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function movementExportForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $logs = MovementLog::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['secretary', 'unionCouncil.tehsil'])
            ->latest('occurred_at')
            ->get();

        $rows = ['Date,Time,Secretary,UC,Tehsil,Distance (m),Reason,Details'];
        foreach ($logs as $log) {
            $rows[] = implode(',', [
                $log->occurred_at->toDateString(),
                $log->occurred_at->format('H:i:s'),
                '"'.str_replace('"', '""', $log->secretary->name).'"',
                '"'.str_replace('"', '""', $log->unionCouncil->name).'"',
                '"'.($log->unionCouncil->tehsil?->name ?? '').'"',
                $log->distance_meters,
                '"'.str_replace('"', '""', $log->reason).'"',
                '"'.str_replace('"', '""', $log->details ?? '').'"',
            ]);
        }

        $csv = implode("\n", $rows);
        $filename = 'Movement_Registry_'.now()->toDateString().'.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
