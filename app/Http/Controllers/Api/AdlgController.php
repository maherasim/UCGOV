<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreAdlgRequest;
use App\Http\Requests\Api\UpdateAdlgRequest;
use App\Http\Resources\UserResource;
use App\Models\AdlgProfile;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\Tehsil;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdlgController extends Controller
{
    public function index()
    {
        $adlgs = User::where('role', 'adlg')
            ->with('adlgProfile.tehsil.district')
            ->orderBy('name')
            ->get();

        return UserResource::collection($adlgs);
    }

    /**
     * Read-only, own-district view for DDLG — every ADLG across every tehsil in their district.
     */
    public function indexForDdlg(Request $request)
    {
        $districtId = $request->user()->ddlgProfile->district_id;

        $adlgs = User::where('role', 'adlg')
            ->whereHas('adlgProfile.tehsil', fn ($q) => $q->where('district_id', $districtId))
            ->with('adlgProfile.tehsil.district')
            ->orderBy('name')
            ->get();

        return UserResource::collection($adlgs);
    }

    public function store(StoreAdlgRequest $request)
    {
        $tehsil = Tehsil::findOrFail($request->integer('tehsil_id'));

        $user = DB::transaction(function () use ($request, $tehsil) {
            $user = User::create([
                'role' => 'adlg',
                'name' => $request->string('name')->toString(),
                'username' => $request->string('username')->toString(),
                'email' => $request->input('email'),
                'password' => Hash::make($request->string('password')->toString()),
                'cnic' => $request->input('cnic'),
                'phone' => $request->input('phone'),
                'active' => true,
                'bio_enrolled' => true,
                'first_login' => true,
            ]);

            AdlgProfile::create([
                'user_id' => $user->id,
                'tehsil_id' => $tehsil->id,
                'grade' => $request->input('grade'),
            ]);

            $tehsil->update(['adlg_activated' => true]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'ADLG_CREATED',
                'entity_type' => 'User',
                'entity_id' => $user->id,
                'note' => "ADLG {$user->name} created for {$tehsil->name}",
            ]);

            CaseNotification::create([
                'to_user_id' => $user->id,
                'from_user_id' => $request->user()->id,
                'type' => 'ACCOUNT_CREATED',
                'message' => "Your ADLG account has been created. Username: \"{$user->username}\" — {$tehsil->name}.",
            ]);

            return $user;
        });

        return new UserResource($user->load('adlgProfile.tehsil.district'));
    }

    public function update(UpdateAdlgRequest $request, User $adlg)
    {
        $newTehsil = Tehsil::findOrFail($request->integer('tehsil_id'));
        $oldTehsilId = $adlg->adlgProfile->tehsil_id;

        DB::transaction(function () use ($request, $adlg, $newTehsil, $oldTehsilId) {
            $adlg->update([
                'name' => $request->string('name')->toString(),
                'username' => $request->string('username')->toString(),
                'email' => $request->input('email'),
                'cnic' => $request->input('cnic'),
                'phone' => $request->input('phone'),
            ]);

            $adlg->adlgProfile->update([
                'tehsil_id' => $newTehsil->id,
                'grade' => $request->input('grade'),
            ]);

            $newTehsil->update(['adlg_activated' => true]);

            if ($oldTehsilId !== $newTehsil->id) {
                $this->refreshTehsilActivation($oldTehsilId);
            }

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'ADLG_UPDATED',
                'entity_type' => 'User',
                'entity_id' => $adlg->id,
                'note' => "ADLG {$adlg->name} updated",
            ]);
        });

        return new UserResource($adlg->load('adlgProfile.tehsil.district'));
    }

    /**
     * Deactivate/reactivate rather than hard-delete — ADLG accounts carry audit-log and
     * case history in a government system, so the account itself should be preserved.
     */
    public function toggleActive(Request $request, User $adlg)
    {
        $adlg->update(['active' => ! $adlg->active]);

        $this->refreshTehsilActivation($adlg->adlgProfile->tehsil_id);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $adlg->active ? 'ADLG_REACTIVATED' : 'ADLG_DEACTIVATED',
            'entity_type' => 'User',
            'entity_id' => $adlg->id,
            'note' => "ADLG {$adlg->name} " . ($adlg->active ? 'reactivated' : 'deactivated'),
        ]);

        return new UserResource($adlg->load('adlgProfile.tehsil.district'));
    }

    /**
     * Recompute a tehsil's adlg_activated flag from whether any active ADLG is actually
     * assigned to it — needed because moving/deactivating an ADLG doesn't automatically
     * clear the flag on the tehsil they left.
     */
    protected function refreshTehsilActivation(int $tehsilId): void
    {
        $stillCovered = AdlgProfile::where('tehsil_id', $tehsilId)
            ->whereHas('user', fn ($q) => $q->where('active', true))
            ->exists();

        Tehsil::whereKey($tehsilId)->update(['adlg_activated' => $stillCovered]);
    }
}
