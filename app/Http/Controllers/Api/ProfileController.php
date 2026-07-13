<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ChangePasswordRequest;
use App\Http\Requests\Api\ResetPasswordRequest;
use App\Http\Requests\Api\UpdateProfileRequest;
use App\Http\Requests\Api\UploadAvatarRequest;
use App\Http\Resources\UserResource;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());

        return new UserResource($user);
    }

    public function uploadAvatar(UploadAvatarRequest $request)
    {
        $user = $request->user();
        $oldPath = $user->avatar_path;

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_path' => $path]);

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return new UserResource($user);
    }

    public function changePassword(ChangePasswordRequest $request)
    {
        $request->user()->forceFill(['password' => Hash::make($request->string('password')->toString())])->save();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'PASSWORD_CHANGED',
            'entity_type' => 'User',
            'entity_id' => $request->user()->id,
            'note' => "{$request->user()->name} changed their own password",
        ]);

        return response()->noContent();
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
