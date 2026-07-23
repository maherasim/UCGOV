<?php

namespace App\Support\Concerns;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * One consistent visual language for every Excel export in the platform — the same
 * brand header color and the same status-tone palette the app's own <Badge> component
 * uses (success/warning/danger/info), so a report reads as one system whether it's
 * Attendance, LBR, Divorce/Khula cases, or the Audit Log.
 */
trait StylesExcelSheets
{
    protected const XL_PRIMARY = '5F40F5';

    protected const XL_PRIMARY_BG = 'EEF0FF';

    protected const XL_SUCCESS = '16A34A';

    protected const XL_SUCCESS_BG = 'DCFCE7';

    protected const XL_DANGER = 'DC2626';

    protected const XL_DANGER_BG = 'FEE2E2';

    protected const XL_WARNING = 'A9871E';

    protected const XL_WARNING_BG = 'FBF3DC';

    protected const XL_INFO = '2563EB';

    protected const XL_INFO_BG = 'DBEAFE';

    protected const XL_MUTED = '52616B';

    protected const XL_BORDER = 'E2E8E4';

    protected function xlTitleBanner(Worksheet $sheet, string $title, ?string $subtitle, int $columnSpan): void
    {
        $lastCol = $this->xlColumnLetter($columnSpan);
        $sheet->setCellValue('A1', mb_strtoupper($title));
        $sheet->mergeCells("A1:{$lastCol}1");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB(self::XL_PRIMARY);

        if ($subtitle) {
            $sheet->setCellValue('A2', $subtitle);
            $sheet->mergeCells("A2:{$lastCol}2");
            $sheet->getStyle('A2')->getFont()->setItalic(true)->setSize(10)->getColor()->setRGB(self::XL_MUTED);
        }
    }

    protected function xlHeaderRow(Worksheet $sheet, string $range, ?string $bg = null): void
    {
        $sheet->getStyle($range)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($bg ?? self::XL_PRIMARY);
        $sheet->getStyle($range)->getFont()->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle($range)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER)
            ->setWrapText(true);
    }

    /** tone: success | danger | warning | info | neutral */
    protected function xlStatusCell(Worksheet $sheet, string $coord, string $label, string $tone = 'neutral'): void
    {
        [$bg, $font] = match ($tone) {
            'success' => [self::XL_SUCCESS_BG, self::XL_SUCCESS],
            'danger' => [self::XL_DANGER_BG, self::XL_DANGER],
            'warning' => [self::XL_WARNING_BG, self::XL_WARNING],
            'info' => [self::XL_INFO_BG, self::XL_INFO],
            default => ['F5F7F6', self::XL_MUTED],
        };

        $sheet->setCellValue($coord, $label);
        $sheet->getStyle($coord)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($bg);
        $sheet->getStyle($coord)->getFont()->setBold(true)->getColor()->setRGB($font);
    }

    protected function xlHyperlink(Worksheet $sheet, string $coord, string $url, string $label): void
    {
        $sheet->setCellValue($coord, $label);
        $sheet->getCell($coord)->getHyperlink()->setUrl($url);
        $sheet->getStyle($coord)->getFont()->setUnderline(true)->getColor()->setRGB(self::XL_INFO);
    }

    protected function xlEmbedImage(Worksheet $sheet, string $coord, string $absolutePath, int $row, int $height = 50): void
    {
        $sheet->getRowDimension($row)->setRowHeight($height + 4);
        $drawing = new Drawing;
        $drawing->setPath($absolutePath);
        $drawing->setHeight($height);
        $drawing->setOffsetX(4);
        $drawing->setOffsetY(2);
        $drawing->setCoordinates($coord);
        $drawing->setWorksheet($sheet);
    }

    protected function xlBorderAndFilter(Worksheet $sheet, string $headerRange, string $fullRange, bool $freezeBelowHeader = true): void
    {
        $sheet->getStyle($fullRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB(self::XL_BORDER);
        $sheet->setAutoFilter($headerRange);
        if ($freezeBelowHeader) {
            $sheet->freezePane('A2');
        }
    }

    protected function xlAutoSize(Worksheet $sheet, array $columns): void
    {
        foreach ($columns as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
    }

    protected function xlColumnWidths(Worksheet $sheet, array $widths): void
    {
        foreach ($widths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }
    }

    protected function xlColumnLetter(int $oneBasedIndex): string
    {
        return Coordinate::stringFromColumnIndex($oneBasedIndex);
    }

    protected function xlDownload(Spreadsheet $spreadsheet, string $filename)
    {
        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
