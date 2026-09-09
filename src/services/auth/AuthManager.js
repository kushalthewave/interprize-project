/**
 * AuthManager.js
 * One place that knows how a person gets into the game.
 *
 * Four routes, in the order the login screen offers them:
 *   1. Passkey        — Windows Hello / Touch ID / Face ID, nothing typed
 *   2. Social sign-in — Google, Facebook (GitHub needs a backend)
 *   3. Name only      — the original zero-friction path, still the default
 *   4. Guest          — no name at all
 *
 * Plus optional TOTP as a second factor on top of any of them.
 *
 * ── Threat model, stated plainly ──────────────────────────────────────
 * There is no server. Everything below runs in the browser against data in
 * localStorage, so none of it is an authentication boundary against someone
 * with developer tools on this machine. What it genuinely provides:
 *
 *   • a real, standards-correct implementation of each mechanism
 *   • protection of a profile from casual access on a shared computer
 *   • a drop-in path to real security later — each method already produces
 *     exactly the artefact a server would verify
 *
 * The UI repeats this where it matters. Overstating it would be worse than
 * not having it.
 */
import { bus, EV } from '../../core/EventBus.js';
import { PROVIDERS, getProvider, github } from './providers.js';
import {
  registerPasskey, authenticateWithPasskey, passkeyAvailability, describePasskeyError,
} from './passkey.js';
import { randomBase32Secret } from './base32.js';
import { verifyTotp, otpauthURI } from './totp.js';

export class AuthManager {
  /** @param {import('../Profile.js').Profile} profile */
  constructor(profile) {
    this.profile = profile;
  }

  /* ---------------------------------------------------------------- *
   * Security state, stored on the profile
   * ---------------------------------------------------------------- */

  get security() {
    this.profile.data.security ??= {
      passkeys: [],
      totp: null,       // { secret, enrolledAt }
      lastMethod: null,
    };
    return this.profile.data.security;
  }

  get hasPasskey() { return this.security.passkeys.length > 0; }
  get hasTotp() { return !!this.security.totp?.secret; }

  /** Everything the login screen needs to decide what to render. */
  async capabilities() {
    const passkey = await passkeyAvailability();
    return {
      passkey: { ...passkey, enrolled: this.hasPasskey },
      totp: { enrolled: this.hasTotp },
      providers: PROVIDERS.map((p) => ({
        id: p.id,
        label: p.label,
        icon: p.icon,
        colour: p.colour,
        textColour: p.textColour,
        configured: p.configured,
        reason: p.configured ? '' : (p.blockedReason || 'Not configured on this build.'),
        setupHint: p.setupHint,
      })),
    };
  }

  /* ---------------------------------------------------------------- *
   * Sign-in routes
   * ---------------------------------------------------------------- */

  /** The original path: just a name and an avatar. */
  signInWithName({ name, avatar }) {
    this.profile.signIn({ name, avatar, provider: 'local' });
    this.security.lastMethod = 'name';
    this.profile.save();
    bus.emit(EV.TOAST, { message: `Welcome, ${this.profile.name}`, kind: 'ok' });
    return this.profile.data;
  }

  /** @param {'google'|'facebook'|'github'} providerId */
  async signInWithProvider(providerId) {
    const provider = getProvider(providerId);
    if (!provider) throw new Error(`Unknown provider: ${providerId}`);
    if (!provider.configured) {
      throw new Error(provider.blockedReason || `${provider.label} is not configured on this build.`);
    }

    const account = await provider.signIn();
    this.profile.signIn({
      name: account.name,
      avatar: this.profile.avatar,
      provider: account.provider,
      email: account.email,
    });
    this.security.lastMethod = account.provider;
    this.profile.data.picture = account.picture ?? null;
    this.profile.save();
    return account;
  }

  /**
   * Handle the return leg of a redirect-based provider (GitHub).
   * Safe to call on every boot; returns null when there is nothing to do.
   */
  async completeRedirectSignIn() {
    try {
      const account = await github.completeRedirect();
      if (!account) return null;
      this.profile.signIn({
        name: account.name,
        avatar: this.profile.avatar,
        provider: 'github',
        email: account.email,
      });
      this.security.lastMethod = 'github';
      this.profile.save();
      return account;
    } catch (err) {
      bus.emit(EV.TOAST, { message: err.message, kind: 'error' });
      return null;
    }
  }

  /* ---------------------------------------------------------------- *
   * Passkeys
   * ---------------------------------------------------------------- */

  /** Enrol a passkey for the current profile. */
  async enrolPasskey() {
    const name = this.profile.name || 'Trainee';
    try {
      const cred = await registerPasskey({ name });
      // Replace any existing entry for the same credential id.
      this.security.passkeys = [
        ...this.security.passkeys.filter((p) => p.id !== cred.id),
        cred,
      ];
      this.profile.save();
      bus.emit(EV.TOAST, { message: `Passkey added (${cred.deviceLabel})`, kind: 'ok' });
      return cred;
    } catch (err) {
      throw new Error(describePasskeyError(err));
    }
  }

  /** Unlock the saved profile with a passkey. */
  async signInWithPasskey() {
    if (!this.hasPasskey) throw new Error('No passkey has been set up on this device yet.');
    try {
      const ids = this.security.passkeys.map((p) => p.id);
      const res = await authenticateWithPasskey(ids);
      const known = this.security.passkeys.find((p) => p.id === res.id);
      if (!known) throw new Error('That passkey is not registered for this profile.');

      known.lastUsedAt = Date.now();
      this.security.lastMethod = 'passkey';
      this.profile.save();
      return { name: this.profile.name, method: 'passkey' };
    } catch (err) {
      throw new Error(describePasskeyError(err));
    }
  }

  removePasskey(id) {
    this.security.passkeys = this.security.passkeys.filter((p) => p.id !== id);
    this.profile.save();
  }

  /* ---------------------------------------------------------------- *
   * TOTP
   * ---------------------------------------------------------------- */

  /**
   * Start enrolment: make a secret and the otpauth URI for the QR code.
   * Nothing is saved until a code is confirmed, so a half-finished
   * enrolment cannot lock anyone out.
   */
  beginTotpEnrolment() {
    const secret = randomBase32Secret();
    const uri = otpauthURI({
      secret,
      account: this.profile.name || 'Trainee',
      issuer: 'Beat The Hazard',
    });
    return { secret, uri };
  }

  /** Confirm enrolment by checking a code the app produced. */
  async confirmTotpEnrolment(secret, code) {
    const { valid } = await verifyTotp(secret, code);
    if (!valid) return false;
    this.security.totp = { secret, enrolledAt: Date.now() };
    this.profile.save();
    bus.emit(EV.TOAST, { message: 'Authenticator app connected', kind: 'ok' });
    return true;
  }

  /** Check a code at sign-in time. */
  async verifyTotpCode(code) {
    if (!this.hasTotp) return true; // not enrolled: nothing to check
    const { valid } = await verifyTotp(this.security.totp.secret, code);
    return valid;
  }

  disableTotp() {
    this.security.totp = null;
    this.profile.save();
  }

  /* ---------------------------------------------------------------- *
   * Misc
   * ---------------------------------------------------------------- */

  signOut() {
    this.profile.signOut();
  }

  /**
   * Remove every credential. Used by "reset all progress" so a wiped profile
   * does not leave a passkey pointing at nothing.
   */
  clearCredentials() {
    this.profile.data.security = { passkeys: [], totp: null, lastMethod: null };
    this.profile.save();
  }
}
