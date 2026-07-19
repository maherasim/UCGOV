<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RespondPerformaExcelRequest;
use App\Http\Requests\Api\RespondPerformaFormRequest;
use App\Http\Requests\Api\StorePerformaRequest;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\Performa;
use App\Models\PerformaResponse;
use App\Models\UnionCouncil;
use App\Models\User;
use App\Support\Concerns\StylesExcelSheets;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PerformaController extends Controller
{
    use StylesExcelSheets;

    public function indexForAdlg(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $performas = Performa::where('tehsil_id', $tehsilId)
            ->with('fields')
            ->withCount('responses')
            ->latest()
            ->get();

        $totalSecretaries = User::where('role', 'sec')
            ->whereHas('secretaryProfile.unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->count();

        return response()->json([
            'data' => $performas->map(fn (Performa $p) => $this->performaArray($p)),
            'meta' => ['total_secretaries' => $totalSecretaries],
        ]);
    }

    public function store(StorePerformaRequest $request)
    {
        $adlg = $request->user();
        $tehsilId = $adlg->adlgProfile->tehsil_id;

        $templatePath = $request->hasFile('excel_template')
            ? $request->file('excel_template')->store('performa-templates', 'public')
            : null;

        $performa = DB::transaction(function () use ($request, $adlg, $tehsilId, $templatePath) {
            $performa = Performa::create([
                'adlg_id' => $adlg->id,
                'tehsil_id' => $tehsilId,
                'title' => $request->string('title')->toString(),
                'description' => $request->input('description'),
                'mode' => $request->string('mode')->toString(),
                'report_type' => $request->string('report_type')->toString(),
                'deadline' => $request->input('deadline'),
                'excel_template_path' => $templatePath,
            ]);

            if ($performa->mode === 'form') {
                foreach ($request->input('fields') as $index => $field) {
                    $performa->fields()->create([
                        'label' => $field['label'],
                        'type' => $field['type'],
                        'sort_order' => $index,
                    ]);
                }
            }

            AuditLog::create([
                'user_id' => $adlg->id,
                'action' => 'PERFORMA_PUBLISHED',
                'entity_type' => 'Performa',
                'entity_id' => $performa->id,
                'note' => "{$adlg->name} published ".($performa->mode === 'excel' ? 'Excel' : 'Form')." performa \"{$performa->title}\" ({$performa->report_type})",
            ]);

            $secretaryIds = User::where('role', 'sec')
                ->whereHas('secretaryProfile.unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
                ->pluck('id');

            foreach ($secretaryIds as $secretaryId) {
                CaseNotification::create([
                    'to_user_id' => $secretaryId,
                    'from_user_id' => $adlg->id,
                    'type' => 'PERFORMA',
                    'message' => 'New '.($performa->report_type === 'daily' ? 'daily' : 'one-time')." performa \"{$performa->title}\" published".
                        ($performa->report_type === 'daily' ? ' — requires daily updates.' : '.'),
                ]);
            }

            return $performa;
        });

        return response()->json($this->performaArray($performa->load('fields')), 201);
    }

    public function responses(Request $request, Performa $performa)
    {
        abort_unless($performa->tehsil_id === $request->user()->adlgProfile->tehsil_id, 403);

        $responses = $performa->responses()
            ->with(['secretary.secretaryProfile.unionCouncil', 'values.field'])
            ->latest('response_date')
            ->get();

        return response()->json([
            'data' => $responses->map(fn (PerformaResponse $r) => $this->responseArray($r)),
        ]);
    }

    /**
     * A "Response Summary" sheet — which UCs in the tehsil have actually responded,
     * colored green/red, so the ADLG can see who's outstanding at a glance — plus the
     * full "Responses" detail (dynamic field columns for form mode, a clickable file
     * link for upload mode). The old CSV had no completion tracking at all.
     */
    public function exportResponses(Request $request, Performa $performa)
    {
        abort_unless($performa->tehsil_id === $request->user()->adlgProfile->tehsil_id, 403);

        $responses = $performa->responses()
            ->with(['secretary.secretaryProfile.unionCouncil', 'values.field'])
            ->latest('response_date')
            ->get();

        $ucs = UnionCouncil::where('tehsil_id', $performa->tehsil_id)->where('active', true)
            ->with('secretaryProfile.user')->orderBy('uc_no')->get();
        $respondedUcIds = $responses->pluck('secretary.secretaryProfile.union_council_id')->filter()->unique();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('UC Governance Platform')->setTitle('Performa: '.$performa->title);

        $this->buildPerformaSummarySheet($spreadsheet->getActiveSheet(), $performa, $ucs, $respondedUcIds);

        if ($performa->mode === 'form') {
            $this->buildPerformaFormResponsesSheet($spreadsheet->createSheet(), $performa, $responses);
        } else {
            $this->buildPerformaFileResponsesSheet($spreadsheet->createSheet(), $responses);
        }
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Performa_'.Str::slug($performa->title).'_'.now()->toDateString().'.xlsx');
    }

    protected function buildPerformaSummarySheet(Worksheet $sheet, Performa $performa, $ucs, $respondedUcIds): void
    {
        $sheet->setTitle('Response Summary');

        $subtitle = $performa->deadline ? 'Deadline: '.$performa->deadline->toFormattedDateString() : 'No deadline set';
        $this->xlTitleBanner($sheet, $performa->title, $subtitle, 4);

        $headerRow = 4;
        foreach (['UC No', 'UC Name', 'Secretary', 'Responded'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:D{$headerRow}");

        $row = $headerRow + 1;
        $respondedCount = 0;
        foreach ($ucs as $uc) {
            $responded = $respondedUcIds->contains($uc->id);
            if ($responded) {
                $respondedCount++;
            }
            $sheet->setCellValue("A{$row}", $uc->uc_no);
            $sheet->setCellValue("B{$row}", $uc->name);
            $sheet->setCellValue("C{$row}", $uc->secretaryProfile?->user?->name ?? '—');
            $this->xlStatusCell($sheet, "D{$row}", $responded ? 'Responded' : 'Outstanding', $responded ? 'success' : 'danger');
            $row++;
        }

        $totalUcs = $ucs->count();
        $sheet->setCellValue("A{$row}", 'TOTAL');
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->setCellValue("D{$row}", "{$respondedCount} / {$totalUcs} responded");
        $sheet->getStyle("A{$row}:D{$row}")->getFont()->setBold(true);
        $sheet->getStyle("A{$row}:D{$row}")->getBorders()->getTop()->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        $this->xlAutoSize($sheet, ['A', 'B', 'C', 'D']);
        $this->xlBorderAndFilter($sheet, "A{$headerRow}:D{$headerRow}", "A{$headerRow}:D{$row}", freezeBelowHeader: false);
    }

    protected function buildPerformaFormResponsesSheet(Worksheet $sheet, Performa $performa, $responses): void
    {
        $sheet->setTitle('Responses');

        $fieldLabels = $performa->fields()->orderBy('sort_order')->pluck('label', 'id');
        $headers = ['Date', 'Secretary', 'UC', ...$fieldLabels->values()->all()];
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");
        $this->xlColumnWidths($sheet, ['A' => 12, 'B' => 20, 'C' => 20]);

        $row = 2;
        foreach ($responses as $r) {
            $valuesByField = $r->values->keyBy('performa_field_id');
            $sheet->setCellValue("A{$row}", $r->response_date->toDateString());
            $sheet->setCellValue("B{$row}", $r->secretary->name);
            $sheet->setCellValue("C{$row}", $r->secretary->secretaryProfile?->unionCouncil?->name);
            foreach ($fieldLabels->keys()->values() as $i => $fieldId) {
                $sheet->setCellValue([$i + 4, $row], $valuesByField->get($fieldId)?->value);
            }
            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }

    protected function buildPerformaFileResponsesSheet(Worksheet $sheet, $responses): void
    {
        $sheet->setTitle('Responses');

        foreach (['Date', 'Secretary', 'UC', 'File'] as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $this->xlHeaderRow($sheet, 'A1:D1');
        $this->xlColumnWidths($sheet, ['A' => 12, 'B' => 22, 'C' => 22, 'D' => 16]);

        $row = 2;
        foreach ($responses as $r) {
            $sheet->setCellValue("A{$row}", $r->response_date->toDateString());
            $sheet->setCellValue("B{$row}", $r->secretary->name);
            $sheet->setCellValue("C{$row}", $r->secretary->secretaryProfile?->unionCouncil?->name);
            if ($r->file_path) {
                $this->xlHyperlink($sheet, "D{$row}", Storage::disk('public')->url($r->file_path), 'Open file');
            }
            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, 'A1:D1', "A1:D{$lastRow}");
        }
    }

    public function downloadTemplateForAdlg(Request $request, Performa $performa)
    {
        abort_unless($performa->tehsil_id === $request->user()->adlgProfile->tehsil_id, 403);
        abort_unless($performa->excel_template_path, 404);

        return Storage::disk('public')->download($performa->excel_template_path);
    }

    public function indexForSecretary(Request $request)
    {
        $secretary = $request->user();
        $tehsilId = $secretary->secretaryProfile->unionCouncil->tehsil_id;
        $today = Carbon::today()->toDateString();

        $performas = Performa::where('tehsil_id', $tehsilId)
            ->with([
                'fields',
                'responses' => fn ($q) => $q->where('secretary_id', $secretary->id)->latest('response_date')->with('values.field'),
            ])
            ->latest()
            ->get();

        return response()->json([
            'data' => $performas->map(function (Performa $p) use ($today) {
                $latest = $p->responses->first();

                return array_merge($this->performaArray($p, includeCount: false), [
                    'my_response' => $latest ? $this->responseArray($latest) : null,
                    'needs_today' => $p->report_type === 'daily'
                        && ! $p->responses->contains(fn ($r) => $r->response_date->toDateString() === $today),
                ]);
            }),
        ]);
    }

    public function respondForm(RespondPerformaFormRequest $request, Performa $performa)
    {
        $secretary = $request->user();
        $this->assertVisibleToSecretary($performa, $secretary);
        abort_unless($performa->mode === 'form', 422, 'This performa expects an Excel upload, not form values.');

        $today = Carbon::today()->toDateString();

        $response = DB::transaction(function () use ($request, $performa, $secretary, $today) {
            $response = $performa->responses()->updateOrCreate(
                ['secretary_id' => $secretary->id, 'response_date' => $today],
                ['type' => 'form']
            );

            foreach ($request->input('values') as $fieldId => $value) {
                $response->values()->updateOrCreate(
                    ['performa_field_id' => $fieldId],
                    ['value' => $value]
                );
            }

            AuditLog::create([
                'user_id' => $secretary->id,
                'action' => 'PERFORMA_FILLED',
                'entity_type' => 'Performa',
                'entity_id' => $performa->id,
                'note' => "{$secretary->name} submitted form response for \"{$performa->title}\"",
            ]);

            CaseNotification::create([
                'to_user_id' => $performa->adlg_id,
                'from_user_id' => $secretary->id,
                'type' => 'PERFORMA_FILLED',
                'message' => "{$secretary->name} submitted \"{$performa->title}\".",
            ]);

            return $response;
        });

        return response()->json($this->responseArray($response->load('values.field')));
    }

    public function respondExcel(RespondPerformaExcelRequest $request, Performa $performa)
    {
        $secretary = $request->user();
        $this->assertVisibleToSecretary($performa, $secretary);
        abort_unless($performa->mode === 'excel', 422, 'This performa expects form values, not a file upload.');

        $today = Carbon::today()->toDateString();
        $filePath = $request->file('file')->store('performa-responses', 'public');

        $response = DB::transaction(function () use ($performa, $secretary, $today, $filePath) {
            $response = $performa->responses()->updateOrCreate(
                ['secretary_id' => $secretary->id, 'response_date' => $today],
                ['type' => 'excel', 'file_path' => $filePath]
            );

            AuditLog::create([
                'user_id' => $secretary->id,
                'action' => 'PERFORMA_FILLED',
                'entity_type' => 'Performa',
                'entity_id' => $performa->id,
                'note' => "{$secretary->name} uploaded filled Excel for \"{$performa->title}\"",
            ]);

            CaseNotification::create([
                'to_user_id' => $performa->adlg_id,
                'from_user_id' => $secretary->id,
                'type' => 'PERFORMA_FILLED',
                'message' => "{$secretary->name} uploaded filled Excel for \"{$performa->title}\".",
            ]);

            return $response;
        });

        return response()->json($this->responseArray($response));
    }

    public function downloadTemplateForSecretary(Request $request, Performa $performa)
    {
        $this->assertVisibleToSecretary($performa, $request->user());
        abort_unless($performa->excel_template_path, 404);

        return Storage::disk('public')->download($performa->excel_template_path);
    }

    protected function assertVisibleToSecretary(Performa $performa, User $secretary): void
    {
        abort_unless($performa->tehsil_id === $secretary->secretaryProfile->unionCouncil->tehsil_id, 403);
    }

    protected function performaArray(Performa $performa, bool $includeCount = true): array
    {
        return [
            'id' => $performa->id,
            'title' => $performa->title,
            'description' => $performa->description,
            'mode' => $performa->mode,
            'report_type' => $performa->report_type,
            'deadline' => $performa->deadline,
            'has_template' => (bool) $performa->excel_template_path,
            'fields' => $performa->fields->map(fn ($f) => ['id' => $f->id, 'label' => $f->label, 'type' => $f->type]),
            'created_at' => $performa->created_at,
            ...($includeCount ? ['responses_count' => $performa->responses_count ?? $performa->responses()->count()] : []),
        ];
    }

    protected function responseArray(PerformaResponse $response): array
    {
        return [
            'id' => $response->id,
            'performa_id' => $response->performa_id,
            'type' => $response->type,
            'secretary' => $response->relationLoaded('secretary') ? $response->secretary?->name : null,
            'union_council' => $response->relationLoaded('secretary')
                ? $response->secretary?->secretaryProfile?->unionCouncil?->name
                : null,
            'file_url' => $response->file_path ? Storage::disk('public')->url($response->file_path) : null,
            'values' => $response->relationLoaded('values')
                ? $response->values->map(fn ($v) => ['field_id' => $v->performa_field_id, 'label' => $v->field?->label, 'value' => $v->value])
                : [],
            'response_date' => $response->response_date,
        ];
    }
}
