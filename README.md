# BEAT THE HAZARD

**A 3D interactive health & safety training game for warehouse forklift and pedestrian safety.**

Himalaya Logistics Distribution Centre · Birgunj, Nepal 🇳🇵

You walk a working warehouse in first person, learn what a hazard physically
looks like, then prove you can spot them on your own against the clock.

---

## Contents

- [What it is](#what-it-is)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Installation](#installation)
- [Running it](#running-it)
- [Controls](#controls)
- [Train Mode](#train-mode)
- [Test Mode](#test-mode)
- [Difficulty](#difficulty)
- [Scoring, combo and ranks](#scoring-combo-and-ranks)
- [The 15 hazards](#the-15-hazards)
- [Environments](#environments)
- [Architecture](#architecture)
- [Testing](#testing)
- [Assets](#assets)
- [Limitations — read this](#limitations--read-this)
- [Future improvements](#future-improvements)

---

## What it is

Most workplace-safety e-learning is a slideshow with a multiple-choice quiz.
The problem is that recognising a hazard is a *visual, spatial* skill: you have
to notice that one rack upright is not vertical, that a carton overhangs a beam
above a walkway, that the person in dark clothing is standing in a vehicle
aisle.

Beat The Hazard puts the trainee inside the warehouse instead. Every hazard is
built as real geometry you can walk up to and inspect from any angle. There are
no floating red icons that give the answer away — in Test Mode you find them by
looking, exactly as you would on a real site walk.

Deliberately, the game also contains **decoys**: situations that look wrong but
are actually correctly controlled — a spill that *is* coned and signed, a rack
carrying a green inspection tag, a forklift parked properly in its charging bay.
Flagging one is scored as wrong and the game explains why it is fine. Learning
what "good" looks like is half of hazard spotting.

## Features

- **Real-time 3D warehouse** you walk around in first person
- **15 physical hazard scenarios**, each modelled as geometry, not a marker
- **Three environments** — general storage, cross-dock dispatch, high-bay annexe
- **Train Mode** — guided, highlighted, with a teaching card for every hazard
- **Test Mode** — unassisted, timed, scored and ranked
- **Three difficulties** that change the actual game, not just a label
- Reaction clock, scoring, combo streaks, ranks and a detailed results breakdown
- Profile with avatar, progression gates, achievements and score history
- Fully **synthesised audio** — ambience, forklift engine, reversing alarm, cues
- Works **offline**; no server, no database, no account required
- Desktop, tablet and phone (on-screen sticks); keyboard-only playable

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| 3D | **Three.js 0.180** | Direct control of the scene graph, materials and the render loop. |
| Build | **Vite 7** | Instant dev server, ES-module builds, tiny config. |
| Language | **Vanilla ES modules** | No framework. A canvas game owns its own frame loop; a virtual DOM would add weight and fight `requestAnimationFrame`. |
| Tests | **Vitest 3** | Runs the pure gameplay logic in Node with no browser needed. |
| Physics | **Custom** | Circle-vs-AABB collision, ~60 lines. A full physics engine is ~500 kB for a flat slab with box obstacles. |
| Art | **Procedural** | All geometry and textures generated at runtime. See [Assets](#assets). |
| Audio | **Web Audio API** | Every sound synthesised. No files, no licences. |

Full reasoning in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Installation

Requires **Node.js 20+** (developed on 24.20.0) and npm.

```bash
npm install
```

> **Note for this machine:** Node is installed under nvm but is not on the
> system PATH. Prefix commands with:
> ```bash
> export PATH="/c/Users/acer/AppData/Local/nvm/v24.20.0:$PATH"
> ```

## Running it

```bash
npm run dev
```

Then open **http://localhost:5173**.

Other commands:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build
npm test           # run the test suite
npm run test:watch # watch mode

node scripts/syntax-check.mjs   # fast syntax gate over all sources
```

The production build is fully static — `dist/` can be dropped on any web host
or opened through a plain file server.

## Controls

### Desktop

| Input | Action |
|---|---|
| `W` `A` `S` `D` / arrows | Move |
| Mouse | Look around |
| `Shift` | Run |
| `C` / `Ctrl` | Crouch |
| `E` or **left click** | Flag the hazard under the reticle |
| `Esc` or `P` | Pause |

Click once to capture the mouse. If your browser refuses pointer lock (an
embedded iframe, or a managed/kiosk browser), the game automatically switches
to **click-and-drag to look** — it stays fully playable.

### Touch

Left half of the screen is a movement stick, right half looks around, plus
on-screen **FLAG** and **MENU** buttons.

## Train Mode

Train Mode teaches. It is the intended starting point and it gates Test Mode.

- Every hazard is ringed so you can find it
- Finding one opens a card with what it is, **why it is dangerous**, the correct
  control, and the safety keywords
- The clock is effectively unlimited — nothing is being measured
- Finding all of them completes the module and unlocks testing for that site

## Test Mode

Test Mode evaluates.

```
Observe → Find → Flag → Validate → Result
```

No rings (except on Simple), no hints. A reaction clock runs per hazard. Wrong
flags cost you your combo and return a safety tip explaining what you actually
looked at. The round ends when every hazard is found or the clock expires, and
you get a full breakdown with coaching notes.

## Difficulty

Difficulty changes **real gameplay parameters**, not a label:

| | Simple | Mid | Hard |
|---|---|---|---|
| Time per hazard | 90 s | 60 s | 38 s |
| Score multiplier | ×1.0 | ×1.25 | ×1.6 |
| Hazards highlighted | ✅ | ❌ | ❌ |
| Hazard count shown | ✅ | ✅ | ❌ |
| Decoys | 0 | 6 | 12 |
| Moving hazards | ❌ | ✅ | ✅ |
| Ambient light | 0.85 | 0.6 | 0.4 |
| Fog density | 0.006 | 0.011 | 0.017 |
| Aim tolerance | 1.35 | 1.0 | 0.8 |

On Hard the building is genuinely darker and hazier, forklifts patrol, boxes
actually fall, and you are not told how many hazards exist.

## Scoring, combo and ranks

**Points**

| | Fast | Slow |
|---|---|---|
| Major hazard | **+15** | **+7** |
| Minor hazard | **+5** | **+2** |
| Wrong flag | **0** + a safety tip | |

"Fast" means within the first half of that hazard's allotted time.

**Combo** — three correct in a row starts a combo, worth **+3** per find while
it holds. A wrong flag or an expired hazard breaks it.

**Ranks**

| Score | Rank |
|---|---|
| 50+ | 🏆 **Safety Champion** |
| 30–49 | 🟡 **Getting There** |
| Below 30 | 🔴 **Needs Practice** |

Every value above lives in [`src/data/config.js`](src/data/config.js) and can be
retuned without touching game code.

## The 15 hazards

| # | Hazard | Category | Severity |
|---|---|---|---|
| 1 | Forklift on a pedestrian route | Vehicle | Major |
| 2 | Reversing forklift with a worker behind | Vehicle | Major |
| 3 | Unstable / falling boxes | Storage | Major |
| 4 | Damaged / leaning racking | Storage | Major |
| 5 | Oil / liquid spill on the floor | Floor | Minor |
| 6 | Blocked pedestrian walkway | Floor | Minor |
| 7 | Blocked emergency exit | Emergency | Major |
| 8 | Blocked fire extinguisher | Emergency | Minor |
| 9 | Worker without PPE | PPE | Minor |
| 10 | Person at an open loading dock edge | Height | Major |
| 11 | Trailing electrical cable | Electrical | Minor |
| 12 | Broken / damaged pallet | Storage | Minor |
| 13 | Overloaded / over-height stack | Storage | Minor |
| 14 | Unsafe ladder use | Height | Major |
| 15 | Blind corner conflict | Vehicle | Major |

Each is fully documented — description, why it is dangerous, the control, and
the teaching text — in [`docs/HAZARDS.md`](docs/HAZARDS.md).

**The rule this project enforces:** a hazard is never an icon. The falling-box
hazard is a rack bay where most cartons are stacked correctly, one is displaced,
one is tilted, and one hangs over the beam edge and periodically falls. You
identify it by looking at the world.

## Environments

| # | Name | Size | Hazards | Character |
|---|---|---|---|---|
| 1 | **Main Storage Hall** | 62 × 44 m | 15 | Four racking runs, central pedestrian spine, office block. The vertical slice. |
| 2 | **Loading & Dispatch Bay** | 70 × 30 m | 12 | Cross-dock, six dock doors, heavy vehicle traffic. |
| 3 | **High-Bay Annexe** | 54 × 40 m | 15 | Five-level narrow aisle, poor light, congested. The hard site. |

Environments 2 and 3 are about 250 lines each because they reuse the shared prop
library and scenario builders rather than duplicating the application. Details
in [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).

## Architecture

```
src/
├── core/          Engine (render loop), EventBus, procedural Textures
├── player/        First-person controller + collision
├── environment/   World build context, Scenarios (the 15 hazards),
│                  props/ (racking, forklifts, workers, signage, structure),
│                  scenes/ (env01, env02, env03)
├── hazards/       HazardSystem — targeting, occlusion, validation
├── gameplay/      GameManager, ScoreManager, Timer
├── services/      Profile (persistence, progression, achievements)
├── audio/         AudioManager (fully synthesised)
├── ui/            UIManager, HUD, Screens, styles
└── data/          config.js (all tunables), hazards.js (the knowledge base)
```

Gameplay code never touches the DOM; the UI listens on an event bus. Hazard
*content* is pure data, separate from both the 3D scene and the UI. Full
diagrams in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Testing

```bash
npm test
```

**94 automated tests, all passing** — scoring rules, combo, ranks, the reaction
clock, hazard-data integrity, difficulty configuration, profile progression and
achievements.

Because the gameplay logic is pure and framework-free, it is tested in Node with
no browser or mocking.

3D behaviour was verified by **manual browser QA**, including a repeatable
reachability harness (`scripts/qa-harness.js`) that walks the player around every
hazard from 24 vantage points and confirms it can be flagged. Latest run:

| Environment | Difficulty | Hazards reachable | Score | Rank |
|---|---|---|---|---|
| env01 | Mid | **15 / 15** | 243 | Champion |
| env02 | Mid | **12 / 12** | 175 | Champion |
| env03 | Hard | **15 / 15** | 310 | Champion |

Performance measured in-browser: **60 fps, 1,520 draw calls, 272k triangles**,
no console errors.

What has and has not been tested — honestly — is in
[`docs/TESTING.md`](docs/TESTING.md).

## Assets

**There are no third-party assets in this project.** Every mesh, texture and
sound is generated in code at runtime:

- **Geometry** — procedural Three.js primitives (racking, pallets, cartons,
  forklifts, human figures, signage, the building shell)
- **Textures** — drawn on `<canvas>` at load: worn concrete, cardboard with
  printed shipping labels and barcodes, pallet wood with grain and knots,
  scuffed painted steel, profiled wall cladding, oil-spill decals, bilingual
  safety signage, and the flag of Nepal drawn to its real double-pennant outline
- **Audio** — synthesised with the Web Audio API

This is a deliberate decision, not a shortcut — see
[`docs/ASSET_CREDITS.md`](docs/ASSET_CREDITS.md) for the reasoning and the full
inventory.

## Limitations — read this

Stated plainly, because a training tool that overstates itself is worse than one
that does not:

- **This is not photorealistic.** It is stylised, procedurally generated
  geometry aimed at believable *scale, layout and hazard readability*. It will
  not be mistaken for a rendered CAD walkthrough.
- **Blender was not used.** Blender is not installed on the development machine.
  `scripts/blender/` contains Python scripts to regenerate equivalent assets if
  Blender becomes available, but **they have not been executed or verified**.
- **The human figures are not rigged or skinned.** They are primitive-built
  figures with a procedural walk cycle.
- **WebXR / VR is not implemented.** No headset was available, so rather than
  ship untested VR code, it is left out. Desktop play does not depend on it.
- **Google sign-in is not configured and has never been tested.** The UI states
  this honestly instead of faking a sign-in. Local demo auth is used.
- **No mobile device testing.** Touch controls are implemented and the layout is
  responsive, but they have only been exercised in a desktop browser.
- **Performance was measured on one machine.** 60 fps there; low-end hardware
  will be slower. Adaptive pixel-ratio scaling is in place as mitigation.

## Future improvements

1. Merge rigid sub-assemblies inside animated props to cut the remaining ~920
   dynamic draw calls
2. WebXR support, once a headset is available to test on
3. Real device testing for the touch controls
4. Optional server-backed persistence — the storage layer is already behind a
   swappable adapter
5. Multi-language UI (the in-world signage is already bilingual)
6. An instructor dashboard for cohort results
7. Replay of a finished round, showing what was missed and where

---

Built as a university project. Hazards are staged for teaching purposes and the
safety guidance is educational, not a substitute for site-specific training or a
formal risk assessment.
