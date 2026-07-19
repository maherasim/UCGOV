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
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Passkeys\Actions\GenerateVerificationOptions;
use Laravel\Passkeys\Actions\VerifyPasskey;
use Laravel\Passkeys\Support\WebAuthn;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

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

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
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

        $sheet->setCellValue('A1', 'UC GOVERNANCE PLATFORM — ATTENDANCE SUMMARY');
        $sheet->mergeCells('A1:E1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('0B6D3A');

        $periodLabel = $from->isSameDay($to)
            ? 'Report date: '.$from->toFormattedDateString()
            : 'Report period: '.$from->toFormattedDateString().' → '.$to->toFormattedDateString();
        if ($request->filled('union_council_id') && $ucs->isNotEmpty()) {
            $periodLabel .= ' · UC filter: '.$ucs->first()->name;
        }
        $sheet->setCellValue('A2', $periodLabel);
        $sheet->mergeCells('A2:E2');
        $sheet->getStyle('A2')->getFont()->setItalic(true)->setSize(10)->getColor()->setRGB('52616B');

        $headerRow = 4;
        foreach (['UC No', 'UC Name', 'Status', 'Marks in Period', 'Last Check-in'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->styleHeaderRow($sheet, "A{$headerRow}:E{$headerRow}");

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
            $sheet->setCellValue("C{$row}", $present ? 'Present' : 'Absent');
            $sheet->setCellValue("D{$row}", $ucRecords->count());
            $sheet->setCellValue("E{$row}", $last ? "{$last->attendance_date->toDateString()} {$last->check_in_time}" : '—');

            $fill = $present ? 'E7F3EC' : 'FEE2E2';
            $font = $present ? '0B6D3A' : 'DC2626';
            $sheet->getStyle("C{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($fill);
            $sheet->getStyle("C{$row}")->getFont()->setBold(true)->getColor()->setRGB($font);

            $row++;
        }

        $totalUcs = $ucs->count();
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->mergeCells("A{$row}:B{$row}");
        $sheet->setCellValue("C{$row}", "{$presentCount} / {$totalUcs} present");
        $sheet->mergeCells("C{$row}:E{$row}");
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_THIN);

        foreach (['A', 'B', 'C', 'D', 'E'] as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        $sheet->getStyle("A{$headerRow}:E{$row}")->getBorders()->getAllBorders()
            ->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E2E8E4');
    }

    protected function buildAttendanceDetailSheet(Worksheet $sheet, $records): void
    {
        $sheet->setTitle('Attendance Detail');

        $headers = ['Date', 'Check-in', 'UC No', 'UC Name', 'Secretary', 'Status', 'Geofence', 'Distance (m)', 'Fingerprint', 'Map', 'Selfie'];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = chr(64 + count($headers)); // 'K' for 11 headers
        $this->styleHeaderRow($sheet, "A1:{$lastCol}1");

        foreach (['A' => 12, 'B' => 10, 'C' => 8, 'D' => 22, 'E' => 22, 'F' => 10, 'G' => 10, 'H' => 12, 'I' => 12, 'J' => 12, 'K' => 14] as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $row = 2;
        foreach ($records as $record) {
            $sheet->setCellValue("A{$row}", $record->attendance_date->toDateString());
            $sheet->setCellValue("B{$row}", $record->check_in_time);
            $sheet->setCellValue("C{$row}", $record->unionCouncil?->uc_no);
            $sheet->setCellValue("D{$row}", $record->unionCouncil?->name);
            $sheet->setCellValue("E{$row}", $record->secretary?->name);
            $sheet->setCellValue("F{$row}", ucfirst($record->status));
            $sheet->setCellValue("G{$row}", $record->inside_geofence ? 'Inside' : 'Outside');
            $sheet->setCellValue("H{$row}", $record->distance_meters);
            $sheet->setCellValue("I{$row}", $record->biometric_verified ? 'Verified' : 'Not verified');
            $sheet->getStyle("G{$row}")->getFont()->getColor()->setRGB($record->inside_geofence ? '0B6D3A' : 'DC2626');
            $sheet->getStyle("I{$row}")->getFont()->getColor()->setRGB($record->biometric_verified ? '0B6D3A' : '94A3A0');

            if ($record->lat && $record->lng) {
                $sheet->setCellValue("J{$row}", 'View on map');
                $sheet->getCell("J{$row}")->getHyperlink()->setUrl("https://maps.google.com/?q={$record->lat},{$record->lng}");
                $sheet->getStyle("J{$row}")->getFont()->setUnderline(true)->getColor()->setRGB('2563EB');
            }

            if ($record->photo_path && Storage::disk('public')->exists($record->photo_path)) {
                $sheet->getRowDimension($row)->setRowHeight(54);
                $drawing = new Drawing;
                $drawing->setPath(Storage::disk('public')->path($record->photo_path));
                $drawing->setHeight(50);
                $drawing->setOffsetX(4);
                $drawing->setOffsetY(2);
                $drawing->setCoordinates("K{$row}");
                $drawing->setWorksheet($sheet);
            }

            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $sheet->setAutoFilter("A1:{$lastCol}{$lastRow}");
            $sheet->getStyle("A1:{$lastCol}{$lastRow}")->getBorders()->getAllBorders()
                ->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E2E8E4');
        }
        $sheet->freezePane('A2');
    }

    protected function styleHeaderRow(Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0B6D3A');
        $sheet->getStyle($range)->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle($range)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);
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
