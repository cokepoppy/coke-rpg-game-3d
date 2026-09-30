"""Build the standalone 百草药铺 mesh and its Blender/GLB deliverables.

Run: blender --background --factory-startup --python tools/build_hundred_herbs_pharmacy.py
The map crop is reference-only; runtime output contains modeled geometry only.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from tools import build_cangshan_world as world  # noqa: E402

OUT = ROOT / "assets/generated/threejs-wuxia/models"
BLEND_PATH = OUT / "hundred-herbs-pharmacy-blender.blend"
GLB_PATH = OUT / "hundred-herbs-pharmacy-game-ready.glb"
PREVIEW_PATH = OUT / "hundred-herbs-pharmacy-preview.png"


def point_camera(camera: bpy.types.Object, point: tuple[float, float, float]) -> None:
    direction = Vector(point) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def configure_preview(collection: bpy.types.Collection) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    world_data = bpy.data.worlds.new("Warm neutral asset studio")
    world_data.use_nodes = True
    world_data.node_tree.nodes.get("Background").inputs[0].default_value = (0.11, 0.095, 0.075, 1)
    world_data.node_tree.nodes.get("Background").inputs[1].default_value = 0.45
    scene.world = world_data

    camera_data = bpy.data.cameras.new("Pharmacy asset preview camera")
    camera = bpy.data.objects.new("Pharmacy asset preview camera", camera_data)
    collection.objects.link(camera)
    camera.location = (8.4, 10.5, 7.2)
    point_camera(camera, (0, 0, 1.65))
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 8.2
    scene.camera = camera

    for name, loc, power, size, color in (
        ("Large softbox", (-5, 4, 9), 1700, 7, (1.0, 0.79, 0.58)),
        ("Cool fill", (4, -4, 6), 1100, 6, (0.62, 0.76, 1.0)),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.shape, data.size, data.color = power, "DISK", size, color
        lamp = bpy.data.objects.new(name, data)
        collection.objects.link(lamp)
        lamp.location = loc
        point_camera(lamp, (0, 0, 1.4))


def add_details(collection: bpy.types.Collection, palette: dict[str, bpy.types.Material]) -> None:
    cube = world.cube
    # Front faces +Y, matching the deterministic world builder's door direction.
    front = 2.8 * 0.5 + 0.035
    door_center_z = 0.13 + 2.55 * 0.72 * 0.48

    # Add recessed paired door panels, raised rails and brass ring pulls.
    for side in (-1, 1):
        x = side * 0.255
        cube("Pharmacy double door | inset panel", (x, front + 0.173, door_center_z + 0.27),
             (0.36, 0.035, 0.48), palette["wood_mid"], collection, bevel=0.018)
        for rail_z in (door_center_z + 0.04, door_center_z + 0.50):
            cube("Pharmacy door | raised rail", (x, front + 0.207, rail_z),
                 (0.40, 0.036, 0.045), palette["wood_lit"], collection, bevel=0.009)
        cube("Pharmacy door | brass pull plate", (x - side * 0.10, front + 0.216, door_center_z + 0.03),
             (0.07, 0.025, 0.10), palette["gold"], collection, bevel=0.012)
        world.cylinder("Pharmacy door | brass ring", (x - side * 0.10, front + 0.25, door_center_z - 0.015),
                       0.047, 0.022, palette["gold"], collection, vertices=12)

    # A separate hanging timber plaque with an understated jade inset, leaving
    # the Chinese lettering to a later texture/mesh authoring pass if needed.
    sign_x, sign_z = 1.82, 2.26
    cube("Pharmacy plaque | carved timber board", (sign_x, front + 0.22, sign_z),
         (0.68, 0.13, 0.82), palette["wood"], collection, bevel=0.035)
    cube("Pharmacy plaque | jade inset", (sign_x, front + 0.295, sign_z),
         (0.48, 0.035, 0.62), palette["jade"], collection, bevel=0.025)
    for dz in (-0.25, 0.25):
        cube("Pharmacy plaque | brass border", (sign_x, front + 0.322, sign_z + dz),
             (0.39, 0.025, 0.025), palette["gold"], collection, bevel=0.006)
    for dz in (-0.18, 0.18):
        world.cylinder("Pharmacy plaque | brass pin", (sign_x, front + 0.33, sign_z + dz),
                       0.024, 0.018, palette["gold"], collection, vertices=10)

    # Roof end caps read clearly at the isometric play camera and remain solid
    # geometry rather than a baked image plane.
    roof_top = 0.13 + 2.55 + 0.20 + 0.76 * 0.75
    for side in (-1, 1):
        world.cylinder("Pharmacy roof ridge cap", (side * 1.88, 0, roof_top + 0.16),
                       0.16, 0.40, palette["roof_lit"], collection, vertices=10)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    collections = world.reset_scene()
    palette = world.make_palette()
    architecture = collections["Architecture"]

    # World-space transform of the stitched map center is (0, 0), so this
    # reuses the same dimensions and door heading as the live world placeholder.
    world.build_house("Hundred Herbs pharmacy", (world.MAP_W / 2, world.MAP_H / 2),
                      3.45, 2.8, 2.55, palette, architecture, "plaster")
    add_details(architecture, palette)

    # Keep the unjoined object construction editable in the .blend; GLB exports
    # only the standalone asset geometry.
    scene = bpy.context.scene
    configure_preview(collections["Props"])
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in architecture.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format="GLB", use_selection=True,
                              export_apply=True, export_materials="EXPORT", export_cameras=False,
                              export_lights=False, export_animations=False)

    depsgraph = bpy.context.evaluated_depsgraph_get()
    points = [obj.matrix_world @ Vector(corner) for obj in architecture.objects
              for corner in obj.evaluated_get(depsgraph).bound_box]
    dims = tuple(max(p[i] for p in points) - min(p[i] for p in points) for i in range(3))
    print(f"PHARMACY_BOUNDS meters={tuple(round(d, 3) for d in dims)} objects={len(architecture.objects)}")
    print(f"Blender source: {BLEND_PATH}")
    print(f"Runtime GLB: {GLB_PATH}")
    print(f"Preview: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
