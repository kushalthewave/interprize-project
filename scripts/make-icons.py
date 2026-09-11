"""
make-icons.py — the app icons for "Install app" (PWA), drawn in code.

    python scripts/make-icons.py

Writes public/icons/: icon-192.png, icon-512.png, icon-maskable-512.png and
apple-touch-icon.png. The mark is the company's: a hazard triangle inside the
game's targeting reticle, on the product's dark ground. Drawn at 4x and
downsampled, so the edges are clean at every size.
"""
import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'public', 'icons')

BG = (11, 15, 20)
AMBER = (242, 185, 12)
INK = (26, 18, 4)


def draw(size, maskable=False):
    s = size * 4
    im = Image.new('RGBA', (s, s), BG + (255,))
    d = ImageDraw.Draw(im)
    # A maskable icon may be cropped to a circle: keep the art inside the
    # central 80% "safe zone".
    scale = 0.62 if maskable else 0.8
    cx = cy = s / 2
    r = s / 2 * scale * 0.78

    ring_w = max(2, int(r * 0.13))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=AMBER, width=ring_w)
    for ang in (0, 90, 180, 270):
        a = math.radians(ang)
        x0, y0 = cx + math.cos(a) * r * 0.98, cy + math.sin(a) * r * 0.98
        x1, y1 = cx + math.cos(a) * r * 1.28, cy + math.sin(a) * r * 1.28
        d.line([x0, y0, x1, y1], fill=AMBER, width=ring_w)

    t = r * 0.78
    tri = [(cx, cy - t * 0.9), (cx - t * 0.95, cy + t * 0.66), (cx + t * 0.95, cy + t * 0.66)]
    d.polygon(tri, fill=AMBER)
    bar_w = t * 0.18
    d.rounded_rectangle([cx - bar_w / 2, cy - t * 0.42, cx + bar_w / 2, cy + t * 0.22], radius=bar_w / 2, fill=INK)
    dot = t * 0.12
    d.ellipse([cx - dot, cy + t * 0.34, cx + dot, cy + t * 0.34 + dot * 2], fill=INK)

    return im.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, size, maskable in (
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('icon-maskable-512.png', 512, True),
        ('apple-touch-icon.png', 180, False),
    ):
        draw(size, maskable).save(os.path.join(OUT, name), optimize=True)
        print('  ·', name)


if __name__ == '__main__':
    main()
