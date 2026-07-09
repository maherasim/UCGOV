<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDistrictRequest;
use App\Http\Requests\Api\StoreDivisionRequest;
use App\Http\Requests\Api\UpdateDistrictRequest;
use App\Http\Requests\Api\UpdateDivisionRequest;
use App\Http\Resources\DistrictResource;
use App\Http\Resources\DivisionResource;
use App\Models\AuditLog;
use App\Models\District;
use App\Models\Division;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GeographyController extends Controller
{
    public function divisions()
    {
        return DivisionResource::collection(
            Division::withCount('districts')->orderBy('name')->get()
        );
    }

    public function storeDivision(StoreDivisionRequest $request)
    {
        $division = Division::create($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DIVISION_CREATED',
            'entity_type' => 'Division',
            'entity_id' => $division->id,
            'note' => "Division {$division->name} created",
        ]);

        return new DivisionResource($division);
    }

    public function updateDivision(UpdateDivisionRequest $request, Division $division)
    {
        $division->update($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DIVISION_UPDATED',
            'entity_type' => 'Division',
            'entity_id' => $division->id,
            'note' => "Division renamed to {$division->name}",
        ]);

        return new DivisionResource($division);
    }

    public function destroyDivision(Request $request, Division $division)
    {
        if ($division->districts()->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Cannot delete a division that still has districts under it.',
            ]);
        }

        $division->delete();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DIVISION_DELETED',
            'entity_type' => 'Division',
            'entity_id' => $division->id,
            'note' => "Division {$division->name} deleted",
        ]);

        return response()->noContent();
    }

    public function districts(Request $request)
    {
        $query = District::with('division')->withCount('tehsils')->orderBy('name');

        if ($request->filled('division_id')) {
            $query->where('division_id', $request->integer('division_id'));
        }

        return DistrictResource::collection($query->get());
    }

    public function storeDistrict(StoreDistrictRequest $request)
    {
        $district = District::create($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DISTRICT_CREATED',
            'entity_type' => 'District',
            'entity_id' => $district->id,
            'note' => "District {$district->name} created",
        ]);

        return new DistrictResource($district);
    }

    public function updateDistrict(UpdateDistrictRequest $request, District $district)
    {
        $district->update($request->validated());

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DISTRICT_UPDATED',
            'entity_type' => 'District',
            'entity_id' => $district->id,
            'note' => "District {$district->name} updated",
        ]);

        return new DistrictResource($district->load('division'));
    }

    public function destroyDistrict(Request $request, District $district)
    {
        if ($district->tehsils()->exists()) {
            throw ValidationException::withMessages([
                'name' => 'Cannot delete a district that still has tehsils under it.',
            ]);
        }

        $district->delete();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DISTRICT_DELETED',
            'entity_type' => 'District',
            'entity_id' => $district->id,
            'note' => "District {$district->name} deleted",
        ]);

        return response()->noContent();
    }
}
