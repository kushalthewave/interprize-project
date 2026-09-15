/**
 * AuthManager.js
 * One place that knows how a person gets into the game.
 *
 * Every trainee has an account: a name and an email address, checked by
 * validate.js. There is no guest route and no name-only route.
 *
 *   1. Create an account — name + email, then an avatar
 *   2. Log in            — the account's email, or a passkey if one is set up
 *
 * Plus optional TOTP as a second factor. Wrong emails and wrong codes are
 * both rate-limited (throttle.js), and an accepted code cannot be used twice.
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
import {
  registerPasskey, authenticateWithPasskey, passkeyAvailability, describePasskeyError,
} from './passkey.js';
import { randomBase32Secret } from './base32.js';
import { verifyTotp, otpauthURI, timingSafeEqual } from './totp.js';
import { validateName, validateEmail } from './validate.js';
import { createThrottle, describeWait } from './throttle.js';

const TOTP_PERIOD = 30;

export class AuthManager {
  /**
   * @param {import('../Profile.js').Profile} profile
   * @param {object} [o]
   * @param {{get:Function,set:Function}} [o.storage] where attempt counts live (tests pass memory)
   * @param {() => number} [o.now]
   */
  constructor(profile, { storage, now } = {}) {
    this.profile = profile;
    this.now = now ?? (() => Date.now());
    this.loginThrottle = createThrottle({ key: 'beat-the-hazard:throttle:login', storage, now: this.now });
    this.totpThrottle = createThrottle({ key: 'beat-the-hazard:throttle:totp', storage, now: this.now });
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
      /** The account saved on this device, if any. */
      account: this.profile.account,
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

  /* ---------------------------------------------------------------- *
   * Accounts: create and log in
   * ---------------------------------------------------------------- */

  /**
   * Check a new account before anything is written, and say what creating it
   * would do on this device.
   *
   *   conflict null         nothing is in the way
   *   conflict 'same-email' this device already has that account: log in
   *                         instead. Creating it again must never be a way
   *                         round the owner's two-factor code.
   *   conflict 'replace'    a different account lives here; creating this one
   *                         deletes it, so the screen asks first
   *   completing true       the signed-in trainee predates emails and is only
   *                         adding one; nothing is deleted
   *
   * @returns {{ok:false, field:'name'|'email', error:string} |
   *           {ok:true, name:string, email:string, conflict:null|'same-email'|'replace', existing:?string, completing:boolean}}
   */
  planAccount({ name, email }) {
    const n = validateName(name);
    if (!n.ok) return { ok: false, field: 'name', error: n.error };
    const e = validateEmail(email);
    if (!e.ok) return { ok: false, field: 'email', error: e.error };

    const p = this.profile;
    const base = { ok: true, name: n.value, email: e.value, conflict: null, existing: null, completing: false };
    if (p.isSignedIn && !p.data.email) return { ...base, completing: true };

    const acct = p.account;
    if (acct && timingSafeEqual(acct.email, e.value)) return { ...base, conflict: 'same-email', existing: acct.email };
    if (acct || p.hasLocalData) {
      return { ...base, conflict: 'replace', existing: acct?.email ?? p.remembered?.name ?? (p.name || null) };
    }
    return base;
  }

  /**
   * Create the account a plan describes. Returns the identity to commit.
   * @param {ReturnType<AuthManager['planAccount']>} plan
   * @param {{replace?:boolean, avatar?:string}} [o]
   */
  createAccount(plan, { replace = false, avatar } = {}) {
    if (!plan?.ok) throw new Error(plan?.error ?? 'Please check your details.');
    if (plan.conflict === 'same-email') {
      throw new Error('An account with this email is already saved on this device. Log in instead.');
    }
    if (plan.conflict === 'replace' && !replace) {
      throw new Error('Confirm that the account already on this device should be replaced.');
    }
    const p = this.profile;
    if (plan.completing) {
      p.data.email = plan.email;
      p.data.name = plan.name;
      p.save();
    } else {
      // Starts clean: no scores and no passkeys or authenticator from whoever
      // used this device before.
      p.createAccount({ name: plan.name, email: plan.email, avatar: avatar ?? p.avatar });
      this.loginThrottle.succeed();
      this.totpThrottle.succeed();
    }
    return { name: plan.name, avatar: p.avatar, provider: 'local', email: plan.email, method: 'account' };
  }

  /** The message for a locked log-in form, or null. */
  loginLock() {
    const st = this.loginThrottle.status();
    return st.locked ? `Too many attempts. Try again in ${describeWait(st.waitMs)}.` : null;
  }

  /**
   * Log in to the account saved on this device with its email address.
   * Nothing is written; the identity still goes through commit(), after the
   * second factor if one is set up.
   */
  identityForLogin(email) {
    const locked = this.loginLock();
    if (locked) throw new Error(locked);
    const e = validateEmail(email);
    // A typo in the format is not a guess, so it does not count as an attempt.
    if (!e.ok) throw new Error(e.error);

    const acct = this.profile.account;
    if (!acct || !timingSafeEqual(acct.email, e.value)) {
      const st = this.loginThrottle.fail();
      throw new Error(st.locked
        ? `Too many attempts. Try again in ${describeWait(st.waitMs)}.`
        : 'There is no account with that email on this device.');
    }
    this.loginThrottle.succeed();
    return { name: acct.name, avatar: acct.avatar, provider: 'local', email: acct.email, method: 'account' };
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
      account: this.profile.data.email || this.profile.name || 'Trainee',
      issuer: 'Beat The Hazard',
    });
    return { secret, uri };
  }

  /** Confirm enrolment by checking a code the app produced. */
  async confirmTotpEnrolment(secret, code) {
    const time = Math.floor(this.now() / 1000);
    const { valid, delta } = await verifyTotp(secret, code, { time });
    if (!valid) return false;
    this.security.totp = {
      secret,
      enrolledAt: this.now(),
      // The code used to confirm cannot then be used to sign in.
      lastCounter: Math.floor(time / TOTP_PERIOD) + delta,
    };
    this.profile.save();
    bus.emit(EV.TOAST, { message: 'Authenticator app connected', kind: 'ok' });
    return true;
  }

  /**
   * Check a code at sign-in time.
   *
   * Rate-limited: after 5 wrong codes the prompt locks, for longer each time.
   * A code that was accepted once is refused afterwards, so a code read over
   * someone's shoulder cannot be replayed in the same 90-second window.
   *
   * @returns {Promise<{ok:boolean, locked?:boolean, waitMs?:number, message?:string}>}
   */
  async verifyTotpCode(code) {
    if (!this.hasTotp) return { ok: true }; // not enrolled: nothing to check
    const lock = this.totpThrottle.status();
    if (lock.locked) {
      return { ok: false, locked: true, waitMs: lock.waitMs, message: `Too many wrong codes. Try again in ${describeWait(lock.waitMs)}.` };
    }

    const time = Math.floor(this.now() / 1000);
    const { valid, delta } = await verifyTotp(this.security.totp.secret, code, { time });
    const counter = valid ? Math.floor(time / TOTP_PERIOD) + delta : null;
    const replayed = valid && counter <= (this.security.totp.lastCounter ?? -Infinity);

    if (valid && !replayed) {
      this.totpThrottle.succeed();
      this.security.totp.lastCounter = counter;
      this.profile.save();
      return { ok: true };
    }
    const st = this.totpThrottle.fail();
    if (st.locked) {
      return { ok: false, locked: true, waitMs: st.waitMs, message: `Too many wrong codes. Try again in ${describeWait(st.waitMs)}.` };
    }
    return {
      ok: false,
      message: replayed
        ? 'That code has already been used. Wait for the next one in your app.'
        : 'That code is not right. Check the app and try again.',
    };
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
