<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ResetPasswordRequest;
use App\Http\Requests\Api\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());

        return new UserResource($user);
    }

    public function resetPassword(ResetPasswordRequest $request, User $user)
    {
        $user->forceFill(['password' => Hash::make($request->string('password')->toString())])->save();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'PASSWORD_RESET',
            'entity_type' => 'User',
            'entity_id' => $user->id,
            'note' => "Password reset for {$user->name} by Super Admin",
        ]);

        return response()->noContent();
    }
}
