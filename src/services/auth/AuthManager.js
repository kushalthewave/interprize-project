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
      /** Who signed out last, so the login screen can say "welcome back". */
      remembered: this.profile.remembered,
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
   *
   * Every route produces an *identity* first and commits it second. The gap
   * between the two is where the second factor sits: nothing about the
   * profile changes until the code has been checked. Previously the name was
   * written straight away, so someone who typed their own name and then
   * failed or abandoned the 2FA prompt had already renamed the owner's
   * profile.
   * ---------------------------------------------------------------- */

  /** @typedef {{name:string, avatar:string, provider:string, email:?string, picture?:?string, method:string}} Identity */

  /** The zero-friction path: a name and an avatar. */
  identityForName({ name, avatar }) {
    return { name, avatar, provider: 'local', email: null, method: 'name' };
  }

  /** @param {'google'|'facebook'|'github'} providerId */
  async identityFromProvider(providerId) {
    const provider = getProvider(providerId);
    if (!provider) throw new Error(`Unknown provider: ${providerId}`);
    if (!provider.configured) {
      throw new Error(provider.blockedReason || `${provider.label} is not configured on this build.`);
    }
    const account = await provider.signIn();
    return {
      name: account.name,
      avatar: this.profile.remembered?.avatar ?? this.profile.avatar,
      provider: account.provider,
      email: account.email,
      picture: account.picture ?? null,
      method: account.provider,
    };
  }

  /**
   * The return leg of a redirect-based provider (GitHub). Safe to call on
   * every boot; resolves to null when there is nothing to do.
   */
  async identityFromRedirect() {
    try {
      const account = await github.completeRedirect();
      if (!account) return null;
      return {
        name: account.name,
        avatar: this.profile.remembered?.avatar ?? this.profile.avatar,
        provider: 'github',
        email: account.email,
        picture: account.picture ?? null,
        method: 'github',
      };
    } catch (err) {
      bus.emit(EV.TOAST, { message: err.message, kind: 'error' });
      return null;
    }
  }

  /**
   * Does this identity still need the authenticator code?
   *
   * A passkey does not: it already requires the device *and* a fingerprint,
   * face or PIN, which is two factors on its own. Asking for a TOTP code on
   * top would add friction and no protection.
   */
  needsSecondFactor(identity) {
    return this.hasTotp && identity?.method !== 'passkey';
  }

  /** Write the identity to the profile. The only place a sign-in lands. */
  commit(identity) {
    this.profile.signIn({
      name: identity.name,
      avatar: identity.avatar,
      provider: identity.provider,
      email: identity.email ?? null,
    });
    if (identity.picture !== undefined) this.profile.data.picture = identity.picture;
    this.security.lastMethod = identity.method;
    this.profile.save();
    bus.emit(EV.TOAST, { message: `Welcome, ${this.profile.name}`, kind: 'ok' });
    return this.profile.data;
  }

  /** Kept for callers that want the old one-step behaviour (no 2FA gate). */
  signInWithName({ name, avatar }) {
    return this.commit(this.identityForName({ name, avatar }));
  }

  /* ---------------------------------------------------------------- *
   * Passkeys
   * ---------------------------------------------------------------- */

  /** Enrol a passkey for the current profile. */
  async enrolPasskey() {
    const name = this.profile.name || 'Trainee';
    try {
      const cred = await registerPasskey({ name });
      // Record whose passkey this is, so signing in with it later restores
      // this person rather than an anonymous "Trainee".
      cred.owner = { name, avatar: this.profile.avatar };
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

  /**
   * Unlock the saved profile with a passkey, returning the identity it
   * belongs to. Previously this checked the passkey and then left the profile
   * nameless and signed out — the menu said "Trainee" and a reload went
   * straight back to the login screen.
   */
  async identityFromPasskey() {
    if (!this.hasPasskey) throw new Error('No passkey has been set up on this device yet.');
    let known;
    try {
      const ids = this.security.passkeys.map((p) => p.id);
      const res = await authenticateWithPasskey(ids);
      known = this.security.passkeys.find((p) => p.id === res.id);
    } catch (err) {
      throw new Error(describePasskeyError(err));
    }
    if (!known) throw new Error('That passkey is not registered for this profile.');
    known.lastUsedAt = Date.now();

    const who = known.owner ?? this.profile.remembered ??
      (this.profile.name ? { name: this.profile.name, avatar: this.profile.avatar } : null);
    return {
      name: who?.name || 'Trainee',
      avatar: who?.avatar ?? this.profile.avatar,
      provider: 'passkey',
      email: who?.email ?? null,
      method: 'passkey',
    };
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
