<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreDgRequest;
use App\Http\Requests\Api\UpdateDgRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\DgProfile;
use App\Models\Division;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DgController extends Controller
{
    public function index()
    {
        $dgs = User::where('role', 'dg')
            ->with('dgProfile.division')
            ->orderBy('name')
            ->get();

        return UserResource::collection($dgs);
    }

    public function store(StoreDgRequest $request)
    {
        $division = Division::findOrFail($request->integer('division_id'));

        $user = DB::transaction(function () use ($request, $division) {
            $user = User::create([
                'role' => 'dg',
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

            DgProfile::create([
                'user_id' => $user->id,
                'division_id' => $division->id,
                'grade' => $request->input('grade'),
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'DG_CREATED',
                'entity_type' => 'User',
                'entity_id' => $user->id,
                'note' => "DG {$user->name} created for {$division->name}",
            ]);

            CaseNotification::create([
                'to_user_id' => $user->id,
                'from_user_id' => $request->user()->id,
                'type' => 'ACCOUNT_CREATED',
                'message' => "Your Director General account has been created. Username: \"{$user->username}\" — {$division->name}.",
            ]);

            return $user;
        });

        return new UserResource($user->load('dgProfile.division'));
    }

    public function update(UpdateDgRequest $request, User $dg)
    {
        $division = Division::findOrFail($request->integer('division_id'));

        DB::transaction(function () use ($request, $dg, $division) {
            $dg->update([
                'name' => $request->string('name')->toString(),
                'username' => $request->string('username')->toString(),
                'email' => $request->input('email'),
                'cnic' => $request->input('cnic'),
                'phone' => $request->input('phone'),
            ]);

            $dg->dgProfile->update([
                'division_id' => $division->id,
                'grade' => $request->input('grade'),
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'DG_UPDATED',
                'entity_type' => 'User',
                'entity_id' => $dg->id,
                'note' => "DG {$dg->name} updated",
            ]);
        });

        return new UserResource($dg->load('dgProfile.division'));
    }

    /**
     * Deactivate/reactivate rather than hard-delete — DG accounts carry audit-log
     * history in a government system, so the account itself should be preserved.
     */
    public function toggleActive(Request $request, User $dg)
    {
        $dg->update(['active' => ! $dg->active]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $dg->active ? 'DG_REACTIVATED' : 'DG_DEACTIVATED',
            'entity_type' => 'User',
            'entity_id' => $dg->id,
            'note' => "DG {$dg->name} " . ($dg->active ? 'reactivated' : 'deactivated'),
        ]);

        return new UserResource($dg->load('dgProfile.division'));
    }
}
