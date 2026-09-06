# Architecture

## Guiding rules

1. **Gameplay code never touches the DOM.** Systems emit events; the UI listens.
2. **Hazard content is data**, separate from both the 3D scene and the UI.
3. **A scene declares *where*, the scenario library declares *what*.**
   Adding an environment must not mean copying the application.
4. **Everything tunable lives in `src/data/config.js`.** No gameplay constants
   buried in systems.

---

## Layers

```
┌─────────────────────────────────────────────────────────────┐
│                          main.js                            │
│   boots everything, owns cross-layer input (Esc, E, click)  │
└─────────────────────────────────────────────────────────────┘
        │                    │                      │
        ▼                    ▼                      ▼
┌───────────────┐   ┌─────────────────┐   ┌──────────────────┐
│    Engine     │   │   GameManager   │   │    UIManager     │
│  renderer     │   │  round lifecycle│   │  screen router   │
│  scene/camera │◄──┤  Train vs Test  │   │  HUD, overlays   │
│  frame loop   │   │  win/lose/end   │   │  touch controls  │
└───────────────┘   └─────────────────┘   └──────────────────┘
        │              │      │      │              ▲
        │              ▼      ▼      ▼              │
        │         ┌───────┐ ┌─────┐ ┌────────┐      │
        │         │ Score │ │Timer│ │Profile │      │
        │         └───────┘ └─────┘ └────────┘      │
        │              │      │      │              │
        │              └──────┴──────┴──────────────┘
        │                  via EventBus (no direct calls)
        ▼
┌───────────────────────────────────────────────────┐
│                      World                        │
│   build context handed to each scene              │
│   add() collider() hazard() decoy() animate()     │
│   optimize()  ← static-geometry merge             │
└───────────────────────────────────────────────────┘
        │                          │
        ▼                          ▼
┌────────────────────┐   ┌──────────────────────┐
│   HazardSystem     │   │   scenes/ + props/   │
│  proxy raycast     │   │   Scenarios.js       │
│  occlusion test    │   │   (the 15 hazards)   │
│  validation        │   └──────────────────────┘
└────────────────────┘
```

The **EventBus** is what keeps this decoupled. `ScoreManager` emits
`score:changed`; it has no idea a HUD exists. That is also why the gameplay
logic is testable in Node with no browser.

---

## Directory map

```
src/
├── main.js                     entry point, wiring, cross-layer input
│
├── core/
│   ├── Engine.js               renderer, camera, frame loop, adaptive quality,
│   │                           WebGL context-loss recovery
│   ├── EventBus.js             pub/sub + the canonical event-name table
│   └── Textures.js             every texture, drawn on canvas
│
├── player/
│   └── PlayerController.js     FPS camera, WASD, crouch/run, collision,
│                               pointer lock + drag-look fallback, touch
│
├── environment/
│   ├── World.js                build context + optimize() merge pass
│   ├── Scenarios.js            the 15 hazards as reusable physical situations
│   ├── registry.js             the environment list
│   ├── props/
│   │   ├── Materials.js        shared material + geometry cache
│   │   ├── Structure.js        shell, frame, lighting, doors, floor markings
│   │   ├── Storage.js          racking, pallets, cartons, stacks
│   │   ├── Forklift.js         forklift, pallet truck, roll cage
│   │   ├── Worker.js           human figures + walk cycle + Nepali avatars
│   │   └── SafetyProps.js      fire points, signage, barriers, ladders, spills
│   └── scenes/
│       ├── env01.js            Main Storage Hall
│       ├── env02.js            Loading & Dispatch Bay
│       └── env03.js            High-Bay Annexe
│
├── hazards/
│   └── HazardSystem.js         instances, proxy targeting, occlusion, markers
│
├── gameplay/
│   ├── GameManager.js          round lifecycle, Train vs Test rules
│   ├── ScoreManager.js         scoring, combo, stats, summary   (pure)
│   └── Timer.js                round + per-hazard clocks         (pure)
│
├── services/
│   └── Profile.js              persistence, progression, achievements
│
├── audio/
│   └── AudioManager.js         synthesised audio
│
├── ui/
│   ├── UIManager.js            router, overlays, toasts, touch layer
│   ├── HUD.js                  in-game overlay
│   ├── Screens.js              every menu screen
│   ├── dom.js                  ~40-line DOM helper
│   └── styles.css
│
└── data/
    ├── config.js               ALL tunables
    └── hazards.js              the hazard knowledge base
```

---

## Round lifecycle

```
loadEnvironment(envId, difficulty, mode)
    ├── unload previous world
    ├── new World(scene, hazards, difficultyOptions)
    ├── env.build(world)          ← the scene declares everything
    ├── world.optimize()          ← merge static geometry
    ├── wire colliders → player, occluders → hazards
    └── teleport player to spawn
                │
                ▼
start(mode)
    ├── new ScoreManager(multiplier)
    ├── new Timer(secondsPerHazard × hazardCount)
    ├── hazards.reset() + activate
    └── emit game:start
                │
                ▼
    ┌───────── per frame ─────────┐
    │  world.update()  animations │
    │  hazards.update() targeting │
    │  player.update() movement   │
    │  timer.tick()               │
    │  emit game:tick             │
    └─────────────────────────────┘
                │
        flag() on E / click
                │
        ┌───────┴────────┐
     correct            wrong
        │                │
   score.recordCorrect   score.recordWrong
   timer.nextHazard()    (combo breaks)
        │                │
        └───────┬────────┘
                ▼
     all found OR clock expired
                │
                ▼
end(reason)
    ├── build summary (+ coaching tips, missed hazards)
    ├── profile.recordResult() → achievements, progression
    └── emit game:end → results screen
```

---

## How a scene declares a hazard

A scene never manipulates the hazard system directly. It calls `world.hazard()`:

```js
world.hazard({
  id: 'falling-boxes',            // links to data/hazards.js
  center: worldPosition,          // or pass `object` to derive it
  size: new THREE.Vector3(2.4, 2.0, 1.9),
  hint: 'Compare this pallet with the ones beside it.',
});
```

`World` builds a `HazardInstance`, `HazardSystem` creates the invisible proxy
and the highlight marker. The scene's job ends there.

Similarly `world.decoy({ ..., reason })` registers a safe lookalike, and
`world.animate(fn)` registers a per-frame updater.

---

## Why environments 2 and 3 are short

Everything reusable lives in `props/` and `Scenarios.js`. A scene file is
almost entirely *layout*:

```js
Sc.forkliftOnWalkway(world, { at: [-13, 0, 6.5], heading: Math.PI / 2, patrol: true });
Sc.openDockEdge(world,      { at: [dockXs[2], 0, -D / 2 + 2.2], heading: 0 });
Sc.blindCorner(world,       { at: [8, 0, 9.0], heading: Math.PI });
```

Each builder constructs the geometry, registers the hazard, adds colliders and
wires the animation. Adding a fourth environment is one file plus one line in
`registry.js`.

---

## Performance strategy

| Technique | Where | Effect |
|---|---|---|
| Shared materials + geometry cache | `props/Materials.js` | Fewer GPU state changes |
| Static-geometry merge | `World.optimize()` | **9,587 meshes → 994** |
| Proxy-only raycast | `HazardSystem._pick()` | ~20 objects tested, not thousands |
| Ray-vs-AABB occlusion | `HazardSystem._occluded()` | No scene traversal |
| Selective shadow casting | `Structure.lighting()` | One shadow-casting light |
| Emissive fixtures, not lights | `Structure.lighting()` | Only alternate lamps are real lights |
| Adaptive pixel ratio | `Engine._adaptiveQuality()` | Drops DPR below ~40 fps, recovers above 58 |
| dt clamping | `Engine.start()` | A background tab cannot teleport the player |

Measured: **60 fps, 1,520 draw calls, 272k triangles, 35 textures.**

---

## Error handling

| Failure | Behaviour |
|---|---|
| No WebGL | Explanatory full-screen message, not a black canvas |
| WebGL context lost | Loop stops, game pauses, auto-resumes on restore |
| `localStorage` blocked | In-memory fallback; game still runs |
| AudioContext unavailable | All audio calls become no-ops |
| Pointer lock refused | Falls back to click-and-drag look |
| Environment fails to build | Caught, toast shown, returns to menu |
| Event handler throws | Caught per handler; one bad listener cannot kill the bus |
| Tab hidden mid-round | Auto-pause (a running reaction clock would be unfair) |
| Tab hidden mid-load | Loader races rAF against a timeout so it cannot stall |
