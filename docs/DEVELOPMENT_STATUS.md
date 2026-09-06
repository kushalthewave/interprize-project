# Development Status

**Last updated:** 2026-09-07
**Overall:** ✅ **COMPLETE and working** for the specified scope, with the
limitations below stated honestly.

---

## Health

| Check | Status |
|---|---|
| Build (`npm run build`) | ✅ passing, 2.6 s |
| Tests (`npm test`) | ✅ **94 / 94 passing** |
| Syntax gate | ✅ 34 files, 0 errors |
| App boots | ✅ no console errors |
| Playthrough, all 3 environments | ✅ every hazard reachable |
| Performance | ✅ 60 fps, 1,520 draw calls |

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
- `scripts/blender/` with an honest never-executed warning

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
| **Blender assets** | Blender not installed. Scripts written, syntax-checked, **never run**. |
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

**To regenerate assets in Blender**
1. Install Blender 4.x
2. `blender --background --python scripts/blender/build_warehouse.py`
3. Expect to debug — see `scripts/blender/README.md`

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

**Live artifact:** https://claude.ai/code/artifact/7ba87d99-7847-41fe-8c73-b71445dbcbdc
(private to the account that owns it until shared from the page's share menu)

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
