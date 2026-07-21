<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDdlgRequest;
use App\Http\Requests\Api\UpdateDdlgRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\DdlgProfile;
use App\Models\District;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DdlgController extends Controller
{
    public function index()
    {
        $ddlgs = User::where('role', 'ddlg')
            ->with('ddlgProfile.district.division')
            ->orderBy('name')
            ->get();

        return UserResource::collection($ddlgs);
    }

    public function store(StoreDdlgRequest $request)
    {
        $district = District::findOrFail($request->integer('district_id'));

        $user = DB::transaction(function () use ($request, $district) {
            $user = User::create([
                'role' => 'ddlg',
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

            DdlgProfile::create([
                'user_id' => $user->id,
                'district_id' => $district->id,
                'grade' => $request->input('grade'),
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'DDLG_CREATED',
                'entity_type' => 'User',
                'entity_id' => $user->id,
                'note' => "DDLG {$user->name} created for {$district->name}",
            ]);

            CaseNotification::create([
                'to_user_id' => $user->id,
                'from_user_id' => $request->user()->id,
                'type' => 'ACCOUNT_CREATED',
                'message' => "Your DDLG account has been created. Username: \"{$user->username}\" — {$district->name}.",
            ]);

            return $user;
        });

        return new UserResource($user->load('ddlgProfile.district.division'));
    }

    public function update(UpdateDdlgRequest $request, User $ddlg)
    {
        $district = District::findOrFail($request->integer('district_id'));

        DB::transaction(function () use ($request, $ddlg, $district) {
            $ddlg->update([
                'name' => $request->string('name')->toString(),
                'username' => $request->string('username')->toString(),
                'email' => $request->input('email'),
                'cnic' => $request->input('cnic'),
                'phone' => $request->input('phone'),
            ]);

            $ddlg->ddlgProfile->update([
                'district_id' => $district->id,
                'grade' => $request->input('grade'),
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'DDLG_UPDATED',
                'entity_type' => 'User',
                'entity_id' => $ddlg->id,
                'note' => "DDLG {$ddlg->name} updated",
            ]);
        });

        return new UserResource($ddlg->load('ddlgProfile.district.division'));
    }

    /**
     * Deactivate/reactivate rather than hard-delete — DDLG accounts carry audit-log and
     * decision history in a government system, so the account itself should be preserved.
     */
    public function toggleActive(Request $request, User $ddlg)
    {
        $ddlg->update(['active' => ! $ddlg->active]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $ddlg->active ? 'DDLG_REACTIVATED' : 'DDLG_DEACTIVATED',
            'entity_type' => 'User',
            'entity_id' => $ddlg->id,
            'note' => "DDLG {$ddlg->name} " . ($ddlg->active ? 'reactivated' : 'deactivated'),
        ]);

        return new UserResource($ddlg->load('ddlgProfile.district.division'));
    }
}
