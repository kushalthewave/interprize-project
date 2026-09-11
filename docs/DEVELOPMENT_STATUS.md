# Development Status

**Last updated:** 2026-09-11
**Overall:** ✅ **COMPLETE and working** for the specified scope, with the
limitations below stated honestly.

---

## Health

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ passing, 2.6 s |
| Tests (`npm test`) | ✅ **204 / 204 passing** (8 suites) |
| Syntax gate | ✅ 47 files, 0 errors |
| App boots | ✅ no console errors |
| Playthrough, all 3 environments | ✅ every hazard reachable |
| Performance | ✅ 60 fps, 1,520 draw calls |

---

## Latest changes (2026-09-11)

### Sign-in — every route re-tested and fixed
- **Passkey sign-in did not sign you in.** It checked the passkey, then left the
  profile nameless — the menu said "Trainee" and a reload went back to login.
  Passkeys now record whose they are and restore that name and avatar.
- **A failed 2FA code renamed the owner's profile.** The name was written before
  the code was checked. Sign-in is now *identity first, commit after the code*.
- **Social buttons were dead ends.** Unconfigured Google / Facebook / GitHub
  buttons were greyed out, and the only place to configure them was behind a
  sign-in. They now open their setup form on the login screen.
- The login screen says **"Welcome back, Kushal"** and pre-fills the name and
  avatar after a sign-out.
- A passkey no longer triggers a TOTP prompt (it is already two factors); the
  2FA screen for a returning user offers **"Use my passkey instead"**.
- Removed a dead second login screen in `Screens.js` that called actions which
  no longer existed.

### Train Mode — no clock, a guide to every hazard
- The clock is gone from Train Mode entirely.
- The first hazard and its location are named from the first frame.
- A HUD compass (arrow + distance), the location in words, and a column of light
  over the spot lead to the **nearest** unfound hazard.

### Test Mode — five minutes, no locations, never locked
- One fixed **5:00** round on every difficulty; amber at 1:00, red at 0:30.
- No guide and no locations, in the round or on the results screen.
- Test Mode is open from the start: training is optional.

### Avatars — five team leads, and you can see yourself
- Sarah, David, Maria, James and Aisha, drawn as inline SVG.
- Your avatar appears in the login preview, the menu, the profile, the results
  screen and a player card in the HUD for the whole round.

### Verification
- Every sign-in route driven in the running app, including a mocked
  authenticator for the passkey path.
- Train guide bearing checked at 0°, ±90° and 180°; guide moves to the
  next-nearest hazard after a find.
- Test clock run to expiry: ends at exactly 5:00 with no locations shown.
- 204 / 204 tests; production and single-file builds pass.

---

## COMPLETED

### Foundation
- Vite 7 + Three.js 0.180 + Vitest 3, vanilla ES modules
- `scripts/syntax-check.mjs` — esbuild syntax gate
- `scripts/qa-harness.js` — repeatable in-browser hazard reachability check
- `scripts/gen-hazard-docs.mjs` — generates `docs/HAZARDS.md` from source data
- `.env.example`, `.gitignore` — no secrets committed

### Core engine
- `Engine` — render loop, adaptive pixel-ratio quality, WebGL context-loss recovery, dt clamping
- `EventBus` — decouples gameplay from UI; handler errors isolated
- `Textures` — every texture drawn on canvas, deterministic, cached

### 3D world
- Full prop library: racking, pallets, cartons, forklifts, workers, safety equipment, building structure
- `World` build context + **static-geometry merge pass** (9,587 → 994 meshes)
- **All 15 hazards** as physical scenarios in `Scenarios.js`
- Decoy system — safe lookalikes that teach on a wrong flag
- 3 environments, sharing one prop and scenario library

### Gameplay
- `ScoreManager` — exact brief scoring, combo, stats, summary (pure, unit-tested)
- `Timer` — round + per-hazard clocks (pure, unit-tested)
- `HazardSystem` — proxy raycast targeting, occlusion, validation, markers
- `GameManager` — Train/Test modes, lifecycle, coaching tips
- `Profile` — persistence, progression gates, 8 achievements, history
- `AudioManager` — fully synthesised

### UI
- Login, main menu, environment select, difficulty select, HUD, results, profile, progress, hazard guide, settings, pause, loading, toasts, touch controls
- Responsive; keyboard accessible; `prefers-reduced-motion` respected

### Documentation
- `README.md` + 9 documents in `docs/`

---

## Bugs found and fixed

All nine were found by **driving the real game in a browser** — none would have
been caught by unit tests alone.

| # | Bug | Impact |
|---|---|---|
| 1 | Proxies never had `matrixWorld` updated after registration | **14 of 15 hazards unflaggable**; the 15th was a false positive |
| 2 | Occlusion counted a hazard's own collider as blocking it | 3 hazards unflaggable |
| 3 | Proxies used `FrontSide` — no hit from inside a large volume | Unflaggable from the most obvious vantage point |
| 4 | Pointer lock had no fallback | Player stranded on "Click to look around" |
| 5 | Train Mode showed "Training complete" on the opening frame | Wrong and confusing |
| 6 | `el()` did not parse `#id` selectors | `#hud`, `#toasts`, `#touch` had **no CSS at all** |
| 7 | Spawn yaw faced a blank wall in all 3 environments | Spawned looking at nothing |
| 8 | 9,587 draw calls per frame | Unusable performance |
| 9 | Loader awaited rAF, which stops in hidden tabs | Load could stall forever |

Plus one **test** bug: a timer assertion had incorrect arithmetic; `Timer` was
correct. Fixed and extended.

---

## Verified results

Multi-angle reachability harness — 24 vantage points per hazard:

| Environment | Difficulty | Reachable | Score | Rank |
|---|---|---|---|---|
| env01 Main Storage Hall | Mid | **15 / 15** | 243 | Champion |
| env02 Loading & Dispatch | Mid | **12 / 12** | 175 | Champion |
| env03 High-Bay Annexe | Hard | **15 / 15** | 310 | Champion |

Also confirmed: results screen, ranks, achievements (5 unlocked on a perfect
run), profile persistence, and the Train → Simple → Mid progression gate.

Performance: 60 fps · 1,520 draw calls · 272,622 triangles · 192 geometries ·
35 textures · 74 merged batches · ~183 kB gzipped bundle.

---

## NOT IMPLEMENTED (deliberate, documented)

| Item | Reason |
|---|---|
| **WebXR / VR** | No headset available. Shipping untested VR code and calling it done would be dishonest. Desktop play never depended on it. |
| **Google OAuth** | No client ID. The code path exists and activates with `VITE_GOOGLE_CLIENT_ID`, but has **never been executed against Google**. The UI says "not configured". |
| **Blender assets** | Blender not installed. Generator scripts were written but never executed or integrated, so they have been **removed** rather than left as dead weight. |
| **Rigged/skinned characters** | Would have required Blender plus rigging work; the brief said character animation must not block the core game. |

## NOT TESTED

| Item | Reason |
|---|---|
| Touch controls on a real device | No phone or tablet available |
| Firefox / Safari | Only Chromium available |
| Screen readers | No assistive tech available |
| Long-session stability | No soak test performed |
| Performance on low-end hardware | One machine only |

## KNOWN ISSUES

| Issue | Severity | Note |
|---|---|---|
| 🇳🇵 emoji renders as "NP" in the UI header on Windows | Cosmetic | No emoji flag font on Windows. The in-world 3D flag is drawn from scratch and is fine. |
| ~920 dynamic meshes still draw individually | Minor | Workers and forklifts. 60 fps is met; further merging is the top optimisation. |
| Scenario sub-offsets are not rotated by `heading` | Minor | Some colliders sit slightly off when a scenario is rotated. No gameplay impact — verified every hazard is still reachable from multiple angles. |
| Loading is slow in a background tab | Cosmetic | Browsers throttle timers when hidden. Completes correctly; instant when visible. |

## MANUAL ACTION REQUIRED

None blocking. Optional only:

**To enable Google sign-in**
1. Google Cloud Console → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID, type *Web application*
3. Add `http://localhost:5173` as an authorised JavaScript origin
4. Copy `.env.example` to `.env` and set `VITE_GOOGLE_CLIENT_ID=<your id>`
5. Restart the dev server. **Never commit `.env`.**

---

## NEXT PRIORITY

1. Merge rigid sub-assemblies inside animated props (~920 → ~200 draw calls)
2. Real-device touch testing
3. Firefox and Safari verification
4. WebXR, once a headset is available
5. Rotate scenario sub-offsets by `heading` for exact collider placement
6. Instructor dashboard / cohort results
7. Round replay showing what was missed and where

---

## Deployment

**Live (public):** https://kushalthewave.github.io/interprize-project/
**Standalone single file:** https://kushalthewave.github.io/interprize-project/beat-the-hazard.html
**Private artifact:** https://claude.ai/code/artifact/7ba87d99-7847-41fe-8c73-b71445dbcbdc
(the artifact is private to its owner until shared from the page's share menu)

### How Pages is published

Via the **`gh-pages` branch**, not the Pages deployment API. The API route
(`actions/configure-pages` + `actions/deploy-pages`) requires the repository's
Pages source to be set to "GitHub Actions" in Settings first; `enablement: true`
could not create the site and failed with *"Get Pages site failed ... Not
Found"*. Pushing a `gh-pages` branch works with no manual repository setting,
and GitHub serves it automatically.

Verified live: 15 hazards, 5 decoys, 1,549 draw calls, 273k triangles, no
console errors.

### Single-file build

```bash
npm run build:single      # -> dist-single/beat-the-hazard.html
```

Produces **one self-contained 677 kB HTML file** with CSS and JS inlined and
**zero external requests** — no CDN, no fonts, no images, no audio files. It can
be opened directly from disk, emailed, or dropped on any static host.

The only URL string in the bundle is the XHTML namespace constant used
internally by Three.js; it is not a network request.

### Verified in a sandboxed iframe

The hosted artifact runs the page in a sandboxed iframe **without
`allow="pointer-lock"`**, which is the riskiest difference from local play. This
was reproduced locally and tested:

| Check | Result |
|---|---|
| Game boots and loads a round | ✅ 15 hazards, 60 fps |
| Pointer lock refused | ✅ `lockFailed: true` — as expected |
| Drag-look fallback engages | ✅ camera turns (yaw 0 → −0.616) |
| Click flags a hazard | ✅ +15 score |
| Drag does **not** flag | ✅ no accidental wrong answers |
| localStorage / profile | ✅ works |

This is exactly why the pointer-lock fallback (bug #4) was worth building.

### Other hosting options

The same `dist/` or `dist-single/` output is a plain static site and will work
on GitHub Pages, Netlify, Vercel, Cloudflare Pages or any web server. Those all
require the project owner's own account, so they were not set up here.

```bash
npm run build        # -> dist/  (normal multi-file build)
npm run preview      # serve the production build locally
```
