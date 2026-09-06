# Environments

Three warehouses, sharing one prop library and one scenario library. Each scene
file declares only *layout* — where the racking runs, where the doors are, and
where each hazard scenario is placed.

| | Environment 1 | Environment 2 | Environment 3 |
|---|---|---|---|
| **Name** | Main Storage Hall | Loading & Dispatch Bay | High-Bay Annexe |
| **Type** | General storage | Cross-dock | Narrow-aisle high bay |
| **Size** | 62 × 44 × 9.5 m | 70 × 30 × 8.5 m | 54 × 40 × 12 m |
| **Hazards** | 15 (all) | 12 | 15 (all) |
| **Racking** | 8 double-sided runs, 3 levels | 3 shallow runs, 2 levels | 6 runs, **5 levels** |
| **Lighting** | Baseline | ×1.05 brighter | **×0.72 dimmer** |
| **Fog** | Baseline | ×0.85 | **×1.5 heavier** |
| **Extra decoys** | — | — | **+4 on top of difficulty** |
| **Emphasis** | Balanced, every hazard type | Vehicle & dock | Everything, harder to see |
| **Source** | `scenes/env01.js` | `scenes/env02.js` | `scenes/env03.js` |

---

## Environment 1 — Main Storage Hall

**The vertical slice.** Built first and completely; environments 2 and 3 reuse
its architecture rather than duplicating it.

**Layout**

- Four aisles (A–D) at x = −16.5, −8, 8, 16.5, each with a north and south
  double-sided racking run, leaving a cross aisle at z = 0
- A marked green pedestrian spine running the length of the building at
  x = −1.9, plus a cross walkway to the office
- Office block with mezzanine, glazing and the company board on the west side
- Two goods-in roller shutters and two dock doors on the north wall
- Fire exits east and west, a compliant fire point, and a marshalling area

**Racking is populated realistically** — `populateRack()` leaves about 26% of
slots empty, mixes full pallet loads, bare pallets and block stacks, and
shrink-wraps some loads. A 100%-full warehouse looks fake.

**Nepali identity** — the Nepal flag on a pole by the office entrance, the
"Himalaya Logistics · Birgunj" company board, bilingual English/Nepali signage
(निकास, आगो नियन्त्रण, हेलमेट अनिवार्य, पैदल मार्ग), and shipping labels
printed "HIMALAYA LOGISTICS PVT. · KATHMANDU NP" on the cartons. It reads as a
Nepali workplace, not a decorated one.

**All 15 hazards** are placed here. Spawn: (0, 18.5) facing into the building.

---

## Environment 2 — Loading & Dispatch Bay

**Wide and shallow instead of deep.** A cross-dock hall where goods flow
straight through, so there is far more vehicle movement and far less storage.

**Layout**

- **Six dock doors** along the north elevation at x = −26, −17, −8, 1, 10, 19
  - Doors 1, 2, 4, 6 are **sealed by trailers** — safe, and registered as decoys
  - Door 5 is **closed** — also correct, also a decoy
  - **Door 3 is open with no trailer and no barrier** — that is hazard #10
- Numbered outbound marshalling bays (OUT 1–6) marked on the floor, staged with
  correctly built wrapped pallets — bay 4 is left clear for the broken-pallet hazard
- A pedestrian route running the full length, set back from the dock face, with
  two marked crossing points
- Only three shallow racking runs against the south wall

**Why 12 hazards, not 15.** Three storage-specific hazards (falling boxes from
height, damaged high-bay racking, unsafe ladder at height) do not belong in a
cross-dock hall with two-level racking. Forcing them in would have made the
space less believable, which defeats the point. The hazard mix instead leans
toward what genuinely goes wrong on a dispatch floor: vehicle/pedestrian
conflict, dock edges and marshalling housekeeping.

The dock face is the teaching centrepiece: five correct docks and one wrong one,
side by side, so the difference is learnable.

Spawn: (−6, 11) looking down the hall.

---

## Environment 3 — High-Bay Annexe

**The hard site.** Everything that makes hazard spotting difficult in reality.

**Layout**

- **Six narrow-aisle runs, five levels high** (2.0 m level height, ~12 m to the
  roof) at x = −19, −11.4, −3.8, 3.8, 11.4, 19 — aisles are ~2.6 m wide
- Racking is **densely filled** (only ~12% of slots empty vs 26% in env01),
  which is exactly what makes it dark and visually noisy
- Pedestrian routes at both ends and down the west side
- One open dock and one trailer-sealed dock

**What makes it hard**

1. **Light** — ambient at ×0.72 and fog at ×1.5, so distant hazards are genuinely harder to resolve
2. **Height** — the falling-box hazard is on **level 3**, well above eye line
3. **Congestion** — dense stock, extra roll cages, pallet stacks and drums
4. **Decoys** — carries **+4 extra decoys** on top of whatever the difficulty adds, so on Hard there are up to 16 safe lookalikes to reject
5. **Damaged racking is baked into the run itself** (run D, bay 2) rather than being a separate short run, so it must be spotted by sighting down a line of otherwise identical uprights

All 15 hazards. Spawn: (0, 16.5).

---

## Adding a fourth environment

1. Create `src/environment/scenes/env04.js` exporting `meta` and `build(world)`
2. Add it to the array in `src/environment/registry.js`

Nothing else changes — the menus, difficulty selection, progression gates,
achievements and results all read from the registry.

A minimal scene:

```js
export const meta = {
  id: 'env04', name: 'Cold Store', subtitle: 'Chilled · low visibility',
  description: '…', hazardCount: 8,
  size: { width: 40, depth: 30, height: 7 },
  spawn: { x: 0, z: 12, yaw: 0 }, order: 4,
};

export function build(world) {
  world.add(Struct.warehouseShell({ width: 40, depth: 30, height: 7, colliders: world.colliders }));
  world.add(Struct.lighting({ width: 40, depth: 30, height: 7, scene: world.scene,
                              ambientIntensity: world.opts.ambientIntensity }));

  Sc.unmarkedSpill(world, { at: [4, 0, -2] });
  Sc.blockedFireExit(world, { at: [-18, 0, 0], heading: Math.PI / 2 });
  // …

  world.markers.spawn = meta.spawn;
  world.markers.bounds = { minX: -19, maxX: 19, minZ: -14, maxZ: 14 };
}
```

---

## Shared building blocks

| Module | Provides |
|---|---|
| `props/Structure.js` | Shell, portal frame, trusses, high-bay lighting, dock doors, fire-exit doors, roller shutters, office block, walkways, floor lines, floor labels, hazard-striped patches |
| `props/Storage.js` | APR racking (any bays/levels/damage), Euro pallets, cartons, tidy loads, unstable loads, over-height stacks, broken pallets, block stacks |
| `props/Forklift.js` | Counterbalance forklift, hand pallet truck, roll cage |
| `props/Worker.js` | Human figures (hi-vis, no-PPE, driver) and the Nepali kurta-surwal / kurti-surwal avatars, with walk/idle/climbing/leaning poses |
| `props/SafetyProps.js` | Fire points, exit signs, 12 bilingual sign presets, barriers, cones, convex mirrors, ladders, cables, spills, drums, Nepal flag |
| `Scenarios.js` | All 15 hazards + the decoy builders |

## Scale reference

Every dimension is metres, set against real equipment so the space reads
correctly:

| Object | Dimension |
|---|---|
| Player eye height | 1.68 m (1.05 m crouched) |
| Euro pallet | 1.2 × 0.8 × 0.144 m |
| Racking bay | 2.7 m wide, 1.1 m deep, 1.85 m per level |
| Forklift | 2.6 m long, 1.15 m wide, 2.1 m to the overhead guard |
| Worker | ~1.72 m |
| Dock door | 3.0–3.4 m wide, 3.4–3.8 m high |
| Dock edge drop | ~1.2 m |
