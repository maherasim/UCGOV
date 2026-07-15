<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $user = $request->authenticate();

        return new UserResource($user->load(['adlgProfile.tehsil', 'secretaryProfile.unionCouncil', 'secretaryProfile.additionalCharges.unionCouncil']));
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    public function me(Request $request)
    {
        $user = $request->user()->load([
            'adlgProfile.tehsil',
            'secretaryProfile.unionCouncil',
            'secretaryProfile.additionalCharges.unionCouncil',
        ]);

        return new UserResource($user);
    }
}
