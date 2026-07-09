<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreTehsilRequest;
use App\Http\Requests\Api\UpdateTehsilRequest;
use App\Http\Resources\TehsilResource;
use App\Models\AuditLog;
use App\Models\Tehsil;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TehsilController extends Controller
{
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
