/**
 * AuthManager: the sign-in model.
 *
 * Two real defects are pinned here:
 *   1. A name sign-in used to write the profile BEFORE the second factor was
 *      checked, so someone who typed their name and failed 2FA had already
 *      renamed the owner's profile.
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

const mk = () => {
  const profile = new Profile(new MemoryAdapter());
  return { profile, auth: new AuthManager(profile) };
};

beforeEach(() => {
  passkeyMock.result = null;
  passkeyMock.fail = null;
});

describe('Auth - identities are committed, not written on the way in', () => {
  it('identityForName does not touch the profile', () => {
    const { profile, auth } = mk();
    const id = auth.identityForName({ name: 'Kushal', avatar: 'aisha' });
    expect(id).toMatchObject({ name: 'Kushal', avatar: 'aisha', method: 'name' });
    expect(profile.isSignedIn).toBe(false);
    expect(profile.name).toBe('');
  });

  it('commit writes the identity and records the method', () => {
    const { profile, auth } = mk();
    auth.commit(auth.identityForName({ name: 'Kushal', avatar: 'james' }));
    expect(profile.isSignedIn).toBe(true);
    expect(profile.name).toBe('Kushal');
    expect(profile.avatar).toBe('james');
    expect(auth.security.lastMethod).toBe('name');
  });

  it('a failed second factor leaves the owner\'s profile exactly as it was', async () => {
    const { profile, auth } = mk();
    auth.commit(auth.identityForName({ name: 'Owner', avatar: 'sarah' }));
    const { secret } = auth.beginTotpEnrolment();
    await auth.confirmTotpEnrolment(secret, await totp(secret));
    profile.signOut();

    // Somebody else types a name and gets as far as the code prompt.
    const impostor = auth.identityForName({ name: 'Impostor', avatar: 'david' });
    expect(auth.needsSecondFactor(impostor)).toBe(true);
    expect(await auth.verifyTotpCode('000000')).toBe(false);

    // Nothing was committed, so nothing changed.
    expect(profile.name).toBe('');
    expect(profile.remembered.name).toBe('Owner');
    expect(profile.remembered.avatar).toBe('sarah');
  });
});

describe('Auth - second factor policy', () => {
  it('asks for nothing when no authenticator is enrolled', () => {
    const { auth } = mk();
    expect(auth.needsSecondFactor({ method: 'name' })).toBe(false);
  });

  it('asks for the code after a name or social sign-in', async () => {
    const { auth } = mk();
    const { secret } = auth.beginTotpEnrolment();
    await auth.confirmTotpEnrolment(secret, await totp(secret));
    for (const method of ['name', 'google', 'facebook', 'github']) {
      expect(auth.needsSecondFactor({ method })).toBe(true);
    }
  });

  it('does not ask again after a passkey, which is already two factors', async () => {
    const { auth } = mk();
    const { secret } = auth.beginTotpEnrolment();
    await auth.confirmTotpEnrolment(secret, await totp(secret));
    expect(auth.needsSecondFactor({ method: 'passkey' })).toBe(false);
  });
});

describe('Auth - passkeys restore the person they belong to', () => {
  it('records the owner when a passkey is enrolled', async () => {
    const { profile, auth } = mk();
    profile.signIn({ name: 'Kushal', avatar: 'aisha' });
    const cred = await auth.enrolPasskey();
    expect(cred.owner).toEqual({ name: 'Kushal', avatar: 'aisha' });
  });

  it('signs the owner back in after a sign-out, name and avatar intact', async () => {
    const { profile, auth } = mk();
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
    const { profile, auth } = mk();
    auth.security.passkeys = [{ id: 'old-cred', deviceLabel: 'Old', createdAt: 1 }];
    profile.signIn({ name: 'Sunita', avatar: 'maria' });
    profile.signOut();

    passkeyMock.result = { id: 'old-cred', verified: false };
    const identity = await auth.identityFromPasskey();
    expect(identity).toMatchObject({ name: 'Sunita', avatar: 'maria', method: 'passkey' });
  });

  it('refuses a credential that is not registered to this profile', async () => {
    const { profile, auth } = mk();
    profile.signIn({ name: 'Kushal' });
    await auth.enrolPasskey();
    passkeyMock.result = { id: 'someone-else', verified: false };
    await expect(auth.identityFromPasskey()).rejects.toThrow(/not registered/);
  });

  it('says so plainly when no passkey exists yet', async () => {
    const { auth } = mk();
    await expect(auth.identityFromPasskey()).rejects.toThrow(/No passkey/);
  });

  it('surfaces a cancelled prompt as an error rather than signing in', async () => {
    const { profile, auth } = mk();
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
    const { profile, auth } = mk();
    profile.signIn({ name: 'Kushal', avatar: 'james' });
    profile.signOut();
    return auth.capabilities().then((caps) => {
      expect(caps.remembered).toMatchObject({ name: 'Kushal', avatar: 'james' });
    });
  });

  it('lists every social provider with a reason when it is not configured', async () => {
    const { auth } = mk();
    const caps = await auth.capabilities();
    expect(caps.providers.map((p) => p.id).sort()).toEqual(['facebook', 'github', 'google']);
    for (const p of caps.providers) {
      if (!p.configured) expect(p.reason.length).toBeGreaterThan(5);
    }
  });
});
