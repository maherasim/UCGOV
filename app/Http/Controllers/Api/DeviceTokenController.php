<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RegisterDeviceTokenRequest;
use App\Models\DeviceToken;
use Illuminate\Http\Request;

/**
 * Stores FCM registration tokens so the backend can push notifications to the
 * mobile app (attendance reminders, case updates, etc.) — see the scheduled
 * attendance-reminder command for the first consumer, wired once Firebase
 * credentials are configured.
 */
class DeviceTokenController extends Controller
{
    public function register(RegisterDeviceTokenRequest $request)
    {
        $token = DeviceToken::updateOrCreate(
            ['token' => $request->string('token')->toString()],
            [
                'user_id' => $request->user()->id,
                'platform' => $request->input('platform'),
                'last_used_at' => now(),
            ]
        );

        return response()->json(['data' => ['id' => $token->id]], 201);
    }

    public function unregister(Request $request)
    {
        $request->validate(['token' => ['required', 'string']]);

        DeviceToken::where('user_id', $request->user()->id)
            ->where('token', $request->string('token')->toString())
            ->delete();

        return response()->noContent();
    }
}
