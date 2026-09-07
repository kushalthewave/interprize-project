# Presentation

`Beat-The-Hazard-Presentation.pptx` (repo root) — 15-slide deck for the client
and classroom presentation.

## Rebuilding

```bash
cd ppt
npm install          # pptxgenjs only; kept out of the game's dependencies
npm run build        # writes ../Beat-The-Hazard-Presentation.pptx
```

## Screenshots

The deck uses **real in-game renders**, not mock-ups. They are captured at
1920x1080 straight from the WebGL canvas:

```bash
node ppt/capture-server.mjs          # listens on :7788, writes ppt/shots/
npm run dev                          # then in the browser console:
#   window.__cap('name')             (helpers are installed by the capture snippet)
```

Captured PNGs are downscaled to 1600x900 JPEGs in `ppt/shots/opt/`, which is
what the deck references. Both `shots/` directories are gitignored — regenerate
them rather than committing ~20 MB of images.

## Checks

```bash
python ppt/audit.py                  # geometry: off-slide, tight margins, overlap, text overflow
python <skill>/scripts/office/validate.py Beat-The-Hazard-Presentation.pptx
python -m markitdown Beat-The-Hazard-Presentation.pptx    # content dump
```

`audit.py` exists because LibreOffice is not installed on this machine, so the
slides cannot be rendered to images for a visual pass. It checks geometrically
for the defects a render would show. **Text-fit is an estimate** based on
character widths, not a real layout engine — open the deck once in PowerPoint
before presenting.
