<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Support\Concerns\StylesExcelSheets;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class AuditLogController extends Controller
{
    use StylesExcelSheets;

    public function index(Request $request)
    {
        $query = AuditLog::with('user')->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%");
            });
        }

        return AuditLogResource::collection($query->paginate(30));
    }

    /**
     * An "Activity Overview" sheet (top actions + most active users) plus the full
     * "Audit Log" detail, action rows colored the same way the on-screen
     * ActivityTimeline icons are (create/reactivate=green, update=blue,
     * delete/deactivate=red, password/newsletter=amber).
     */
    public function export(Request $request)
    {
        $query = AuditLog::with('user')->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('note', 'like', "%{$search}%");
            });
        }

        $logs = $query->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('UC Governance Platform')->setTitle('Audit Log Report');

        $this->buildAuditOverviewSheet($spreadsheet->getActiveSheet(), $logs, $request);
        $this->buildAuditDetailSheet($spreadsheet->createSheet(), $logs);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Audit_Log_'.now()->toDateString().'.xlsx');
    }

    protected function actionTone(string $action): string
    {
        return match (true) {
            str_contains($action, 'DEACTIVATED'), str_contains($action, 'DELETED'),
            str_contains($action, 'REJECTED'), str_contains($action, 'REMOVED') => 'danger',

            str_contains($action, 'CREATED'), str_contains($action, 'REGISTERED'), str_contains($action, 'APPROVED'),
            str_contains($action, 'REACTIVATED'), str_contains($action, 'ENROLLED'), str_contains($action, 'COMPLETED'),
            str_contains($action, 'CONSTITUTED'), str_contains($action, 'PASSED'), str_contains($action, 'PUBLISHED') => 'success',

            str_contains($action, 'UPDATED'), str_contains($action, 'EDITED'), str_contains($action, 'VIEW'),
            str_contains($action, 'DOWNLOAD'), str_contains($action, 'SEEN'), str_contains($action, 'BOOKMARK') => 'info',

            str_contains($action, 'PASSWORD'), str_contains($action, 'ISSUED'),
            str_contains($action, 'CHARGE'), str_contains($action, 'ACK') => 'warning',

            default => 'neutral',
        };
    }

    protected function buildAuditOverviewSheet(Worksheet $sheet, $logs, Request $request): void
    {
        $sheet->setTitle('Activity Overview');

        $subtitle = 'Total events: '.$logs->count().($request->filled('search') ? ' · Search: "'.$request->string('search').'"' : '');
        $this->xlTitleBanner($sheet, 'UC Governance Platform — Audit Log Overview', $subtitle, 3);

        $headerRow = 4;
        foreach (['Action', 'Count', 'Share'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:C{$headerRow}");

        $total = $logs->count();
        $byAction = $logs->countBy('action')->sortDesc()->take(15);
        $row = $headerRow + 1;
        foreach ($byAction as $action => $count) {
            $sheet->setCellValue("A{$row}", $action);
            $this->xlStatusCell($sheet, "B{$row}", (string) $count, $this->actionTone($action));
            $sheet->setCellValue("C{$row}", $total ? round($count / $total * 100).'%' : '0%');
            $row++;
        }
        $this->xlAutoSize($sheet, ['A', 'B', 'C']);
        $this->xlBorderAndFilter($sheet, "A{$headerRow}:C{$headerRow}", "A{$headerRow}:C".($row - 1), freezeBelowHeader: false);

        // Second block: most active users.
        $userHeaderRow = $row + 3;
        foreach (['User', 'Events Logged'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $userHeaderRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$userHeaderRow}:B{$userHeaderRow}");

        $byUser = $logs->groupBy(fn ($l) => $l->user?->name ?? 'System')->sortByDesc(fn ($g) => $g->count())->take(10);
        $r = $userHeaderRow + 1;
        foreach ($byUser as $userName => $userLogs) {
            $sheet->setCellValue("A{$r}", $userName);
            $sheet->setCellValue("B{$r}", $userLogs->count());
            $r++;
        }
        if ($r > $userHeaderRow + 1) {
            $this->xlBorderAndFilter($sheet, "A{$userHeaderRow}:B{$userHeaderRow}", "A{$userHeaderRow}:B".($r - 1), freezeBelowHeader: false);
        }
    }

    protected function buildAuditDetailSheet(Worksheet $sheet, $logs): void
    {
        $sheet->setTitle('Audit Log');

        $headers = ['Date', 'Time', 'User', 'Action', 'Entity Type', 'Entity ID', 'Note'];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, ['A' => 12, 'B' => 10, 'C' => 22, 'D' => 22, 'E' => 16, 'F' => 10, 'G' => 44]);

        $row = 2;
        foreach ($logs as $log) {
            $sheet->setCellValue("A{$row}", $log->created_at->toDateString());
            $sheet->setCellValue("B{$row}", $log->created_at->format('H:i:s'));
            $sheet->setCellValue("C{$row}", $log->user?->name ?? 'System');
            $this->xlStatusCell($sheet, "D{$row}", $log->action, $this->actionTone($log->action));
            $sheet->setCellValue("E{$row}", $log->entity_type);
            $sheet->setCellValue("F{$row}", $log->entity_id);
            $sheet->setCellValue("G{$row}", $log->note);
            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }
}
