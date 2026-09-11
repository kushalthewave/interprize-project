# Testing

**Status legend:** ✅ PASS · ❌ FAIL · ⚠️ PARTIAL · ⬜ NOT TESTED · 🚫 BLOCKED

Last run: **2026-09-07**

---

## Summary

| Area | Status | Evidence |
|---|---|---|
| Automated unit tests | ✅ **94 / 94 passing** | `npm test` |
| Build | ✅ PASS | `npm run build`, 2.6 s |
| Syntax gate | ✅ PASS | 34 files, 0 errors |
| App boots | ✅ PASS | No console errors |
| Full playthrough, all 3 environments | ✅ PASS | Every hazard reachable |
| Results / ranks / achievements | ✅ PASS | Verified in browser |
| Progression gates | ✅ PASS | Verified in browser |
| Performance | ✅ PASS | 60 fps measured |
| Touch controls on a real device | ⬜ **NOT TESTED** | No device available |
| Google OAuth | 🚫 **BLOCKED** | No credentials configured |
| WebXR / VR | 🚫 **NOT IMPLEMENTED** | No headset available |
| Cross-browser | ⚠️ PARTIAL | Chromium only |

---

## 1. Automated tests

```bash
npm test
```

```
✓ tests/timer.test.js     (15 tests)
✓ tests/hazards.test.js   (23 tests)
✓ tests/score.test.js     (26 tests)
✓ tests/profile.test.js   (30 tests)

Test Files  10 passed (10)
     Tests  255 passed (255)
  Duration  625ms
```

### Coverage by area

| File | Tests | What it locks down |
|---|---|---|
| `score.test.js` | 26 | Exact scoring table (15/7/5/2), the fast/slow threshold including both boundary sides, combo start at exactly 3, combo bonus accumulation, combo breaking on wrong flags and on expiry, best-streak retention, difficulty multiplier applied to final not raw score, accuracy, average reaction time, perfect-round detection, score never negative, reset |
| `timer.test.js` | 20 | Fixed five-minute Test round overriding seconds × hazards, the per-hazard clock still running underneath at the difficulty pace, round warning at 1:00 and critical at 0:30, reset keeping the fixed length; plus budget = seconds × hazards, countdown, expiry fires once and only once, pause/resume, no resume after finish, per-hazard clock independent of the round clock, `nextHazard()` reset, warning band, critical band including the 10 s cap, `mm:ss` formatting, negative clamping |
| `auth.test.js` | 14 | An identity is committed only after the second factor — a failed 2FA leaves the owner's profile untouched; passkeys record their owner and restore name and avatar after a sign-out; a passkey skips TOTP because it is already two factors; unregistered and cancelled passkeys refuse cleanly; the login screen learns who signed out last |
| `avatars.test.js` | 12 | Exactly five avatars, in order, each with a name, role and prop; legacy ids mapped; unknown ids — including `constructor` and `__proto__` — fall back to the default; every SVG self-contained with no external reference, labelled for screen readers, and given unique gradient and clip ids so two copies on one page do not collide |
| `settings.test.js` | 41 | Every requested section present; unique keys; defaults valid; ranges clamped, bad selects and toggles rejected; migration from older profiles (keeps values, turns head bob off for anyone who had reduced motion, drops unknown keys, repairs unbound actions, strips reserved keys); presets recognised and never switch post-processing on; key rebinding (conflicts move the key and promote the displaced action's alternative, reserved keys refused, no mutation); resolution and frame-cap maths including 60 Hz jitter |
| `settings-runtime.test.js` | 10 | Colour-blind palettes complete and genuinely different; 3D marker colour follows the mode; aim tolerance combines difficulty × assist and is clamped to 0.85–2.2; score snapshot round-trips for training resume and survives corrupt data |
| `hazards.test.js` | 23 | All 15 required hazard ids present, unique, every teaching field non-empty and of substantial length, valid severities, valid categories, life-threatening scenarios classified major, difficulty monotonicity across six parameters, the three difficulties genuinely distinct, scoring constants match the brief, rank thresholds |
| `profile.test.js` | 38 | Sign-in and name sanitisation, default and legacy avatar migration (`male`→David, `female`→Maria), the remembered identity after sign-out and through a reset, persistence round-trip, recovery from a corrupt save, every gate open by default, every gate still enforced when a site switches it on, best-score-never-regresses, stat accumulation, history cap and ordering, each achievement condition and its boundary, no duplicate unlocks, completion percentage, reset preserving identity |

### A failure that was found and fixed

The first run failed 1 of 40. The bug was **in the test, not the code** — it
asserted `critical === false` at 8 s remaining when the critical threshold is
`min(10, 60 × 0.15) = 9 s`. `Timer` was correct. The test was corrected and a
second case added for the 10 s cap.

### What is deliberately not unit-tested

Three.js scene construction, materials and rendering. Testing that a box mesh
was added to a group asserts the framework works, not that the warehouse looks
right. That is covered by manual browser QA below.

---

## 2. Manual browser QA

**Environment:** Chromium via the in-app browser pane, Windows 11, Vite dev
server on `localhost:5173`.

### Hazard reachability harness

`scripts/qa-harness.js` drives the real game: for every hazard it walks the
player to **24 vantage points** (8 compass angles × 3 distances), aims the
camera, runs the real targeting update, and attempts a real flag. It reports any
hazard that cannot be flagged from *any* sensible angle.

| Environment | Difficulty | Reachable | Score | Rank | Status |
|---|---|---|---|---|---|
| env01 Main Storage Hall | Mid | **15 / 15** | 243 | Champion | ✅ |
| env02 Loading & Dispatch | Mid | **12 / 12** | 175 | Champion | ✅ |
| env03 High-Bay Annexe | Hard | **15 / 15** | 310 | Champion | ✅ |

Re-run it with:

```js
// in the browser console, with the game loaded
const src = await (await fetch('/scripts/qa-harness.js')).text();
(0, eval)(src);
await window.__qaRun('env01', 'mid');
```

### Verified manually

| Check | Status | Note |
|---|---|---|
| App boots, no console errors | ✅ | Clean |
| Login → sign-in → menu | ✅ | Profile persists across reload |
| Environment select, difficulty select | ✅ | Locked states shown with reasons |
| env01/02/03 build and render | ✅ | Screenshots captured |
| Player movement and collision | ✅ | Cannot walk through racking or walls |
| Reticle targeting + label | ✅ | Highlights on hover |
| Flag correct → feedback card + points | ✅ | |
| Flag wrong → reason returned | ✅ | Decoys explain why they are safe |
| Round completes when all found | ✅ | |
| Results screen | ✅ | Score, rank, found/missed lists, coaching tips |
| Achievements awarded | ✅ | 5 unlocked on a perfect run |
| Profile stats persisted | ✅ | Best score written and read back |
| Progression gate Train → Simple → Mid | ✅ | Mid unlocked after scoring 30+ |
| Train Mode panel and teaching cards | ✅ | |
| Pause / resume | ✅ | Esc |
| Auto-pause on tab hide | ✅ | |

### Bugs found by manual QA and fixed

All five were **invisible to unit tests** — they only appear when driving the
real renderer.

| # | Bug | Impact | Fix |
|---|---|---|---|
| 1 | Hazard proxies never had `matrixWorld` updated after registration | **14 of 15 hazards unflaggable**; the one "success" was a false positive hitting a different hazard's box at the origin | Update the world matrix at registration |
| 2 | Occlusion counted a hazard's own collider as blocking it | 3 hazards unflaggable | Skip colliders containing the target point or the camera |
| 3 | Proxies used `FrontSide`, so standing inside a large hazard volume produced no hit | Hazards unflaggable from the spot where they are most obvious | `DoubleSide` |
| 4 | Pointer lock had no fallback | Player stranded on "Click to look around" in any browser that refuses it | Click-and-drag look fallback |
| 5 | Train Mode showed "Training complete" on the opening frame | Confusing and wrong | Distinguish not-started from finished |
| 6 | `el()` did not parse `#id` selectors | `#hud`, `#toasts`, `#touch` had **no CSS applied at all** | Proper selector parser |
| 7 | Spawn yaw faced a blank wall in all 3 environments | Player spawned looking at nothing | Corrected yaw |
| 8 | 9,587 draw calls per frame | Unusable performance | Static-geometry merge pass |
| 9 | Loader awaited `requestAnimationFrame`, which browsers stop firing in hidden tabs | Load could stall forever | Race rAF against a timeout |

---

## 3. Performance

Measured in-browser on Environment 1, Simple, after the merge pass:

| Metric | Value |
|---|---|
| Frame rate | **60 fps** |
| Draw calls | 1,520 |
| Triangles | 272,622 |
| Geometries | 192 |
| Textures | 35 |
| Shader programs | 20 |
| Merged static batches | 74 |
| Dynamic meshes | 920 |
| Meshes before merge | **9,587** |

Bundle: 501 kB Three.js + 172 kB app + 19 kB CSS → **~183 kB gzipped total**.

⚠️ **Measured on one machine only.** Low-end hardware will be slower. Adaptive
pixel-ratio scaling drops resolution below ~40 fps and recovers above 58 fps.

---

## 4. Not tested — stated honestly

| Item | Why |
|---|---|
| **Touch controls on a real device** | No phone or tablet available. Implemented and responsive-laid-out, exercised only via a desktop browser. |
| **Google OAuth** | No client ID configured. The code path exists but has **never been executed against Google's servers**. The UI says "not configured" rather than pretending. |
| **WebXR / VR** | No headset. Deliberately **not implemented** rather than shipping untested VR code. |
| **Firefox / Safari** | Only Chromium was available. No known reason for incompatibility — the app uses standard WebGL2, Web Audio and Pointer Lock — but this is untested. |
| **Screen readers** | Focus management, semantic buttons and labels are in place; no assistive-technology testing was performed. |
| **Long-session stability** | No multi-hour soak test. Disposal paths exist and are called on unload, but no leak profiling was done. |

---

## 5. How to reproduce

```bash
export PATH="/c/Users/acer/AppData/Local/nvm/v24.20.0:$PATH"

npm install
node scripts/syntax-check.mjs   # syntax gate
npm test                        # 94 unit tests
npm run build                   # production build
npm run dev                     # then open http://localhost:5173
```

Manual pass:

1. Sign in with any name
2. Train Mode → Main Storage Hall → walk to a ringed hazard → press `E`
3. Confirm the teaching card names the hazard and gives the control
4. Find all 15 → results screen → confirm training marked complete
5. Test Mode → Main Storage Hall → Simple should now be unlocked
6. Flag something safe (a coned spill) → confirm it is wrong and explains why
7. Finish or wait out the clock → confirm the results breakdown
8. Progress screen → confirm scores, achievements and history


### Two bugs the new tests caught before they shipped

- **`normaliseAvatar('constructor')` returned `'constructor'`.** A plain
  `AVATARS[id]` lookup finds `Object.prototype.constructor`, so an unknown id
  could slip through as a "valid" avatar. Fixed with own-property checks.
- **`lockReason()` still said "Score 30+ on Simple to unlock"** with the gate
  switched off, because it never checked the flag that `isUnlocked()` checks.
  Not visible in the UI today — the message only shows when locked — but it
  would have surfaced the moment a site turned one gate on and another off.


### Settings: bugs found while building them

- **"Low" quality left shadows on.** `SHADOWS.off` is deliberately `null`, and
  `SHADOWS[q] ?? SHADOWS.high` treated that `null` as "missing" and fell through
  to High. Found by reading the renderer state after applying the preset.
- **Rebinding a key left the other action with an empty primary slot.** Only
  the action being changed was tidied. Found by writing the test.
- **Aim tolerance never did anything.** Every difficulty set `flagRadius`
  (1.35 / 1.0 / 0.8) and nothing read it. It now scales each hazard's target
  volume, combined with Aim Assist.
- **Forklifts were silent.** `createForkliftEmitter()` and `footstep()` existed
  and were never called. They now run, driven by distance, and feed the captions.

### Settings: what is NOT verified

- A **physical controller** — tested with a simulated standard-mapping gamepad
  (moves, turns, A flags, Start pauses and resumes), not real hardware.
- **Switching audio output** between two real devices — the API is detected and
  called; the test machine exposes only the default output.
- **Spoken announcements** — speech synthesis is present and called; whether a
  voice is installed depends on the operating system. Subtitles show either way.
- **Fullscreen** — browsers only allow it from a real click, which automation
  cannot provide.
