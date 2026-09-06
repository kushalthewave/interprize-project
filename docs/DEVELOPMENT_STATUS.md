# Development Status

**Last updated:** 2026-09-06 (session 1, paused by user request)
**Overall:** PARTIAL — core is built and running; mid-debug on first-load QA.

---

## Environment findings (verified, not assumed)

| Tool | Status | Note |
|---|---|---|
| Node.js | ✅ v24.20.0 | **Was NOT installed.** Installed via existing nvm4w during this session. |
| npm | ✅ 11.19.0 | `esbuild` postinstall required explicit `npm install-scripts approve esbuild`. |
| Git | ✅ 2.55.0 | |
| Python | ✅ 3.14.7 | Used for scripted file patching only. |
| **Blender** | ❌ **NOT INSTALLED** | No `blender` on PATH, no `Program Files/Blender Foundation`. All 3D geometry is therefore **procedural Three.js**, not Blender-authored. See `docs/DECISIONS.md`. |

⚠️ Node is **not on the system PATH** — nvm's shim directory is on PATH but empty.
Commands must be run with the version dir prepended:
```bash
export PATH="/c/Users/acer/AppData/Local/nvm/v24.20.0:$PATH"
```
`.claude/launch.json` invokes `node.exe` by absolute path for the same reason.

---

## COMPLETED

### Foundation
- Vite 7 + Three.js 0.180 + Vitest 3, vanilla ES modules (no framework). `npm run build` **passes**.
- `scripts/syntax-check.mjs` — esbuild-based syntax gate over all sources (31 files, 0 errors).
- Project structure, `.gitignore`, `.env.example` (no secrets committed).

### Core engine
- `core/Engine.js` — renderer, frame loop, resize, FPS tracking, **adaptive pixel-ratio quality**, WebGL context-loss recovery.
- `core/EventBus.js` — pub/sub; gameplay never touches the DOM.
- `core/Textures.js` — **all textures generated procedurally on canvas**: worn concrete, cardboard with printed labels/barcodes, pallet wood with knots, painted steel, profiled wall cladding, oil-spill decal, hazard chevrons, and a correctly-shaped **Nepal flag** (double pennant, moon + 12-ray sun).

### Environment / art
- `props/Materials.js` — shared material + geometry cache (draw-call state minimisation).
- `props/Storage.js` — APR racking (real proportions), Euro pallets, cartons, tidy loads, **unstable loads**, over-height stacks, broken pallets.
- `props/Forklift.js` — procedural counterbalance truck (mast, carriage, tines, FOPS guard, beacon, reversing lights), hand pallet truck, roll cage.
- `props/Worker.js` — procedural figures with walk/idle cycles; hi-vis, no-PPE, driver, and **Nepali kurta-surwal / kurti-surwal avatars** (dhaka topi, dupatta).
- `props/SafetyProps.js` — fire points, exit signs, bilingual (English/Nepali) signage, barriers, cones, convex mirrors, ladders, trailing cables, spills, drums.
- `props/Structure.js` — shell, portal frame + trusses, high-bay lighting rig, dock doors, fire-exit doors, roller shutters, office block, painted walkways/lines/labels.
- `World.js` — scene build context + **static-geometry merge pass** (see Performance below).
- `Scenarios.js` — **all 15 hazards as physical situations**, reusable across environments, plus safe "decoy" lookalikes.
- 3 environments: `env01` Main Storage Hall (15 hazards), `env02` Loading & Dispatch Bay (12), `env03` High-Bay Annexe (15).

### Gameplay
- `ScoreManager.js` — exact brief scoring (major 15/7, minor 5/2, wrong 0), combo at 3-in-a-row, difficulty multiplier, full stats.
- `Timer.js` — round + per-hazard reaction clocks, warning/critical states.
- `HazardSystem.js` — invisible proxy raycast targeting + ray-vs-AABB occlusion rejection, correct/wrong validation, highlight markers.
- `GameManager.js` — Train/Test modes, round lifecycle, expiry, results summary with coaching tips.
- `Profile.js` — localStorage-backed profile, progression gates (Train → Simple → Mid → Hard), 8 achievements, history. Storage adapter is swappable.
- `AudioManager.js` — **fully synthesised** Web Audio (ambience, forklift engine, reversing alarm, cues). No audio files, no licensing.

### UI
- `styles.css`, `dom.js`, `HUD.js`, `Screens.js`, `UIManager.js`, `main.js`, `index.html`.
- Login, main menu, environment select, difficulty select, HUD, results, profile, progress, hazard guide, settings, pause, loading, toasts, touch controls.

### Performance
- **Static-geometry merge:** `World.optimize()` bakes static props into per-material batches.
  Measured on env01: **9,587 meshes → 994 objects across 74 merged batches.** ✅ verified in browser.

---

## VERIFIED IN BROWSER (Chromium, localhost:5173)
- ✅ App boots, no console errors.
- ✅ Login screen renders; sign-in works; profile persists.
- ✅ Main menu, environment select, difficulty select all render correctly.
- ✅ env01 builds: 15 hazards + 5 decoys + 29 colliders registered.
- ✅ Merge pass runs and reports correctly.

## Bugs found and FIXED this session
1. **`el()` helper did not parse `#id`** → `#hud`, `#toasts`, `#touch` were created as invalid tag names, so **none of their CSS applied**. Fixed with a proper selector parser.
2. **Spawn yaw faced the wall** in all 3 environments → the player spawned looking at a blank wall with the entire warehouse behind them (only 38 draw calls rendering). Fixed.
3. **9,587 draw calls per frame** → added the static merge pass. Now 74 batches.
4. **Loader hung in hidden tabs** — `frame()` awaited `requestAnimationFrame`, which browsers stop firing when the tab is hidden. Now races rAF against a timeout.
5. Dead `P.fireExitDoor` reference in `Scenarios.js` (build warning). Removed.

---

## ⏳ IN PROGRESS — RESUME HERE

### 🔴 OPEN BUG (next task)
`GameManager.loadEnvironment()` **never leaves `state === 'loading'`** for env01.

Evidence gathered:
- `env.build()` completes (15 hazards, 29 colliders registered).
- `World.optimize()` completes (console logs `merged 9587 meshes into 994 (74 batches)`).
- The returned promise neither resolves nor rejects (`__r` stays `null`), so it is **hanging on an `await`, not throwing**.
- Remaining awaits after the merge are `frame()` calls; the rAF/timeout race fix was applied but the page under test may not have picked it up.

Next debugging steps:
1. Hard-reload and confirm the patched `frame()` is actually live (`GameManager.js` timestamp / add a temp log).
2. If still hanging, instrument each `await frame()` in `loadEnvironment` with a sequence log to find which one stalls.
3. Note the Browser pane was **hidden** during testing, which suppresses rAF — front the tab (`tabs_select`) before re-testing, and re-measure FPS with the tab visible.

### Not yet started
- [ ] **Tests** — `tests/score.test.js` and `tests/timer.test.js` are written but **have not been run yet**. `hazard.test.js`, `profile.test.js`, `world.test.js` not written.
- [ ] **Docs** — only this file exists. Still needed: `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `GAME_DESIGN.md`, `HAZARDS.md`, `ENVIRONMENTS.md`, `DECISIONS.md`, `TESTING.md`, `ASSET_CREDITS.md`.
- [ ] **README.md**.
- [ ] `scripts/blender/` Python scripts (for use if Blender is ever installed).
- [ ] Visual QA pass on env02 and env03 (never loaded in a browser yet).
- [ ] Full playthrough test: flag a hazard → feedback → results screen.
- [ ] WebXR support (P4).
- [ ] Git checkpoint commits.

---

## KNOWN ISSUES / LIMITATIONS (honest)
- 🇳🇵 The flag emoji in the UI header renders as the letters "NP" on Windows (no emoji flag font). Cosmetic; the in-world 3D flag is drawn properly and is unaffected.
- FPS has **not been measured with the render surface visible** — the 60fps reading was taken with the pane hidden and is not meaningful.
- env02 and env03 have never been loaded in a browser.
- Google OAuth is **not configured and not tested** — the UI honestly reports "not configured" rather than faking a sign-in.
- **No VR headset available** — WebXR is unimplemented and untested.
- Blender unavailable → geometry is procedural primitives, not modelled assets. Not photorealistic; aimed at believable scale and hazard readability.

## MANUAL ACTION REQUIRED
None blocking. Optional only:
- To enable Google sign-in: create an OAuth 2.0 Web client in Google Cloud Console, add `http://localhost:5173` as an authorised JavaScript origin, and put the client ID in `.env` as `VITE_GOOGLE_CLIENT_ID`. Never commit `.env`.
- To regenerate assets in Blender: install Blender, then run the scripts in `scripts/blender/` (not yet written).

## NEXT PRIORITY (in order)
1. Fix the loading-state hang (above).
2. Run the test suite; fix failures; add remaining test files.
3. Full manual playthrough of env01 with the pane visible; capture screenshots; fix visual bugs.
4. QA env02 + env03.
5. Write the docs and README.
6. Git checkpoints.

## How to run
```bash
export PATH="/c/Users/acer/AppData/Local/nvm/v24.20.0:$PATH"
npm run dev      # http://localhost:5173
npm run build
npm test
node scripts/syntax-check.mjs
```
