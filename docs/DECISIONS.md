# Decision Log

Every significant technical choice, with the reasoning and the alternatives that
were rejected. Written so the decisions can be challenged later on their merits.

---

## D1 — Three.js + Vite + vanilla ES modules (no framework)

**Date:** 2026-09-06 · **Status:** Adopted

**Context.** The brief required a browser-based 3D game and listed Three.js,
A-Frame, React, React Three Fiber, Vite, WebGL and WebXR as candidates.

**Decision.** Three.js on Vite, with plain ES modules for everything else.

**Why.**

- **Three.js over raw WebGL** — raw WebGL means writing shader, buffer and
  scene-graph management before drawing a single box. No benefit here.
- **Three.js over A-Frame** — A-Frame is excellent for declarative VR scenes,
  but this game needs imperative control: a per-frame targeting raycast, custom
  collision resolution, a static-geometry merge pass, and controlled hazard
  animation. Doing that through A-Frame's entity-component layer means fighting
  the abstraction. A-Frame's main advantage is easy WebXR, and VR is explicitly
  a non-blocking P4 item with no headset available to test on.
- **No React / R3F.** The game owns its frame loop. React's render cadence adds
  nothing to a canvas that repaints itself 60 times a second, and R3F would put
  a reconciler between the game and the scene graph. The UI is menus and a HUD —
  a few hundred lines of DOM. Adding React would roughly double the bundle to
  make that marginally more declarative. The brief explicitly warned against
  adding technologies "merely to make the architecture sound impressive".
- **Vite** — near-instant dev server, ES-module output, essentially no config.

**Consequence.** The UI is hand-written DOM (`src/ui/dom.js` is a ~40-line
helper). That is more verbose than JSX, but it is dependency-free and the total
UI is small. Bundle: **~183 kB gzipped**, of which Three.js is ~126 kB.

---

## D2 — Procedural geometry and textures instead of authored assets

**Date:** 2026-09-06 · **Status:** Adopted (forced by the environment)

**Context.** The brief asked for Blender automation where practical, with a
documented fallback. **Blender is not installed** on the development machine —
verified: no `blender` on PATH, no `Program Files/Blender Foundation`.

Generator scripts were written early on but were never executed and never
integrated with the game, so they were **deleted** rather than left in the
repository as dead weight that implies a pipeline which does not exist.

**Decision.** Generate all geometry procedurally in Three.js, and all textures
on `<canvas>` at load.

**Why.**

- Installing Blender (~400 MB) plus authoring, UV-unwrapping, texturing and
  exporting a warehouse of assets would have consumed the entire timeline and
  produced *fewer* hazards, which are the actual learning content.
- Downloading third-party models introduces licence tracking, attribution
  obligations, inconsistent scale and art styles, and multi-megabyte downloads.
- Procedural generation gives consistent scale by construction (every dimension
  is written in metres against real APR racking and Euro-pallet sizes), zero
  download weight, no licensing, and lets hazards be *parameterised* — the same
  `racking()` builder produces a healthy run or a damaged one from one argument.

**Cost, stated honestly.** It does not look photorealistic. Cartons are boxes
with drawn labels, not scanned geometry. This is documented in the README rather
than glossed over.

**Alternatives rejected.** Sketchfab/Poly Haven assets (licence overhead,
inconsistent scale, download weight); a 360° photo with hotspots (explicitly
discouraged by the brief, and it cannot express spatial hazards like a blind
corner or a dock edge).

---

## D3 — Custom collision instead of a physics engine

**Date:** 2026-09-06 · **Status:** Adopted

**Context.** The player needs to not walk through racking. Boxes need to fall.

**Decision.** Circle-vs-AABB collision resolved per axis (~60 lines in
`PlayerController`), plus controlled keyframe animation for falling cartons.

**Why.** The warehouse is a flat slab with box-shaped obstacles and a player who
never leaves the ground. That is the exact case where a physics engine
(Rapier ~500 kB, Cannon ~150 kB) buys nothing. Per-axis resolution also avoids
the corner-sticking that naive resolution produces.

For the falling box, controlled animation is *better* than real physics for a
training tool: it is deterministic, so every trainee sees the identical event,
it can loop and reset so a late arrival still sees it, and it costs nothing.

**Consequence.** No emergent physics — nothing else can knock the box. Not
needed; the scenario is scripted by design.

---

## D4 — Static-geometry merge pass

**Date:** 2026-09-06 · **Status:** Adopted · **Revised after measurement**

**Context.** A believable warehouse needs thousands of cartons and rack members.
First measurement of Environment 1: **9,587 meshes**, i.e. ~9,587 draw calls per
frame. Unusable.

**Decision.** After a scene builds, `World.optimize()` bakes every *static* mesh
into merged per-material geometry. Anything under an object marked
`userData.dynamic` (forklifts, workers, the falling carton, flags) is left alone
so it can still be animated.

**Measured result:** 9,587 meshes → **994 objects in 74 merged batches**.
In-browser: **60 fps, 1,520 draw calls, 272k triangles**.

**Why this and not InstancedMesh.** Instancing needs identical geometry per
batch; the props deliberately vary (different carton sizes, rotations, brick-bond
offsets). Merging handles arbitrary geometry as long as the material is shared,
which the shared-material cache guarantees.

**Consequence.** Merged batches lose per-object frustum culling, so
`frustumCulled = false` is set on them — with one batch spanning the building,
culling could only ever produce false negatives. Trading a little GPU vertex
work for ~9,000 fewer CPU draw calls is overwhelmingly correct here.

**Known remaining cost.** ~920 dynamic meshes (workers and forklifts) still draw
individually. Listed as the top future optimisation.

---

## D5 — Invisible proxy raycast for hazard targeting

**Date:** 2026-09-06 · **Status:** Adopted

**Decision.** Each hazard gets an invisible box proxy. The reticle raycast tests
*only* those ~20 proxies, then a cheap ray-vs-AABB pass rejects hazards the
player cannot actually see through solid racking.

**Why.** Raycasting the real scene graph every frame would traverse thousands of
objects. It would also be wrong: hazards like "blind corner" are a *situation*,
not a single mesh, so there is nothing sensible to hit.

**Bugs this design produced, and their fixes** (all found in browser QA):

1. `Mesh.raycast()` reads `matrixWorld`, not `position`. Proxies were never
   given an updated world matrix, so for raycasting purposes they all sat at the
   origin — 14 of 15 hazards were unflaggable and the 15th was a false positive.
   Fixed by updating the world matrix at registration.
2. The occlusion pass counted a hazard's *own* collider as blocking it. Fixed by
   skipping colliders that contain the target point or the camera.
3. Proxies used the default `FrontSide`, so standing *inside* a large hazard
   volume produced no hit — precisely where the hazard is most obvious. Fixed
   with `DoubleSide`.

Recorded here because all three were silent failures that unit tests could not
have caught; only driving the real game found them.

---

## D6 — Synthesised audio

**Date:** 2026-09-06 · **Status:** Adopted

**Decision.** Every sound is generated with the Web Audio API. No audio files.

**Why.** It removes all licensing and attribution overhead, adds zero download
weight, and — the real win — lets the forklift engine and reversing alarm respond
*continuously* to distance and speed rather than being a looped clip. The
reversing alarm getting louder as the truck backs toward you is a genuine
teaching cue.

**Consequence.** It sounds synthetic. Acceptable: the cues are functional
(correct/incorrect/warning), not atmospheric set dressing.

---

## D7 — Local-first persistence behind a swappable adapter

**Date:** 2026-09-06 · **Status:** Adopted

**Decision.** `localStorage` by default, behind a `load()/save()/clear()`
adapter interface. `MemoryAdapter` is used by the tests.

**Why.** The brief required the core game to work with no cloud database, and
offline-first. Every access is wrapped in try/catch: a browser with site data
blocked loses persistence but the game still runs.

Swapping in a REST or Firestore backend means implementing three methods.

---

## D8 — Google OAuth is reported honestly, never faked

**Date:** 2026-09-06 · **Status:** Adopted

**Decision.** Local demo auth by default. Real Google Identity Services code is
present but only activates when `VITE_GOOGLE_CLIENT_ID` is set. Without it, the
button is replaced by the text "Google sign-in not configured".

**Why.** The brief was explicit: never invent credentials, never claim a login
works without testing it. **It has never been tested with real credentials.**

---

## D9 — Difficulty must change gameplay, not labels

**Date:** 2026-09-06 · **Status:** Adopted

**Decision.** Difficulty drives eight distinct parameters: reaction clock, score
multiplier, hazard highlighting, whether the hazard count is shown, decoy count,
whether hazards move, ambient light, fog density, and aim tolerance.

A unit test (`hazards.test.js`) asserts the three difficulty *shapes* are
distinct, so a future change cannot quietly reduce them to a label.

---

## D10 — Decoys as a first-class teaching mechanic

**Date:** 2026-09-06 · **Status:** Adopted

**Decision.** Scenes register deliberately *safe* lookalikes — a spill that is
coned and signed, a rack with a green inspection tag, a correctly parked truck,
a dock sealed by a trailer. Flagging one is wrong and returns an explanation of
why it is acceptable.

**Why.** Real hazard spotting is discrimination, not detection. A trainee who
flags everything has not learned anything. Decoys also give difficulty a way to
get harder without hiding hazards unfairly.

---

## D11 — Node.js installed during development

**Date:** 2026-09-06 · **Status:** Done

Node.js was **not installed** on the development machine — only an empty nvm4w.
Node 24.20.0 LTS was installed via `nvm install`.

`nvm use` requires elevation (it creates a symlink at `C:\nvm4w\nodejs`), so
Node is **not on the system PATH**. Commands must prefix:

```bash
export PATH="/c/Users/acer/AppData/Local/nvm/v24.20.0:$PATH"
```

`.claude/launch.json` invokes `node.exe` by absolute path for the same reason.
`esbuild`'s postinstall also needed explicit approval under npm 11
(`npm install-scripts approve esbuild`).

---

## D12 — First-person only

**Date:** 2026-09-06 · **Status:** Adopted

**Decision.** First-person camera. The Nepali avatars appear in the profile and
as in-world colleagues, not as a controllable third-person character.

**Why.** Hazard spotting is about *your* eyeline. Judging whether a carton
overhangs a beam above head height, or whether you are inside a forklift's blind
spot, depends on being at eye level in the space. A third-person camera actively
harms that, and would have cost rigging and animation work that the brief
explicitly said must not block the core game.
