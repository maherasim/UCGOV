<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Laravel\Passkeys\Support\WebAuthn;
use Throwable;
use Webauthn\PublicKeyCredential;
use Webauthn\PublicKeyCredentialRequestOptions;

/**
 * Marking attendance is multipart/form-data (it carries a selfie photo), so the
 * WebAuthn credential — normally a nested JSON object — arrives as a single
 * JSON-encoded string field instead and gets decoded back into an array here.
 *
 * Unlike enrollment, the fingerprint check here is best-effort, not mandatory:
 * a secretary always enrolls once at first login, but a failed/skipped/unsupported
 * scan on any given day must never block marking attendance — GPS + the selfie
 * photo are what's actually required. See credential()/verificationOptions(),
 * which return null rather than failing validation when no credential was sent.
 */
class MarkAttendanceRequest extends FormRequest
{
    protected ?PublicKeyCredential $publicKeyCredential = null;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('credential'))) {
            $decoded = json_decode($this->input('credential'), true);
            $this->merge(['credential' => is_array($decoded) ? $decoded : null]);
        }
    }

    public function rules(): array
    {
        return [
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
            'credential' => ['nullable', 'array'],
            'credential.id' => ['required_with:credential', 'string'],
            'credential.rawId' => ['required_with:credential', 'string'],
            'credential.type' => ['required_with:credential', 'string', 'in:public-key'],
            'credential.response' => ['required_with:credential', 'array'],
        ];
    }

    protected function passedValidation(): void
    {
        if (! $this->filled('credential')) {
            return;
        }

        try {
            $this->publicKeyCredential = WebAuthn::fromJson(
                json_encode($this->input('credential')) ?: '{}',
                PublicKeyCredential::class
            );
        } catch (Throwable) {
            // Malformed credential — treated the same as "none sent" (soft-fail).
            $this->publicKeyCredential = null;
        }
    }

    public function credential(): ?PublicKeyCredential
    {
        return $this->publicKeyCredential;
    }

    /**
     * The verification challenge stashed by AttendanceController::webauthnOptions().
     * Null (not an exception) when missing/expired — callers must treat that as
     * "skip the fingerprint check," never as a hard failure.
     */
    public function verificationOptions(): ?PublicKeyCredentialRequestOptions
    {
        /** @var string|null $serialized */
        $serialized = $this->session()->pull('passkey.verification_options');

        if (! $serialized) {
            return null;
        }

        try {
            return WebAuthn::fromJson($serialized, PublicKeyCredentialRequestOptions::class);
        } catch (Throwable) {
            return null;
        }
    }
}
