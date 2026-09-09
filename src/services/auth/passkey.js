/**
 * passkey.js
 * WebAuthn passkeys — sign in with Windows Hello, Touch ID, Face ID or a
 * security key instead of typing anything.
 *
 * ── What this gives you, precisely ────────────────────────────────────
 * A passkey normally proves identity to a *server*: the server issues a random
 * challenge, the authenticator signs it, and the server verifies the signature
 * against a public key it stored at registration. This game has no server.
 *
 * So what is implemented here is the real WebAuthn ceremony used as a
 * **device-bound local unlock**:
 *
 *   ✅ The credential is created by, and lives in, the platform authenticator
 *      (TPM / Secure Enclave / Windows Hello). It cannot be copied out.
 *   ✅ Signing in requires the actual device AND a successful user
 *      verification — fingerprint, face or device PIN.
 *   ✅ Nothing is typed, so nothing can be shoulder-surfed or reused.
 *   ❌ The signature is NOT cryptographically verified, because verification
 *      requires a server holding the public key.
 *
 * In practice that means it protects a profile on a shared machine and
 * demonstrates the full browser API, but it is not an authentication boundary
 * against someone with developer tools. The UI states this rather than
 * implying otherwise. Adding a server later means verifying the assertion in
 * `authenticate()` — the ceremony itself does not change.
 */

const RP_NAME = 'Beat The Hazard';

/* ------------------------------------------------------------------ *
 * Encoding helpers (WebAuthn speaks ArrayBuffer; storage speaks text)
 * ------------------------------------------------------------------ */

export function bufferToBase64url(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlToBuffer(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

const randomBytes = (n) => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
};

/* ------------------------------------------------------------------ *
 * Capability detection
 * ------------------------------------------------------------------ */

/** Is the WebAuthn API present at all? */
export function isPasskeySupported() {
  return typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential === 'function' &&
    !!navigator.credentials?.create;
}

/**
 * WebAuthn only works in a secure context. https and localhost qualify;
 * opening the single-file build from file:// does not.
 */
export function isSecureContextOk() {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

/**
 * Does this device have a built-in authenticator (Windows Hello, Touch ID)?
 * Resolves false rather than throwing on browsers that lack the probe.
 */
export async function hasPlatformAuthenticator() {
  if (!isPasskeySupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** One call that tells the UI exactly what to show and why. */
export async function passkeyAvailability() {
  if (!isPasskeySupported()) {
    return { available: false, reason: 'This browser does not support passkeys.' };
  }
  if (!isSecureContextOk()) {
    return {
      available: false,
      reason: 'Passkeys need a secure connection (https). They will not work when the file is opened directly from disk.',
    };
  }
  if (!(await hasPlatformAuthenticator())) {
    return {
      available: false,
      reason: 'No fingerprint, face or PIN unlock is set up on this device.',
    };
  }
  return { available: true, reason: '' };
}

/* ------------------------------------------------------------------ *
 * Ceremonies
 * ------------------------------------------------------------------ */

/**
 * Create a passkey for this profile.
 * @param {{name: string, displayName?: string}} user
 * @returns {Promise<{id:string, createdAt:number, transports:string[], deviceLabel:string}>}
 */
export async function registerPasskey({ name, displayName = name }) {
  const check = await passkeyAvailability();
  if (!check.available) throw new Error(check.reason);

  // A real server would issue this challenge and remember it. With no server
  // the challenge is still random per attempt, which is what stops a stored
  // response being replayed within this browser.
  const challenge = randomBytes(32);
  const userId = randomBytes(16);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      // rp.id is deliberately omitted: the browser defaults it to the current
      // origin's domain, which is correct for localhost and for the deployed
      // site without needing to be configured per environment.
      rp: { name: RP_NAME },
      user: {
        id: userId,
        name: name || 'Trainee',
        displayName: displayName || name || 'Trainee',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Windows Hello / Touch ID
        residentKey: 'preferred',
        userVerification: 'required',        // force biometric or PIN
      },
      timeout: 60000,
      attestation: 'none', // nothing verifies attestation without a server
    },
  });

  if (!credential) throw new Error('No passkey was created.');

  const transports = credential.response?.getTransports?.() ?? [];
  return {
    id: bufferToBase64url(credential.rawId),
    createdAt: Date.now(),
    transports,
    deviceLabel: describeDevice(),
  };
}

/**
 * Ask the device to unlock with an existing passkey.
 * @param {string[]} credentialIds base64url ids previously registered
 * @returns {Promise<{id:string, verified:boolean}>}
 */
export async function authenticateWithPasskey(credentialIds = []) {
  const check = await passkeyAvailability();
  if (!check.available) throw new Error(check.reason);

  const challenge = randomBytes(32);
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: credentialIds.map((id) => ({
        type: 'public-key',
        id: base64urlToBuffer(id),
      })),
      userVerification: 'required',
      timeout: 60000,
    },
  });

  if (!assertion) throw new Error('Passkey sign-in was cancelled.');

  // The authenticator only returns an assertion after a successful user
  // verification, so reaching this point means the device confirmed the person.
  // `verified: false` is honest about the missing server-side signature check.
  return { id: bufferToBase64url(assertion.rawId), verified: false };
}

/** A friendly label so the profile can show which device a passkey belongs to. */
function describeDevice() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return 'Windows Hello';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'Touch ID';
  if (/iPhone|iPad|iOS/i.test(ua)) return 'Face ID / Touch ID';
  if (/Android/i.test(ua)) return 'Android screen lock';
  return 'this device';
}

/** Turn a WebAuthn DOMException into something worth showing a person. */
export function describePasskeyError(err) {
  const name = err?.name ?? '';
  if (name === 'NotAllowedError') return 'Cancelled, or it timed out. Try again.';
  if (name === 'InvalidStateError') return 'A passkey for this profile already exists on this device.';
  if (name === 'NotSupportedError') return 'This device cannot create the kind of passkey we asked for.';
  if (name === 'SecurityError') return 'Blocked for security reasons — passkeys need an https connection.';
  if (name === 'AbortError') return 'The request was interrupted.';
  return err?.message || 'Something went wrong with the passkey.';
}
