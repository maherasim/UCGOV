<?php

namespace App\Http\Requests\Api;

use Laravel\Passkeys\Http\Requests\PasskeyVerificationRequest;

/**
 * Marking attendance is one atomic ceremony: prove you're physically at the UC
 * (lat/lng) AND prove it's really you (a WebAuthn assertion against your enrolled
 * fingerprint/Face ID). Extending PasskeyVerificationRequest gets the credential
 * parsing/validation and session-challenge lookup for free — see credential()
 * and verificationOptions() on the parent class.
 */
class MarkAttendanceRequest extends PasskeyVerificationRequest
{
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ];
    }
}
