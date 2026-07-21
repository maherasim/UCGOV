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
use App\Support\Concerns\StylesExcelSheets;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Passkeys\Actions\GenerateVerificationOptions;
use Laravel\Passkeys\Actions\VerifyPasskey;
use Laravel\Passkeys\Support\WebAuthn;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AttendanceController extends Controller
{
    use StylesExcelSheets;

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

        // Best-effort fingerprint check — every secretary enrolls once at first
        // login, but a failed/skipped/unsupported scan on any given day must never
        // block attendance. GPS + the selfie photo below are what's actually required.
        $biometricVerified = false;
        $credential = $request->credential();
        $verificationOptions = $request->verificationOptions();
        if ($credential && $verificationOptions) {
            try {
                $verifyPasskey($credential, $verificationOptions, $user);
                $biometricVerified = true;
            } catch (\Throwable) {
                $biometricVerified = false;
            }
        }

        $distance = ($uc->lat && $uc->lng)
            ? $this->distanceMeters((float) $uc->lat, (float) $uc->lng, $request->float('lat'), $request->float('lng'))
            : null;
        $insideGeofence = $distance !== null && $distance <= $uc->geofence_radius;

        $now = Carbon::now();
        $status = $now->format('H:i') > '09:15' ? 'late' : 'present';
        $photoPath = $request->file('photo')->store('attendance-photos', 'public');

        $record = AttendanceRecord::create([
            'secretary_id' => $user->id,
            'union_council_id' => $uc->id,
            'attendance_date' => $today,
            'check_in_time' => $now->format('H:i:s'),
            'status' => $status,
            'inside_geofence' => $insideGeofence,
            'biometric_verified' => $biometricVerified,
            'lat' => $request->float('lat'),
            'lng' => $request->float('lng'),
            'distance_meters' => $distance,
            'photo_path' => $photoPath,
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

    /**
     * Accepts optional union_council_id/from/to filters — the same three the Excel
     * export takes, so the on-screen list and the exported file always agree.
     */
    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $base = AttendanceRecord::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId));

        $query = (clone $base)->with(['secretary', 'unionCouncil']);
        $this->applyAttendanceFilters($request, $query);

        $records = $query->latest('attendance_date')->take(500)->get();
        $today = Carbon::today()->toDateString();

        return AttendanceRecordResource::collection($records)->additional([
            'meta' => [
                'total' => (clone $base)->count(),
                'today' => (clone $base)->where('attendance_date', $today)->count(),
                'union_councils' => UnionCouncil::where('tehsil_id', $tehsilId)->count(),
                'filtered' => $records->count(),
            ],
        ]);
    }

    /**
     * Read-only, own-district view for DDLG — every UC across every tehsil in their
     * district, same filters/shape as the ADLG view.
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $base = AttendanceRecord::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId));

        $query = (clone $base)->with(['secretary', 'unionCouncil']);
        $this->applyAttendanceFilters($request, $query);

        $records = $query->latest('attendance_date')->take(500)->get();
        $today = Carbon::today()->toDateString();

        return AttendanceRecordResource::collection($records)->additional([
            'meta' => [
                'total' => (clone $base)->count(),
                'today' => (clone $base)->where('attendance_date', $today)->count(),
                'union_councils' => UnionCouncil::whereHas('tehsil', fn ($q) => $q->where('district_id', $districtId))->count(),
                'filtered' => $records->count(),
            ],
        ]);
    }

    protected function applyAttendanceFilters(Request $request, $query): void
    {
        if ($request->filled('union_council_id')) {
            $query->where('union_council_id', $request->integer('union_council_id'));
        }
        if ($request->filled('from')) {
            $query->where('attendance_date', '>=', $request->date('from')->toDateString());
        }
        if ($request->filled('to')) {
            $query->where('attendance_date', '<=', $request->date('to')->toDateString());
        }
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
     * Read-only, own-district view for DDLG.
     */
    public function movementIndexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $logs = MovementLog::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
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
     * Styled Excel workbook (not CSV) — a "UC Summary" sheet (per-UC present/absent for
     * the filtered period) plus an "Attendance Detail" sheet (one row per check-in, with
     * the secretary's selfie embedded and a clickable map link). Accepts the same
     * union_council_id/from/to filters as indexForAdlg so the file always matches
     * whatever the ADLG is looking at on screen.
     */
    public function analyticsExportForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $from = $request->filled('from') ? $request->date('from') : Carbon::today();
        $to = $request->filled('to') ? $request->date('to') : Carbon::today();

        $ucsQuery = UnionCouncil::where('tehsil_id', $tehsilId)->where('active', true);
        if ($request->filled('union_council_id')) {
            $ucsQuery->where('id', $request->integer('union_council_id'));
        }
        $ucs = $ucsQuery->orderBy('uc_no')->get();

        $records = AttendanceRecord::whereIn('union_council_id', $ucs->pluck('id'))
            ->whereBetween('attendance_date', [$from->toDateString(), $to->toDateString()])
            ->with(['secretary', 'unionCouncil'])
            ->orderBy('attendance_date')
            ->orderBy('check_in_time')
            ->get();

        $recordsByUc = $records->groupBy('union_council_id');

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('UC Governance Platform')->setTitle('Attendance Report');

        $this->buildAttendanceSummarySheet($spreadsheet->getActiveSheet(), $ucs, $recordsByUc, $from, $to, $request);
        $this->buildAttendanceDetailSheet($spreadsheet->createSheet(), $records);
        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'Attendance_'.$from->toDateString().'_to_'.$to->toDateString().'.xlsx';

        return $this->xlDownload($spreadsheet, $filename);
    }

    /**
     * Same styled workbook as analyticsExportForAdlg(), scoped to every UC across every
     * tehsil in the DDLG's district instead of a single tehsil.
     */
    public function analyticsExportForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $from = $request->filled('from') ? $request->date('from') : Carbon::today();
        $to = $request->filled('to') ? $request->date('to') : Carbon::today();

        $ucsQuery = UnionCouncil::whereHas('tehsil', fn ($q) => $q->where('district_id', $districtId))->where('active', true);
        if ($request->filled('union_council_id')) {
            $ucsQuery->where('id', $request->integer('union_council_id'));
        }
        $ucs = $ucsQuery->orderBy('uc_no')->get();

        $records = AttendanceRecord::whereIn('union_council_id', $ucs->pluck('id'))
            ->whereBetween('attendance_date', [$from->toDateString(), $to->toDateString()])
            ->with(['secretary', 'unionCouncil'])
            ->orderBy('attendance_date')
            ->orderBy('check_in_time')
            ->get();

        $recordsByUc = $records->groupBy('union_council_id');

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Attendance Report');

        $this->buildAttendanceSummarySheet($spreadsheet->getActiveSheet(), $ucs, $recordsByUc, $from, $to, $request);
        $this->buildAttendanceDetailSheet($spreadsheet->createSheet(), $records);
        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'Attendance_'.$from->toDateString().'_to_'.$to->toDateString().'.xlsx';

        return $this->xlDownload($spreadsheet, $filename);
    }

    protected function buildAttendanceSummarySheet(
        Worksheet $sheet,
        $ucs,
        $recordsByUc,
        Carbon $from,
        Carbon $to,
        Request $request
    ): void {
        $sheet->setTitle('UC Summary');

        $periodLabel = $from->isSameDay($to)
            ? 'Report date: '.$from->toFormattedDateString()
            : 'Report period: '.$from->toFormattedDateString().' → '.$to->toFormattedDateString();
        if ($request->filled('union_council_id') && $ucs->isNotEmpty()) {
            $periodLabel .= ' · UC filter: '.$ucs->first()->name;
        }
        $this->xlTitleBanner($sheet, 'UC Governance Platform — Attendance Summary', $periodLabel, 5);

        $headerRow = 4;
        foreach (['UC No', 'UC Name', 'Status', 'Marks in Period', 'Last Check-in'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:E{$headerRow}");

        $row = $headerRow + 1;
        $presentCount = 0;
        foreach ($ucs as $uc) {
            $ucRecords = $recordsByUc->get($uc->id, collect());
            $present = $ucRecords->isNotEmpty();
            if ($present) {
                $presentCount++;
            }
            $last = $ucRecords->last();

            $sheet->setCellValue("A{$row}", $uc->uc_no);
            $sheet->setCellValue("B{$row}", $uc->name);
            $this->xlStatusCell($sheet, "C{$row}", $present ? 'Present' : 'Absent', $present ? 'success' : 'danger');
            $sheet->setCellValue("D{$row}", $ucRecords->count());
            $sheet->setCellValue("E{$row}", $last ? "{$last->attendance_date->toDateString()} {$last->check_in_time}" : '—');

            $row++;
        }

        $totalUcs = $ucs->count();
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->mergeCells("A{$row}:B{$row}");
        $sheet->setCellValue("C{$row}", "{$presentCount} / {$totalUcs} present");
        $sheet->mergeCells("C{$row}:E{$row}");
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getTop()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        $this->xlAutoSize($sheet, ['A', 'B', 'C', 'D', 'E']);
        $this->xlBorderAndFilter($sheet, "A{$headerRow}:E{$headerRow}", "A{$headerRow}:E{$row}", freezeBelowHeader: false);
    }

    protected function buildAttendanceDetailSheet(Worksheet $sheet, $records): void
    {
        $sheet->setTitle('Attendance Detail');

        $headers = ['Date', 'Check-in', 'UC No', 'UC Name', 'Secretary', 'Status', 'Geofence', 'Distance (m)', 'Fingerprint', 'Map', 'Selfie'];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, ['A' => 12, 'B' => 10, 'C' => 8, 'D' => 22, 'E' => 22, 'F' => 10, 'G' => 10, 'H' => 12, 'I' => 12, 'J' => 12, 'K' => 14]);

        $row = 2;
        foreach ($records as $record) {
            $sheet->setCellValue("A{$row}", $record->attendance_date->toDateString());
            $sheet->setCellValue("B{$row}", $record->check_in_time);
            $sheet->setCellValue("C{$row}", $record->unionCouncil?->uc_no);
            $sheet->setCellValue("D{$row}", $record->unionCouncil?->name);
            $sheet->setCellValue("E{$row}", $record->secretary?->name);
            $this->xlStatusCell($sheet, "F{$row}", ucfirst($record->status), $record->status === 'present' ? 'success' : 'warning');
            $this->xlStatusCell($sheet, "G{$row}", $record->inside_geofence ? 'Inside' : 'Outside', $record->inside_geofence ? 'success' : 'danger');
            $sheet->setCellValue("H{$row}", $record->distance_meters);
            $this->xlStatusCell($sheet, "I{$row}", $record->biometric_verified ? 'Verified' : 'Not verified', $record->biometric_verified ? 'success' : 'neutral');

            if ($record->lat && $record->lng) {
                $this->xlHyperlink($sheet, "J{$row}", "https://maps.google.com/?q={$record->lat},{$record->lng}", 'View on map');
            }

            if ($record->photo_path && Storage::disk('public')->exists($record->photo_path)) {
                $this->xlEmbedImage($sheet, "K{$row}", Storage::disk('public')->path($record->photo_path), $row);
            }

            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }

    /**
     * A "Secretary Summary" sheet (movement counts + max distance per secretary — who's
     * leaving their UC most often) plus a "Movement Detail" sheet with reason- and
     * distance-severity-colored rows.
     */
    public function movementExportForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $logs = MovementLog::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['secretary', 'unionCouncil.tehsil'])
            ->latest('occurred_at')
            ->get();

        $logsBySecretary = $logs->groupBy('secretary_id');

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('UC Governance Platform')->setTitle('Movement Registry');

        $this->buildMovementSummarySheet($spreadsheet->getActiveSheet(), $logsBySecretary);
        $this->buildMovementDetailSheet($spreadsheet->createSheet(), $logs);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Movement_Registry_'.now()->toDateString().'.xlsx');
    }

    /**
     * Same styled workbook as movementExportForAdlg(), scoped to the DDLG's whole district.
     */
    public function movementExportForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $logs = MovementLog::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['secretary', 'unionCouncil.tehsil'])
            ->latest('occurred_at')
            ->get();

        $logsBySecretary = $logs->groupBy('secretary_id');

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Movement Registry');

        $this->buildMovementSummarySheet($spreadsheet->getActiveSheet(), $logsBySecretary);
        $this->buildMovementDetailSheet($spreadsheet->createSheet(), $logs);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Movement_Registry_'.now()->toDateString().'.xlsx');
    }

    protected function buildMovementSummarySheet(Worksheet $sheet, $logsBySecretary): void
    {
        $sheet->setTitle('Secretary Summary');
        $this->xlTitleBanner($sheet, 'UC Governance Platform — Movement Registry Summary', 'All logged out-of-office movements, all-time', 4);

        $headerRow = 4;
        foreach (['Secretary', 'Union Council', 'Movements Logged', 'Max Distance (m)'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:D{$headerRow}");

        $row = $headerRow + 1;
        foreach ($logsBySecretary as $secLogs) {
            $first = $secLogs->first();
            $maxDistance = $secLogs->max('distance_meters');

            $sheet->setCellValue("A{$row}", $first->secretary->name);
            $sheet->setCellValue("B{$row}", $first->unionCouncil->name);
            $sheet->setCellValue("C{$row}", $secLogs->count());
            $this->xlStatusCell($sheet, "D{$row}", (string) $maxDistance, $maxDistance > 1000 ? 'danger' : ($maxDistance > 300 ? 'warning' : 'success'));

            $row++;
        }

        $this->xlAutoSize($sheet, ['A', 'B', 'C', 'D']);
        $this->xlBorderAndFilter($sheet, "A{$headerRow}:D{$headerRow}", "A{$headerRow}:D".($row - 1), freezeBelowHeader: false);
    }

    protected function buildMovementDetailSheet(Worksheet $sheet, $logs): void
    {
        $sheet->setTitle('Movement Detail');

        $headers = ['Date', 'Time', 'Secretary', 'UC', 'Tehsil', 'Reason', 'Distance (m)', 'Details'];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, ['A' => 12, 'B' => 10, 'C' => 22, 'D' => 22, 'E' => 16, 'F' => 18, 'G' => 12, 'H' => 32]);

        $reasonTone = [
            'Court Hearing' => 'danger',
            'Field Visit' => 'info',
            'Tehsil Office Meeting' => 'warning',
            'Document Delivery' => 'success',
        ];

        $row = 2;
        foreach ($logs as $log) {
            $sheet->setCellValue("A{$row}", $log->occurred_at->toDateString());
            $sheet->setCellValue("B{$row}", $log->occurred_at->format('H:i'));
            $sheet->setCellValue("C{$row}", $log->secretary->name);
            $sheet->setCellValue("D{$row}", $log->unionCouncil->name);
            $sheet->setCellValue("E{$row}", $log->unionCouncil->tehsil?->name);
            $this->xlStatusCell($sheet, "F{$row}", $log->reason, $reasonTone[$log->reason] ?? 'neutral');
            $this->xlStatusCell($sheet, "G{$row}", (string) $log->distance_meters, $log->distance_meters > 1000 ? 'danger' : ($log->distance_meters > 300 ? 'warning' : 'success'));
            $sheet->setCellValue("H{$row}", $log->details);

            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }
}
