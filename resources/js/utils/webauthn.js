import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser';
import client from '../api/client';

export { browserSupportsWebAuthn };

/**
 * @simplewebauthn/browser throws DOMException-flavored errors (NotAllowedError on
 * cancel/timeout, InvalidStateError on a device already enrolled, etc.) with technical
 * messages. Map the common ones to something a secretary in the field can act on.
 */
function friendlyBrowserError(err) {
    switch (err?.name) {
        case 'NotAllowedError':
            return 'Fingerprint verification was cancelled or timed out. Please try again.';
        case 'InvalidStateError':
            return 'This device is already enrolled.';
        case 'SecurityError':
            return 'Your browser blocked this for security reasons. Make sure you are on the official site.';
        default:
            return err?.message || 'Could not complete fingerprint verification. Please try again.';
    }
}

/**
 * Enrolls this device's platform authenticator (fingerprint/Face ID/Windows Hello) as
 * a real WebAuthn credential and stores it server-side. Throws a plain Error with a
 * user-facing message on any failure — API errors (e.g. name validation) pass through
 * with their original `response.data.message` shape so existing error handling still works.
 */
export async function enrollFingerprint(deviceName) {
    if (!browserSupportsWebAuthn()) {
        throw new Error('This device or browser does not support biometric verification.');
    }

    const { data } = await client.get('/api/passkeys/register-options');

    let registrationResponse;
    try {
        registrationResponse = await startRegistration({ optionsJSON: data.options });
    } catch (err) {
        throw new Error(friendlyBrowserError(err));
    }

    const { data: passkey } = await client.post('/api/passkeys', {
        name: deviceName || 'Enrolled device',
        credential: registrationResponse,
    });

    return passkey;
}

/**
 * Runs the WebAuthn assertion ceremony against the secretary's enrolled fingerprint and
 * returns the raw credential response — the caller combines it with lat/lng and POSTs to
 * mark-in, where the server does the actual cryptographic verification.
 */
export async function verifyFingerprint() {
    if (!browserSupportsWebAuthn()) {
        throw new Error('This device or browser does not support biometric verification.');
    }

    const { data } = await client.get('/api/sec/attendance/webauthn-options');

    try {
        return await startAuthentication({ optionsJSON: data.options });
    } catch (err) {
        throw new Error(friendlyBrowserError(err));
    }
}
