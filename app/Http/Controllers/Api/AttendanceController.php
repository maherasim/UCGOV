<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LogMovementRequest;
use App\Http\Requests\Api\MarkAttendanceRequest;
use App\Http\Resources\AttendanceRecordResource;
use App\Http\Resources\MovementLogResource;
use App\Models\AttendanceRecord;
use App\Models\AuditLog;
use App\Models\MovementLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

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

    public function markIn(MarkAttendanceRequest $request)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;
        $today = Carbon::today()->toDateString();

        if (AttendanceRecord::where('secretary_id', $user->id)->where('attendance_date', $today)->exists()) {
            throw ValidationException::withMessages(['lat' => 'Attendance already marked for today.']);
        }

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

        return new AttendanceRecordResource($record->load(['secretary', 'unionCouncil']));
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
}
