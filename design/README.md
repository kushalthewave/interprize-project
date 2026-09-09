# Design / Prototype

Figma-importable UI artboards for **Beat The Hazard**.

## ⚠️ What these are, and what they are not

These are **SVG artboards**, not a native `.fig` file. Figma has no public API
for writing `.fig` documents, so a real Figma file cannot be generated outside
Figma itself.

What you get instead is genuinely useful: Figma imports SVG as **editable vector
layers with editable text** — real rectangles, real type, correct colours — not
flattened images. You can restyle, rearrange and prototype on top of them
immediately.

## Importing into Figma

1. Open a Figma file
2. **File → Import…** (or just drag the SVGs onto the canvas)
3. Select all eight files from `design/frames/`
4. Each becomes its own frame, named from its `<title>` (e.g. "05 In-Game HUD")

To make it a **clickable prototype**:

1. Select all frames → right-click → *Frame selection*
2. Switch to the **Prototype** tab
3. Drag connections following `08-user-flow.svg`:

```
01 Login → 02 Main Menu → 03 Environment Select → 04 Difficulty Select
                ↓                                          ↓
          07 Settings                               05 In-Game HUD
                                                           ↓
                                                     06 Results ──→ 02 Main Menu
```

4. Press ▶ to present

## The frames

| File | Screen |
|---|---|
| `01-login.svg` | Sign-in, name entry, Nepali avatar picker |
| `02-main-menu.svg` | Six entry points, profile bar, completion |
| `03-environment-select.svg` | The three warehouses, with locked state |
| `04-difficulty-select.svg` | Simple / Mid / Hard and what each changes |
| `05-in-game-hud.svg` | **The key frame** — HUD, reticle, Train panel, feedback card with hazard location and safety keywords |
| `06-results.svg` | Score, rank, stats, coaching, found/missed with locations |
| `07-settings.svg` | All five settings groups |
| `08-user-flow.svg` | Flow map + the Test Mode loop |

`05` and `08` are the two worth spending time on in a presentation: one shows
what the trainee actually sees, the other explains the whole model in a glance.

## Rebuilding

```bash
node design/build-frames.mjs      # regenerates design/frames/*.svg
```

The palette and type in `build-frames.mjs` are copied from
`src/ui/styles.css`, so the prototype and the built game stay in agreement.
If you restyle the game, update both.

## A note for the presentation

The prototype is a **design artefact**, not the product — the real game is
already built and playable at
<https://kushalthewave.github.io/interprize-project/>.

Use the frames to talk through the flow and the interface decisions, then switch
to the live game for the demo. Showing a prototype when a working build exists
undersells the work.
