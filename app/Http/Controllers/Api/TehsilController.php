<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreTehsilRequest;
use App\Http\Requests\Api\UpdateTehsilRequest;
use App\Http\Resources\TehsilResource;
use App\Models\AuditLog;
use App\Models\Tehsil;
use App\Support\Concerns\StylesExcelSheets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TehsilController extends Controller
{
    use StylesExcelSheets;

    public function index(Request $request)
    {
        $query = Tehsil::with('district.division')->withCount('unionCouncils');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('district', fn ($d) => $d->where('name', 'like', "%{$search}%"));
            });
        }

        $perPage = min($request->integer('per_page', 20), 200);

        return TehsilResource::collection($query->orderBy('name')->paginate($perPage));
    }

    /**
     * Read-only, own-district view for DDLG — every tehsil under their district.
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $tehsils = Tehsil::where('district_id', $districtId)
            ->with('district.division')
            ->withCount('unionCouncils')
            ->orderBy('name')
            ->get();

        return TehsilResource::collection($tehsils);
    }

    /** Punjab-wide, for Super Admin. */
    public function export(Request $request)
    {
        $tehsils = Tehsil::with('district.division')->withCount('unionCouncils')->orderBy('name')->get();

        return $this->buildTehsilWorkbook($tehsils, 'Punjab-wide');
    }

    /** Own-district only, for DDLG. */
    public function exportForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $tehsils = Tehsil::where('district_id', $districtId)
            ->with('district.division')
            ->withCount('unionCouncils')
            ->orderBy('name')
            ->get();

        return $this->buildTehsilWorkbook($tehsils, 'District');
    }

    protected function buildTehsilWorkbook($tehsils, string $scope)
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Tehsils Report');

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Tehsils');
        $this->xlTitleBanner($sheet, 'Union Council Management System — Tehsils', "{$scope} · {$tehsils->count()} Tehsils", 6);

        $headers = ['Tehsil', 'District', 'Division', 'Union Councils', 'ADLG Assigned', 'Created'];
        $headerRow = 4;
        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A{$headerRow}:{$lastCol}{$headerRow}");
        $this->xlColumnWidths($sheet, ['A' => 20, 'B' => 20, 'C' => 20, 'D' => 16, 'E' => 16, 'F' => 14]);

        $row = $headerRow + 1;
        foreach ($tehsils as $t) {
            $sheet->setCellValue("A{$row}", $t->name);
            $sheet->setCellValue("B{$row}", $t->district?->name);
            $sheet->setCellValue("C{$row}", $t->district?->division?->name);
            $sheet->setCellValue("D{$row}", $t->union_councils_count);
            $this->xlStatusCell($sheet, "E{$row}", $t->adlg_activated ? 'Assigned' : 'Vacant', $t->adlg_activated ? 'success' : 'warning');
            $sheet->setCellValue("F{$row}", $t->created_at?->toDateString());
            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= $headerRow + 1) {
            $this->xlBorderAndFilter($sheet, "A{$headerRow}:{$lastCol}{$headerRow}", "A{$headerRow}:{$lastCol}{$lastRow}");
        }

        return $this->xlDownload($spreadsheet, 'Tehsils_'.now()->toDateString().'.xlsx');
    }

    public function store(StoreTehsilRequest $request)
    {
        $tehsil = Tehsil::create($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'TEHSIL_CREATED',
            'entity_type' => 'Tehsil',
            'entity_id' => $tehsil->id,
            'note' => "Tehsil {$tehsil->name} created",
        ]);

        return new TehsilResource($tehsil->load('district.division'));
    }

    public function update(UpdateTehsilRequest $request, Tehsil $tehsil)
    {
        $tehsil->update($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'TEHSIL_UPDATED',
            'entity_type' => 'Tehsil',
            'entity_id' => $tehsil->id,
            'note' => "Tehsil {$tehsil->name} updated",
        ]);

        return new TehsilResource($tehsil->load('district.division')->loadCount('unionCouncils'));
    }

    public function destroy(Request $request, Tehsil $tehsil)
    {
        if ($tehsil->unionCouncils()->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Cannot delete a tehsil that still has union councils under it.',
            ]);
        }

        if ($tehsil->adlgProfiles()->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Cannot delete a tehsil that has an ADLG assigned. Deactivate the ADLG first.',
            ]);
        }

        $tehsil->delete();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'TEHSIL_DELETED',
            'entity_type' => 'Tehsil',
            'entity_id' => $tehsil->id,
            'note' => "Tehsil {$tehsil->name} deleted",
        ]);

        return response()->noContent();
    }
}
