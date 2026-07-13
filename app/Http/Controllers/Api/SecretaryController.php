<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreSecretaryRequest;
use App\Http\Requests\Api\UpdateSecretaryRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\CaseNotification;
use App\Models\SecretaryProfile;
use App\Models\UnionCouncil;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SecretaryController extends Controller
{
    public function index(Request $request)
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;

        $secretaries = User::where('role', 'sec')
            ->whereHas('secretaryProfile.unionCouncil', fn ($q) => $q->where('tehsil_id', $tehsilId))
            ->with('secretaryProfile.unionCouncil')
            ->orderBy('name')
            ->get();

        return UserResource::collection($secretaries);
    }

    public function store(StoreSecretaryRequest $request)
    {
        $uc = UnionCouncil::findOrFail($request->integer('union_council_id'));

        $user = DB::transaction(function () use ($request, $uc) {
            $user = User::create([
                'role' => 'sec',
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

            SecretaryProfile::create([
                'user_id' => $user->id,
                'union_council_id' => $uc->id,
                'father_name' => $request->input('father_name'),
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'SEC_CREATED',
                'entity_type' => 'User',
                'entity_id' => $user->id,
                'note' => "Secretary {$user->name} created for {$uc->name}",
            ]);

            CaseNotification::create([
                'to_user_id' => $user->id,
                'from_user_id' => $request->user()->id,
                'type' => 'ACCOUNT_CREATED',
                'message' => "Your Secretary account has been created. Username: \"{$user->username}\" — {$uc->name}.",
            ]);

            return $user;
        });

        return new UserResource($user->load('secretaryProfile.unionCouncil'));
    }

    public function update(UpdateSecretaryRequest $request, User $secretary)
    {
        $this->authorizeOwnTehsil($request, $secretary);

        $uc = UnionCouncil::findOrFail($request->integer('union_council_id'));

        DB::transaction(function () use ($request, $secretary, $uc) {
            $secretary->update([
                'name' => $request->string('name')->toString(),
                'username' => $request->string('username')->toString(),
                'email' => $request->input('email'),
                'cnic' => $request->input('cnic'),
                'phone' => $request->input('phone'),
            ]);

            $secretary->secretaryProfile->update([
                'union_council_id' => $uc->id,
                'father_name' => $request->input('father_name'),
            ]);

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'SEC_UPDATED',
                'entity_type' => 'User',
                'entity_id' => $secretary->id,
                'note' => "Secretary {$secretary->name} updated",
            ]);
        });

        return new UserResource($secretary->load('secretaryProfile.unionCouncil'));
    }

    public function toggleActive(Request $request, User $secretary)
    {
        $this->authorizeOwnTehsil($request, $secretary);

        $secretary->update(['active' => ! $secretary->active]);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $secretary->active ? 'SEC_REACTIVATED' : 'SEC_DEACTIVATED',
            'entity_type' => 'User',
            'entity_id' => $secretary->id,
            'note' => "Secretary {$secretary->name} " . ($secretary->active ? 'reactivated' : 'deactivated'),
        ]);

        return new UserResource($secretary->load('secretaryProfile.unionCouncil'));
    }

    protected function authorizeOwnTehsil(Request $request, User $secretary): void
    {
        $tehsilId = $request->user()->adlgProfile->tehsil_id;
        abort_unless($secretary->secretaryProfile?->unionCouncil?->tehsil_id === $tehsilId, 403);
    }
}
