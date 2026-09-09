"""
frames.py — rasterise the Figma-importable UI prototype frames (design/frames/*.svg)
into PNGs the Word documents can embed.

One correction is applied on the way through. The frames draw pill-shaped chips
as `<rect rx="999">`, which every browser clamps to half the height. svglib does
not clamp, and renders them as pointed lens shapes instead. Rather than change
the source frames — the browser rendering is correct and is what Figma imports —
the radius is clamped here, at the point where the artefact appears.
"""
import os
import re
import tempfile
from xml.etree import ElementTree as ET

from reportlab.graphics import renderPM
from svglib.svglib import svg2rlg

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), "design", "frames")
OUT = os.path.join(HERE, "_figures", "frames")

SVG_NS = "http://www.w3.org/2000/svg"

TITLES = {
    "01-login": "Sign-in — every route, with unavailable ones explained",
    "02-main-menu": "Main menu — mode, progress and rank",
    "03-environment-select": "Environment select — three warehouses",
    "04-difficulty-select": "Difficulty select — what each setting actually changes",
    "05-in-game-hud": "In-game HUD — reticle, clock, found count and the find panel",
    "06-results": "Results — rank, breakdown and every hazard named",
    "07-settings": "Settings — audio, controls, accessibility and security",
    "08-user-flow": "End-to-end user flow",
}


def _clamp_pill_radii(svg_path):
    """Rewrite rx/ry that exceed half the rect, then return a temp file path."""
    ET.register_namespace("", SVG_NS)
    tree = ET.parse(svg_path)
    for rect in tree.getroot().iter(f"{{{SVG_NS}}}rect"):
        try:
            h = float(rect.get("height", "0"))
            w = float(rect.get("width", "0"))
        except ValueError:
            continue
        for attr, limit in (("rx", w / 2), ("ry", h / 2)):
            raw = rect.get(attr)
            if raw is None:
                continue
            try:
                val = float(raw)
            except ValueError:
                continue
            cap = min(w / 2, h / 2)
            if val > cap:
                rect.set(attr, f"{cap:g}")
        # A rect with only rx set gets ry = rx in SVG; make that explicit so the
        # clamp above cannot be undone by the renderer's own default.
        if rect.get("rx") is not None and rect.get("ry") is None:
            rect.set("ry", rect.get("rx"))
    fd, tmp = tempfile.mkstemp(suffix=".svg")
    os.close(fd)
    tree.write(tmp, encoding="utf-8", xml_declaration=True)
    return tmp


def build_all(dpi=140):
    os.makedirs(OUT, exist_ok=True)
    made = []
    for name in sorted(os.listdir(SRC)):
        if not name.endswith(".svg"):
            continue
        stem = os.path.splitext(name)[0]
        tmp = _clamp_pill_radii(os.path.join(SRC, name))
        try:
            drawing = svg2rlg(tmp)
            dest = os.path.join(OUT, f"{stem}.png")
            renderPM.drawToFile(drawing, dest, fmt="PNG", dpi=dpi)
            made.append((stem, dest))
            print(f"  · frames/{stem}.png")
        finally:
            os.unlink(tmp)
    return made


def path(stem):
    return os.path.join(OUT, f"{stem}.png")


if __name__ == "__main__":
    print("Prototype frames")
    build_all()
