"""
diagrams.py — every figure in the submission, generated rather than drawn by
hand so a change to the design is a change to one line of code.

Produces:
  fig_context.png            A1  system context (level-0) diagram
  fig_usecase.png            A1  use case diagram
  fig_flow_round.png         A1  structured flowchart — a training round
  fig_flow_flag.png          A1  structured flowchart — hazard flag resolution
  fig_flow_auth.png          A1  structured flowchart — sign-in and 2FA
  fig_architecture.png       A1  layered module architecture
  fig_gantt.png              A5  project Gantt chart
  logo_dark.png / logo_light.png / logo_mark.png   A6  corporate identity
  fig_palette.png            A6  brand palette sheet
"""
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Polygon, FancyArrowPatch, Circle, Rectangle
from matplotlib.lines import Line2D

import config as CFG

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_figures")

C = {k: "#" + v for k, v in CFG.BRAND.items()}
PAPER = "#FFFFFF"
INK = "#1F2933"
GREY = "#5B6873"
LINE = "#9AA5B1"


def _ensure():
    os.makedirs(OUT, exist_ok=True)


# ══════════════════════════════════════════════════════════════════════
# A tiny flowchart engine
# ══════════════════════════════════════════════════════════════════════
class Flow:
    """
    Coordinates are in arbitrary units with y increasing downwards, which is
    how flowcharts are actually read. Nodes are placed by their centre.
    """

    SHAPES = ("terminal", "process", "decision", "io", "note")

    def __init__(self, width=10.0, height=12.0, title=None):
        self.w, self.h = width, height
        self.title = title
        self.nodes = {}
        self.edges = []
        self.paths = []

    def node(self, key, x, y, text, shape="process", w=2.6, h=0.8, fill=None):
        assert shape in self.SHAPES, shape
        self.nodes[key] = dict(x=x, y=y, text=text, shape=shape, w=w, h=h, fill=fill)
        return key

    def edge(self, a, b, label=None, style="auto", side=None, colour=None):
        self.edges.append(dict(a=a, b=b, label=label, style=style, side=side, colour=colour))

    def path(self, points, arrow=True, colour=None, dots=(), label=None,
             label_at=None):
        """
        An explicit orthogonal route. Flowcharts get unreadable the moment two
        lines are allowed to cut through a box, so every return path and every
        merge in this document is routed by hand down a clear corridor.
        `dots` marks junctions where several routes join one spine.
        """
        self.paths.append(dict(points=list(points), arrow=arrow, colour=colour,
                               dots=list(dots), label=label, label_at=label_at))

    def port(self, key, direction):
        return self._port(key, direction)

    # -- geometry ------------------------------------------------------
    def _port(self, key, direction):
        n = self.nodes[key]
        hw, hh = n["w"] / 2, n["h"] / 2
        return {
            "n": (n["x"], n["y"] - hh),
            "s": (n["x"], n["y"] + hh),
            "w": (n["x"] - hw, n["y"]),
            "e": (n["x"] + hw, n["y"]),
        }[direction]

    def _auto_ports(self, a, b):
        na, nb = self.nodes[a], self.nodes[b]
        dx, dy = nb["x"] - na["x"], nb["y"] - na["y"]
        if abs(dy) >= abs(dx):
            return ("s", "n") if dy > 0 else ("n", "s")
        return ("e", "w") if dx > 0 else ("w", "e")

    # -- drawing -------------------------------------------------------
    def draw(self, path, dpi=200, fontsize=8.6):
        _ensure()
        fig, ax = plt.subplots(figsize=(self.w, self.h), dpi=dpi)
        ax.set_xlim(0, self.w)
        ax.set_ylim(self.h, 0)          # flip y so it reads top-down
        ax.axis("off")
        fig.patch.set_facecolor(PAPER)

        if self.title:
            ax.text(self.w / 2, 0.35, self.title, ha="center", va="center",
                    fontsize=fontsize + 3.4, fontweight="bold", color=INK)

        for pth in self.paths:
            self._draw_path(ax, pth, fontsize)
        for e in self.edges:
            self._draw_edge(ax, e, fontsize)
        for key in self.nodes:
            self._draw_node(ax, key, fontsize)

        fig.tight_layout(pad=0.2)
        fig.savefig(path, facecolor=PAPER, bbox_inches="tight", pad_inches=0.12)
        plt.close(fig)
        print(f"  · {os.path.basename(path)}")
        return path

    def _draw_path(self, ax, pth, fs):
        colour = pth["colour"] or "#8A94A0"
        pts = pth["points"]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        end = -1 if pth["arrow"] else len(pts)
        ax.plot(xs[:end if end == -1 else None], ys[:end if end == -1 else None],
                color=colour, linewidth=1.1, zorder=2, solid_capstyle="round",
                solid_joinstyle="round")
        if pth["arrow"]:
            ax.add_patch(FancyArrowPatch(
                pts[-2], pts[-1], arrowstyle="-|>", mutation_scale=11,
                linewidth=1.1, color=colour, zorder=2, shrinkA=0, shrinkB=0))
        for d in pth["dots"]:
            ax.add_patch(Circle(d, 0.055, facecolor=colour, edgecolor="none",
                                zorder=4))
        if pth["label"] and pth["label_at"]:
            ax.text(pth["label_at"][0], pth["label_at"][1], pth["label"],
                    ha="center", va="center", zorder=5, fontsize=fs - 0.9,
                    color="#2F3A45", fontweight="bold",
                    bbox=dict(boxstyle="round,pad=0.22", facecolor=PAPER,
                              edgecolor="none"))

    def _draw_node(self, ax, key, fs):
        n = self.nodes[key]
        x, y, w, h = n["x"], n["y"], n["w"], n["h"]
        shape = n["shape"]
        fill = n["fill"]

        if shape == "terminal":
            fill = fill or C["accent"]
            ax.add_patch(FancyBboxPatch(
                (x - w / 2, y - h / 2), w, h,
                boxstyle=f"round,pad=0,rounding_size={h/2:.3f}",
                linewidth=1.3, edgecolor="#8A6A05", facecolor=fill, zorder=3))
            fg = C["ink"]
        elif shape == "decision":
            fill = fill or "#FFF4D6"
            ax.add_patch(Polygon(
                [(x, y - h / 2), (x + w / 2, y), (x, y + h / 2), (x - w / 2, y)],
                closed=True, linewidth=1.2, edgecolor="#B98A08",
                facecolor=fill, zorder=3))
            fg = INK
        elif shape == "io":
            fill = fill or "#E8F4FF"
            sk = w * 0.10
            ax.add_patch(Polygon(
                [(x - w / 2 + sk, y - h / 2), (x + w / 2, y - h / 2),
                 (x + w / 2 - sk, y + h / 2), (x - w / 2, y + h / 2)],
                closed=True, linewidth=1.2, edgecolor="#3E7FB0",
                facecolor=fill, zorder=3))
            fg = INK
        elif shape == "note":
            fill = fill or "#F4F6F8"
            ax.add_patch(FancyBboxPatch(
                (x - w / 2, y - h / 2), w, h,
                boxstyle="round,pad=0,rounding_size=0.06",
                linewidth=1.0, edgecolor=LINE, facecolor=fill,
                linestyle=(0, (3, 2)), zorder=3))
            fg = GREY
        else:
            fill = fill or "#FFFFFF"
            ax.add_patch(FancyBboxPatch(
                (x - w / 2, y - h / 2), w, h,
                boxstyle="round,pad=0,rounding_size=0.09",
                linewidth=1.2, edgecolor="#4A5560", facecolor=fill, zorder=3))
            fg = INK

        ax.text(x, y, n["text"], ha="center", va="center", zorder=4,
                fontsize=fs, color=fg, linespacing=1.35, wrap=True)

    def _draw_edge(self, ax, e, fs):
        colour = e["colour"] or "#42505C"
        if e["side"]:
            pa, pb = e["side"]
        else:
            pa, pb = self._auto_ports(e["a"], e["b"])
        p1 = self._port(e["a"], pa)
        p2 = self._port(e["b"], pb)

        if e["style"] == "elbow":
            conn = "angle,angleA=0,angleB=90,rad=8"
        elif e["style"] == "elbow-v":
            conn = "angle,angleA=90,angleB=0,rad=8"
        elif e["style"] == "arc":
            conn = "arc3,rad=0.28"
        elif e["style"] == "arc-":
            conn = "arc3,rad=-0.28"
        else:
            conn = "arc3,rad=0"

        ax.add_patch(FancyArrowPatch(
            p1, p2, connectionstyle=conn, arrowstyle="-|>",
            mutation_scale=11, linewidth=1.15, color=colour, zorder=2,
            shrinkA=1, shrinkB=1))

        if e["label"]:
            mx, my = (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2
            if e["style"] == "arc":
                mx += 0.32
            elif e["style"] == "arc-":
                mx -= 0.32
            ax.text(mx, my, e["label"], ha="center", va="center", zorder=5,
                    fontsize=fs - 0.9, color="#2F3A45", fontweight="bold",
                    bbox=dict(boxstyle="round,pad=0.22", facecolor=PAPER,
                              edgecolor="none"))


def legend(ax, x, y, fs=8.0):
    items = [
        ("terminal", C["accent"], "Start / End"),
        ("process", "#FFFFFF", "Process"),
        ("decision", "#FFF4D6", "Decision"),
        ("io", "#E8F4FF", "Input / Output"),
    ]
    for i, (_, col, label) in enumerate(items):
        ax.add_patch(Rectangle((x, y + i * 0.34), 0.30, 0.20,
                               facecolor=col, edgecolor="#4A5560", linewidth=0.9))
        ax.text(x + 0.42, y + i * 0.34 + 0.10, label, fontsize=fs,
                va="center", color=GREY)


# ══════════════════════════════════════════════════════════════════════
# A1 — Context diagram
# ══════════════════════════════════════════════════════════════════════
def context_diagram():
    _ensure()
    fig, ax = plt.subplots(figsize=(10, 6.6), dpi=200)
    ax.set_xlim(0, 10); ax.set_ylim(6.6, 0); ax.axis("off")
    fig.patch.set_facecolor(PAPER)

    ax.text(5, 0.42, "System Context — Beat The Hazard", ha="center",
            fontsize=13.5, fontweight="bold", color=INK)

    # centre
    ax.add_patch(Circle((5, 3.5), 1.28, facecolor=C["accent"],
                        edgecolor="#8A6A05", linewidth=1.6, zorder=3))
    ax.text(5, 3.34, "BEAT THE\nHAZARD", ha="center", va="center", zorder=4,
            fontsize=11, fontweight="bold", color=C["ink"], linespacing=1.3)
    ax.text(5, 3.98, "browser client", ha="center", va="center", zorder=4,
            fontsize=8, color="#5A4400")

    ext = [
        ("Trainee\n(warehouse operative)", 1.6, 1.5, ["plays rounds, flags hazards",
                                                      "score, rank, feedback"]),
        ("Safety Officer\n(Vantec)", 8.4, 1.5, ["reviews results", "exports session summary"]),
        ("Browser platform\nWebGL 2 · Web Audio · localStorage", 1.6, 5.5,
         ["render, sound, storage"]),
        ("Identity providers\nGoogle · Facebook · GitHub · WebAuthn",
         8.4, 5.5, ["sign-in assertion"]),
    ]
    for label, x, y, _flows in ext:
        ax.add_patch(FancyBboxPatch((x - 1.55, y - 0.52), 3.1, 1.04,
                                    boxstyle="round,pad=0,rounding_size=0.10",
                                    facecolor="#F4F6F8", edgecolor="#4A5560",
                                    linewidth=1.2, zorder=3))
        ax.text(x, y, label, ha="center", va="center", zorder=4,
                fontsize=8.4, color=INK, linespacing=1.4)

    arrows = [
        ((2.55, 1.9), (4.05, 3.0), "flags, movement"),
        ((4.15, 3.15), (2.7, 2.05), None),
        ((7.45, 1.9), (5.95, 3.0), "review requests"),
        ((5.95, 3.12), (7.4, 2.0), "results, ranks"),
        ((2.6, 5.15), (4.0, 4.05), "WebGL / audio / storage"),
        ((7.4, 5.15), (6.0, 4.05), "tokens & assertions"),
    ]
    for a, b, lbl in arrows:
        ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=11,
                                     linewidth=1.15, color="#42505C", zorder=2,
                                     connectionstyle="arc3,rad=0.06"))
        if lbl:
            ax.text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, lbl, fontsize=7.4,
                    ha="center", va="center", color="#2F3A45", zorder=5,
                    bbox=dict(boxstyle="round,pad=0.2", facecolor=PAPER, edgecolor="none"))

    ax.text(5, 6.35,
            "No application server: every arrow above terminates in the browser "
            "or at a third-party identity provider.",
            ha="center", fontsize=8, color=GREY, style="italic")

    p = os.path.join(OUT, "fig_context.png")
    fig.savefig(p, facecolor=PAPER, bbox_inches="tight", pad_inches=0.14)
    plt.close(fig)
    print("  · fig_context.png")
    return p


# ══════════════════════════════════════════════════════════════════════
# A1 — Use case diagram
# ══════════════════════════════════════════════════════════════════════
def usecase_diagram():
    _ensure()
    fig, ax = plt.subplots(figsize=(10, 7.4), dpi=200)
    ax.set_xlim(0, 10); ax.set_ylim(7.4, 0); ax.axis("off")
    fig.patch.set_facecolor(PAPER)
    ax.text(5, 0.36, "Use Case Diagram", ha="center", fontsize=13.5,
            fontweight="bold", color=INK)

    # system boundary
    ax.add_patch(Rectangle((2.55, 0.85), 4.9, 6.25, facecolor="#FBFCFD",
                           edgecolor="#4A5560", linewidth=1.3, zorder=1))
    ax.text(5.0, 1.15, "Beat The Hazard", ha="center", fontsize=9.6,
            fontweight="bold", color=GREY, zorder=2)

    def actor(x, y, label):
        ax.add_patch(Circle((x, y - 0.42), 0.16, facecolor="none",
                            edgecolor=INK, linewidth=1.3, zorder=3))
        ax.add_line(Line2D([x, x], [y - 0.26, y + 0.16], color=INK, linewidth=1.3, zorder=3))
        ax.add_line(Line2D([x - 0.26, x + 0.26], [y - 0.10, y - 0.10], color=INK,
                           linewidth=1.3, zorder=3))
        ax.add_line(Line2D([x, x - 0.20], [y + 0.16, y + 0.52], color=INK, linewidth=1.3, zorder=3))
        ax.add_line(Line2D([x, x + 0.20], [y + 0.16, y + 0.52], color=INK, linewidth=1.3, zorder=3))
        ax.text(x, y + 0.80, label, ha="center", fontsize=8.4, color=INK,
                linespacing=1.3, zorder=3)

    actor(1.15, 2.4, "Trainee")
    actor(1.15, 5.6, "Safety\nOfficer")
    actor(8.9, 4.2, "Identity\nProvider")

    cases = [
        ("Sign in", 4.05, 1.72, [(1.15, 2.4), (8.9, 4.2)]),
        ("Enrol a passkey / 2FA", 6.0, 2.30, [(1.15, 2.4)]),
        ("Play a Training round", 4.05, 2.92, [(1.15, 2.4)]),
        ("Take a Timed Test", 6.0, 3.52, [(1.15, 2.4)]),
        ("Flag a hazard", 4.05, 4.12, [(1.15, 2.4)]),
        ("Review feedback & rank", 6.0, 4.72, [(1.15, 2.4), (1.15, 5.6)]),
        ("Adjust accessibility settings", 4.05, 5.32, [(1.15, 2.4)]),
        ("Inspect session history", 6.0, 5.92, [(1.15, 5.6)]),
        ("Run offline (single file)", 4.05, 6.52, [(1.15, 5.6)]),
    ]
    for label, x, y, actors in cases:
        w = 2.55
        ax.add_patch(FancyBboxPatch((x - w / 2, y - 0.24), w, 0.48,
                                    boxstyle="round,pad=0,rounding_size=0.24",
                                    facecolor="#FFF4D6", edgecolor="#B98A08",
                                    linewidth=1.05, zorder=3))
        ax.text(x, y, label, ha="center", va="center", fontsize=8.0,
                color=INK, zorder=4)
        for ax_, ay in actors:
            ax.add_line(Line2D([ax_ + (0.3 if ax_ < 5 else -0.3), x - (w / 2 if ax_ < 5 else -w / 2)],
                               [ay, y], color=LINE, linewidth=0.9, zorder=2))

    p = os.path.join(OUT, "fig_usecase.png")
    fig.savefig(p, facecolor=PAPER, bbox_inches="tight", pad_inches=0.14)
    plt.close(fig)
    print("  · fig_usecase.png")
    return p


# ══════════════════════════════════════════════════════════════════════
# A1 — Structured flowcharts
# ══════════════════════════════════════════════════════════════════════
def flow_round():
    f = Flow(9.8, 12.9, "Structured Flowchart 1 — Lifecycle of a round")
    L, R = 3.2, 7.3
    f.node("start", L, 1.15, "START", "terminal", w=2.2, h=0.62)
    f.node("pick", L, 2.15, "Trainee selects mode,\nenvironment and difficulty", "io", w=4.2, h=0.85)
    f.node("load", L, 3.20, "Build the environment:\ngeometry, textures, audio", w=4.2, h=0.85)
    f.node("opt", L, 4.20, "Merge static geometry\n9,587 meshes → 994 objects", w=4.2, h=0.85)
    f.node("spawn", L, 5.20, "Place 15 hazards + 5 decoys\nspawn player, start the clock", w=4.2, h=0.85)
    f.node("loop", L, 6.25, "Frame: read input, move, collide,\nraycast, render", w=4.4, h=0.85)
    f.node("flagq", L, 7.45, "Flag\npressed?", "decision", w=2.8, h=1.10)
    f.node("resolve", R, 7.45, "Resolve the flag\n(Flowchart 2)", w=2.8, h=0.80)
    f.node("endq", L, 8.85, "All hazards found,\nor time expired?", "decision", w=3.8, h=1.20)
    f.node("score", L, 10.20, "Compute total, combo,\naccuracy and rank", w=4.2, h=0.85)
    f.node("save", L, 11.15, "Persist the session to the\nprofile (localStorage)", w=4.2, h=0.82)
    f.node("show", L, 12.10, "Show results and\nper-hazard feedback", "io", w=4.2, h=0.82)
    f.node("end", R, 12.10, "END", "terminal", w=2.0, h=0.62)

    for a, b in (("start", "pick"), ("pick", "load"), ("load", "opt"),
                 ("opt", "spawn"), ("spawn", "loop"), ("loop", "flagq"),
                 ("score", "save"), ("save", "show")):
        f.edge(a, b)
    f.edge("flagq", "resolve", "Yes", side=("e", "w"))
    f.edge("flagq", "endq", "No")
    f.edge("endq", "score", "Yes")
    f.edge("show", "end", side=("e", "w"))

    # Resolving a flag rejoins the spine below the flag test.
    f.path([f.port("resolve", "s"), (R, 8.85), f.port("endq", "e")])
    # Not finished yet: go round the frame loop again.
    f.path([f.port("endq", "w"), (0.62, 8.85), (0.62, 6.25), f.port("loop", "w")],
           label="No", label_at=(0.62, 7.60))
    return f.draw(os.path.join(OUT, "fig_flow_round.png"))


def flow_flag():
    f = Flow(10.2, 12.2, "Structured Flowchart 2 — Resolving a hazard flag")
    L, R, CH = 3.0, 7.0, 9.45
    f.node("start", L, 1.10, "FLAG PRESSED", "terminal", w=2.8, h=0.62)
    f.node("ray", L, 2.05, "Cast a ray from the camera\nthrough the screen centre", w=4.0, h=0.82)
    f.node("hitq", L, 3.15, "Ray hits a\nhazard proxy?", "decision", w=3.2, h=1.15)
    f.node("miss", R, 3.15, "No target: “Nothing there”,\nno score change", w=3.4, h=0.80)
    f.node("occq", L, 4.45, "Line of sight clear?\n(ray vs collider AABBs)", "decision", w=3.6, h=1.20)
    f.node("blocked", R, 4.45, "Occluded — treated\nas a miss", w=3.4, h=0.80)
    f.node("realq", L, 5.75, "Target is a real\nhazard?", "decision", w=3.2, h=1.15)
    f.node("decoy", R, 5.75, "Decoy: 0 points, accuracy\ndown, combo reset", w=3.4, h=0.80)
    f.node("sevq", L, 7.05, "Severity, and was it found\nwithin half the time allowed\nfor that hazard?", "decision", w=4.4, h=1.35)
    f.node("majfast", 1.45, 8.55, "MAJOR\nin time\n+15", w=1.85, h=0.92)
    f.node("majslow", 3.45, 8.55, "MAJOR\nlate\n+7", w=1.85, h=0.92)
    f.node("minfast", 5.45, 8.55, "MINOR\nin time\n+5", w=1.85, h=0.92)
    f.node("minslow", 7.45, 8.55, "MINOR\nlate\n+2", w=1.85, h=0.92)
    f.node("combo", 4.45, 10.05, "Streak += 1 — at three correct in a row,\nadd the +3 combo bonus to every find", w=5.6, h=0.85)
    f.node("fb", 4.45, 11.00, "Mark it found  ·  show keywords and location  ·  confirmation cue",
           "io", w=7.6, h=0.72)
    f.node("end", 4.45, 11.95, "RETURN TO THE FRAME LOOP", "terminal", w=4.6, h=0.62)

    f.edge("start", "ray")
    f.edge("ray", "hitq")
    f.edge("hitq", "miss", "No", side=("e", "w"))
    f.edge("hitq", "occq", "Yes")
    f.edge("occq", "blocked", "No", side=("e", "w"))
    f.edge("occq", "realq", "Yes")
    f.edge("realq", "decoy", "No", side=("e", "w"))
    f.edge("realq", "sevq", "Yes")
    f.edge("combo", "fb")
    f.edge("fb", "end", side=("s", "n"))

    # Fan out to the four scoring outcomes, then converge on one junction.
    for key in ("majfast", "majslow", "minfast", "minslow"):
        f.edge("sevq", key, side=("s", "n"))
    JY = 9.45
    for key in ("majfast", "majslow", "minfast", "minslow"):
        x = f.nodes[key]["x"]
        f.path([f.port(key, "s"), (x, JY), (4.45, JY)], arrow=False, colour="#42505C")
    f.path([(4.45, JY), f.port("combo", "n")], colour="#42505C", dots=[(4.45, JY)])

    # Every non-scoring outcome returns down one clear corridor on the right.
    f.path([f.port("miss", "e"), (CH, 3.15), (CH, 11.95), f.port("end", "e")],
           dots=[(CH, 4.45), (CH, 5.75)])
    f.path([f.port("blocked", "e"), (CH, 4.45)], arrow=False)
    f.path([f.port("decoy", "e"), (CH, 5.75)], arrow=False)
    return f.draw(os.path.join(OUT, "fig_flow_flag.png"))


def flow_auth():
    f = Flow(11.0, 12.4, "Structured Flowchart 3 — Sign-in and second factor")
    L, R = 4.1, 8.4
    f.node("start", L, 1.05, "APP LOADS", "terminal", w=2.6, h=0.60)
    f.node("caps", L, 1.95, "Probe capabilities: WebAuthn present?\nsecure context? providers configured?", w=5.6, h=0.85)
    f.node("redir", L, 3.10, "Returning from an\nOAuth redirect?", "decision", w=3.6, h=1.15)
    f.node("exch", 1.35, 3.10, "Exchange the code via\nthe server endpoint", w=2.5, h=0.85)
    f.node("known", L, 4.55, "Profile already\nsigned in?", "decision", w=3.2, h=1.15)
    f.node("login", R, 4.95, "Login screen: passkey,\nGoogle, Facebook,\nGitHub, name only", "io", w=3.4, h=1.05)
    f.node("choose", R, 6.35, "Trainee picks a route\nand completes it", w=3.4, h=0.82)
    f.node("okq", R, 7.55, "Succeeded?", "decision", w=2.8, h=1.00)
    f.node("err", R, 8.95, "Show the exact reason;\nstay on the login screen", "note", w=3.2, h=0.85)
    f.node("totpq", L, 9.45, "Second factor\nenrolled?", "decision", w=3.4, h=1.15)
    f.node("code", L, 10.85, "Prompt for the 6-digit code,\nverify it (RFC 6238, ±1 step)", "io", w=4.6, h=0.85)
    f.node("menu", L, 11.90, "MAIN MENU", "terminal", w=2.8, h=0.62)

    f.edge("start", "caps")
    f.edge("caps", "redir")
    f.edge("redir", "exch", "Yes", side=("w", "e"))
    f.edge("redir", "known", "No")
    f.edge("known", "login", "No", side=("e", "w"))
    f.edge("login", "choose")
    f.edge("choose", "okq")
    f.edge("okq", "err", "No")
    f.edge("totpq", "code", "Yes")
    f.edge("code", "menu")

    MY = 8.45                      # the merge line: three routes join here
    f.path([f.port("known", "s"), (L, MY)], arrow=False, colour="#42505C",
           label="Yes", label_at=(L, 6.9))
    f.path([f.port("exch", "s"), (1.35, MY), (L, MY)], arrow=False, colour="#42505C")
    f.path([f.port("okq", "w"), (6.2, 7.55), (6.2, MY), (L, MY)], arrow=False,
           colour="#42505C", label="Yes", label_at=(6.2, 8.02))
    f.path([(L, MY), f.port("totpq", "n")], colour="#42505C", dots=[(L, MY)])
    # A failed attempt returns to the login screen, never to the menu.
    f.path([f.port("err", "e"), (10.55, 8.95), (10.55, 4.95), f.port("login", "e")])
    # No second factor enrolled: straight through to the menu.
    f.path([f.port("totpq", "w"), (1.15, 9.45), (1.15, 11.90), f.port("menu", "w")],
           label="No", label_at=(1.15, 10.6), colour="#42505C")
    return f.draw(os.path.join(OUT, "fig_flow_auth.png"))


def architecture_diagram():
    _ensure()
    fig, ax = plt.subplots(figsize=(10, 6.8), dpi=200)
    ax.set_xlim(0, 10); ax.set_ylim(6.8, 0); ax.axis("off")
    fig.patch.set_facecolor(PAPER)
    ax.text(5, 0.34, "Module Architecture", ha="center", fontsize=13.5,
            fontweight="bold", color=INK)

    layers = [
        ("Presentation", 1.05, "#FFF4D6",
         ["ui/UIManager", "ui/HUD", "ui/AuthScreens", "ui/screens/*"]),
        ("Gameplay", 2.25, "#E8F4FF",
         ["gameplay/GameManager", "gameplay/ScoreManager", "hazards/HazardSystem",
          "player/PlayerController"]),
        ("World & Content", 3.45, "#EAF7EE",
         ["environment/World", "environment/Scenarios", "environment/scenes/env01–03",
          "data/config"]),
        ("Platform Services", 4.65, "#F2ECFB",
         ["core/Engine", "core/Textures", "audio/AudioManager",
          "services/Profile", "services/auth/*"]),
        ("Browser", 5.85, "#F4F6F8",
         ["WebGL 2 / Three.js", "Web Audio API", "Web Crypto", "localStorage",
          "WebAuthn"]),
    ]
    for label, y, fill, mods in layers:
        ax.add_patch(FancyBboxPatch((0.55, y - 0.45), 8.9, 0.9,
                                    boxstyle="round,pad=0,rounding_size=0.08",
                                    facecolor=fill, edgecolor="#4A5560",
                                    linewidth=1.15, zorder=2))
        ax.text(1.05, y, label, ha="left", va="center", fontsize=9.6,
                fontweight="bold", color=INK, zorder=3)
        ax.text(3.4, y, "   ·   ".join(mods), ha="left", va="center",
                fontsize=7.6, color="#3A464F", zorder=3)

    ax.add_patch(FancyBboxPatch((0.55, 6.25 - 0.32), 8.9, 0.64,
                                boxstyle="round,pad=0,rounding_size=0.08",
                                facecolor=C["accent"], edgecolor="#8A6A05",
                                linewidth=1.2, zorder=2))
    ax.text(5.0, 6.25, "core/EventBus  —  every layer above publishes and "
                       "subscribes here; no layer imports the one above it",
            ha="center", va="center", fontsize=8.4, color=C["ink"],
            fontweight="bold", zorder=3)

    p = os.path.join(OUT, "fig_architecture.png")
    fig.savefig(p, facecolor=PAPER, bbox_inches="tight", pad_inches=0.14)
    plt.close(fig)
    print("  · fig_architecture.png")
    return p


# ══════════════════════════════════════════════════════════════════════
# A5 — Gantt chart
# ══════════════════════════════════════════════════════════════════════
GANTT_TASKS = [
    # (task, owner short, start week, duration weeks, phase)
    ("Client brief received & unpacked",        "PM",        1, 1, 0),
    ("Skills audits & role allocation",         "PM",        1, 1, 0),
    ("Group rules & registration form",         "PM",        1, 1, 0),
    ("Requirements elicitation (A1)",           "UX",        2, 2, 1),
    ("PACT & heuristic analysis",               "UX",        2, 2, 1),
    ("System analysis & flowcharts",            "Tech Lead", 3, 2, 1),
    ("Technical spike: Three.js render loop",   "Tech Lead", 3, 1, 1),
    ("Corporate identity & brand system",       "Art Lead",  3, 2, 2),
    ("Marketing strategy (zero budget)",        "QA Lead",   4, 2, 2),
    ("Company website build & deploy",          "QA Lead",   5, 2, 2),
    ("Environment 1 — main warehouse",          "Art Lead",  5, 3, 3),
    ("Hazard system & scoring engine",          "Tech Lead", 5, 3, 3),
    ("HUD, menus & settings",                   "UX",        6, 3, 3),
    ("Unit test suite (Vitest)",                "QA Lead",   6, 3, 3),
    ("Environments 2 & 3",                      "Art Lead",  8, 2, 3),
    ("Authentication: passkeys, OAuth, TOTP",   "Tech Lead", 8, 2, 3),
    ("Performance optimisation pass",           "Tech Lead", 9, 1, 3),
    ("Accessibility & usability testing",       "UX",        9, 2, 4),
    ("Figma prototype frames",                  "UX",       10, 1, 4),
    ("Defect triage & fix cycle",               "QA Lead",  10, 2, 4),
    ("Deployment & offline build",              "Tech Lead", 10, 1, 4),
    ("Presentation deck & rehearsal",           "PM",       11, 2, 5),
    ("Assessment 1 pack assembly",              "PM",       11, 2, 5),
    ("Client presentation to Vantec",           "All",      12, 1, 5),
]

PHASE_COLOURS = ["#64717F", "#38BDF8", "#22C55E", "#F2B90C", "#FF8A1F", "#EF4444"]
PHASE_NAMES = ["Mobilisation", "Analysis", "Brand & Market",
               "Build", "Harden", "Deliver"]


def gantt():
    _ensure()
    n = len(GANTT_TASKS)
    fig, ax = plt.subplots(figsize=(12.6, 0.35 * n + 2.0), dpi=190)
    fig.patch.set_facecolor(PAPER)

    for i, (task, owner, start, dur, phase) in enumerate(GANTT_TASKS):
        y = n - i - 1
        ax.barh(y, dur, left=start, height=0.56,
                color=PHASE_COLOURS[phase], edgecolor="#2F3A45", linewidth=0.6)
        ax.text(start + dur + 0.12, y, owner, va="center", fontsize=7.6,
                color=GREY)

    ax.set_yticks(range(n))
    ax.set_yticklabels([t[0] for t in reversed(GANTT_TASKS)], fontsize=8.4, color=INK)
    ax.set_xticks(range(1, 14))
    ax.set_xticklabels([f"W{i}" for i in range(1, 14)], fontsize=8.4, color=INK)
    ax.set_xlim(0.7, 14.2)
    ax.set_ylim(-0.8, n - 0.2)
    ax.xaxis.set_ticks_position("top")
    ax.xaxis.set_label_position("top")
    ax.grid(axis="x", color="#DDE2E7", linewidth=0.7)
    ax.set_axisbelow(True)
    for spine in ("top", "right", "left", "bottom"):
        ax.spines[spine].set_visible(False)

    # milestone markers
    for wk, label in ((4, "Requirements\nsigned off"), (9, "Playable\nvertical slice"),
                      (12, "Client\npresentation")):
        ax.axvline(wk + 0.0, color="#B03030", linewidth=1.0, linestyle=(0, (4, 3)))
        ax.text(wk + 0.08, -0.62, label, fontsize=7.4, color="#B03030",
                va="center", ha="left", linespacing=1.2)

    handles = [plt.Rectangle((0, 0), 1, 1, color=PHASE_COLOURS[i]) for i in range(len(PHASE_NAMES))]
    ax.legend(handles, PHASE_NAMES, loc="lower right", ncol=3, fontsize=8,
              frameon=False, bbox_to_anchor=(1.0, -0.13))

    ax.set_title(f"{CFG.COMPANY} — {CFG.PRODUCT} · Initial Project Plan "
                 f"(Assessment 1, weeks 1–12)",
                 fontsize=12.5, fontweight="bold", color=INK, pad=26)

    p = os.path.join(OUT, "fig_gantt.png")
    fig.savefig(p, facecolor=PAPER, bbox_inches="tight", pad_inches=0.2)
    plt.close(fig)
    print("  · fig_gantt.png")
    return p


# ══════════════════════════════════════════════════════════════════════
# A6 — Corporate identity
# ══════════════════════════════════════════════════════════════════════
def _draw_mark(ax, cx, cy, r, accent, ink, ring):
    """
    The mark: a hazard triangle inside a reticle ring. The triangle is the
    universal warning sign; the ring is the game's own targeting reticle.
    Together they say 'spot the hazard' with no words.
    """
    ax.add_patch(Circle((cx, cy), r, facecolor="none", edgecolor=ring, linewidth=r * 9))
    for ang in (0, 90, 180, 270):
        import math
        a = math.radians(ang)
        x0, y0 = cx + math.cos(a) * r * 0.96, cy + math.sin(a) * r * 0.96
        x1, y1 = cx + math.cos(a) * r * 1.30, cy + math.sin(a) * r * 1.30
        ax.add_line(Line2D([x0, x1], [y0, y1], color=ring, linewidth=r * 8,
                           solid_capstyle="round"))
    t = r * 0.80
    ax.add_patch(Polygon([(cx, cy + t * 0.86), (cx - t * 0.92, cy - t * 0.66),
                          (cx + t * 0.92, cy - t * 0.66)],
                         closed=True, facecolor=accent, edgecolor="none"))
    ax.add_patch(Rectangle((cx - t * 0.10, cy - t * 0.28), t * 0.20, t * 0.62,
                           facecolor=ink, edgecolor="none"))
    ax.add_patch(Circle((cx, cy - t * 0.44), t * 0.11, facecolor=ink, edgecolor="none"))


def logo(variant="dark"):
    _ensure()
    dark = variant == "dark"
    bg = "#" + CFG.BRAND["bg"] if dark else PAPER
    text_col = "#" + CFG.BRAND["text"] if dark else INK
    dim_col = "#" + CFG.BRAND["dim"] if dark else GREY
    accent = "#" + CFG.BRAND["accent"]
    ring = accent if dark else "#B98A08"

    fig, ax = plt.subplots(figsize=(9, 2.8), dpi=220)
    ax.set_xlim(0, 9); ax.set_ylim(0, 2.8); ax.axis("off")
    fig.patch.set_facecolor(bg)
    ax.add_patch(Rectangle((0, 0), 9, 2.8, facecolor=bg, edgecolor="none", zorder=0))

    _draw_mark(ax, 1.5, 1.4, 0.62, accent, "#" + CFG.BRAND["ink"] if dark else "#1A1204", ring)
    ax.text(2.75, 1.62, CFG.COMPANY.upper(), fontsize=27, fontweight="bold",
            color=text_col, va="center", ha="left", family="DejaVu Sans")
    ax.text(2.80, 0.98, CFG.TAGLINE, fontsize=11.5, color=dim_col,
            va="center", ha="left", style="italic")

    p = os.path.join(OUT, f"logo_{variant}.png")
    fig.savefig(p, facecolor=bg, bbox_inches="tight", pad_inches=0.22)
    plt.close(fig)
    print(f"  · logo_{variant}.png")
    return p


def logo_mark():
    _ensure()
    fig, ax = plt.subplots(figsize=(3, 3), dpi=260)
    ax.set_xlim(0, 3); ax.set_ylim(0, 3); ax.axis("off")
    bg = "#" + CFG.BRAND["bg"]
    fig.patch.set_facecolor(bg)
    ax.add_patch(Rectangle((0, 0), 3, 3, facecolor=bg, edgecolor="none"))
    _draw_mark(ax, 1.5, 1.5, 0.86, "#" + CFG.BRAND["accent"],
               "#" + CFG.BRAND["ink"], "#" + CFG.BRAND["accent"])
    p = os.path.join(OUT, "logo_mark.png")
    fig.savefig(p, facecolor=bg, bbox_inches="tight", pad_inches=0.16)
    plt.close(fig)
    print("  · logo_mark.png")
    return p


PALETTE_ROLES = [
    ("bg",      "Ground",        "Every surface behind content"),
    ("panel",   "Panel",         "Cards, menus, the HUD"),
    ("border",  "Border",        "Hairlines and dividers"),
    ("text",    "Text",          "Primary copy"),
    ("dim",     "Text dim",      "Secondary copy and labels"),
    ("accent",  "Hazard amber",  "The brand. Primary actions only"),
    ("accent2", "Amber deep",    "Gradients, hover states"),
    ("major",   "Major hazard",  "Life-threatening findings"),
    ("minor",   "Minor hazard",  "Housekeeping findings"),
    ("success", "Correct",       "Confirmations and passes"),
    ("danger",  "Wrong",         "Errors and decoys"),
    ("info",    "Information",   "Hints and neutral notices"),
]


def palette_sheet():
    _ensure()
    n = len(PALETTE_ROLES)
    fig, ax = plt.subplots(figsize=(10, 0.62 * n + 1.0), dpi=200)
    ax.set_xlim(0, 10); ax.set_ylim(0, 0.62 * n + 1.0); ax.axis("off")
    fig.patch.set_facecolor(PAPER)
    ax.text(0.2, 0.62 * n + 0.6, "Brand palette", fontsize=13.5,
            fontweight="bold", color=INK)

    for i, (key, label, use) in enumerate(PALETTE_ROLES):
        y = 0.62 * (n - i - 1) + 0.15
        hexv = "#" + CFG.BRAND[key]
        ax.add_patch(Rectangle((0.2, y), 1.5, 0.48, facecolor=hexv,
                               edgecolor="#C8CED5", linewidth=0.9))
        ax.text(1.85, y + 0.24, label, fontsize=10, fontweight="bold",
                va="center", color=INK)
        ax.text(4.1, y + 0.24, hexv.upper(), fontsize=9.4, va="center",
                color=GREY, family="DejaVu Sans Mono")
        ax.text(5.5, y + 0.24, use, fontsize=9, va="center", color=GREY)

    p = os.path.join(OUT, "fig_palette.png")
    fig.savefig(p, facecolor=PAPER, bbox_inches="tight", pad_inches=0.16)
    plt.close(fig)
    print("  · fig_palette.png")
    return p


def build_all():
    print("Figures")
    _ensure()
    context_diagram()
    usecase_diagram()
    flow_round()
    flow_flag()
    flow_auth()
    architecture_diagram()
    gantt()
    logo("dark")
    logo("light")
    logo_mark()
    palette_sheet()


if __name__ == "__main__":
    build_all()
