# Project Context

**Read this first when returning to the project.** The repository is the source
of truth, not chat history.

---

## What this is

**Beat The Hazard** — a browser-based 3D interactive health & safety training
game for warehouse forklift and pedestrian safety.

A trainee walks a working warehouse as the avatar they chose, learns what each hazard
physically looks like in Train Mode, then identifies hazards unaided in a timed,
scored Test Mode. Set at a fictional Nepali distribution centre (Himalaya
Logistics, Birgunj).

Built as a university project.

## Current state

**Working and verified.** Playable end to end across all three environments.

| | |
|---|---|
| Build | ✅ passing |
| Tests | ✅ 94 / 94 |
| Playthrough | ✅ all 3 environments, every hazard reachable |
| Performance | ✅ 60 fps, 1,520 draw calls |
| Console errors | ✅ none |

See [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md) for the live task list and
[`TESTING.md`](TESTING.md) for exactly what has and has not been tested.

## Requirements this satisfies

| Requirement | Status |
|---|---|
| Browser-based 3D game | ✅ Three.js, walkable, third person (your avatar) or first person |
| 15 specified hazards, physically modelled | ✅ all 15, geometry not icons |
| Train Mode (teaches) | ✅ highlights, teaching cards, gates testing |
| Test Mode (evaluates) | ✅ timed, scored, ranked |
| Three difficulties that change gameplay | ✅ 8 parameters differ |
| Reaction clock | ✅ configurable, per hazard |
| Scoring 15/7/5/2, wrong = 0 + tip | ✅ exact, unit-tested |
| Combo on 3 in a row | ✅ |
| Ranks 50+/30–49/<30 | ✅ |
| Results screen | ✅ score, breakdown, coaching, missed hazards |
| Three environments | ✅ env01, env02, env03 |
| Profile, avatar, progress, achievements | ✅ 8 achievements, progression gates |
| Nepali identity | ✅ flag, bilingual signage, avatars, company branding |
| Audio | ✅ fully synthesised |
| Offline-first core | ✅ no server or database needed |
| Login not blocking the game | ✅ local demo auth; Google optional |
| Automated tests | ✅ 94 |
| Documentation | ✅ this docs/ folder + README |
| Blender automation | ⚠️ scripts written, **never executed** — Blender not installed |
| WebXR / VR | ❌ not implemented — no headset to test on |

## Environment facts

Verified on this machine, not assumed:

| Tool | Status |
|---|---|
| Node.js | ✅ **24.20.0** — was NOT installed; installed via nvm during development |
| npm | ✅ 11.19.0 |
| Git | ✅ 2.55.0 |
| Python | ✅ 3.14.7 (used only for scripted file edits) |
| **Blender** | ❌ **not installed** |

⚠️ **Node is not on the system PATH.** nvm's shim directory is on PATH but
empty, and `nvm use` needs elevation. Prefix commands:

```bash
export PATH="/c/Users/acer/AppData/Local/nvm/v24.20.0:$PATH"
```

`.claude/launch.json` calls `node.exe` by absolute path for the same reason.
`esbuild`'s postinstall needed `npm install-scripts approve esbuild` under npm 11.

## Quick start

```bash
export PATH="/c/Users/acer/AppData/Local/nvm/v24.20.0:$PATH"
npm install
npm run dev          # http://localhost:5173
npm test
npm run build
```

## Where things live

| I want to… | Go to |
|---|---|
| Change scoring, timers, ranks, difficulty | `src/data/config.js` |
| Edit hazard text / safety tips | `src/data/hazards.js` |
| Change how a hazard is built in 3D | `src/environment/Scenarios.js` |
| Change a warehouse layout | `src/environment/scenes/env0N.js` |
| Add a new prop | `src/environment/props/` |
| Change textures | `src/core/Textures.js` |
| Change the round lifecycle | `src/gameplay/GameManager.js` |
| Change menus or the HUD | `src/ui/` |
| Add an environment | new file in `scenes/` + one line in `registry.js` |

## Documentation map

| File | Contents |
|---|---|
| [`../README.md`](../README.md) | Overview, install, controls, features, limitations |
| `PROJECT_CONTEXT.md` | **This file** — orientation |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Layers, data flow, round lifecycle, performance strategy |
| [`GAME_DESIGN.md`](GAME_DESIGN.md) | Design principles, modes, progression, scoring rationale |
| [`HAZARDS.md`](HAZARDS.md) | All 15 hazards — **generated from source** |
| [`ENVIRONMENTS.md`](ENVIRONMENTS.md) | The three warehouses, and how to add a fourth |
| [`DECISIONS.md`](DECISIONS.md) | Every significant technical decision and why |
| [`AUTHENTICATION.md`](AUTHENTICATION.md) | Sign-in methods, what each proves, setup steps |
| [`TESTING.md`](TESTING.md) | What is tested, what is not, honestly |
| [`ASSET_CREDITS.md`](ASSET_CREDITS.md) | Asset inventory (all procedural) and licences |
| [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md) | Live status, known issues, next priorities |

## Non-negotiable design rules

If you change anything, keep these:

1. **A hazard must exist physically in the world.** Never a floating icon. The
   highlight ring is a training aid only.
2. **Every hazard has a control nearby** — the correct version of the same
   situation, so trainees learn by contrast.
3. **Wrong answers teach.** A wrong flag always returns a reason.
4. **Difficulty changes gameplay, not labels.** A unit test enforces this.
5. **Gameplay code never touches the DOM.** Systems emit events; the UI listens.
6. **Never overstate what was built or tested.** No claimed VR testing, no
   claimed Blender modelling, no claimed working OAuth.

## Known limitations

- Not photorealistic — stylised procedural geometry
- Human figures are not rigged or skinned
- No VR, no real-device touch testing, no OAuth testing
- Chromium only
- Performance measured on one machine

Full detail in [`TESTING.md`](TESTING.md) and the README.
