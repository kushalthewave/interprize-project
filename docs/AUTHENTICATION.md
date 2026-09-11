# Authentication

Four ways in, plus an optional second factor. All of it free, none of it
requiring a paid service.

| Method | Works with no backend? | What it actually proves |
|---|---|---|
| **Passkey** (WebAuthn) | ⚠️ Partly | Possession of *this device* + a successful fingerprint / face / PIN check |
| **Google** | ✅ Yes | A Google account signed in on this browser |
| **Facebook** | ✅ Yes | A Facebook account signed in on this browser |
| **GitHub** | ❌ No | Needs a server; disabled and explained until one is configured |
| **Name only** | ✅ Yes | Nothing — it is a label, and always has been |
| **TOTP** (authenticator app) | ⚠️ Partly | Possession of the enrolled app |

---

## Read this before claiming it is "secure"

**The game has no backend.** It is a static site. Everything below runs in the
browser against data in `localStorage`.

That has a hard consequence: **none of this is an authentication boundary
against someone with developer tools on the same machine.** They could read the
TOTP secret or edit the stored profile. Saying otherwise would be teaching the
wrong lesson in a product about safety.

What it genuinely is:

- a **correct** implementation of each standard, pinned by the official test vectors
- **real protection against casual access** — a colleague on a shared warehouse PC
  cannot open your profile without your fingerprint or your phone
- a **drop-in path to real security**, because each method already produces
  exactly the artefact a server would verify

The in-game UI repeats these limits where a user would otherwise assume more.

---

## How a sign-in actually happens

Every route produces an **identity** first and **commits** it second:

```
passkey / Google / Facebook / GitHub / name
            │
            ▼
      identity { name, avatar, provider, method }
            │
   2FA enrolled and not a passkey? ── yes ──► 6-digit code ──✗──► back to login,
            │ no                                  │ ✓            profile untouched
            ▼                                     ▼
                     commit → profile → menu
```

The gap between the two is where the second factor sits. This fixed a real
defect: the name used to be written *before* the code was checked, so somebody
who typed their own name and then failed or abandoned the 2FA prompt had already
renamed the owner's profile.

**A passkey skips the TOTP prompt.** It already requires the device *and* a
fingerprint, face or PIN — two factors on its own. Asking for a code on top
added friction and no protection.

**Signing out remembers who you were.** The login screen then says *"Welcome
back, Kushal"*, pre-fills the name and avatar, and labels the passkey button
*"Sign in as Kushal with your passkey"*.

---

## 1. Passkeys (WebAuthn)

Sign in with Windows Hello, Touch ID, Face ID or a security key. Nothing typed.

**Where:** the top button on the login screen; enrol from **Settings →
Security**.

**Whose passkey it is.** Each passkey records its owner's name and avatar when it
is enrolled. Signing in with it restores that person. Previously a passkey
sign-in verified the credential and then left the profile nameless and signed
out — the menu said "Trainee" and a reload returned to the login screen.

**How it works here.** The full WebAuthn ceremony runs: a random challenge, a
credential created inside the platform authenticator (TPM / Secure Enclave), and
`userVerification: 'required'` so a biometric or PIN is compulsory. The private
key never leaves the device and cannot be exported.

**The gap.** Normally a server verifies the signed assertion against a public
key it stored at registration. With no server, we accept the fact that the
authenticator *produced* an assertion — which means the device is present and
the person passed verification. We do not verify the signature.
`authenticateWithPasskey()` returns `verified: false` to keep that explicit.

**You do NOT need Windows Hello.** An earlier version gated this on
`isUserVerifyingPlatformAuthenticatorAvailable()`, which meant every desktop
without a fingerprint reader saw "Passkeys unavailable". That was wrong:
WebAuthn also supports **your phone** (scan a QR — the hybrid transport) and
**USB security keys**. When no built-in authenticator is present, the
`authenticatorAttachment` constraint is dropped so the browser offers
everything it can. The credential's reported transports then label it
correctly: "Phone or tablet", "Security key", or "Windows Hello".

**Requirements.** A secure context (`https` or `localhost`). It will not work
from `file://`, so the standalone single-file build reports passkeys as
unavailable and says why. Use the online version for passkeys.

**To make it real:** verify the assertion server-side in
`AuthManager.signInWithPasskey()`. The ceremony does not change.

---

## 2. Social sign-in

### Google — works today, no backend

> **You do not need to edit `.env` or redeploy — or even sign in first.** Press
> **Set up** on the Google button on the login screen, paste the Client ID, press
> *Save & enable*, and the button works immediately. (The same form is also in
> **Settings → Security → Social sign-in**.) The panel also shows the exact
> origin URL to paste into Google's console. `.env` still works and is the
> better choice for a shared deployment; the in-app route is per-browser.

1. <https://console.cloud.google.com> → **APIs & Services → Credentials**
2. **Create Credentials → OAuth client ID → Web application**
3. Under *Authorised JavaScript origins* add both:
   - `http://localhost:5173`
   - `https://kushalthewave.github.io`
4. Copy the Client ID into `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```
5. Restart the dev server. The button activates by itself.

There is **no client secret** in this flow, which is exactly why it can run in a
browser. Google returns a signed ID token (a JWT); we decode it for the name and
email.

> ⚠️ We do **not** verify the JWT signature — that needs a server to fetch
> Google's public keys. Fine for personalising a training profile; not
> acceptable for granting access to real data.

### Facebook — works today, no backend

<https://developers.facebook.com> → create an app → add **Facebook Login** → add
this site under *Valid OAuth Redirect URIs* → put the App ID in
`VITE_FACEBOOK_APP_ID`.

### GitHub — needs a small backend

GitHub cannot be done from a browser alone, for two independent reasons:

1. The token exchange requires the **client secret**. Anything in front-end
   JavaScript is public, so shipping it would leak it to everybody.
2. GitHub's token endpoint sends **no CORS headers**, so a browser is blocked
   from calling it regardless.

The adapter is written and waiting. To enable it, deploy a one-function endpoint
that accepts `{ code }` and returns the GitHub profile:

```js
// Cloudflare Worker / Netlify Function / Vercel — all have free tiers
export default async function handler(request) {
  const { code } = await request.json();

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET, // stays on the server
      code,
    }),
  });
  const { access_token } = await tokenRes.json();

  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'beat-the-hazard' },
  });
  return new Response(await userRes.text(), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
```

Then set both:

```
VITE_GITHUB_CLIENT_ID=Iv1.xxxxxxxx
VITE_GITHUB_TOKEN_ENDPOINT=https://your-worker.workers.dev/github
```

Until then the button is visibly disabled and states the reason. It is never a
button that silently fails.

Because a server does the exchange, GitHub is the **only** provider that returns
`verified: true`.

---

## 3. Authenticator apps (TOTP)

A 6-digit code from Google Authenticator, Authy, 1Password, Microsoft
Authenticator — any RFC 6238 app.

**Enrol:** Settings → Security → *Set up two-factor*. Scan the QR, or type the
key by hand, then enter one code to confirm. Nothing is saved until a code
verifies, so a half-finished setup cannot lock you out.

**Then:** every sign-in asks for a code before reaching the menu.

### Implementation

| Piece | Detail |
|---|---|
| Algorithm | HMAC-SHA1, 6 digits, 30-second period — the defaults every app assumes |
| Crypto | Web Crypto (`crypto.subtle`) — no dependency, nothing to keep patched |
| Secret | 160-bit, from `crypto.getRandomValues`, Base32 (RFC 4648) |
| Drift | ±1 step accepted, so a phone a few seconds off still works |
| QR | Encoder **written from scratch** (`src/services/auth/qr.js`) so the offline build needs no CDN |

### How correctness is established

Not by inspection — by test vectors and a round trip:

- **RFC 4226 Appendix D** — all 10 HOTP vectors
- **RFC 6238 Appendix B** — all 6 TOTP vectors
- **RFC 4648** — all 7 Base32 vectors
- **QR round trip** — every generated code is decoded again by `jsQR`, an
  independent decoder, including **100 random secrets** and every version the
  encoder selects. `jsQR` is a devDependency used only in tests; it is not in
  the bundle.

That round trip earned its keep: it caught a real bug where the format
information was written transposed — row 8 instead of column 8. The matrix
looked perfectly well-formed and no scanner on earth would have read it.

---

## Where the code lives

```
src/services/auth/
├── AuthManager.js   orchestration: sign-in routes, enrolment, 2FA gate
├── providers.js     Google / Facebook / GitHub adapters
├── passkey.js       WebAuthn ceremonies + capability detection
├── totp.js          RFC 6238 / RFC 4226
├── base32.js        RFC 4648
└── qr.js            QR encoder (ISO/IEC 18004)

src/ui/AuthScreens.js   login, 2FA prompt, enrolment, security panel
```

Tests: `tests/totp.test.js` (53), `tests/qr.test.js` (17).

## Verified

| Check | Result |
|---|---|
| Login screen offers all four routes with honest availability | ✅ |
| Name sign-in → menu shows name and chosen avatar | ✅ |
| Sign-out → "Welcome back", name and avatar pre-filled | ✅ |
| Wrong 2FA code after typing a different name leaves the owner's profile untouched | ✅ |
| Passkey sign-in restores the owner's name and avatar, survives reload (mocked authenticator) | ✅ |
| Passkey sign-in does not ask for a TOTP code | ✅ |
| Returning user's 2FA screen offers "Use my passkey instead" | ✅ |
| Unconfigured provider opens its setup form on the login screen; saving enables the button | ✅ |
| Unconfigured providers disabled with the reason shown | ✅ |
| TOTP enrolment: QR renders, secret shown for manual entry | ✅ |
| Wrong enrolment code rejected | ✅ |
| Correct enrolment code accepted and persisted | ✅ |
| Sign-in with 2FA on routes to the code prompt, not the menu | ✅ |
| Wrong code at sign-in keeps the gate closed and shows an error | ✅ |
| Correct code reaches the menu | ✅ |
| Passkeys report unavailability with a specific reason | ✅ |
| Passkey offered without a built-in authenticator | ✅ Now shows "Set up a passkey" instead of "unavailable" |
| Provider enabled at runtime from Settings | ✅ Google button goes live with no rebuild |
| GitHub still refused with only a Client ID | ✅ Correctly needs the endpoint too |
| Passkey ceremony on real hardware | ⬜ **Not tested** — no authenticator on the test machine |
| Google / Facebook against live servers | ⬜ **Not tested** — no credentials configured |
| GitHub end to end | ⬜ **Not tested** — needs the backend endpoint |
