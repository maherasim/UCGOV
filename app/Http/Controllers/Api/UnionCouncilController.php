<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreUnionCouncilRequest;
use App\Http\Requests\Api\UpdateUnionCouncilRequest;
use App\Http\Resources\UnionCouncilResource;
use App\Models\AuditLog;
use App\Models\UnionCouncil;
use App\Support\Concerns\StylesExcelSheets;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class UnionCouncilController extends Controller
{
    use StylesExcelSheets;

    public function index(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $ucs = UnionCouncil::where('tehsil_id', $tehsilId)
            ->with('secretaryProfile.user')
            ->orderBy('name')
            ->get();

        return UnionCouncilResource::collection($ucs);
    }

    /**
     * Read-only, own-district view for DDLG — every UC across every tehsil in their district.
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $ucs = UnionCouncil::whereHas('tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['tehsil.district', 'secretaryProfile.user'])
            ->orderBy('name')
            ->get();

        return UnionCouncilResource::collection($ucs);
    }

    /**
     * Read-only, Punjab-wide view for Super Admin — every UC across every tehsil/district,
     * A–Z. Editing stays exclusive to the owning ADLG (see index()/update() above).
     *
     * Paginated (not ->get()) — there are 4,000+ UCs in Punjab; shipping the full set to the
     * browser in one response is what was making this page slow/unresponsive to load.
     */
    public function indexForAdmin(Request $request)
    {
        $query = UnionCouncil::with(['tehsil.district', 'secretaryProfile.user']);

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('uc_no', 'like', "%{$search}%")
                    ->orWhereHas('tehsil', fn ($t) => $t->where('name', 'like', "%{$search}%")
                        ->orWhereHas('district', fn ($d) => $d->where('name', 'like', "%{$search}%")))
                    ->orWhereHas('secretaryProfile.user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        $perPage = min($request->integer('per_page', 30), 100);

        return UnionCouncilResource::collection($query->orderBy('name')->paginate($perPage));
    }

    /** Punjab-wide, for Super Admin. */
    public function exportForAdmin(Request $request)
    {
        $ucs = UnionCouncil::with(['tehsil.district', 'secretaryProfile.user'])->orderBy('name')->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Union Councils Report');

        $this->buildUcSummarySheet($spreadsheet->getActiveSheet(), $ucs);
        $this->buildUcDetailSheet($spreadsheet->createSheet(), $ucs, includeJurisdiction: true);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Union_Councils_'.now()->toDateString().'.xlsx');
    }

    /** Own-district only, for DDLG. */
    public function exportForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $ucs = UnionCouncil::whereHas('tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with(['tehsil.district', 'secretaryProfile.user'])
            ->orderBy('name')
            ->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Union Councils Report');

        $this->buildUcSummarySheet($spreadsheet->getActiveSheet(), $ucs);
        $this->buildUcDetailSheet($spreadsheet->createSheet(), $ucs, includeJurisdiction: true);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Union_Councils_'.now()->toDateString().'.xlsx');
    }

    /**
     * A "Summary" sheet (assigned vs. vacant, geofence coverage) plus the full
     * "Union Councils" detail listing, colored to match the on-screen badges
     * (Vacant secretary in amber, geofence Set/Not Set in green/neutral).
     */
    public function export(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $ucs = UnionCouncil::where('tehsil_id', $tehsilId)
            ->with(['tehsil', 'secretaryProfile.user'])
            ->orderBy('name')
            ->get();

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()->setCreator('Union Council Management System')->setTitle('Union Councils Report');

        $this->buildUcSummarySheet($spreadsheet->getActiveSheet(), $ucs);
        $this->buildUcDetailSheet($spreadsheet->createSheet(), $ucs);
        $spreadsheet->setActiveSheetIndex(0);

        return $this->xlDownload($spreadsheet, 'Union_Councils_'.now()->toDateString().'.xlsx');
    }

    protected function buildUcSummarySheet(Worksheet $sheet, $ucs): void
    {
        $sheet->setTitle('Summary');

        $total = $ucs->count();
        $assigned = $ucs->filter(fn ($uc) => $uc->secretaryProfile)->count();
        $vacant = $total - $assigned;
        $geofenceSet = $ucs->filter(fn ($uc) => $uc->lat !== null && $uc->lng !== null)->count();

        $this->xlTitleBanner($sheet, 'Union Council Management System — Union Councils Summary', "Tehsil overview · {$total} Union Councils", 2);

        $headerRow = 4;
        foreach (['Metric', 'Value'] as $i => $h) {
            $sheet->setCellValue([$i + 1, $headerRow], $h);
        }
        $this->xlHeaderRow($sheet, "A{$headerRow}:B{$headerRow}");

        $rows = [
            ['Total Union Councils', (string) $total, 'neutral'],
            ['Secretary Assigned', (string) $assigned, 'success'],
            ['Vacant (No Secretary)', (string) $vacant, $vacant > 0 ? 'warning' : 'success'],
            ['Geofence Configured', (string) $geofenceSet, $geofenceSet === $total ? 'success' : 'warning'],
            ['Geofence Not Set', (string) ($total - $geofenceSet), $total - $geofenceSet > 0 ? 'danger' : 'success'],
        ];
        $row = $headerRow + 1;
        foreach ($rows as [$label, $value, $tone]) {
            $sheet->setCellValue("A{$row}", $label);
            $this->xlStatusCell($sheet, "B{$row}", $value, $tone);
            $row++;
        }
        $this->xlAutoSize($sheet, ['A', 'B']);
        $this->xlBorderAndFilter($sheet, "A{$headerRow}:B{$headerRow}", "A{$headerRow}:B".($row - 1), freezeBelowHeader: false);
    }

    /**
     * $includeJurisdiction adds Tehsil/District columns — irrelevant for ADLG's
     * own-tehsil export (every row is the same tehsil) but needed once the export
     * spans multiple tehsils (DDLG's district, Admin's Punjab-wide) so the file
     * is usable standalone.
     */
    protected function buildUcDetailSheet(Worksheet $sheet, $ucs, bool $includeJurisdiction = false): void
    {
        $sheet->setTitle('Union Councils');

        $headers = ['UC No.', 'Name', 'Code', 'Address'];
        if ($includeJurisdiction) {
            $headers[] = 'Tehsil';
            $headers[] = 'District';
        }
        array_push($headers, 'Secretary', 'Geofence', 'Latitude', 'Longitude', 'Radius (m)');

        foreach ($headers as $i => $h) {
            $sheet->setCellValue([$i + 1, 1], $h);
        }
        $lastCol = $this->xlColumnLetter(count($headers));
        $this->xlHeaderRow($sheet, "A1:{$lastCol}1");

        $widths = ['A' => 10, 'B' => 24, 'C' => 12, 'D' => 30];
        if ($includeJurisdiction) {
            $widths += ['E' => 18, 'F' => 18, 'G' => 22, 'H' => 14, 'I' => 12, 'J' => 12, 'K' => 12];
        } else {
            $widths += ['E' => 22, 'F' => 14, 'G' => 12, 'H' => 12, 'I' => 12];
        }
        $this->xlColumnWidths($sheet, $widths);

        $row = 2;
        foreach ($ucs as $uc) {
            $col = 'A';
            $sheet->setCellValue($col++.$row, $uc->uc_no);
            $sheet->setCellValue($col++.$row, $uc->name);
            $sheet->setCellValue($col++.$row, $uc->code);
            $sheet->setCellValue($col++.$row, $uc->address);

            if ($includeJurisdiction) {
                $sheet->setCellValue($col++.$row, $uc->tehsil?->name);
                $sheet->setCellValue($col++.$row, $uc->tehsil?->district?->name);
            }

            if ($uc->secretaryProfile?->user) {
                $this->xlStatusCell($sheet, $col++.$row, $uc->secretaryProfile->user->name, 'success');
            } else {
                $this->xlStatusCell($sheet, $col++.$row, 'Vacant', 'warning');
            }

            $hasGeofence = $uc->lat !== null && $uc->lng !== null;
            $this->xlStatusCell($sheet, $col++.$row, $hasGeofence ? "Set · {$uc->geofence_radius}m" : 'Not set', $hasGeofence ? 'success' : 'neutral');

            $sheet->setCellValue($col++.$row, $uc->lat);
            $sheet->setCellValue($col++.$row, $uc->lng);
            $sheet->setCellValue($col++.$row, $uc->geofence_radius);
            $row++;
        }

        $lastRow = $row - 1;
        if ($lastRow >= 2) {
            $this->xlBorderAndFilter($sheet, "A1:{$lastCol}1", "A1:{$lastCol}{$lastRow}");
        }
    }

    public function store(StoreUnionCouncilRequest $request)
    {
        $uc = UnionCouncil::create([
            ...$request->validated(),
            'tehsil_id' => $request->user()->adlgProfile->tehsil_id,
            'geofence_radius' => $request->input('geofence_radius', 150),
            'active' => true,
        ]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UC_CREATED',
            'entity_type' => 'UnionCouncil',
            'entity_id' => $uc->id,
            'note' => "UC {$uc->name} created by " . $request->user()->name,
        ]);

        return new UnionCouncilResource($uc);
    }

    public function update(UpdateUnionCouncilRequest $request, UnionCouncil $unionCouncil)
    {
        $this->authorizeOwnTehsil($request, $unionCouncil);

        $unionCouncil->update($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UC_UPDATED',
            'entity_type' => 'UnionCouncil',
            'entity_id' => $unionCouncil->id,
            'note' => "UC {$unionCouncil->name} updated" . ($request->filled('lat') ? ' · geofence set' : ''),
        ]);

        return new UnionCouncilResource($unionCouncil->load('secretaryProfile.user'));
    }

    protected function authorizeOwnTehsil(Request $request, UnionCouncil $unionCouncil): void
    {
        abort_unless($unionCouncil->tehsil_id === $request->user()->adlgProfile->tehsil_id, 403);
    }
}
