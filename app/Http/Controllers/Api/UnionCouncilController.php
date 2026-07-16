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
