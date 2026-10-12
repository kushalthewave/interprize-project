/**
 * client.js
 * A small Supabase client written with fetch, rather than the official SDK.
 *
 * Two reasons. The game has exactly one runtime dependency (Three.js) and
 * that is a security position worth keeping: every package added here ends up
 * in a trainee's browser. And the whole surface we need is four REST calls and
 * three auth calls, which is less code than the wiring to install a library.
 *
 * Configuration comes from the build (VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY). Both are public values: the anon key is designed to
 * ship in a page, and the database's row level security is what actually
 * protects the data. When neither is set the client reports `configured:
 * false` and every call throws a clear error, so the game runs exactly as it
 * does today with no database at all.
 */

const ENV = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export const config = {
  url: (ENV.VITE_SUPABASE_URL ?? '').replace(/\/+$/, ''),
  anonKey: ENV.VITE_SUPABASE_ANON_KEY ?? '',
};

/** Is there a database to talk to at all? */
export function isConfigured(c = config) {
  return Boolean(c.url && c.anonKey);
}

const SESSION_KEY = 'beat-the-hazard:db-session:v1';

/** Tokens live here between page loads. */
function readStored(storage) {
  try {
    const raw = storage?.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(storage, value) {
  try {
    if (value) storage?.setItem(SESSION_KEY, JSON.stringify(value));
    else storage?.removeItem(SESSION_KEY);
  } catch { /* private mode: the session simply does not survive a reload */ }
}

export class DbError extends Error {
  constructor(message, { status = 0, code = '' } = {}) {
    super(message);
    this.name = 'DbError';
    this.status = status;
    this.code = code;
  }
}

/** Supabase phrases its errors for developers; these are for trainees. */
function friendly(status, payload) {
  const raw = String(payload?.msg || payload?.message || payload?.error_description
    || payload?.error || payload?.hint || '').toLowerCase();

  if (raw.includes('already registered') || raw.includes('already been registered')) {
    return 'There is already an account with that email address. Log in instead.';
  }
  if (raw.includes('invalid login credentials')) {
    return 'That email and password do not match an account.';
  }
  if (raw.includes('password should be at least')) {
    return 'Your password needs to be at least 6 characters.';
  }
  if (raw.includes('email not confirmed')) {
    return 'Check your email and confirm the address before logging in.';
  }
  if (status === 429) return 'Too many attempts. Wait a minute and try again.';
  if (status >= 500) return 'The results service is not responding. Your progress is saved on this device.';
  return 'Could not reach the results service. Your progress is saved on this device.';
}

export class DbClient {
  /**
   * @param {object} [o]
   * @param {{url:string, anonKey:string}} [o.cfg]
   * @param {typeof fetch} [o.fetchImpl]
   * @param {Storage} [o.storage]
   * @param {() => number} [o.now]
   */
  constructor({ cfg = config, fetchImpl, storage, now = Date.now } = {}) {
    this.cfg = cfg;
    this.fetch = fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.storage = storage ?? (typeof localStorage === 'undefined' ? null : localStorage);
    this.now = now;
    this.session = readStored(this.storage);
  }

  get configured() { return isConfigured(this.cfg); }
  get signedIn() { return Boolean(this.session?.access_token); }
  get userId() { return this.session?.user?.id ?? null; }
  get email() { return this.session?.user?.email ?? null; }

  _require() {
    if (!this.configured) {
      throw new DbError('No results service is configured for this build.', { code: 'unconfigured' });
    }
    if (!this.fetch) {
      throw new DbError('This browser cannot make network requests.', { code: 'nofetch' });
    }
  }

  async _call(path, { method = 'GET', body, token, headers = {} } = {}) {
    this._require();
    let res;
    try {
      res = await this.fetch(`${this.cfg.url}${path}`, {
        method,
        headers: {
          apikey: this.cfg.anonKey,
          Authorization: `Bearer ${token ?? this.session?.access_token ?? this.cfg.anonKey}`,
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      // Offline, DNS failure, blocked by a firewall: all the same to us.
      throw new DbError('Could not reach the results service. Your progress is saved on this device.',
        { code: 'offline' });
    }

    const text = await res.text();
    const payload = text ? safeJson(text) : null;
    if (!res.ok) {
      throw new DbError(friendly(res.status, payload), {
        status: res.status,
        code: payload?.code ?? payload?.error_code ?? '',
      });
    }
    return payload;
  }

  /* ── Accounts ─────────────────────────────────────────────────────── */

  /** Create an account. The name is stored on the profile row by a trigger. */
  async signUp({ email, password, name }) {
    const out = await this._call('/auth/v1/signup', {
      method: 'POST',
      body: { email, password, data: { name } },
      token: this.cfg.anonKey,
    });
    // A project with email confirmation on returns a user and no session.
    if (out?.access_token) this._adopt(out);
    return { needsConfirmation: !out?.access_token, user: out?.user ?? null };
  }

  async signIn({ email, password }) {
    const out = await this._call('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password },
      token: this.cfg.anonKey,
    });
    this._adopt(out);
    await this.touchLastSeen();
    return this.session;
  }

  async signOut() {
    if (this.signedIn) {
      try { await this._call('/auth/v1/logout', { method: 'POST', body: {} }); } catch { /* local sign out still happens */ }
    }
    this.session = null;
    writeStored(this.storage, null);
  }

  _adopt(out) {
    this.session = {
      access_token: out.access_token,
      refresh_token: out.refresh_token,
      expires_at: this.now() + (out.expires_in ?? 3600) * 1000,
      user: { id: out.user?.id, email: out.user?.email, name: out.user?.user_metadata?.name ?? '' },
    };
    writeStored(this.storage, this.session);
  }

  /** Swap a refresh token for a new access token when the old one is stale. */
  async ensureFresh() {
    if (!this.session?.refresh_token) return false;
    if (this.session.expires_at - this.now() > 60_000) return true;
    try {
      const out = await this._call('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: { refresh_token: this.session.refresh_token },
        token: this.cfg.anonKey,
      });
      this._adopt(out);
      return true;
    } catch {
      // The refresh token has been revoked or expired: sign out quietly.
      this.session = null;
      writeStored(this.storage, null);
      return false;
    }
  }

  /* ── Data ─────────────────────────────────────────────────────────── */

  /** @param {object} row a row for public.sessions */
  async insertSession(row) {
    await this.ensureFresh();
    return this._call('/rest/v1/sessions', {
      method: 'POST',
      body: row,
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
    });
  }

  /** This trainee's rounds, newest first. */
  async mySessions({ limit = 50 } = {}) {
    await this.ensureFresh();
    const q = new URLSearchParams({
      select: 'played_at,mode,environment,difficulty,score,rank,correct,wrong,total_hazards,duration_s',
      order: 'played_at.desc',
      limit: String(limit),
    });
    return (await this._call(`/rest/v1/sessions?${q}`)) ?? [];
  }

  /** Admin only: every account with its totals. Row level security decides. */
  async adminAccounts() {
    await this.ensureFresh();
    const q = new URLSearchParams({ select: '*', order: 'created_at.desc' });
    return (await this._call(`/rest/v1/admin_overview?${q}`)) ?? [];
  }

  /** Admin only: one person's rounds. */
  async accountSessions(userId, { limit = 100 } = {}) {
    await this.ensureFresh();
    const q = new URLSearchParams({
      select: 'played_at,mode,environment,difficulty,score,rank,correct,total_hazards',
      user_id: `eq.${userId}`,
      order: 'played_at.desc',
      limit: String(limit),
    });
    return (await this._call(`/rest/v1/sessions?${q}`)) ?? [];
  }

  /**
   * Delete this account's data: the profile row, and every round with it
   * through the foreign key cascade. The policies allow a trainee to delete
   * their own rows and nothing else, so this can only ever remove your own.
   */
  async deleteMyData() {
    await this.ensureFresh();
    if (!this.userId) return;
    await this._call(`/rest/v1/profiles?id=eq.${this.userId}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
  }

  /** Mark this account as active now. Never worth failing a sign in over. */
  async touchLastSeen() {
    if (!this.userId) return;
    try {
      await this._call(`/rest/v1/profiles?id=eq.${this.userId}`, {
        method: 'PATCH',
        body: { last_seen: new Date(this.now()).toISOString() },
        headers: { Prefer: 'return=minimal' },
      });
    } catch { /* cosmetic */ }
  }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return { message: text }; }
}

/** The one client the game uses. */
export const db = new DbClient();
