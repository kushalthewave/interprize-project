/**
 * AuthManager: accounts, log-in and the second factor.
 *
 * Defects pinned here:
 *   1. A sign-in used to write the profile BEFORE the second factor was
 *      checked, so someone who failed 2FA had already changed the owner's
 *      profile.
 *   2. Passkey sign-in checked the passkey and then left the profile nameless
 *      and signed out — the menu said "Trainee" and a reload went back to
 *      the login screen.
 *
 * The WebAuthn ceremony itself needs real hardware, so passkey.js is mocked
 * and only the bookkeeping around it is tested.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const passkeyMock = vi.hoisted(() => ({ result: null, fail: null }));
vi.mock('../src/services/auth/passkey.js', () => ({
  passkeyAvailability: async () => ({ available: true, platform: true, reason: '' }),
  registerPasskey: async ({ name }) => ({ id: 'cred-1', deviceLabel: 'Test key', createdAt: 1, name }),
  authenticateWithPasskey: async () => {
    if (passkeyMock.fail) throw passkeyMock.fail;
    return passkeyMock.result;
  },
  describePasskeyError: (e) => e?.message ?? String(e),
}));

const { AuthManager } = await import('../src/services/auth/AuthManager.js');
const { Profile, MemoryAdapter } = await import('../src/services/Profile.js');
const { totp } = await import('../src/services/auth/totp.js');
const { memoryStorage } = await import('../src/services/auth/throttle.js');

/** A profile and auth manager with in-memory storage and a clock the test controls. */
const mk = () => {
  const clock = { t: Date.UTC(2026, 8, 15, 10, 0, 0) };
  const profile = new Profile(new MemoryAdapter());
  const auth = new AuthManager(profile, { storage: memoryStorage(), now: () => clock.t });
  return { profile, auth, clock };
};

/** Create and sign in to an account, as the Create account screen does. */
const signUp = (auth, name = 'Kushal Neupane', email = 'kushal@example.com', o = {}) => {
  const plan = auth.planAccount({ name, email });
  return auth.commit(auth.createAccount(plan, o));
};

beforeEach(() => {
  passkeyMock.result = null;
  passkeyMock.fail = null;
});

describe('Auth - creating an account', () => {
  it('checks the details before anything is written', () => {
    const { profile, auth, clock } = mk();
    expect(auth.planAccount({ name: 'K', email: 'kushal@example.com' })).toMatchObject({ ok: false, field: 'name' });
    expect(auth.planAccount({ name: 'Kushal', email: 'not-an-email' })).toMatchObject({ ok: false, field: 'email' });
    expect(auth.planAccount({ name: '<script>', email: 'a@b.co' })).toMatchObject({ ok: false, field: 'name' });
    expect(profile.isSignedIn).toBe(false);
  });

  it('creates the account with cleaned-up details and signs in', () => {
    const { profile, auth, clock } = mk();
    const plan = auth.planAccount({ name: '  Kushal   Neupane ', email: ' Kushal@Example.COM ' });
    expect(plan).toMatchObject({ ok: true, name: 'Kushal Neupane', email: 'kushal@example.com', conflict: null });
    auth.commit(auth.createAccount(plan));
    expect(profile.isSignedIn).toBe(true);
    expect(profile.name).toBe('Kushal Neupane');
    expect(profile.data.email).toBe('kushal@example.com');
    expect(auth.security.lastMethod).toBe('account');
  });

  it('will not create a second account for an email already on this device', () => {
    const { profile, auth, clock } = mk();
    signUp(auth);
    profile.signOut();
    const plan = auth.planAccount({ name: 'Someone Else', email: 'KUSHAL@example.com' });
    expect(plan.conflict).toBe('same-email');
    expect(() => auth.createAccount(plan, { replace: true })).toThrow(/Log in instead/);
    expect(profile.isSignedIn).toBe(false);
  });

  it('asks before replacing a different account, and then starts clean', async () => {
    const { profile, auth, clock } = mk();
    signUp(auth, 'Owner Person', 'owner@example.com');
    const { secret } = auth.beginTotpEnrolment();
    await auth.confirmTotpEnrolment(secret, await totp(secret, { time: Math.floor(clock.t / 1000) }));
    profile.data.stats.bestScore = 99;
    profile.setSetting('fov', 90);
    profile.signOut();

    const plan = auth.planAccount({ name: 'New Person', email: 'new@example.com' });
    expect(plan).toMatchObject({ conflict: 'replace', existing: 'owner@example.com' });
    expect(() => auth.createAccount(plan)).toThrow(/Confirm/);
    expect(profile.account.email).toBe('owner@example.com');

    auth.commit(auth.createAccount(plan, { replace: true }));
    expect(profile.name).toBe('New Person');
    // Nothing of the previous person survives: not their scores, not their authenticator.
    expect(profile.data.stats.bestScore).toBe(0);
    expect(auth.hasTotp).toBe(false);
    expect(profile.remembered).toBeNull();
    // Device preferences do.
    expect(profile.settings.fov).toBe(90);
  });

  it('lets a trainee from before emails add one without losing progress', () => {
    const { profile, auth, clock } = mk();
    profile.signIn({ name: 'Old Timer', avatar: 'james' });
    profile.data.stats.bestScore = 42;
    const plan = auth.planAccount({ name: 'Old Timer', email: 'old@example.com' });
    expect(plan.completing).toBe(true);
    auth.commit(auth.createAccount(plan));
    expect(profile.data.email).toBe('old@example.com');
    expect(profile.data.stats.bestScore).toBe(42);
    expect(profile.avatar).toBe('james');
  });
});

describe('Auth - logging in', () => {
  it('logs back in with the account email, case-insensitively', () => {
    const { profile, auth, clock } = mk();
    signUp(auth, 'Kushal Neupane', 'kushal@example.com');
    profile.setAvatar('aisha');
    profile.signOut();

    const id = auth.identityForLogin('  KUSHAL@example.com ');
    // Nothing is written until commit (the second factor sits between).
    expect(profile.isSignedIn).toBe(false);
    auth.commit(id);
    expect(profile.name).toBe('Kushal Neupane');
    expect(profile.avatar).toBe('aisha');
  });

  it('refuses an email that is not the account on this device', () => {
    const { profile, auth, clock } = mk();
    signUp(auth);
    profile.signOut();
    expect(() => auth.identityForLogin('someone@example.com')).toThrow(/no account/i);
    expect(profile.isSignedIn).toBe(false);
  });

  it('does not count a badly typed address as a guess', () => {
    const { profile, auth, clock } = mk();
    signUp(auth);
    profile.signOut();
    for (let i = 0; i < 10; i++) expect(() => auth.identityForLogin('not an email')).toThrow(/valid email/);
    expect(auth.loginLock()).toBeNull();
  });

  it('locks the form after five wrong emails, then unlocks after the wait', () => {
    const { profile, auth, clock } = mk();
    signUp(auth);
    profile.signOut();
    for (let i = 0; i < 4; i++) expect(() => auth.identityForLogin(`x${i}@example.com`)).toThrow(/no account/i);
    expect(() => auth.identityForLogin('x5@example.com')).toThrow(/Too many attempts/);
    // Even the right email is refused while locked.
    expect(() => auth.identityForLogin('kushal@example.com')).toThrow(/Too many attempts/);

    clock.t += 31_000;
    expect(auth.loginLock()).toBeNull();
    expect(auth.identityForLogin('kushal@example.com').name).toBe('Kushal Neupane');
  });

  it('keeps the signed-in trainee out of the log-in path entirely when there is no account', () => {
    const { auth, clock } = mk();
    expect(() => auth.identityForLogin('anyone@example.com')).toThrow(/no account/i);
  });
});

describe('Auth - identities are committed, not written on the way in', () => {
  it('a failed second factor leaves the owner\'s profile exactly as it was', async () => {
    const { profile, auth, clock } = mk();
    signUp(auth, 'Owner Person', 'owner@example.com');
    profile.setAvatar('sarah');
    const { secret } = auth.beginTotpEnrolment();
    await auth.confirmTotpEnrolment(secret, await totp(secret, { time: Math.floor(clock.t / 1000) }));
    profile.signOut();

    // Somebody who knows the email gets as far as the code prompt.
    const attempt = auth.identityForLogin('owner@example.com');
    expect(auth.needsSecondFactor(attempt)).toBe(true);
    expect((await auth.verifyTotpCode('000000')).ok).toBe(false);

    // Nothing was committed, so nothing changed.
    expect(profile.name).toBe('');
    expect(profile.remembered.name).toBe('Owner Person');
    expect(profile.remembered.avatar).toBe('sarah');
  });
});

describe('Auth - authenticator codes', () => {
  const enrol = async (auth, clock) => {
    const { secret } = auth.beginTotpEnrolment();
    const code = await totp(secret, { time: Math.floor(clock.t / 1000) });
    expect(await auth.confirmTotpEnrolment(secret, code)).toBe(true);
    return secret;
  };

  it('accepts the current code once', async () => {
    const { auth, clock } = mk();
    signUp(auth);
    const secret = await enrol(auth, clock);
    clock.t += 30_000; // the next code
    const code = await totp(secret, { time: Math.floor(clock.t / 1000) });
    expect((await auth.verifyTotpCode(code)).ok).toBe(true);
    // The same code again, within its window, is a replay.
    const again = await auth.verifyTotpCode(code);
    expect(again.ok).toBe(false);
    expect(again.message).toMatch(/already been used/);
  });

  it('will not accept the code that was used to set the authenticator up', async () => {
    const { auth, clock } = mk();
    signUp(auth);
    const secret = await enrol(auth, clock);
    const sameCode = await totp(secret, { time: Math.floor(clock.t / 1000) });
    expect((await auth.verifyTotpCode(sameCode)).ok).toBe(false);
  });

  it('locks after five wrong codes, even for the right one', async () => {
    const { auth, clock } = mk();
    signUp(auth);
    const secret = await enrol(auth, clock);
    clock.t += 30_000;
    for (let i = 0; i < 4; i++) expect((await auth.verifyTotpCode('000000')).locked).toBeFalsy();
    const fifth = await auth.verifyTotpCode('000000');
    expect(fifth).toMatchObject({ ok: false, locked: true });

    const right = await totp(secret, { time: Math.floor(clock.t / 1000) });
    expect((await auth.verifyTotpCode(right)).locked).toBe(true);

    clock.t += 31_000;
    const next = await totp(secret, { time: Math.floor(clock.t / 1000) });
    expect((await auth.verifyTotpCode(next)).ok).toBe(true);
  });
});

describe('Auth - second factor policy', () => {
  it('asks for nothing when no authenticator is enrolled', () => {
    const { auth, clock } = mk();
    expect(auth.needsSecondFactor({ method: 'account' })).toBe(false);
  });

  it('asks for the code after an email log-in', async () => {
    const { auth, clock } = mk();
    const { secret } = auth.beginTotpEnrolment();
    await auth.confirmTotpEnrolment(secret, await totp(secret, { time: Math.floor(clock.t / 1000) }));
    for (const method of ['account']) {
      expect(auth.needsSecondFactor({ method })).toBe(true);
    }
  });

  it('does not ask again after a passkey, which is already two factors', async () => {
    const { auth, clock } = mk();
    const { secret } = auth.beginTotpEnrolment();
    await auth.confirmTotpEnrolment(secret, await totp(secret, { time: Math.floor(clock.t / 1000) }));
    expect(auth.needsSecondFactor({ method: 'passkey' })).toBe(false);
  });
});

describe('Auth - passkeys restore the person they belong to', () => {
  it('records the owner when a passkey is enrolled', async () => {
    const { profile, auth, clock } = mk();
    profile.signIn({ name: 'Kushal', avatar: 'aisha' });
    const cred = await auth.enrolPasskey();
    expect(cred.owner).toEqual({ name: 'Kushal', avatar: 'aisha' });
  });

  it('signs the owner back in after a sign-out, name and avatar intact', async () => {
    const { profile, auth, clock } = mk();
    profile.signIn({ name: 'Kushal', avatar: 'aisha' });
    await auth.enrolPasskey();
    profile.signOut();
    expect(profile.isSignedIn).toBe(false);

    passkeyMock.result = { id: 'cred-1', verified: false };
    const identity = await auth.identityFromPasskey();
    auth.commit(identity);

    expect(profile.isSignedIn).toBe(true);
    expect(profile.name).toBe('Kushal');
    expect(profile.avatar).toBe('aisha');
    expect(auth.security.lastMethod).toBe('passkey');
  });

  it('falls back to the remembered identity for passkeys enrolled before owners were recorded', async () => {
    const { profile, auth, clock } = mk();
    auth.security.passkeys = [{ id: 'old-cred', deviceLabel: 'Old', createdAt: 1 }];
    profile.signIn({ name: 'Sunita', avatar: 'maria' });
    profile.signOut();

    passkeyMock.result = { id: 'old-cred', verified: false };
    const identity = await auth.identityFromPasskey();
    expect(identity).toMatchObject({ name: 'Sunita', avatar: 'maria', method: 'passkey' });
  });

  it('refuses a credential that is not registered to this profile', async () => {
    const { profile, auth, clock } = mk();
    profile.signIn({ name: 'Kushal' });
    await auth.enrolPasskey();
    passkeyMock.result = { id: 'someone-else', verified: false };
    await expect(auth.identityFromPasskey()).rejects.toThrow(/not registered/);
  });

  it('says so plainly when no passkey exists yet', async () => {
    const { auth, clock } = mk();
    await expect(auth.identityFromPasskey()).rejects.toThrow(/No passkey/);
  });

  it('surfaces a cancelled prompt as an error rather than signing in', async () => {
    const { profile, auth, clock } = mk();
    profile.signIn({ name: 'Kushal' });
    await auth.enrolPasskey();
    profile.signOut();
    passkeyMock.fail = new Error('The request was cancelled.');
    await expect(auth.identityFromPasskey()).rejects.toThrow(/cancelled/);
    expect(profile.isSignedIn).toBe(false);
  });
});

describe('Auth - login screen capabilities', () => {
  it('reports who signed out last, for the "welcome back" line', () => {
    const { profile, auth, clock } = mk();
    profile.signIn({ name: 'Kushal', avatar: 'james' });
    profile.signOut();
    return auth.capabilities().then((caps) => {
      expect(caps.remembered).toMatchObject({ name: 'Kushal', avatar: 'james' });
    });
  });
});
