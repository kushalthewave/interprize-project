/**
 * providers.js
 * Social sign-in providers.
 *
 * ── Why they are not all the same ─────────────────────────────────────
 * The game is a static site. That decides which providers can work:
 *
 *   Google   ✅ works with no backend. Google Identity Services returns a
 *               signed ID token (a JWT) straight to the browser.
 *   Facebook ✅ works with no backend, via the Facebook JS SDK.
 *   GitHub   ❌ cannot work with no backend. GitHub's token endpoint requires
 *               the client *secret*, and does not send CORS headers, so a
 *               browser cannot call it — and shipping a secret in JavaScript
 *               would publish it to everyone. It needs a small server-side
 *               exchange. The adapter below is ready for one and reports the
 *               situation honestly instead of failing mysteriously.
 *
 * A note on what "signed in" means here. Without a backend the ID token's
 * signature is NOT verified — we decode it to read the name and email. That is
 * fine for personalising a training profile, and it is what the app claims. It
 * would not be acceptable for anything that grants access to real data.
 *
 * Provider scripts are loaded lazily and only when configured, so the offline
 * single-file build never reaches the network.
 */

const env = (key) => {
  try {
    return import.meta.env?.[key] || '';
  } catch {
    return '';
  }
};

/**
 * Runtime configuration.
 *
 * Client IDs used to come only from `import.meta.env`, which meant they were
 * baked in at build time: enabling Google on the deployed site required editing
 * .env, rebuilding and redeploying. That is a poor experience for what is
 * really just one public string.
 *
 * They can now also be set from Settings -> Security at runtime and are kept in
 * localStorage. Runtime values win over build-time ones, so a deployed copy can
 * be configured in place without a rebuild.
 *
 * These are all PUBLIC identifiers - a Google Client ID is designed to be
 * visible in page source. No secret is ever stored here; GitHub's secret stays
 * on its server-side endpoint, which is exactly why GitHub needs one.
 */
const STORE_KEY = 'beat-the-hazard:auth-config:v1';

function readStored() {
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStored(obj) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

const FIELDS = {
  googleClientId: 'VITE_GOOGLE_CLIENT_ID',
  facebookAppId: 'VITE_FACEBOOK_APP_ID',
  githubClientId: 'VITE_GITHUB_CLIENT_ID',
  githubTokenEndpoint: 'VITE_GITHUB_TOKEN_ENDPOINT',
};

/** Live view of the configuration: stored value first, then build-time. */
export const CONFIG = {};
for (const [key, envKey] of Object.entries(FIELDS)) {
  Object.defineProperty(CONFIG, key, {
    enumerable: true,
    get() {
      const stored = readStored()[key];
      return (stored && String(stored).trim()) || env(envKey);
    },
  });
}

/** Save runtime configuration. Pass an empty string to clear a field. */
export function setAuthConfig(patch) {
  const current = readStored();
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in FIELDS)) continue;
    const value = String(v ?? '').trim();
    if (value) current[k] = value;
    else delete current[k];
  }
  return writeStored(current);
}

/** What has been set at runtime (for pre-filling the settings form). */
export function getStoredAuthConfig() {
  return readStored();
}

/** True when a field came from .env rather than the settings form. */
export function isFromBuild(key) {
  return !readStored()[key] && !!env(FIELDS[key]);
}

/** Load a third-party script once, resolving when it is ready. */
const scriptCache = new Map();
function loadScript(src) {
  if (scriptCache.has(src)) return scriptCache.get(src);
  const p = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${src}. Check your connection.`));
    document.head.appendChild(el);
  });
  scriptCache.set(src, p);
  return p;
}

/** Decode a JWT payload. Does NOT verify the signature — see the note above. */
export function decodeJwtPayload(token) {
  const part = String(token).split('.')[1];
  if (!part) throw new Error('Malformed token.');
  const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
  // The payload is UTF-8; atob gives Latin-1, so re-decode it properly.
  const bytes = Uint8Array.from(json, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/* ================================================================== *
 * Google — works client-side
 * ================================================================== */
export const google = {
  id: 'google',
  label: 'Continue with Google',
  icon: 'G',
  colour: '#ffffff',
  textColour: '#1f1f1f',

  get configured() { return !!CONFIG.googleClientId; },

  setupHint:
    'Create a free OAuth 2.0 Client ID at console.cloud.google.com → APIs & Services → ' +
    'Credentials. Add this site to "Authorised JavaScript origins", then put the ID in ' +
    '.env as VITE_GOOGLE_CLIENT_ID.',

  async signIn() {
    if (!this.configured) throw new Error('Google sign-in is not configured on this build.');
    await loadScript('https://accounts.google.com/gsi/client');
    if (!window.google?.accounts?.id) throw new Error('Google Identity Services failed to load.');

    return new Promise((resolve, reject) => {
      let settled = false;
      window.google.accounts.id.initialize({
        client_id: CONFIG.googleClientId,
        callback: (response) => {
          settled = true;
          try {
            const p = decodeJwtPayload(response.credential);
            resolve({
              provider: 'google',
              id: p.sub,
              name: p.name || p.given_name || 'Trainee',
              email: p.email ?? null,
              picture: p.picture ?? null,
              verified: false, // signature not checked without a server
            });
          } catch (err) {
            reject(new Error(`Could not read the Google response: ${err.message}`));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.prompt((notification) => {
        // If the One Tap prompt cannot be shown, say so rather than hanging.
        if (settled) return;
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          reject(new Error(
            'Google did not show the sign-in prompt. This usually means the site origin is not ' +
            'in the Authorised JavaScript origins list for this Client ID.',
          ));
        }
      });
    });
  },
};

/* ================================================================== *
 * Facebook — works client-side
 * ================================================================== */
export const facebook = {
  id: 'facebook',
  label: 'Continue with Facebook',
  icon: 'f',
  colour: '#1877f2',
  textColour: '#ffffff',

  get configured() { return !!CONFIG.facebookAppId; },

  setupHint:
    'Create a free app at developers.facebook.com, add the "Facebook Login" product, ' +
    'add this site to "Valid OAuth Redirect URIs", then put the App ID in .env as ' +
    'VITE_FACEBOOK_APP_ID.',

  async signIn() {
    if (!this.configured) throw new Error('Facebook sign-in is not configured on this build.');
    await loadScript('https://connect.facebook.net/en_US/sdk.js');
    if (!window.FB) throw new Error('The Facebook SDK failed to load.');

    window.FB.init({ appId: CONFIG.facebookAppId, cookie: true, xfbml: false, version: 'v19.0' });

    return new Promise((resolve, reject) => {
      window.FB.login((res) => {
        if (res.status !== 'connected') {
          reject(new Error('Facebook sign-in was cancelled.'));
          return;
        }
        window.FB.api('/me', { fields: 'id,name,email,picture' }, (me) => {
          if (!me || me.error) {
            reject(new Error(me?.error?.message || 'Could not read the Facebook profile.'));
            return;
          }
          resolve({
            provider: 'facebook',
            id: me.id,
            name: me.name || 'Trainee',
            email: me.email ?? null,
            picture: me.picture?.data?.url ?? null,
            verified: false,
          });
        });
      }, { scope: 'public_profile,email' });
    });
  },
};

/* ================================================================== *
 * GitHub — needs a backend
 * ================================================================== */
export const github = {
  id: 'github',
  label: 'Continue with GitHub',
  icon: '⌥',
  colour: '#24292f',
  textColour: '#ffffff',

  // Only usable when BOTH a client id and a server-side exchange endpoint
  // exist. A client id alone cannot complete the flow in a browser.
  get configured() {
    return !!CONFIG.githubClientId && !!CONFIG.githubTokenEndpoint;
  },

  get blockedReason() {
    if (!CONFIG.githubClientId) return 'No GitHub Client ID configured.';
    if (!CONFIG.githubTokenEndpoint) {
      return 'GitHub needs a small server endpoint to exchange the code for a token — ' +
        'a browser cannot do it, because the exchange requires the client secret.';
    }
    return '';
  },

  setupHint:
    'GitHub cannot complete OAuth in the browser alone. Register an OAuth App at ' +
    'github.com/settings/developers, then deploy a one-function endpoint (Cloudflare ' +
    'Workers, Netlify or Vercel all have free tiers) that swaps ?code= for the user ' +
    'profile using your client secret. Put the URL in .env as VITE_GITHUB_TOKEN_ENDPOINT.',

  /** Step 1: send the browser to GitHub. */
  beginRedirect() {
    if (!CONFIG.githubClientId) throw new Error(this.blockedReason);
    const state = crypto.randomUUID();
    sessionStorage.setItem('bth:github:state', state);
    const params = new URLSearchParams({
      client_id: CONFIG.githubClientId,
      redirect_uri: window.location.origin + window.location.pathname,
      scope: 'read:user user:email',
      state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  },

  /** Step 2: on return, hand ?code= to the configured server endpoint. */
  async completeRedirect() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code) return null;

    const expected = sessionStorage.getItem('bth:github:state');
    sessionStorage.removeItem('bth:github:state');
    // Clean the URL so a refresh does not retry a spent code.
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());

    if (!expected || state !== expected) {
      throw new Error('GitHub sign-in failed a security check (state mismatch).');
    }
    if (!CONFIG.githubTokenEndpoint) throw new Error(this.blockedReason);

    const res = await fetch(CONFIG.githubTokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw new Error(`The GitHub exchange endpoint returned ${res.status}.`);
    const me = await res.json();
    return {
      provider: 'github',
      id: String(me.id),
      name: me.name || me.login || 'Trainee',
      email: me.email ?? null,
      picture: me.avatar_url ?? null,
      verified: true, // a server did the exchange, so this one is real
    };
  },

  async signIn() {
    if (!this.configured) throw new Error(this.blockedReason);
    this.beginRedirect();
    // The page navigates away; this never resolves.
    return new Promise(() => {});
  },
};

export const PROVIDERS = [google, github, facebook];

export function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}
