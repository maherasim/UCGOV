<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDklicDocumentRequest;
use App\Http\Resources\DklicDocumentResource;
use App\Models\AuditLog;
use App\Models\DklicAcknowledgement;
use App\Models\DklicAiQuery;
use App\Models\DklicDocument;
use App\Support\Concerns\StylesExcelSheets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DklicDocumentController extends Controller
{
    use StylesExcelSheets;

    public function index(Request $request)
    {
        $query = DklicDocument::query()->with('uploader');

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('reference_no', 'like', "%{$search}%")
                    ->orWhereJsonContains('tags', $search);
            });
        }

        if ($category = $request->string('category')->toString()) {
            $query->where('category', $category);
        }

        if ($audience = $request->string('audience')->toString()) {
            $query->whereIn('audience', [$audience, 'All']);
        }

        if ($request->boolean('urgent_only')) {
            $query->where('priority', 'urgent');
        }

        $documents = $query->latest('published_at')->get();

        $allDocs = DklicDocument::query();

        return DklicDocumentResource::collection($documents)->additional([
            'meta' => [
                'total' => (clone $allDocs)->count(),
                'urgent' => (clone $allDocs)->where('priority', 'urgent')->count(),
                'acknowledged' => DklicAcknowledgement::count(),
                'pending_ack' => (clone $allDocs)->where('ack_required', true)->count(),
                'ai_queries' => DklicAiQuery::count(),
                'categories' => (clone $allDocs)->distinct('category')->count('category'),
            ],
        ]);
    }

    public function store(StoreDklicDocumentRequest $request)
    {
        $filePath = $request->file('file')->store('dklic-documents', 'public');

        $document = DklicDocument::create([
            'uploaded_by' => $request->user()->id,
            'title' => $request->string('title')->toString(),
            'category' => $request->string('category')->toString(),
            'subject' => $request->string('subject')->toString(),
            'description' => $request->input('description'),
            'content_text' => $request->input('content_text'),
            'reference_no' => $request->input('reference_no'),
            'issue_date' => $request->input('issue_date'),
            'effective_date' => $request->input('effective_date'),
            'version' => $request->input('version', '1.0'),
            'audience' => $request->string('audience')->toString(),
            'priority' => $request->string('priority')->toString(),
            'ack_required' => $request->boolean('ack_required'),
            'tags' => $request->input('tags', []),
            'file_path' => $filePath,
            'published_at' => now(),
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DKLIC_UPLOAD',
            'entity_type' => 'DklicDocument',
            'entity_id' => $document->id,
            'note' => "Published: {$document->title} ({$document->category})",
        ]);

        return new DklicDocumentResource($document->load('uploader'));
    }

    public function archive(Request $request, DklicDocument $document)
    {
        $document->update(['archived_at' => $document->archived_at ? null : now()]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $document->archived_at ? 'DKLIC_ARCHIVE' : 'DKLIC_UNARCHIVE',
            'entity_type' => 'DklicDocument',
            'entity_id' => $document->id,
            'note' => ($document->archived_at ? 'Archived: ' : 'Unarchived: ').$document->title,
        ]);

        return new DklicDocumentResource($document->load('uploader'));
    }

    /**
     * A "Category Overview" sheet (document counts + urgent count per category) plus
     * the full "Document Registry" — now with the uploader, tags, and acknowledgement
     * count the old CSV didn't carry, priority-colored rows, and a clickable file link.
     */
    public function export()
    {
        $documents = DklicDocument::query()
            ->with('uploader')
            ->withCount('acknowledgements')
            ->latest('created_at')
            ->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('UC Governance Platform')->setTitle('DKLIC Repository Report');

        $this->buildDklicOverviewSheet($spreadsheet->getActiveSheet(), $documents);
        $this->buildDklicRegistrySheet($spreadsheet->createSheet(), $documents);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'DKLIC_Repository_'.now()->toDateString().'.xlsx');
    }

    protected function buildDklicOverviewSheet(Worksheet $sheet, $documents): void
    {
        $sheet->setTitle('Category Overview');
        $this->xlTitleBanner($sheet, 'UC Governance Platform — DKLIC Repository Overview', 'Total documents: '.$documents->count(), 4);

        $headerRow = 4;
        foreach (['Category', 'Documents', 'Urgent', 'Total Views'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:D{$headerRow}");

        $row = $headerRow + 1;
        foreach ($documents->groupBy('category') as $category => $docs) {
            $urgent = $docs->where('priority', 'urgent')->count();
            $sheet->setCellValue("A{$row}", $category);
            $sheet->setCellValue("B{$row}", $docs->count());
            $this->xlStatusCell($sheet, "C{$row}", (string) $urgent, $urgent > 0 ? 'danger' : 'success');
            $sheet->setCellValue("D{$row}", $docs->sum('view_count'));
            $row++;
        }
        $this->xlAutoSize($sheet, ['A', 'B', 'C', 'D']);
        $this->xlBorderAndFilter($sheet, "A{$headerRow}:D{$headerRow}", "A{$headerRow}:D".($row - 1), freezeBelowHeader: false);
    }

    protected function buildDklicRegistrySheet(Worksheet $sheet, $documents): void
    {
        $sheet->setTitle('Document Registry');

        $headers = [
            'Doc ID', 'Title', 'Category', 'Subject', 'Ref No.', 'Priority', 'Audience', 'Version',
            'Uploaded By', 'Tags', 'Issue Date', 'Effective Date', 'Views', 'Downloads',
            'Acknowledgements', 'Status', 'File',
        ];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, [
            'A' => 8, 'B' => 28, 'C' => 16, 'D' => 28, 'E' => 14, 'F' => 10, 'G' => 14, 'H' => 8,
            'I' => 18, 'J' => 24, 'K' => 12, 'L' => 12, 'M' => 8, 'N' => 10, 'O' => 14, 'P' => 12, 'Q' => 14,
        ]);

        $row = 2;
        foreach ($documents as $d) {
            $sheet->setCellValue("A{$row}", $d->id);
            $sheet->setCellValue("B{$row}", $d->title);
            $sheet->setCellValue("C{$row}", $d->category);
            $sheet->setCellValue("D{$row}", $d->subject);
            $sheet->setCellValue("E{$row}", $d->reference_no);
            $this->xlStatusCell($sheet, "F{$row}", ucfirst($d->priority), $d->priority === 'urgent' ? 'danger' : 'neutral');
            $sheet->setCellValue("G{$row}", $d->audience);
            $sheet->setCellValue("H{$row}", $d->version);
            $sheet->setCellValue("I{$row}", $d->uploader?->name);
            $sheet->setCellValue("J{$row}", implode(', ', $d->tags ?? []));
            $sheet->setCellValue("K{$row}", $d->issue_date?->toDateString());
            $sheet->setCellValue("L{$row}", $d->effective_date?->toDateString());
            $sheet->setCellValue("M{$row}", $d->view_count);
            $sheet->setCellValue("N{$row}", $d->download_count);
            $sheet->setCellValue("O{$row}", $d->acknowledgements_count.($d->ack_required ? ' (required)' : ''));
            $this->xlStatusCell($sheet, "P{$row}", $d->archived_at ? 'Archived' : 'Published', $d->archived_at ? 'neutral' : 'success');
            $this->xlHyperlink($sheet, "Q{$row}", Storage::disk('public')->url($d->file_path), 'Open file');

            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }
}
