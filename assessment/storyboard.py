"""
storyboard.py — A6 figures: the website storyboard and the trainee journey.

The A6 task asks for "website ideas / design prototypes / storyboards". The
website itself is built and deployed, so these two figures do the job a
storyboard does that a finished page cannot: they show the *sequence* — what a
visitor meets in what order, and why that order was chosen.
"""
import os
import textwrap

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, FancyArrowPatch

import config as CFG

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_figures")
PAPER = "#FFFFFF"
INK = "#1F2933"
GREY = "#5B6873"
BG = "#" + CFG.BRAND["bg"]
PANEL = "#" + CFG.BRAND["panel"]
ACCENT = "#" + CFG.BRAND["accent"]
DIM = "#" + CFG.BRAND["dim"]

# (title, purpose, wireframe recipe)
PANELS = [
    ("1 · Hero", "Say what it is and let them play it, above the fold.", "hero"),
    ("2 · Proof band", "Five real numbers. Credibility before persuasion.", "stats"),
    ("3 · Product", "Six cards: what it does and why that matters.", "cards"),
    ("4 · Hazards", "All fifteen, colour-coded. Scope made concrete.", "grid"),
    ("5 · Modes", "Train vs Test, side by side, plus the scoring table.", "split"),
    ("6 · Gallery", "Nine screenshots from the running build.", "gallery"),
    ("7 · Company", "Mission and three values. Who is behind it.", "text"),
    ("8 · Close", "One call to action, repeated. Then the footer.", "cta"),
]


def _frame(ax, x, y, w, h):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.06",
                                facecolor=BG, edgecolor="#B7BFC7", linewidth=1.0, zorder=2))
    # browser chrome
    ax.add_patch(Rectangle((x, y), w, 0.22, facecolor="#1F2831", edgecolor="none", zorder=3))
    for i in range(3):
        ax.add_patch(plt.Circle((x + 0.13 + i * 0.13, y + 0.11), 0.032,
                                facecolor="#4A5560", edgecolor="none", zorder=4))


def _bar(ax, x, y, w, h, colour, alpha=1.0):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=colour, edgecolor="none",
                           alpha=alpha, zorder=4))


def _wire(ax, kind, x, y, w, h):
    """Draw a small abstract wireframe of one page section."""
    p = 0.16
    ix, iy, iw = x + p, y + 0.34, w - 2 * p
    if kind == "hero":
        _bar(ax, ix, iy + 0.10, iw * 0.30, 0.07, ACCENT)
        for i, wf in enumerate((0.72, 0.60, 0.46)):
            _bar(ax, ix, iy + 0.30 + i * 0.19, iw * wf, 0.13,
                 ACCENT if i == 2 else "#E9EEF4")
        _bar(ax, ix, iy + 0.92, iw * 0.62, 0.06, DIM, .7)
        _bar(ax, ix, iy + 1.03, iw * 0.55, 0.06, DIM, .7)
        _bar(ax, ix, iy + 1.20, iw * 0.22, 0.13, ACCENT)
        _bar(ax, ix + iw * 0.25, iy + 1.20, iw * 0.20, 0.13, PANEL)
        _bar(ax, x + w * 0.56, iy + 0.22, w * 0.36, h - 0.95, "#2A3540")
    elif kind == "stats":
        for i in range(5):
            cw = iw / 5.4
            _bar(ax, ix + i * (cw + iw * 0.012), iy + 0.30, cw, 0.16, ACCENT)
            _bar(ax, ix + i * (cw + iw * 0.012), iy + 0.52, cw, 0.06, DIM, .7)
    elif kind == "cards":
        for r in range(2):
            for c in range(3):
                cw, ch = iw / 3.3, 0.52
                cx = ix + c * (cw + iw * 0.02)
                cy = iy + 0.22 + r * (ch + 0.14)
                _bar(ax, cx, cy, cw, ch, PANEL)
                _bar(ax, cx + 0.05, cy + 0.07, 0.12, 0.12, ACCENT)
                _bar(ax, cx + 0.05, cy + 0.26, cw * 0.7, 0.05, "#E9EEF4")
                _bar(ax, cx + 0.05, cy + 0.36, cw * 0.85, 0.04, DIM, .6)
    elif kind == "grid":
        for r in range(5):
            for c in range(3):
                cw = iw / 3.2
                cx = ix + c * (cw + iw * 0.02)
                cy = iy + 0.24 + r * 0.19
                _bar(ax, cx, cy, cw, 0.14, PANEL)
                _bar(ax, cx + 0.04, cy + 0.05, 0.05, 0.05,
                     "#FF4D4D" if r * 3 + c < 8 else "#FFC14D")
    elif kind == "split":
        for c in range(2):
            cw = iw / 2.1
            cx = ix + c * (cw + iw * 0.04)
            _bar(ax, cx, iy + 0.22, cw, 0.72, PANEL)
            _bar(ax, cx, iy + 0.22, 0.035, 0.72, "#38BDF8" if c == 0 else ACCENT)
            for i in range(4):
                _bar(ax, cx + 0.09, iy + 0.34 + i * 0.14, cw * 0.72, 0.05, DIM, .65)
        for i in range(4):
            _bar(ax, ix, iy + 1.06 + i * 0.10, iw, 0.06, PANEL)
    elif kind == "gallery":
        for r in range(3):
            for c in range(3):
                cw = iw / 3.2
                _bar(ax, ix + c * (cw + iw * 0.02), iy + 0.24 + r * 0.31, cw, 0.26, "#2A3540")
    elif kind == "text":
        _bar(ax, ix, iy + 0.22, 0.035, 0.30, ACCENT)
        _bar(ax, ix + 0.10, iy + 0.26, iw * 0.66, 0.08, "#E9EEF4")
        _bar(ax, ix + 0.10, iy + 0.40, iw * 0.50, 0.08, "#E9EEF4")
        for c in range(3):
            cw = iw / 3.3
            cx = ix + c * (cw + iw * 0.02)
            _bar(ax, cx, iy + 0.66, cw * 0.6, 0.05, ACCENT)
            for i in range(3):
                _bar(ax, cx, iy + 0.78 + i * 0.10, cw * (0.95 - i * 0.12), 0.04, DIM, .6)
    elif kind == "cta":
        _bar(ax, ix, iy + 0.22, iw, 0.62, "#2A2410")
        _bar(ax, ix + iw * 0.22, iy + 0.34, iw * 0.56, 0.09, "#E9EEF4")
        _bar(ax, ix + iw * 0.32, iy + 0.50, iw * 0.36, 0.05, DIM, .7)
        _bar(ax, ix + iw * 0.30, iy + 0.62, iw * 0.18, 0.11, ACCENT)
        _bar(ax, ix + iw * 0.52, iy + 0.62, iw * 0.18, 0.11, PANEL)
        _bar(ax, ix, iy + 0.94, iw, 0.28, PANEL)


def website_storyboard():
    os.makedirs(OUT, exist_ok=True)
    cols, rows = 4, 2
    cw, ch = 2.85, 3.25
    fig_w, fig_h = cols * cw + 0.5, rows * ch + 1.0
    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=190)
    ax.set_xlim(0, fig_w)
    ax.set_ylim(fig_h, 0)
    ax.axis("off")
    fig.patch.set_facecolor(PAPER)

    ax.text(fig_w / 2, 0.34, f"{CFG.COMPANY} — website storyboard",
            ha="center", fontsize=13.5, fontweight="bold", color=INK)
    ax.text(fig_w / 2, 0.62,
            "One page, read top to bottom. Each panel below is one screen of scroll.",
            ha="center", fontsize=8.6, color=GREY)

    for i, (title, purpose, kind) in enumerate(PANELS):
        c, r = i % cols, i // cols
        x = 0.25 + c * cw
        y = 0.95 + r * ch
        w, h = cw - 0.42, ch - 1.05
        _frame(ax, x, y, w, h)
        _wire(ax, kind, x, y, w, h)
        ax.text(x, y + h + 0.24, title, fontsize=9.4, fontweight="bold", color=INK)
        # matplotlib's wrap=True measures against the whole figure, not the
        # column, so captions ran into the next panel. Wrap explicitly.
        ax.text(x, y + h + 0.40, textwrap.fill(purpose, 34), fontsize=7.8,
                color=GREY, va="top", linespacing=1.45)
        if c < cols - 1 and i < len(PANELS) - 1:
            ax.add_patch(FancyArrowPatch((x + w + 0.06, y + h / 2),
                                         (x + cw - 0.20, y + h / 2),
                                         arrowstyle="-|>", mutation_scale=9,
                                         linewidth=1.0, color="#B7BFC7", zorder=1))

    p = os.path.join(OUT, "fig_website_storyboard.png")
    fig.savefig(p, facecolor=PAPER, bbox_inches="tight", pad_inches=0.16)
    plt.close(fig)
    print("  · fig_website_storyboard.png")
    return p


JOURNEY = [
    ("Sees the link", "LinkedIn post, university showcase,\nor the repository README",
     "#64717F"),
    ("Lands on the site", "Hero states what it is.\nDemo button is the first control.",
     "#38BDF8"),
    ("Checks it is real", "Proof band, then nine screenshots\nfrom the running build.",
     "#22C55E"),
    ("Plays the demo", "One click. No install, no sign-up,\nno form in the way.",
     "#F2B90C"),
    ("Comes back", "Company section answers\n“who are these people?”",
     "#FF8A1F"),
    ("Makes contact", "Repository, offline build,\nor a direct approach.",
     "#EF4444"),
]


def visitor_journey():
    os.makedirs(OUT, exist_ok=True)
    n = len(JOURNEY)
    fig, ax = plt.subplots(figsize=(12.4, 3.1), dpi=190)
    ax.set_xlim(0, n * 2.05)
    ax.set_ylim(3.1, 0)
    ax.axis("off")
    fig.patch.set_facecolor(PAPER)

    ax.text(n * 2.05 / 2, 0.32, "Visitor journey — and the one thing each step has to do",
            ha="center", fontsize=12.5, fontweight="bold", color=INK)

    for i, (title, detail, colour) in enumerate(JOURNEY):
        x = 0.12 + i * 2.05
        ax.add_patch(FancyBboxPatch((x, 0.85), 1.78, 1.55,
                                    boxstyle="round,pad=0,rounding_size=0.09",
                                    facecolor="#FBFCFD", edgecolor=colour,
                                    linewidth=1.5, zorder=2))
        ax.add_patch(Rectangle((x, 0.85), 1.78, 0.11, facecolor=colour,
                               edgecolor="none", zorder=3))
        ax.text(x + 0.89, 1.22, title, ha="center", fontsize=9.2,
                fontweight="bold", color=INK, zorder=4)
        ax.text(x + 0.89, 1.78, detail, ha="center", va="center", fontsize=7.6,
                color=GREY, linespacing=1.45, zorder=4)
        if i < n - 1:
            ax.add_patch(FancyArrowPatch((x + 1.80, 1.62), (x + 2.10, 1.62),
                                         arrowstyle="-|>", mutation_scale=10,
                                         linewidth=1.2, color="#9AA5B1", zorder=1))

    ax.text(n * 2.05 / 2, 2.82,
            "Every step is free to run. The only cost in the whole funnel is the time "
            "spent writing the page.",
            ha="center", fontsize=8.2, color=GREY, style="italic")

    p = os.path.join(OUT, "fig_visitor_journey.png")
    fig.savefig(p, facecolor=PAPER, bbox_inches="tight", pad_inches=0.16)
    plt.close(fig)
    print("  · fig_visitor_journey.png")
    return p


def build_all():
    website_storyboard()
    visitor_journey()


if __name__ == "__main__":
    print("A6 figures")
    build_all()
