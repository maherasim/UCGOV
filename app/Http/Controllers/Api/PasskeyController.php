<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Laravel\Passkeys\Actions\GenerateRegistrationOptions;
use Laravel\Passkeys\Actions\StorePasskey;
use Laravel\Passkeys\Http\Requests\PasskeyRegistrationRequest;
use Laravel\Passkeys\Passkey;
use Laravel\Passkeys\Support\WebAuthn;

/**
 * Real WebAuthn fingerprint/Face ID/Windows Hello enrollment — a device's platform
 * authenticator, not a password. First used during first-login setup, and reusable
 * from Profile settings if a secretary changes devices.
 */
class PasskeyController extends Controller
{
    public function registerOptions(Request $request, GenerateRegistrationOptions $generate)
    {
        $user = $request->user();
        $options = $generate($user);

        $request->session()->put('passkey.registration_options', WebAuthn::toJson($options));

        return response()->json(['options' => WebAuthn::toBrowserArray($options)]);
    }

    public function register(PasskeyRegistrationRequest $request, StorePasskey $store)
    {
        $user = $request->user();

        $passkey = $store(
            $user,
            $request->string('name')->toString() ?: 'Enrolled device',
            $request->credential(),
            $request->registrationOptions()
        );

        $user->forceFill(['bio_enrolled' => true])->save();

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'FINGERPRINT_ENROLLED',
            'entity_type' => 'User',
            'entity_id' => $user->id,
            'note' => "{$user->name} enrolled a biometric credential".($passkey->authenticator ? " ({$passkey->authenticator})" : ''),
        ]);

        return response()->json([
            'id' => $passkey->id,
            'name' => $passkey->name,
            'authenticator' => $passkey->authenticator,
            'created_at' => $passkey->created_at,
        ], 201);
    }

    public function index(Request $request)
    {
        return response()->json([
            'data' => $request->user()->passkeys()->latest()->get()->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'authenticator' => $p->authenticator,
                'last_used_at' => $p->last_used_at,
                'created_at' => $p->created_at,
            ]),
        ]);
    }

    public function destroy(Request $request, Passkey $passkey)
    {
        $user = $request->user();

        // The package's own route-model binding resolves {passkey} globally
        // (any user's row), so ownership has to be checked here explicitly —
        // 404 rather than 403 to avoid confirming another user's passkey ID exists.
        abort_unless($passkey->user_id === $user->id, 404);

        $passkey->delete();

        if (! $user->hasPasskeysEnabled()) {
            $user->forceFill(['bio_enrolled' => false])->save();
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'FINGERPRINT_REMOVED',
            'entity_type' => 'User',
            'entity_id' => $user->id,
            'note' => "{$user->name} removed a biometric credential ({$passkey->name})",
        ]);

        return response()->noContent();
    }
}
