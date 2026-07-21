<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDailyReportRequest;
use App\Http\Resources\DailyReportResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\DailyReport;
use App\Support\Concerns\StylesExcelSheets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DailyReportController extends Controller
{
    use StylesExcelSheets;

    public function store(StoreDailyReportRequest $request)
    {
        $user = $request->user();
        $uc = $user->secretaryProfile->unionCouncil;

        $attachmentPath = $request->hasFile('attachment')
            ? $request->file('attachment')->store('daily-reports', 'public')
            : null;

        $customFields = collect($request->input('custom_fields', []))
            ->filter(fn ($f) => filled($f['label'] ?? null))
            ->map(fn ($f) => ['label' => $f['label'], 'value' => $f['value'] ?? ''])
            ->values()
            ->all();

        $report = DailyReport::create([
            'secretary_id' => $user->id,
            'union_council_id' => $uc->id,
            'report_date' => now()->toDateString(),
            'remarks' => $request->string('remarks')->toString(),
            'nikah_count' => $request->integer('nikah_count'),
            'birth_count' => $request->integer('birth_count'),
            'death_count' => $request->integer('death_count'),
            'complaint_count' => $request->integer('complaint_count'),
            'custom_fields' => $customFields ?: null,
            'attachment_path' => $attachmentPath,
            'reviewed' => false,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'REPORT_SUBMITTED',
            'entity_type' => 'DailyReport',
            'entity_id' => $report->id,
            'note' => "Daily report submitted by {$user->name}",
        ]);

        $adlgId = optional($uc->tehsil->adlgProfiles()->first())->user_id;
        if ($adlgId) {
            CaseNotification::create([
                'to_user_id' => $adlgId,
                'from_user_id' => $user->id,
                'type' => 'REPORT_SUBMITTED',
                'message' => "{$user->name} submitted today's daily report for {$uc->name}.",
            ]);
        }

        return new DailyReportResource($report->load(['secretary', 'unionCouncil']));
    }

    public function myHistory(Request $request)
    {
        $reports = DailyReport::where('secretary_id', $request->user()->id)
            ->latest('report_date')
            ->take(30)
            ->get();

        return DailyReportResource::collection($reports);
    }

    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $reports = DailyReport::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['secretary', 'unionCouncil'])
            ->latest('report_date')
            ->take(200)
            ->get();

        return DailyReportResource::collection($reports);
    }

    /**
     * Read-only, own-district view for DDLG — every report across every tehsil/UC in
     * their district.
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $reports = DailyReport::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['secretary', 'unionCouncil'])
            ->latest('report_date')
            ->take(200)
            ->get();

        return DailyReportResource::collection($reports);
    }

    public function markReviewed(Request $request, DailyReport $report)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        abort_unless($report->unionCouncil->tehsil_id === $tehsilId, 403);

        $report->update(['reviewed' => true, 'reviewed_at' => now()]);

        return new DailyReportResource($report->load(['secretary', 'unionCouncil']));
    }

    /**
     * Two sheets: a "Reports Summary" (per-UC activity totals plus reviewed/pending
     * counts, color-coded to match the on-screen status badges) and a "Report Detail"
     * sheet — one row per submission, with a clickable link to the attachment when one
     * was uploaded. Scoped to the ADLG's own tehsil, same as the on-screen list.
     */
    public function export(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $reports = DailyReport::whereHas('unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with(['secretary', 'unionCouncil'])
            ->orderByDesc('report_date')
            ->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Daily Reports');

        $this->buildReportsSummarySheet($spreadsheet->getActiveSheet(), $reports);
        $this->buildReportsDetailSheet($spreadsheet->createSheet(), $reports);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Daily_Reports_'.now()->toDateString().'.xlsx');
    }

    /**
     * Same styled workbook as export(), scoped to the DDLG's whole district.
     */
    public function exportForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $reports = DailyReport::whereHas('unionCouncil.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['secretary', 'unionCouncil'])
            ->orderByDesc('report_date')
            ->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Daily Reports');

        $this->buildReportsSummarySheet($spreadsheet->getActiveSheet(), $reports);
        $this->buildReportsDetailSheet($spreadsheet->createSheet(), $reports);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Daily_Reports_'.now()->toDateString().'.xlsx');
    }

    protected function buildReportsSummarySheet(Worksheet $sheet, $reports): void
    {
        $sheet->setTitle('Reports Summary');

        $this->xlTitleBanner($sheet, 'Union Council Management System — Daily Reports Summary', 'Activity totals by Union Council', 5);

        $headerRow = 4;
        foreach (['Union Council', 'Nikah', 'Birth', 'Death', 'Complaints'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:E{$headerRow}");

        $byUc = $reports->groupBy('union_council_id');
        $row = $headerRow + 1;
        foreach ($byUc as $ucReports) {
            $sheet->setCellValue("A{$row}", $ucReports->first()->unionCouncil->name);
            $sheet->setCellValue("B{$row}", $ucReports->sum('nikah_count'));
            $sheet->setCellValue("C{$row}", $ucReports->sum('birth_count'));
            $sheet->setCellValue("D{$row}", $ucReports->sum('death_count'));
            $sheet->setCellValue("E{$row}", $ucReports->sum('complaint_count'));
            $row++;
        }
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->setCellValue("B{$row}", $reports->sum('nikah_count'));
        $sheet->setCellValue("C{$row}", $reports->sum('birth_count'));
        $sheet->setCellValue("D{$row}", $reports->sum('death_count'));
        $sheet->setCellValue("E{$row}", $reports->sum('complaint_count'));
        $sheet->getStyle("A{$row}:E{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getTop()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);
        $this->xlAutoSize($sheet, ['A', 'B', 'C', 'D', 'E']);
        $this->xlBorderAndFilter($sheet, "A{$headerRow}:E{$headerRow}", "A{$headerRow}:E".($row - 1), freezeBelowHeader: false);

        // Second block: reviewed vs pending, a few rows below.
        $statusHeaderRow = $row + 3;
        foreach (['Status', 'Reports'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $statusHeaderRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$statusHeaderRow}:B{$statusHeaderRow}");
        $reviewed = $reports->where('reviewed', true)->count();
        $pending = $reports->where('reviewed', false)->count();
        $sheet->setCellValue("A".($statusHeaderRow + 1), 'Reviewed');
        $this->xlStatusCell($sheet, "B".($statusHeaderRow + 1), (string) $reviewed, 'success');
        $sheet->setCellValue("A".($statusHeaderRow + 2), 'Pending');
        $this->xlStatusCell($sheet, "B".($statusHeaderRow + 2), (string) $pending, 'warning');
        $this->xlBorderAndFilter($sheet, "A{$statusHeaderRow}:B{$statusHeaderRow}", "A{$statusHeaderRow}:B".($statusHeaderRow + 2), freezeBelowHeader: false);
    }

    protected function buildReportsDetailSheet(Worksheet $sheet, $reports): void
    {
        $sheet->setTitle('Report Detail');

        $headers = ['Date', 'Secretary', 'Union Council', 'Nikah', 'Birth', 'Death', 'Complaints', 'Status', 'Reviewed At', 'Remarks', 'Custom Fields', 'Attachment'];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, [
            'A' => 12, 'B' => 20, 'C' => 18, 'D' => 9, 'E' => 9, 'F' => 9, 'G' => 12,
            'H' => 12, 'I' => 16, 'J' => 30, 'K' => 30, 'L' => 18,
        ]);

        $row = 2;
        foreach ($reports as $r) {
            $sheet->setCellValue("A{$row}", $r->report_date?->toDateString());
            $sheet->setCellValue("B{$row}", $r->secretary?->name);
            $sheet->setCellValue("C{$row}", $r->unionCouncil?->name);
            $sheet->setCellValue("D{$row}", $r->nikah_count);
            $sheet->setCellValue("E{$row}", $r->birth_count);
            $sheet->setCellValue("F{$row}", $r->death_count);
            $sheet->setCellValue("G{$row}", $r->complaint_count);
            $this->xlStatusCell($sheet, "H{$row}", $r->reviewed ? 'Reviewed' : 'Pending', $r->reviewed ? 'success' : 'warning');
            $sheet->setCellValue("I{$row}", $r->reviewed_at?->format('Y-m-d H:i'));
            $sheet->setCellValue("J{$row}", $r->remarks);
            $sheet->setCellValue("K{$row}", collect($r->custom_fields ?? [])
                ->map(fn ($f) => "{$f['label']}: {$f['value']}")
                ->implode('; ') ?: '—');

            if ($r->attachment_path) {
                $this->xlHyperlink($sheet, "L{$row}", Storage::disk('public')->url($r->attachment_path), 'View attachment');
            } else {
                $sheet->setCellValue("L{$row}", '—');
            }

            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }
}
