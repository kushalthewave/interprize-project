# Blender scripts

## ⚠️ Status: written but NEVER EXECUTED

Blender is **not installed** on the development machine used to build this
project. These scripts are provided so the asset pipeline can be picked up if
Blender becomes available.

**They have not been run, and their output has not been verified.** The Python
syntax is valid (checked with `ast.parse`), but nothing beyond that is
guaranteed. Treat them as a starting point, not working code.

The game does not depend on them. All geometry is generated procedurally in
Three.js at runtime — see `docs/DECISIONS.md`, decision D2.

## Running

```bash
blender --background --python scripts/blender/build_warehouse.py
```

Output goes to `public/assets/models/` as `.glb` files.

## Files

| Script | Purpose |
|---|---|
| `build_warehouse.py` | Generates pallets, cartons, racking (healthy and impact-damaged) and a forklift, then exports each as GLB |

## Integrating the output

The procedural builders and any imported GLBs must share the same `userData`
contract, so that `Scenarios.js` and the scene files need no changes:

| Prop | Contract that must be preserved |
|---|---|
| Racking | `userData.slot(bay, level, side)`, `.bayWidth`, `.levels`, `.bays`, `.height`, `.totalWidth` |
| Forklift | `userData.wheels[]`, `.beacon`, `.beaconLight`, `.reverseLights[]`, `.mast`, `.carriage`, `.setLoad(obj)` |
| Pallet | `userData.height`, `.damaged` |
| Unstable load | `userData.fallingBox`, `.tiltedBox`, `.loadHeight` |

Load each GLB **once** and clone per instance. Keep `World.optimize()` — merged
static geometry matters just as much for imported meshes as for generated ones.

All dimensions in the scripts are metres and match the procedural versions
exactly, so imported assets drop into the existing layouts without
repositioning.
