"""
build_warehouse.py — Blender asset generation for Beat The Hazard.

⚠️  HONEST STATUS: THIS SCRIPT HAS NEVER BEEN EXECUTED.

Blender is not installed on the development machine (verified: no `blender` on
PATH, no Program Files/Blender Foundation). The game therefore uses procedural
Three.js geometry instead — see docs/DECISIONS.md, decision D2.

This file is provided so the asset pipeline can be picked up if Blender becomes
available. It is written against the Blender 4.x Python API and is a starting
point, NOT verified working code. Expect to debug it.

--------------------------------------------------------------------------
HOW TO RUN
--------------------------------------------------------------------------

    blender --background --python scripts/blender/build_warehouse.py

or, to inspect the result interactively:

    blender --python scripts/blender/build_warehouse.py

Output is written to public/assets/models/ as .glb files.

--------------------------------------------------------------------------
WHAT IT GENERATES
--------------------------------------------------------------------------

    racking_healthy.glb    a 5-bay, 3-level APR racking run
    racking_damaged.glb    the same run with an impact-damaged upright
    pallet.glb             a Euro pallet (1.2 x 0.8 x 0.144 m)
    pallet_broken.glb      the same pallet with snapped deck boards
    carton.glb             a shipping carton
    forklift.glb           a counterbalance forklift

--------------------------------------------------------------------------
INTEGRATING THE OUTPUT
--------------------------------------------------------------------------

The game currently builds these procedurally. To use exported GLBs instead:

 1. npm install three  (already present) and use GLTFLoader:

        import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

 2. Add an AssetManager that preloads the GLBs once and clones them per use
    (cloning is essential — do not load the file per instance).

 3. Swap the builder calls in src/environment/props/Storage.js and
    Forklift.js to return clones instead of primitive groups. Keep the SAME
    userData contract (userData.slot(), userData.wheels, userData.beacon,
    userData.setLoad(), userData.fallingBox …) so Scenarios.js and the scene
    files need no changes at all.

 4. Keep World.optimize() — merged static geometry matters just as much for
    imported meshes.

All dimensions below are metres and match the procedural versions exactly, so
imported assets will drop into the existing layouts without re-positioning.
"""

import math
import os

try:
    import bpy
    import bmesh
    from mathutils import Vector
except ImportError:  # pragma: no cover - only importable inside Blender
    raise SystemExit(
        "This script must be run inside Blender:\n"
        "  blender --background --python scripts/blender/build_warehouse.py"
    )


# ---------------------------------------------------------------------------
# Dimensions - kept identical to src/environment/props/*.js
# ---------------------------------------------------------------------------

PALLET_W, PALLET_D = 1.2, 0.8
PALLET_BOARD_T = 0.022
PALLET_BEARER_H = 0.10

RACK_BAY_W = 2.7
RACK_DEPTH = 1.1
RACK_LEVEL_H = 1.85
RACK_POST = 0.09

FORKLIFT_LEN = 2.6
FORKLIFT_WIDTH = 1.15
FORKLIFT_GUARD_H = 2.11

OUT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "assets", "models"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clear_scene():
    """Remove everything, including orphaned meshes and materials."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def make_material(name, rgba, roughness=0.7, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def add_box(name, size, location, material=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        obj.data.materials.append(material)
    return obj


def add_cylinder(name, radius, depth, location, material=None, rotation=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius, depth=depth, location=location, rotation=rotation, vertices=verts
    )
    obj = bpy.context.active_object
    obj.name = name
    if material:
        obj.data.materials.append(material)
    return obj


def join(objects, name):
    """Join a list of objects into one, returning the result."""
    if not objects:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    result = bpy.context.active_object
    result.name = name
    return result


def export_glb(filename):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.abspath(os.path.join(OUT_DIR, filename))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,           # apply modifiers
        export_yup=True,             # Three.js is Y-up, Blender is Z-up
        export_draco_mesh_compression_enable=False,
    )
    print(f"  exported {path}")


# ---------------------------------------------------------------------------
# Pallet
# ---------------------------------------------------------------------------

def build_pallet(broken=False):
    """Euro pallet, 1.2 x 0.8 x 0.144 m. Z-up (Blender); exporter converts."""
    wood = make_material(
        "PalletWood", (0.66, 0.53, 0.31, 1.0), roughness=0.88
    )
    parts = []

    # three bearers running along X
    for i in range(3):
        y = -PALLET_D / 2 + 0.06 + i * (PALLET_D / 2 - 0.06)
        w = PALLET_W * 0.42 if (broken and i == 1) else PALLET_W
        x = -PALLET_W * 0.28 if (broken and i == 1) else 0.0
        parts.append(add_box(
            f"bearer_{i}", (w, 0.1, PALLET_BEARER_H),
            (x, y, PALLET_BOARD_T + PALLET_BEARER_H / 2), wood,
        ))

    # bottom deck boards
    for i in range(3):
        y = -PALLET_D / 2 + 0.06 + i * (PALLET_D / 2 - 0.06)
        parts.append(add_box(
            f"bottom_{i}", (PALLET_W, 0.12, PALLET_BOARD_T),
            (0, y, PALLET_BOARD_T / 2), wood,
        ))

    # top deck boards running along Y
    n_top = 6
    for i in range(n_top):
        if broken and i == 2:
            continue  # missing board
        x = -PALLET_W / 2 + 0.07 + i * (PALLET_W - 0.14) / (n_top - 1)
        z = PALLET_BOARD_T + PALLET_BEARER_H + PALLET_BOARD_T / 2
        rot = (0.18, 0, 0) if (broken and i == 4) else (0, 0, 0)
        if broken and i == 4:
            z += 0.03
        parts.append(add_box(
            f"top_{i}", (0.11, PALLET_D, PALLET_BOARD_T), (x, 0, z), wood, rot
        ))

    return join(parts, "PalletBroken" if broken else "Pallet")


# ---------------------------------------------------------------------------
# Racking
# ---------------------------------------------------------------------------

def build_rack_frame(x, damaged=False, height=6.0):
    orange = make_material("RackUpright", (0.76, 0.32, 0.10, 1.0), 0.62, 0.35)
    dark = make_material("RackDamaged", (0.54, 0.24, 0.08, 1.0), 0.75, 0.30)
    mat = dark if damaged else orange
    parts = []

    for y in (-RACK_DEPTH / 2, RACK_DEPTH / 2):
        rot = (0.055 if damaged else 0.0, 0, 0)
        parts.append(add_box(
            "post", (RACK_POST, RACK_POST, height), (x, y, height / 2), mat, rot
        ))
        if damaged:
            parts.append(add_box(
                "kink", (RACK_POST * 1.15, RACK_POST * 0.65, 0.34),
                (x, y + 0.02, 0.55), mat, (0.28, 0, 0),
            ))

    # bracing between the two posts
    n = max(3, int(height / 0.9))
    for i in range(n):
        z = 0.35 + i * (height - 0.6) / n
        parts.append(add_box("brace_h", (0.05, RACK_DEPTH, 0.05), (x, 0, z), mat))

    return parts


def build_racking(bays=5, levels=3, damaged_bay=-1):
    blue = make_material("RackBeam", (0.12, 0.31, 0.61, 1.0), 0.58, 0.38)
    height = levels * RACK_LEVEL_H + 0.45
    total_w = bays * RACK_BAY_W
    parts = []

    for f in range(bays + 1):
        x = -total_w / 2 + f * RACK_BAY_W
        is_damaged = damaged_bay >= 0 and f in (damaged_bay, damaged_bay + 1)
        parts += build_rack_frame(x, is_damaged, height)

    for level in range(1, levels + 1):
        z = level * RACK_LEVEL_H
        for b in range(bays):
            x = -total_w / 2 + b * RACK_BAY_W + RACK_BAY_W / 2
            for y in (-RACK_DEPTH / 2 + 0.06, RACK_DEPTH / 2 - 0.06):
                parts.append(add_box(
                    "beam", (RACK_BAY_W - 0.09, 0.05, 0.12), (x, y, z), blue
                ))

    name = "RackingDamaged" if damaged_bay >= 0 else "RackingHealthy"
    return join(parts, name)


# ---------------------------------------------------------------------------
# Forklift
# ---------------------------------------------------------------------------

def build_forklift():
    body = make_material("ForkliftBody", (0.94, 0.66, 0.0, 1.0), 0.48, 0.40)
    dark = make_material("ForkliftDark", (0.13, 0.15, 0.17, 1.0), 0.65, 0.50)
    steel = make_material("ForkliftSteel", (0.60, 0.63, 0.66, 1.0), 0.40, 0.85)
    tyre = make_material("Tyre", (0.08, 0.09, 0.09, 1.0), 0.95)
    parts = []

    parts.append(add_box("chassis", (1.05, 1.55, 0.46), (0, -0.15, 0.52), body))
    parts.append(add_box("counterweight", (1.10, 0.62, 0.62), (0, -1.02, 0.50), dark))
    parts.append(add_box("hood", (0.90, 0.72, 0.34), (0, -0.62, 0.86), body))
    parts.append(add_box("seat", (0.50, 0.44, 0.10), (0, -0.62, 1.05), dark))
    parts.append(add_box("seatback", (0.50, 0.10, 0.46), (0, -0.83, 1.28), dark))

    # overhead guard
    for x, y in ((-0.5, 0.02), (0.5, 0.02), (-0.5, -0.98), (0.5, -0.98)):
        parts.append(add_box("guardpost", (0.06, 0.06, 1.12), (x, y, 1.55), dark))
    for i in range(6):
        parts.append(add_box(
            "guardslat", (1.06, 0.07, 0.035), (0, -i * 0.19, FORKLIFT_GUARD_H), dark
        ))

    # mast and tines
    for x in (-0.34, 0.34):
        parts.append(add_box("mastrail", (0.10, 0.12, 2.30), (x, 0.72, 1.15), steel))
    for x in (-0.28, 0.28):
        parts.append(add_box("tine", (0.11, 1.05, 0.035), (x, 1.28, 0.07), steel))
        parts.append(add_box("heel", (0.11, 0.04, 0.26), (x, 0.78, 0.18), steel))

    # wheels
    for x, y, r, w in ((-0.52, 0.42, 0.31, 0.20), (0.52, 0.42, 0.31, 0.20),
                       (-0.42, -1.05, 0.22, 0.16), (0.42, -1.05, 0.22, 0.16)):
        parts.append(add_cylinder(
            "wheel", r, w, (x, y, r), tyre, rotation=(0, math.pi / 2, 0), verts=18
        ))

    return join(parts, "Forklift")


# ---------------------------------------------------------------------------
# Carton
# ---------------------------------------------------------------------------

def build_carton():
    card = make_material("Cardboard", (0.78, 0.60, 0.39, 1.0), 0.92)
    obj = add_box("Carton", (0.42, 0.34, 0.36), (0, 0, 0.18), card)
    return obj


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    targets = [
        ("pallet.glb", lambda: build_pallet(False)),
        ("pallet_broken.glb", lambda: build_pallet(True)),
        ("carton.glb", build_carton),
        ("racking_healthy.glb", lambda: build_racking(5, 3, -1)),
        ("racking_damaged.glb", lambda: build_racking(5, 3, 1)),
        ("forklift.glb", build_forklift),
    ]

    print("Beat The Hazard - Blender asset generation")
    print(f"Output directory: {os.path.abspath(OUT_DIR)}")

    for filename, builder in targets:
        print(f"\nBuilding {filename} …")
        clear_scene()
        builder()
        export_glb(filename)

    print("\nDone. Remember: this script has not been verified — check each")
    print("export visually before relying on it.")


if __name__ == "__main__":
    main()
