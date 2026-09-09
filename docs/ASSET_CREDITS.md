# Asset Credits

## Summary

**This project contains no third-party assets.**

No downloaded models, no stock textures, no sound files, no icon packs, no web
fonts. Every mesh, texture and sound is generated in code at runtime.

There is therefore nothing to attribute and no licence to comply with beyond the
software dependencies listed at the bottom.

---

## Why

This started as a constraint and became a deliberate choice.

**The constraint.** Blender is not installed on the development machine
(verified: no `blender` on PATH, no `Program Files/Blender Foundation`), so
authoring assets locally was not possible. No modelled assets exist in the
project, and no generator scripts are shipped.

**Why the fallback turned out to be the better option anyway:**

| | Downloaded assets | Procedural |
|---|---|---|
| Licensing | Per-asset tracking, attribution obligations, some licences block commercial or derivative use | None |
| Download size | Typically 5–50 MB for a warehouse set | 0 bytes |
| Scale consistency | Every model comes in a different unit scale; must be normalised by hand | Every dimension written in metres by construction |
| Art style | Mixing sources looks incoherent | One consistent style |
| Parameterisation | A damaged rack is a *different model* | `racking({ damagedBay: 1 })` |

That last row matters most here. The hazards *are* parameterised versions of
safe props — a damaged upright, an unstable pallet load, a broken pallet. Being
able to generate the safe and unsafe variants from the same builder is what
makes the hazard-versus-control comparison possible throughout the game.

**The honest cost:** it does not look photorealistic. See
[Limitations](../README.md#limitations--read-this).

---

## Inventory of generated content

### Geometry — Three.js primitives, `src/environment/props/`

| Module | Produces |
|---|---|
| `Structure.js` | Floor slab, profiled wall cladding, dado bands, portal frame columns, roof trusses with web bracing, purlins, high-bay light fixtures, roof-light panels, sectional dock doors, fire-exit doors, roller shutters, office block with mezzanine and glazing, painted walkways, floor lines, floor labels, hazard-striped patches |
| `Storage.js` | APR racking (arbitrary bays/levels/depth, single or double sided, healthy or impact-damaged), upright frames with diagonal bracing and footplates, column guards, beams, deck bars, Euro pallets (sound or broken), cartons, tidy pallet loads, shrink wrap, unstable loads, over-height stacks, block stacks, rack inspection tags |
| `Forklift.js` | Counterbalance forklift — chassis, counterweight, engine cowl, seat, steering column and wheel, FOPS overhead guard, two-stage mast, hydraulic ram, carriage, tines, four wheels, amber beacon, reversing lights, head lights, printed side decals. Plus hand pallet truck and wire roll cage |
| `Worker.js` | Articulated human figures with a procedural walk/idle cycle: hi-vis worker (vest with reflective banding, hard hat, boots), no-PPE worker, seated driver, and the Nepali kurta-surwal and kurti-surwal avatars (dhaka topi, dupatta) |
| `SafetyProps.js` | Fire extinguishers, fire points with backboard and keep-clear hatching, exit signs, sign posts, safety barriers, traffic cones, wet-floor A-boards, convex mirrors, ladders (safe and unsafe angles), trailing cables with taped repairs and exposed conductor, wall socket boxes, spill decals, oil drums, buckets, brooms, the Nepal flag on a pole |

### Textures — HTML canvas, `src/core/Textures.js`

All drawn at load with the Canvas 2D API and cached as `THREE.CanvasTexture`.
Deterministic (seeded PRNG), so the warehouse is identical every session.

| Texture | Detail |
|---|---|
| Concrete floor | Mottling, aggregate speckle, grime blotches, saw-cut expansion joints with highlights, plus a matching roughness map so it is not uniformly shiny |
| Cardboard (4 variants) | Corrugation striping, fibre flecks, packing-tape seam, printed shipping label reading "HIMALAYA LOGISTICS PVT. · KATHMANDU NP", a generated barcode, and a "this way up" stencil |
| Pallet wood | Bezier grain lines and elliptical knots |
| Painted steel | Base colour with scratches revealing bare metal, plus grime |
| Wall cladding | Vertical profiled ribs with gradient shading and a panel joint |
| Signage | A generic sign painter with 12 presets, drawn glyphs (running man, warning triangle, hard hat, forklift, flame), and **bilingual English/Nepali** text |
| Spill decal | Overlapping ellipses with alpha falloff plus oily rainbow-sheen highlights |
| Hazard stripes | Diagonal chevrons for dock edges and keep-clear zones |
| **Flag of Nepal** | Drawn to the real double-pennant outline — not a rectangle — with the crimson field, blue border, the white crescent moon with rays, and the twelve-ray sun |

### Audio — Web Audio API, `src/audio/AudioManager.js`

Every sound synthesised from oscillators and filtered noise buffers.

| Sound | Synthesis |
|---|---|
| Warehouse ambience | Brown-noise plant-room rumble through a low-pass, plus a faint high-passed hiss |
| Forklift engine | Sawtooth through a low-pass filter, frequency and cutoff driven continuously by speed, gain by distance |
| Reversing alarm | Gated square wave, attenuated by distance — it genuinely gets louder as the truck backs toward you |
| Correct | Rising major arpeggio |
| Incorrect | Low descending double buzz |
| Combo | Bright stacked fifths |
| Achievement | Five-note rising triangle run |
| Timer warning / critical | Short square-wave pips |
| Result good / poor | Rising / falling triangle cadence |
| Box impact | Low-passed noise burst plus a sine thump |
| Forklift horn | Two stacked square waves |
| UI click / hover / back | Short triangle and sine blips |

### Fonts

System font stacks only — `Inter`, `Segoe UI`, `system-ui`, `-apple-system`,
falling back to the platform sans-serif. No web fonts are loaded, so there is no
font licence and no network request.

Emoji in the UI are rendered by the operating system's own emoji font.

> **Known cosmetic issue:** the 🇳🇵 flag emoji in the UI header renders as the
> letters "NP" on Windows, which has no emoji flag font. The in-world 3D flag is
> drawn from scratch and is unaffected.

---

## Software dependencies

| Package | Version | Licence |
|---|---|---|
| [three](https://github.com/mrdoob/three.js) | 0.180.0 | MIT |
| [vite](https://github.com/vitejs/vite) | 7.3.6 | MIT |
| [vitest](https://github.com/vitest-dev/vitest) | 3.2.7 | MIT |

All MIT-licensed and permissive. Vite and Vitest are development dependencies
only and are not part of the shipped bundle.

---

## If assets are added later

Any future third-party asset must be recorded here with:

- Asset name and file path in the repo
- Creator / author
- Source URL
- Licence, with a link to its text
- Any modifications made

An unattributed asset is a licence violation, not just untidy bookkeeping.
