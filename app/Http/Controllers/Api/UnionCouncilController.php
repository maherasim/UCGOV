<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreUnionCouncilRequest;
use App\Http\Requests\Api\UpdateUnionCouncilRequest;
use App\Http\Resources\UnionCouncilResource;
use App\Models\AuditLog;
use App\Models\UnionCouncil;
use Illuminate\Http\Request;

class UnionCouncilController extends Controller
{
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
     * Read-only, Punjab-wide view for Super Admin — every UC across every tehsil/district,
     * A–Z. Editing stays exclusive to the owning ADLG (see index()/update() above).
     */
    public function indexForAdmin(Request $request)
    {
        $ucs = UnionCouncil::with(['tehsil.district', 'secretaryProfile.user'])
            ->orderBy('name')
            ->get();

        return UnionCouncilResource::collection($ucs);
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
