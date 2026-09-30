"""Normalize a Hunyuan Cangshan prop into a Blender project and game GLB.

Run one asset at a time after copying the untouched Hunyuan download into
assets/generated/threejs-wuxia/source/:
  blender -b --factory-startup --python tools/package_cangshan_asset.py -- yunlai-inn
  blender -b --factory-startup --python tools/package_cangshan_asset.py -- autumn-maple
  blender -b --factory-startup --python tools/package_cangshan_asset.py -- cangshan-paifang
  blender -b --factory-startup --python tools/package_cangshan_asset.py -- hundred-herbs-pharmacy

The package step preserves aspect ratio, centers X/Y, places the base at Z=0,
and applies a triangle budget without using a 2D image as runtime geometry.
"""

from __future__ import annotations

import math
import random
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Euler, Vector


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "assets/generated/threejs-wuxia/source"
OUT_DIR = ROOT / "assets/generated/threejs-wuxia/models"

ASSETS = {
    "yunlai-inn": {
        "source": "yunlai-inn-hunyuan-raw.glb",
        "stem": "yunlai-inn",
        "max_dimensions": (5.1, 3.35, 3.35),
        "triangle_budget": 100_000,
        "yaw_degrees": 0.0,
    },
    "autumn-maple": {
        "source": "autumn-maple-hunyuan-raw.glb",
        "stem": "autumn-maple",
        "max_dimensions": (5.2, 5.2, 6.0),
        "triangle_budget": 65_000,
        "yaw_degrees": 0.0,
    },
    "cangshan-paifang": {
        "source": "cangshan-paifang-hunyuan-raw.glb",
        "stem": "cangshan-paifang",
        "max_dimensions": (5.45, 1.55, 3.45),
        "triangle_budget": 100_000,
        "yaw_degrees": 0.0,
    },
    "hundred-herbs-pharmacy": {
        "source": "hundred-herbs-pharmacy-hunyuan-raw.glb",
        "stem": "hundred-herbs-pharmacy",
        "max_dimensions": (4.5, 3.8, 3.8),
        "triangle_budget": 100_000,
        "yaw_degrees": 0.0,
    },
}


def object_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner)
              for obj in objects if obj.type == "MESH"
              for corner in obj.bound_box]
    if not points:
        raise RuntimeError("Hunyuan GLB contains no mesh geometry")
    return (Vector(tuple(min(p[axis] for p in points) for axis in range(3))),
            Vector(tuple(max(p[axis] for p in points) for axis in range(3))))


def attach_to_root(objects: list[bpy.types.Object], root: bpy.types.Object) -> None:
    imported = set(objects)
    roots = [obj for obj in objects if obj.parent not in imported]
    for obj in roots:
        world = obj.matrix_world.copy()
        obj.parent = root
        obj.matrix_world = world


def add_maple_foliage(root: bpy.types.Object) -> list[bpy.types.Object]:
    """Add opaque, volumetric leaf clusters where image-to-3D lost the canopy.

    Hunyuan reliably reconstructed the maple's trunk and branches but omitted
    foliage in both 500k runs. These are low-poly 3D meshes, not leaf cards or
    a map/image plane, and stay editable in the Blender source project.
    """
    palette = (
        (0.10, 0.002, 0.0005, 1),  # deep red
        (0.25, 0.006, 0.001, 1),   # vermilion
        (0.50, 0.030, 0.001, 1),   # autumn orange
        (0.65, 0.10, 0.002, 1),    # amber highlights
        (0.16, 0.003, 0.001, 1),   # warm red
    )
    materials = []
    for index, color in enumerate(palette):
        material = bpy.data.materials.new(f"Maple foliage {index + 1}")
        material.diffuse_color = color
        material.use_nodes = True
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = color
            bsdf.inputs["Roughness"].default_value = 0.88
        materials.append(material)

    # A deliberately tiered, asymmetric crown follows the branch spread in the
    # Hunyuan mesh and keeps gaps that reveal the sculpted trunk.
    rings = (
        (2.45, 0.82, 6, 0.63, 0.52, 0.58),
        (3.12, 1.30, 8, 0.68, 0.56, 0.62),
        (3.92, 1.52, 8, 0.66, 0.57, 0.66),
        (4.68, 1.25, 7, 0.60, 0.53, 0.60),
        (5.34, 0.64, 5, 0.54, 0.48, 0.55),
    )
    rng = random.Random(20260929)
    specs: list[tuple[float, float, float, float, float, float]] = []
    for ring_index, (z, radius, count, sx, sy, sz) in enumerate(rings):
        phase = 0.23 + ring_index * 0.37
        for index in range(count):
            angle = phase + 2 * math.pi * index / count
            radial = radius * rng.uniform(0.82, 1.18)
            specs.append((
                math.cos(angle) * radial + rng.uniform(-0.16, 0.16),
                math.sin(angle) * radial * 0.82 + rng.uniform(-0.15, 0.15),
                z + rng.uniform(-0.18, 0.18),
                sx * rng.uniform(0.86, 1.18),
                sy * rng.uniform(0.86, 1.18),
                sz * rng.uniform(0.88, 1.16),
            ))
    # Two crown caps avoid a perfectly circular outline at the very top.
    specs.extend(((0.04, -0.10, 5.64, 0.63, 0.54, 0.58),
                  (-0.36, 0.12, 5.34, 0.50, 0.44, 0.48)))

    # Build thick, five-lobed maple leaves as a single editable mesh. The leaf
    # silhouette follows the source map's star-shaped crowns and avoids the
    # pom-pom look of overlapping spheres.
    outline = (
        (0.00, -0.35), (-0.10, -0.16), (-0.25, -0.22), (-0.18, -0.04),
        (-0.38, -0.12), (-0.27, 0.08), (-0.39, 0.26), (-0.14, 0.20),
        (0.00, 0.49), (0.14, 0.20), (0.39, 0.26), (0.27, 0.08),
        (0.38, -0.12), (0.18, -0.04), (0.25, -0.22), (0.10, -0.16),
    )
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    face_materials: list[int] = []
    base_color_weights = (20, 24, 30, 10, 16)

    for x, y, z, sx, sy, _sz in specs:
        cluster_center = Vector((x, y, z))
        for _leaf in range(12):
            leaf_scale = rng.uniform(0.96, 1.22) * (sx + sy) * 0.58
            rotation = Euler((
                rng.uniform(-0.90, 0.90),
                rng.uniform(-0.90, 0.90),
                rng.uniform(0, math.tau),
            )).to_matrix()
            center = cluster_center + Vector((
                rng.uniform(-sx * 0.36, sx * 0.36),
                rng.uniform(-sy * 0.36, sy * 0.36),
                rng.uniform(-0.22, 0.22),
            ))
            color_index = rng.choices(range(len(materials)), weights=base_color_weights)[0]
            local_outline = []
            back_outline = []
            for px, py in outline:
                local = Vector((px * leaf_scale, py * leaf_scale, 0))
                local_outline.append(len(vertices))
                vertices.append(tuple(center + rotation @ (local + Vector((0, 0, 0.018 * leaf_scale)))))
            for px, py in outline:
                local = Vector((px * leaf_scale, py * leaf_scale, -0.036 * leaf_scale))
                back_outline.append(len(vertices))
                vertices.append(tuple(center + rotation @ local))
            front_center = len(vertices)
            vertices.append(tuple(center + rotation @ Vector((0, 0.045 * leaf_scale, 0.045 * leaf_scale))))
            back_center = len(vertices)
            vertices.append(tuple(center + rotation @ Vector((0, 0.045 * leaf_scale, -0.035 * leaf_scale))))
            n = len(outline)
            # Front and back fans plus thin side walls make these leaves actual
            # volumetric 3D mesh geometry rather than image cards.
            for i in range(n):
                nxt = (i + 1) % n
                faces.append((front_center, local_outline[nxt], local_outline[i]))
                face_materials.append(color_index)
                faces.append((back_center, back_outline[i], back_outline[nxt]))
                face_materials.append(color_index)
                faces.append((local_outline[i], local_outline[nxt], back_outline[nxt], back_outline[i]))
                face_materials.append(color_index)

    mesh = bpy.data.meshes.new("Maple five-lobed volumetric foliage")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    leaf_obj = bpy.data.objects.new("Maple 3D foliage leaves", mesh)
    bpy.context.scene.collection.objects.link(leaf_obj)
    for material in materials:
        mesh.materials.append(material)
    for polygon, material_index in zip(mesh.polygons, face_materials):
        polygon.material_index = material_index
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    world = leaf_obj.matrix_world.copy()
    leaf_obj.parent = root
    leaf_obj.matrix_world = world
    return [leaf_obj]


def prepare_scene(slug: str, config: dict) -> tuple[bpy.types.Object, list[bpy.types.Object], tuple[int, int]]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source = RAW_DIR / config["source"]
    if not source.is_file():
        raise FileNotFoundError(f"Missing untouched Hunyuan source: {source}")

    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = list(bpy.context.selected_objects)
    meshes = [obj for obj in imported if obj.type == "MESH"]
    low, high = object_bounds(meshes)
    raw_size = high - low
    raw_faces = sum(len(obj.data.polygons) for obj in meshes)

    root = bpy.data.objects.new(f"{slug}_AssetRoot", None)
    root.empty_display_type = "PLAIN_AXES"
    bpy.context.scene.collection.objects.link(root)
    attach_to_root(imported, root)

    limits = Vector(config["max_dimensions"])
    scale = min(limits[axis] / max(raw_size[axis], 0.0001) for axis in range(3))
    center = (low + high) * 0.5
    root.scale = (scale, scale, scale)
    root.rotation_euler[2] = math.radians(config["yaw_degrees"])
    root.location = (-center.x * scale, -center.y * scale, -low.z * scale)
    bpy.context.view_layer.update()

    # Keep all material/UV slots. The Hunyuan body gets a uniform ratio, while
    # maple leaf geometry is added afterward so its lobed silhouettes stay crisp.
    ratio = min(1.0, config["triangle_budget"] / max(raw_faces, 1))
    if ratio < 0.999:
        for obj in meshes:
            modifier = obj.modifiers.new("Realtime_Triangle_Budget", "DECIMATE")
            modifier.ratio = ratio
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.ops.object.modifier_apply(modifier=modifier.name)

    if slug == "autumn-maple":
        imported.extend(add_maple_foliage(root))
        meshes = [obj for obj in imported if obj.type == "MESH"]

    # Large source textures are expensive in a browser. Limit only oversized
    # maps; retain any texture at or below 2K unchanged.
    for image in bpy.data.images:
        width, height = tuple(image.size)
        longest = max(width, height)
        if image.has_data and longest > 2048:
            scale_ratio = 2048 / longest
            image.scale(max(1, round(width * scale_ratio)), max(1, round(height * scale_ratio)))
            image.pack()

    bpy.context.view_layer.update()
    low, high = object_bounds(meshes)
    game_size = high - low
    after_faces = sum(len(obj.data.polygons) for obj in meshes)
    print(
        f"DIMENSIONS {slug}: raw={tuple(round(v, 3) for v in raw_size)} "
        f"game={tuple(round(v, 3) for v in game_size)} scale={scale:.6f}"
    )
    return root, imported, (raw_faces, after_faces)


def add_preview_camera(scene: bpy.types.Scene, max_dimension: float) -> None:
    target = Vector((0, 0, 0.50 * max_dimension))
    camera_data = bpy.data.cameras.new("Cangshan asset preview camera")
    camera = bpy.data.objects.new("Cangshan asset preview camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = target + Vector((1.45, -2.8, 1.3)) * max_dimension
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max_dimension * 2.25
    scene.camera = camera

    for name, location, energy, size, color in (
        ("Asset key", (4, -7, 8), 1900, 5.5, (1.0, 0.82, 0.62)),
        ("Asset fill", (-5, -1, 5), 1000, 5.0, (0.58, 0.72, 1.0)),
        ("Asset rim", (2, 5, 6), 1500, 4.0, (1.0, 0.55, 0.32)),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        lamp = bpy.data.objects.new(name, data)
        scene.collection.objects.link(lamp)
        lamp.location = location
        lamp.rotation_euler = (target - lamp.location).to_track_quat("-Z", "Y").to_euler()


def package(slug: str) -> None:
    config = ASSETS[slug]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = config["stem"]
    blend_path = OUT_DIR / f"{stem}-blender.blend"
    glb_path = OUT_DIR / f"{stem}-game-ready.glb"
    preview_path = OUT_DIR / f"{stem}-preview.png"
    root, imported, (raw_faces, game_faces) = prepare_scene(slug, config)

    scene = bpy.context.scene
    available_engines = {item.identifier for item in scene.render.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in available_engines else "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(preview_path)
    scene.view_settings.view_transform = "AgX"
    scene.world = bpy.data.worlds.new("Cangshan asset preview world")
    scene.world.color = (0.035, 0.045, 0.055)
    max_dimension = max(config["max_dimensions"])
    add_preview_camera(scene, max_dimension)

    for obj in bpy.context.scene.objects:
        obj.select_set(False)
    root.select_set(True)
    for obj in imported:
        obj.select_set(True)
        if obj.type == "MESH":
            obj.hide_render = False
    bpy.context.view_layer.objects.active = root
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path), export_format="GLB", use_selection=True,
        export_apply=True, export_materials="EXPORT", export_cameras=False,
        export_lights=False, export_animations=False,
    )
    bpy.ops.render.render(write_still=True)
    print(f"PACKAGED {slug}: faces={raw_faces}->{game_faces}")
    print(f"BLEND={blend_path}\nGLB={glb_path}\nPREVIEW={preview_path}")


if __name__ == "__main__":
    try:
        slug = sys.argv[sys.argv.index("--") + 1]
    except (ValueError, IndexError):
        raise SystemExit(f"Choose one asset slug: {', '.join(ASSETS)}")
    if slug not in ASSETS:
        raise SystemExit(f"Unknown asset '{slug}'. Choose one of: {', '.join(ASSETS)}")
    package(slug)
