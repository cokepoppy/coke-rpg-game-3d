"""Build a standalone, editable 3D mesh for the Cangshan opening gate.

This Blender-authored asset is the deterministic fallback and calibration
baseline for the ImageGen -> Hunyuan3D -> Blender packaging route. The runtime
GLB is a real mesh assembly; it does not use the map crop or a billboard.

Run: blender --background --factory-startup --python tools/build_cangshan_paifang.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/generated/threejs-wuxia/models"
BLEND_PATH = OUT / "cangshan-paifang-blender.blend"
GLB_PATH = OUT / "cangshan-paifang-game-ready.glb"
PREVIEW_PATH = OUT / "cangshan-paifang-preview.png"


def make_material(name: str, rgba: tuple[float, float, float, float], roughness: float = 0.78,
                  metallic: float = 0.0, emission: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = rgba
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if emission:
        shader.inputs["Emission Color"].default_value = rgba
        shader.inputs["Emission Strength"].default_value = emission
    return mat


def add_box(name: str, location: tuple[float, float, float], size: tuple[float, float, float],
            mat: bpy.types.Material, collection: bpy.types.Collection,
            bevel: float = 0.025, rotation: tuple[float, float, float] = (0, 0, 0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    obj.rotation_euler = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new("Hand-softened edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.profile = 0.5
        normals = obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
        normals.keep_sharp = True
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def add_cylinder(name: str, location: tuple[float, float, float], radius: float, depth: float,
                 mat: bpy.types.Material, collection: bpy.types.Collection,
                 vertices: int = 12, radius_top: float | None = None) -> bpy.types.Object:
    if radius_top is None or abs(radius_top - radius) < 0.0001:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth,
                                            location=location)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius_top,
                                        depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    bevel = obj.modifiers.new("Stone edge chamfer", "BEVEL")
    bevel.width = min(0.035, depth * 0.07)
    bevel.segments = 1
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def roof_height(x: float, y: float) -> float:
    # Upturned ends follow the source gate. The front/back eaves fall slightly
    # below the center ridge, giving the roof a real cross-section in 3D.
    u = min(1.0, abs(x) / 2.72)
    v = min(1.0, abs(y) / 0.74)
    return 3.12 + 0.27 * u**3 - 0.13 * v**2


def add_roof_shell(collection: bpy.types.Collection, roof_mat: bpy.types.Material) -> None:
    nx, ny = 36, 10
    half_w, half_d, thickness = 2.72, 0.74, 0.19
    verts: list[tuple[float, float, float]] = []
    for lower in (False, True):
        for j in range(ny + 1):
            y = -half_d + 2 * half_d * j / ny
            for i in range(nx + 1):
                x = -half_w + 2 * half_w * i / nx
                z = roof_height(x, y) - (thickness if lower else 0.0)
                verts.append((x, y, z))

    layer = (nx + 1) * (ny + 1)
    faces: list[tuple[int, ...]] = []
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
            b = layer + a
            faces.append((b + nx + 1, b + nx + 2, b + 1, b))
    for i in range(nx):
        a, b = i, layer + i
        faces.append((a, b, b + 1, a + 1))
        a = ny * (nx + 1) + i
        b = layer + a
        faces.append((a + 1, b + 1, b, a))
    for j in range(ny):
        a = j * (nx + 1)
        b = layer + a
        faces.append((a + nx + 1, b + nx + 1, b, a))
        a += nx
        b = layer + a
        faces.append((a, b, b + nx + 1, a + nx + 1))

    mesh = bpy.data.meshes.new("Paifang curved roof shell mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(roof_mat)
    obj = bpy.data.objects.new("Roof | solid curved charcoal shell", mesh)
    collection.objects.link(obj)


def add_roof_tiles(collection: bpy.types.Collection, materials: list[bpy.types.Material]) -> None:
    # Individually modeled raised tile caps follow the curved shell. Joining
    # by material keeps them real geometry while avoiding hundreds of draw calls.
    tile_verts: list[list[tuple[float, float, float]]] = [[] for _ in materials]
    tile_faces: list[list[tuple[int, int, int, int]]] = [[] for _ in materials]
    xs = [(-2.52 + 0.30 * i) for i in range(17)]
    ys = [-0.60, -0.30, 0.0, 0.30, 0.60]
    for row, y in enumerate(ys):
        for col, x in enumerate(xs):
            dx = 0.30
            dy = 0.285
            dzdx = 0.81 * (min(1.0, abs(x) / 2.72) ** 2) * (1 if x >= 0 else -1) / 2.72
            dzdy = -0.26 * (min(1.0, abs(y) / 0.74)) * (1 if y >= 0 else -1) / 0.74
            rx, ry = math.atan(dzdy), -math.atan(dzdx)
            z = roof_height(x, y) + 0.045
            corners = [(-dx/2, -dy/2, -0.024), (dx/2, -dy/2, -0.024),
                       (dx/2, dy/2, -0.024), (-dx/2, dy/2, -0.024),
                       (-dx/2, -dy/2, 0.024), (dx/2, -dy/2, 0.024),
                       (dx/2, dy/2, 0.024), (-dx/2, dy/2, 0.024)]
            transformed = []
            for px, py, pz in corners:
                # Apply X then Y tilt around the local tile center.
                yy = py * math.cos(rx) - pz * math.sin(rx)
                zz = py * math.sin(rx) + pz * math.cos(rx)
                xx = px * math.cos(ry) + zz * math.sin(ry)
                zz = -px * math.sin(ry) + zz * math.cos(ry)
                transformed.append((x + xx, y + yy, z + zz))
            palette_index = (row + col // 2) % len(materials)
            offset = len(tile_verts[palette_index])
            tile_verts[palette_index].extend(transformed)
            tile_faces[palette_index].extend(tuple(offset + n for n in face) for face in (
                (0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5),
                (2, 3, 7, 6), (3, 0, 4, 7)))

    for index, (verts, faces, mat) in enumerate(zip(tile_verts, tile_faces, materials)):
        mesh = bpy.data.meshes.new(f"Paifang roof tile course {index + 1} mesh")
        mesh.from_pydata(verts, [], faces)
        mesh.materials.append(mat)
        obj = bpy.data.objects.new(f"Roof | raised tile course {index + 1}", mesh)
        collection.objects.link(obj)


def add_frame(collection: bpy.types.Collection, mats: dict[str, bpy.types.Material]) -> None:
    # Stone plinths and collars: two symmetric stacks, both resting on Z=0.
    post_x = (-1.58, 1.58)
    for side, x in enumerate(post_x):
        add_box(f"Stone footing {side + 1} | lower chamfer", (x, 0, 0.18),
                (0.74, 0.84, 0.36), mats["stone"], collection, 0.07)
        add_box(f"Stone footing {side + 1} | cap", (x, 0, 0.43),
                (0.57, 0.68, 0.18), mats["stone_light"], collection, 0.045)
        add_box(f"Stone socket {side + 1}", (x, 0, 0.63),
                (0.46, 0.54, 0.27), mats["stone_dark"], collection, 0.045)
        add_box(f"Pillar {side + 1} | straight vermilion shaft", (x, 0, 1.80),
                (0.34, 0.38, 2.28), mats["red"], collection, 0.055)
        add_box(f"Pillar {side + 1} | lower gold collar", (x, 0, 0.82),
                (0.40, 0.44, 0.10), mats["gold"], collection, 0.025)
        add_box(f"Pillar {side + 1} | upper collar", (x, 0, 2.82),
                (0.44, 0.48, 0.12), mats["gold"], collection, 0.025)
        add_box(f"Pillar {side + 1} | black capital", (x, 0, 2.94),
                (0.52, 0.56, 0.16), mats["wood_dark"], collection, 0.045)
        # Fine vertical wood strips and small gold pin heads add scale without
        # compromising the continuous, perfectly plumb pillar silhouette.
        for strip in (-1, 1):
            add_box(f"Pillar {side + 1} | raised grain inlay", (x + strip * 0.105, -0.197, 1.78),
                    (0.025, 0.014, 1.78), mats["red_light"], collection, 0.006)
        for band_z in (1.06, 2.50):
            for front in (-1, 1):
                add_box(f"Pillar {side + 1} | gold pin", (x + 0.145, front * 0.205, band_z),
                        (0.036, 0.032, 0.036), mats["gold_light"], collection, 0.006)

    # Two perfectly level beams tie the columns. The open span remains clear.
    add_box("Lower vermilion crossbeam", (0, 0, 2.40), (4.48, 0.50, 0.34),
            mats["red_light"], collection, 0.055)
    add_box("Upper vermilion crossbeam", (0, 0, 2.82), (4.84, 0.60, 0.34),
            mats["red"], collection, 0.06)
    add_box("Upper beam | gold front pinstripe", (0, -0.307, 2.68), (4.52, 0.025, 0.035),
            mats["gold"], collection, 0.008)
    add_box("Lower beam | gold front pinstripe", (0, -0.258, 2.26), (4.18, 0.025, 0.030),
            mats["gold"], collection, 0.008)

    # Small dougong-like brackets at the two supports are separate solid pieces.
    for x in post_x:
        for side in (-1, 1):
            add_box("Bracket | horizontal arm", (x + side * 0.29, 0, 2.98),
                    (0.60, 0.28, 0.12), mats["wood_mid"], collection, 0.028)
            add_box("Bracket | rising shoulder", (x + side * 0.43, 0, 3.08),
                    (0.30, 0.28, 0.12), mats["gold"], collection, 0.024,
                    (0, 0, side * math.radians(12)))


def add_plaques(collection: bpy.types.Collection, mats: dict[str, bpy.types.Material]) -> None:
    # Mirrored plaques keep the landmark legible from either side of the road.
    for face in (-1, 1):
        y = face * 0.355
        add_box("Gate plaque | dark timber backing", (0, y, 2.47),
                (0.76, 0.12, 0.65), mats["wood_dark"], collection, 0.045)
        front = face * 0.424
        add_box("Gate plaque | gold frame top", (0, front, 2.78),
                (0.76, 0.055, 0.055), mats["gold"], collection, 0.012)
        add_box("Gate plaque | gold frame bottom", (0, front, 2.16),
                (0.76, 0.055, 0.055), mats["gold"], collection, 0.012)
        for x in (-0.355, 0.355):
            add_box("Gate plaque | gold frame side", (x, front, 2.47),
                    (0.055, 0.055, 0.65), mats["gold"], collection, 0.012)
            for z in (2.21, 2.73):
                add_cylinder("Gate plaque | brass stud", (x, front + face * 0.025, z),
                             0.033, 0.032, mats["gold_light"], collection, 8)
        add_box("Gate plaque | inset enamel", (0, front, 2.47),
                (0.49, 0.028, 0.43), mats["plaque"], collection, 0.014)
        # The source plaque is ornamental and contains no readable glyph; use a
        # centered gold cloud medallion rather than generated lettering artifacts.
        add_cylinder("Gate plaque | raised cloud medallion", (0, front + face * 0.03, 2.47),
                     0.12, 0.036, mats["gold"], collection, 12)
        add_cylinder("Gate plaque | dark medallion inset", (0, front + face * 0.055, 2.47),
                     0.072, 0.026, mats["plaque"], collection, 12)
        for x in (-0.50, 0.50):
            add_box("Plaque hanger | brass strap", (x, face * 0.32, 2.65),
                    (0.08, 0.10, 0.34), mats["gold"], collection, 0.018)


def make_scene() -> tuple[bpy.types.Collection, dict[str, bpy.types.Material]]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "AgX"
    scene.render.filepath = str(PREVIEW_PATH)
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Paifang preview world")

    gate = bpy.data.collections.new("Cangshan Paifang | editable 3D asset")
    scene.collection.children.link(gate)
    preview = bpy.data.collections.new("Preview only | camera and lights")
    scene.collection.children.link(preview)
    mats = {
        "red": make_material("Lacquer | deep vermilion", (0.40, 0.044, 0.026, 1), 0.45),
        "red_light": make_material("Lacquer | warm vermilion", (0.65, 0.092, 0.045, 1), 0.44),
        "wood_dark": make_material("Wood | smoked underside", (0.105, 0.058, 0.036, 1), 0.82),
        "wood_mid": make_material("Wood | warm bracket", (0.27, 0.12, 0.052, 1), 0.72),
        "stone": make_material("Stone | weathered basalt", (0.20, 0.20, 0.205, 1), 0.91),
        "stone_light": make_material("Stone | worn edge", (0.34, 0.32, 0.29, 1), 0.9),
        "stone_dark": make_material("Stone | socket shadow", (0.13, 0.135, 0.14, 1), 0.92),
        "roof": make_material("Roof | charcoal tile", (0.115, 0.125, 0.14, 1), 0.82),
        "roof_alt": make_material("Roof | tile variation", (0.19, 0.20, 0.21, 1), 0.86),
        "roof_lit": make_material("Roof | aged tile highlight", (0.27, 0.27, 0.26, 1), 0.88),
        "gold": make_material("Trim | aged brass", (0.72, 0.42, 0.095, 1), 0.42, 0.62),
        "gold_light": make_material("Trim | brass edge glint", (0.95, 0.70, 0.28, 1), 0.34, 0.56),
        "plaque": make_material("Plaque | midnight enamel", (0.07, 0.075, 0.075, 1), 0.48, 0.12),
    }

    add_frame(gate, mats)
    add_roof_shell(gate, mats["roof"])
    add_roof_tiles(gate, [mats["roof"], mats["roof_alt"], mats["roof_lit"]])
    # Solid carved ridge caps and upturned eave finials.
    add_box("Roof | front curved fascia", (0, -0.68, 3.10), (5.32, 0.13, 0.18),
            mats["wood_dark"], gate, 0.055)
    add_box("Roof | rear curved fascia", (0, 0.68, 3.10), (5.32, 0.13, 0.18),
            mats["wood_dark"], gate, 0.055)
    for x in (-2.62, 2.62):
        for y in (-0.67, 0.67):
            add_cylinder("Roof | brass eave finial", (x, y, roof_height(x, y) + 0.03),
                         0.075, 0.16, mats["gold"], gate, 8)
    # A small beam beneath the roof visibly ties its two sides together.
    add_box("Roof | continuous dark ridge tie", (0, 0, 3.02), (4.9, 0.22, 0.18),
            mats["wood_dark"], gate, 0.04)
    add_plaques(gate, mats)

    # Keep preview staging outside the exported asset collection.
    floor_mat = make_material("Preview background | warm gray", (0.30, 0.30, 0.29, 1), 1.0)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.045))
    floor = bpy.context.object
    floor.name = "Preview floor only"
    floor.data.materials.append(floor_mat)
    for old in list(floor.users_collection): old.objects.unlink(floor)
    preview.objects.link(floor)

    target = Vector((0, 0, 1.62))
    camera_data = bpy.data.cameras.new("Paifang validation camera")
    camera = bpy.data.objects.new("Paifang validation camera", camera_data)
    preview.objects.link(camera)
    camera.location = (7.6, -11.5, 6.2)
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 7.25
    scene.camera = camera
    scene.world.color = (0.20, 0.20, 0.20)

    for name, location, energy, size, color in (
        ("Key softbox", (0, -7, 8), 1500, 6.0, (1.0, 0.76, 0.58)),
        ("Fill softbox", (-6, -1, 5), 900, 5.0, (0.61, 0.74, 1.0)),
        ("Rim softbox", (2, 5, 7), 1300, 4.0, (1.0, 0.52, 0.29)),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        lamp = bpy.data.objects.new(name, data)
        preview.objects.link(lamp)
        lamp.location = location
        lamp.rotation_euler = (target - lamp.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.resolution_percentage = 100
    scene.camera.data.lens = 50
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_percentage = 85
    return gate, mats


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    gate, _ = make_scene()
    scene = bpy.context.scene
    bpy.context.view_layer.update()
    meshes = [obj for obj in gate.objects if obj.type == "MESH"]
    dims_points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    low = Vector(tuple(min(p[axis] for p in dims_points) for axis in range(3)))
    high = Vector(tuple(max(p[axis] for p in dims_points) for axis in range(3)))
    faces = sum(len(obj.data.polygons) for obj in meshes)
    print(f"PAIFANG_BOUNDS meters={(high-low)!r}; faces={faces}; components={len(meshes)}")

    scene.render.filepath = str(PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format="GLB", use_selection=True,
                              export_materials="EXPORT", export_apply=True,
                              export_image_format="AUTO", export_yup=True)
    print(f"PAIFANG_BLEND {BLEND_PATH}")
    print(f"PAIFANG_GLB {GLB_PATH}")
    print(f"PAIFANG_PREVIEW {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
