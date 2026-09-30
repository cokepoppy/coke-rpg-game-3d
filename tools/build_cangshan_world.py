"""Build the Cangshan opening as an original, deterministic 3D scene.

The source pixel maps are used only to place landmarks. No map or room image is
loaded into the generated scene; all visible environment geometry is authored
here from Blender primitives and project-owned materials.

Run: blender --background --factory-startup --python tools/build_cangshan_world.py
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets/generated/threejs-wuxia/world"
BLEND_PATH = OUTPUT / "cangshan-world.blend"
GLB_PATH = OUTPUT / "cangshan-world.glb"
INTERIOR_GLB_PATH = OUTPUT / "cangshan-inn-interior.glb"
PREVIEW_PATH = OUTPUT / "cangshan-world-preview.png"
INN_GAME_READY = ROOT / "assets/generated/threejs-wuxia/models/yunlai-inn-game-ready.glb"
AUTUMN_MAPLE_GAME_READY = ROOT / "assets/generated/threejs-wuxia/models/autumn-maple-game-ready.glb"
PAIFANG_GAME_READY = ROOT / "assets/generated/threejs-wuxia/models/cangshan-paifang-game-ready.glb"
PHARMACY_GAME_READY = ROOT / "assets/generated/threejs-wuxia/models/hundred-herbs-pharmacy-game-ready.glb"
AUTUMN_MAPLE_ANCHOR = (4100, 2390)
MAP_W, MAP_H = 4480.0, 3584.0
# Keep the original 2D pixel anchors, but spread their X/Z positions farther
# apart than the source's compressed 2.5D presentation. Heights and object
# dimensions remain human scale so the world opens up without shrinking actors.
LAYOUT_SPREAD = 1.6
WORLD_W, WORLD_D = 44.0 * LAYOUT_SPREAD, 35.2 * LAYOUT_SPREAD
METERS_PER_MAP_PIXEL = WORLD_W / MAP_W
RNG = random.Random(20260924)

COLLECTION_NAMES = ("Terrain", "Roads_Water", "Architecture", "Props", "Nature", "InnInterior")


def pixel_to_world(px: float, py: float) -> tuple[float, float]:
    """Map pixels to Blender XY (the GLB axis conversion restores Three Z)."""
    return ((0.5 * MAP_W - px) * METERS_PER_MAP_PIXEL,
            (py - 0.5 * MAP_H) * METERS_PER_MAP_PIXEL)


def reset_scene() -> dict[str, bpy.types.Collection]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    collections = {}
    for name in COLLECTION_NAMES:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
        collections[name] = collection
    return collections


def material(name: str, color: tuple[float, float, float, float], roughness: float = 0.9,
             metallic: float = 0.0, emission: float = 0.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if emission:
        shader.inputs["Emission Color"].default_value = color
        shader.inputs["Emission Strength"].default_value = emission
    return mat


def use_vertex_color(mat: bpy.types.Material, attribute_name: str) -> None:
    """Use exported mesh colors for a lightly mottled, hand-painted surface."""
    nodes = mat.node_tree.nodes
    shader = nodes.get("Principled BSDF")
    vertex_color = nodes.new("ShaderNodeVertexColor")
    vertex_color.layer_name = attribute_name
    mat.node_tree.links.new(vertex_color.outputs["Color"], shader.inputs["Base Color"])


def value_noise(x: float, y: float, seed: int = 0) -> float:
    """Small deterministic smooth noise, used for geometry colors only."""
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)

    def corner(px: int, py: int) -> float:
        value = math.sin(px * 127.1 + py * 311.7 + seed * 74.7) * 43758.5453
        return value - math.floor(value)

    top = corner(ix, iy) * (1 - fx) + corner(ix + 1, iy) * fx
    bottom = corner(ix, iy + 1) * (1 - fx) + corner(ix + 1, iy + 1) * fx
    return top * (1 - fy) + bottom * fy


def make_palette() -> dict[str, bpy.types.Material]:
    colors = {
        "soil": (0.29, 0.205, 0.115, 1), "soil_light": (1, 1, 1, 1),
        "soil_dark": (0.225, 0.175, 0.105, 1), "grass": (0.115, 0.185, 0.12, 1),
        "grass_light": (0.20, 0.27, 0.15, 1), "moss": (0.255, 0.30, 0.16, 1),
        "rock": (0.22, 0.22, 0.235, 1), "rock_mid": (0.32, 0.30, 0.29, 1),
        "rock_lit": (0.43, 0.40, 0.36, 1), "wood": (0.245, 0.125, 0.065, 1),
        "wood_mid": (0.40, 0.235, 0.11, 1), "wood_lit": (0.58, 0.37, 0.19, 1),
        "roof": (0.115, 0.12, 0.145, 1), "roof_mid": (0.22, 0.23, 0.25, 1),
        "roof_lit": (0.34, 0.34, 0.35, 1), "plaster": (0.58, 0.46, 0.31, 1),
        "red": (0.50, 0.105, 0.075, 1), "red_lit": (0.72, 0.19, 0.105, 1),
        "water": (0.065, 0.19, 0.22, 1), "water_lit": (0.22, 0.44, 0.45, 1),
        "leaf": (0.105, 0.22, 0.14, 1), "leaf_lit": (0.23, 0.34, 0.18, 1),
        "leaf_red": (0.56, 0.15, 0.085, 1), "leaf_orange": (0.72, 0.34, 0.09, 1),
        "crop": (0.70, 0.49, 0.17, 1), "crop_lit": (0.88, 0.68, 0.27, 1),
        "jade": (0.27, 0.48, 0.34, 1), "paper": (0.79, 0.65, 0.42, 1),
        "gold": (0.86, 0.57, 0.18, 1), "charcoal": (0.075, 0.075, 0.075, 1),
    }
    palette = {key: material(key, value, emission=0.35 if key == "gold" else 0) for key, value in colors.items()}
    use_vertex_color(palette["soil_light"], "road_mottle")
    use_vertex_color(palette["grass"], "terrain_mottle")
    return palette


def cube(name: str, location: tuple[float, float, float], size: tuple[float, float, float],
         mat: bpy.types.Material, collection: bpy.types.Collection,
         rotation: tuple[float, float, float] = (0, 0, 0), bevel: float = 0.0) -> bpy.types.Object:
    hx, hy, hz = (d * 0.5 for d in size)
    verts = [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, hy, -hz), (-hx, hy, -hz),
             (-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    obj.rotation_euler = rotation
    collection.objects.link(obj)
    if bevel:
        modifier = obj.modifiers.new("Soft pixel edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 1
        modifier.affect = "EDGES"
    return obj


def cylinder(name: str, location: tuple[float, float, float], radius: float, depth: float,
             mat: bpy.types.Material, collection: bpy.types.Collection, vertices: int = 8,
             radius_top: float | None = None) -> bpy.types.Object:
    top = radius if radius_top is None else radius_top
    verts = []
    for z, r in ((-depth / 2, radius), (depth / 2, top)):
        verts.extend([(r * math.cos(2 * math.pi * i / vertices),
                       r * math.sin(2 * math.pi * i / vertices), z) for i in range(vertices)])
    faces = [tuple(reversed(range(vertices))), tuple(range(vertices, 2 * vertices))]
    faces.extend((i, (i + 1) % vertices, (i + 1) % vertices + vertices, i + vertices) for i in range(vertices))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    collection.objects.link(obj)
    return obj


def ico(name: str, location: tuple[float, float, float], scale: tuple[float, float, float],
        mat: bpy.types.Material, collection: bpy.types.Collection, subdivisions: int = 1) -> bpy.types.Object:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def mesh_object(name: str, verts: list[tuple[float, float, float]], faces: list[tuple[int, ...]],
                mat: bpy.types.Material, collection: bpy.types.Collection) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def ground_mesh(collection: bpy.types.Collection, palette: dict[str, bpy.types.Material]) -> None:
    # The old single olive material made the entire world read as a flat green
    # board. Keep one continuous 3D terrain mesh, with subtle warm dirt/moss
    # variation at several scales like the source map's painted ground.
    nx, ny = 320, 256
    verts = []
    faces = []
    colors = []
    grass = (0.115, 0.185, 0.12)
    earth = (0.29, 0.205, 0.115)
    for j in range(ny + 1):
        y = -WORLD_D / 2 + WORLD_D * j / ny
        for i in range(nx + 1):
            x = -WORLD_W / 2 + WORLD_W * i / nx
            broad = value_noise(x * 0.34, y * 0.34, 2)
            medium = value_noise(x * 1.15, y * 1.15, 7)
            fine = value_noise(x * 2.8, y * 2.8, 13)
            earth_mix = max(0.28, min(0.94, 0.62 + (broad - 0.5) * 0.52 + (medium - 0.5) * 0.42 + (fine - 0.5) * 0.26))
            tint = 0.95 + fine * 0.10
            colors.append(tuple((grass[k] * (1 - earth_mix) + earth[k] * earth_mix) * tint for k in range(3)) + (1.0,))
            z = 0.02 + 0.012 * math.sin(x * 1.8 + y * 0.9) * math.cos(y * 1.4 - x * 0.4)
            verts.append((x, y, z))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    terrain = mesh_object("Cangshan terrain", verts, faces, palette["grass"], collection)
    tint = terrain.data.color_attributes.new(name="terrain_mottle", type="FLOAT_COLOR", domain="POINT")
    tint.data.foreach_set("color", [channel for color in colors for channel in color])


def smooth_road_points(points: list[tuple[float, float]], steps: int = 18) -> list[tuple[float, float]]:
    world = [pixel_to_world(*point) for point in points]
    result = []
    for i in range(len(world) - 1):
        p0 = world[max(0, i - 1)]
        p1, p2 = world[i], world[i + 1]
        p3 = world[min(len(world) - 1, i + 2)]
        for step in range(steps):
            t = step / steps
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2*p0[0] - 5*p1[0] + 4*p2[0] - p3[0])*t2 + (-p0[0] + 3*p1[0] - 3*p2[0] + p3[0])*t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2*p0[1] - 5*p1[1] + 4*p2[1] - p3[1])*t2 + (-p0[1] + 3*p1[1] - 3*p2[1] + p3[1])*t3)
            result.append((x, y))
    result.append(world[-1])
    return result


def ribbon(name: str, points: list[tuple[float, float]], width: float, z: float,
           mat: bpy.types.Material, collection: bpy.types.Collection) -> list[tuple[float, float]]:
    path = smooth_road_points(points)
    verts, faces = [], []
    road_colors = []
    cross_sections = 7 if name.endswith(" dirt") else 2
    for i, (x, y) in enumerate(path):
        before = Vector(path[max(0, i - 1)])
        after = Vector(path[min(len(path) - 1, i + 1)])
        tangent = (after - before).normalized() if after != before else Vector((1, 0))
        side = Vector((-tangent.y, tangent.x))
        for cross in range(cross_sections):
            across = -1 + 2 * cross / (cross_sections - 1)
            noise = value_noise(x * 1.7 + across * 3.0, y * 1.7 - across * 2.0, 21)
            edge = 1 - abs(across) * 0.06
            verts.append((x + side.x * across * width * 0.5 * edge,
                          y + side.y * across * width * 0.5 * edge, z))
            if cross_sections > 2:
                base = (0.39, 0.285, 0.155)
                shade = 0.80 + noise * 0.38 - abs(across) * 0.08
                road_colors.append(tuple(max(0.0, min(1.0, channel * shade)) for channel in base) + (1.0,))
        if i:
            a = (i - 1) * cross_sections
            for cross in range(cross_sections - 1):
                faces.append((a + cross, a + cross_sections + cross,
                              a + cross_sections + cross + 1, a + cross + 1))
    ribbon_object = mesh_object(name, verts, faces, mat, collection)
    if road_colors:
        tint = ribbon_object.data.color_attributes.new(name="road_mottle", type="FLOAT_COLOR", domain="POINT")
        tint.data.foreach_set("color", [channel for color in road_colors for channel in color])
    return path


def road_network(collection: bpy.types.Collection, palette: dict[str, bpy.types.Material]) -> list[list[tuple[float, float]]]:
    roads = [
        ("South village road", [(2040, 2700), (2250, 2530), (2490, 2490), (2700, 2520), (2910, 2630), (3090, 2710), (3440, 2680), (3970, 2730)], 2.45),
        ("Apothecary lane", [(2700, 2520), (2860, 2410), (3050, 2335), (3110, 2320), (3470, 2390)], 2.05),
        ("Monastery stair road", [(2040, 700), (1970, 900), (1810, 1110), (1900, 1320), (2180, 1510), (2350, 1750), (2390, 1980), (2240, 2220), (2040, 2500)], 2.05),
        ("West farm track", [(640, 1500), (950, 1470), (1280, 1530), (1510, 1700), (1770, 1770), (2060, 1680), (2350, 1750)], 2.15),
        ("River bridge road", [(2630, 1760), (2920, 1580), (3180, 1310), (3380, 930), (3630, 800)], 2.05),
        ("Eastern woods trail", [(3380, 930), (3560, 1160), (3740, 1450), (3480, 1730), (3290, 1900), (3140, 2110), (3110, 2320)], 1.95),
        ("South trail", [(2040, 2700), (1880, 2940), (1650, 3180), (1370, 3450)], 1.85),
    ]
    paths = []
    for name, points, width in roads:
        paths.append(ribbon(name, points, width + 0.10, 0.055, palette["soil_dark"], collection))
        ribbon(name + " dirt", points, width, 0.072, palette["soil_light"], collection)
    return paths


def line_fence(points: list[tuple[float, float]], collection: bpy.types.Collection,
               palette: dict[str, bpy.types.Material], spacing: float = 0.78,
               height: float = 0.65) -> None:
    world = [pixel_to_world(*p) for p in points]
    for start, end in zip(world, world[1:]):
        delta = Vector(end) - Vector(start)
        length = delta.length
        count = max(1, int(length / spacing))
        yaw = math.atan2(delta.y, delta.x)
        for i in range(count + 1):
            t = i / count
            x, y = start[0] + delta.x * t, start[1] + delta.y * t
            cube("Fence post", (x, y, height * 0.5), (0.14, 0.14, height), palette["wood_mid"], collection)
        for i in range(count):
            t = (i + 0.5) / count
            x, y = start[0] + delta.x * t, start[1] + delta.y * t
            cube("Fence rail", (x, y, height * 0.38), (length / count + 0.08, 0.085, 0.11), palette["wood_lit"], collection, (0, 0, yaw))
            cube("Fence rail", (x, y, height * 0.79), (length / count + 0.08, 0.085, 0.10), palette["wood_mid"], collection, (0, 0, yaw))


def blocky_roof(name: str, center: tuple[float, float], width: float, depth: float,
                base_z: float, rise: float, palette: dict[str, bpy.types.Material],
                collection: bpy.types.Collection, tiers: int = 1) -> None:
    x, y = center
    for tier in range(tiers):
        tier_scale = 1 - tier * 0.19
        w, d = width * tier_scale, depth * tier_scale
        z = base_z + rise * tier
        half_run = d * 0.54
        angle = math.atan2(rise * 0.74, half_run)
        slope_depth = math.hypot(half_run, rise * 0.74) * 1.15
        for side in (-1, 1):
            yside = y + side * d * 0.24
            cube(name + " roof slope", (x, yside, z + rise * 0.31), (w + 0.7, slope_depth, 0.22), palette["roof"], collection, (side * angle, 0, 0))
            cube(name + " eave trim", (x, y + side * d * 0.49, z + rise * 0.05), (w + 0.95, 0.19, 0.22), palette["roof_lit"], collection)
            for corner in (-1, 1):
                cube(name + " lifted eave", (x + corner * (w * 0.5 + 0.23), y + side * d * 0.47, z + rise * 0.21), (0.20, 0.22, 0.48), palette["roof_mid"], collection, (0, corner * -0.08, side * -0.16))
        cube(name + " ridge", (x, y, z + rise * 0.75), (w + 0.35, 0.20, 0.2), palette["roof_mid"], collection)
        # Raised rows of individual tiles make the silhouette read as built geometry.
        rows, cols = 4, max(5, int(w / 0.42))
        for side in (-1, 1):
            for row in range(rows):
                yy = y + side * (0.12 + row * d * 0.105)
                zz = z + rise * (0.69 - row * 0.13)
                for col in range(cols):
                    xx = x + (col - (cols - 1) / 2) * (w / cols)
                    shade = palette["roof_lit"] if (row + col) % 5 == 0 else palette["roof_mid"]
                    cube(name + " roof tile", (xx, yy, zz), (w / cols * 0.90, d * 0.11, 0.055), shade, collection, (side * angle, 0, 0))


def build_house(name: str, pixel: tuple[float, float], width: float, depth: float,
                wall_height: float, palette: dict[str, bpy.types.Material],
                collection: bpy.types.Collection, wall_key: str = "plaster",
                sign: str | None = None, pagoda: bool = False) -> tuple[float, float]:
    x, y = pixel_to_world(*pixel)
    floor_z = 0.13
    wall = palette[wall_key]
    cube(name + " stone foundation", (x, y, floor_z + 0.16), (width + 0.55, depth + 0.42, 0.32), palette["rock_mid"], collection)
    cube(name + " walls", (x, y, floor_z + 0.32 + wall_height * 0.5), (width, depth, wall_height), wall, collection)
    # Timber frame, corner columns and sill are separate solid beams.
    front_y = y + depth * 0.5 + 0.035
    for side in (-1, 1):
        for end in (-1, 1):
            cube(name + " corner timber", (x + side * (width * 0.48), y + end * (depth * 0.48), floor_z + wall_height * 0.52), (0.15, 0.16, wall_height + 0.12), palette["wood_mid"], collection)
        cube(name + " front post", (x + side * width * 0.22, front_y, floor_z + wall_height * 0.52), (0.13, 0.13, wall_height + 0.10), palette["wood_lit"], collection)
    cube(name + " front lintel", (x, front_y, floor_z + wall_height * 0.91), (width * 0.96, 0.15, 0.14), palette["wood_mid"], collection)
    cube(name + " side sill", (x, y + depth * 0.5 + 0.03, floor_z + 0.17), (width + 0.14, 0.16, 0.15), palette["rock_lit"], collection)
    # Recessed entrance, frame, two planked leaves and a raised threshold.
    door_w, door_h = min(0.95, width * 0.26), wall_height * 0.72
    cube(name + " dark doorway", (x, front_y + 0.024, floor_z + door_h * 0.5), (door_w + 0.12, 0.045, door_h + 0.12), palette["charcoal"], collection)
    cube(name + " door", (x, front_y + 0.075, floor_z + door_h * 0.48), (door_w, 0.09, door_h * 0.91), palette["wood"], collection)
    for plank in range(3):
        px = x + (plank - 1) * door_w * 0.30
        cube(name + " door plank", (px, front_y + 0.13, floor_z + door_h * 0.48), (0.025, 0.035, door_h * 0.78), palette["wood_lit"], collection)
    cube(name + " door lintel", (x, front_y + 0.055, floor_z + door_h + 0.08), (door_w + 0.32, 0.13, 0.13), palette["wood_lit"], collection)
    cube(name + " door threshold", (x, front_y + 0.07, floor_z + 0.08), (door_w + 0.30, 0.24, 0.16), palette["rock_lit"], collection)
    # Lattice windows are deep boxes and timber mullions, not flat map pixels.
    for side in (-1, 1):
        wx = x + side * width * 0.34
        cube(name + " window recess", (wx, front_y + 0.015, floor_z + wall_height * 0.57), (0.56, 0.06, 0.54), palette["charcoal"], collection)
        cube(name + " window paper", (wx, front_y + 0.06, floor_z + wall_height * 0.57), (0.40, 0.04, 0.38), palette["paper"], collection)
        for dx in (-0.15, 0, 0.15):
            cube(name + " window lattice", (wx + dx, front_y + 0.11, floor_z + wall_height * 0.57), (0.035, 0.045, 0.47), palette["wood_mid"], collection)
        cube(name + " window crossbar", (wx, front_y + 0.12, floor_z + wall_height * 0.57), (0.50, 0.045, 0.04), palette["wood_mid"], collection)
    blocky_roof(name, (x, y), width, depth, floor_z + wall_height + 0.20, 0.76 if not pagoda else 1.0, palette, collection, 2 if pagoda else 1)
    if sign:
        cube(name + " hanging sign board", (x + width * 0.64, front_y + 0.16, floor_z + wall_height * 0.70), (0.82, 0.14, 0.68), palette["wood_mid"], collection)
        cube(name + " sign face", (x + width * 0.64, front_y + 0.245, floor_z + wall_height * 0.70), (0.62, 0.045, 0.49), palette["paper"], collection)
        for i, ch in enumerate(sign[:2]):
            font = bpy.data.curves.new(name + " sign glyph", type="FONT")
            font.body = ch
            font.size = 0.30
            font.extrude = 0.012
            text = bpy.data.objects.new(name + " sign glyph", font)
            collection.objects.link(text)
            text.location = (x + width * 0.64 - 0.16, front_y + 0.28, floor_z + wall_height * 0.70 + 0.13 - i * 0.24)
            text.rotation_euler = (math.radians(90), 0, 0)
            font.materials.append(palette["red"])
    return x, y


def build_torii(pixel: tuple[float, float], collection: bpy.types.Collection,
                palette: dict[str, bpy.types.Material]) -> None:
    x, y = pixel_to_world(*pixel)
    for side in (-1, 1):
        px = x + side * 1.42
        cylinder("Torii stone footing", (px, y, 0.20), 0.34, 0.36, palette["rock_mid"], collection)
        cylinder("Vermilion torii post", (px, y, 1.56), 0.19, 2.55, palette["red"], collection, 10, 0.15)
        cube("Torii gold collar", (px, y, 2.32), (0.47, 0.42, 0.12), palette["gold"], collection)
    cube("Torii lower crossbeam", (x, y, 2.53), (4.15, 0.38, 0.34), palette["red_lit"], collection)
    cube("Torii upper crossbeam", (x, y, 2.89), (4.82, 0.55, 0.36), palette["red"], collection)
    cube("Torii ridge cap", (x, y, 3.11), (5.08, 0.68, 0.16), palette["roof"], collection)
    for side in (-1, 1):
        cube("Torii cap end", (x + side * 2.45, y, 3.16), (0.24, 0.78, 0.19), palette["red_lit"], collection, (0, 0, side * -0.08))
    cube("Torii name plaque", (x, y - 0.04, 2.14), (0.62, 0.20, 0.60), palette["wood_mid"], collection)
    cube("Torii plaque face", (x, y - 0.16, 2.14), (0.46, 0.05, 0.43), palette["gold"], collection)


def build_lantern(pixel: tuple[float, float], collection: bpy.types.Collection,
                  palette: dict[str, bpy.types.Material], scale: float = 1.0) -> None:
    x, y = pixel_to_world(*pixel)
    cylinder("Lantern stone foot", (x, y, 0.15 * scale), 0.42 * scale, 0.30 * scale, palette["rock_mid"], collection)
    cylinder("Lantern pedestal", (x, y, 0.54 * scale), 0.30 * scale, 0.60 * scale, palette["rock_lit"], collection, 8, 0.22 * scale)
    cube("Lantern glowing chamber", (x, y, 1.10 * scale), (0.60 * scale, 0.58 * scale, 0.52 * scale), palette["gold"], collection)
    for side in (-1, 1):
        cube("Lantern chamber rail", (x + side * 0.31 * scale, y, 1.10 * scale), (0.07 * scale, 0.64 * scale, 0.60 * scale), palette["rock_mid"], collection)
        cube("Lantern crossbar", (x, y + side * 0.29 * scale, 1.10 * scale), (0.62 * scale, 0.07 * scale, 0.60 * scale), palette["rock_mid"], collection)
    cube("Lantern roof", (x, y, 1.48 * scale), (0.85 * scale, 0.80 * scale, 0.15 * scale), palette["rock_lit"], collection)
    cube("Lantern roof crown", (x, y, 1.66 * scale), (0.43 * scale, 0.43 * scale, 0.20 * scale), palette["rock_mid"], collection)


def build_well(pixel: tuple[float, float], collection: bpy.types.Collection,
               palette: dict[str, bpy.types.Material]) -> None:
    x, y = pixel_to_world(*pixel)
    cylinder("Well dark water", (x, y, 0.42), 0.82, 0.10, palette["water"], collection, 12)
    for i in range(12):
        angle = 2 * math.pi * i / 12
        cube("Well stone ring", (x + math.cos(angle) * 0.76, y + math.sin(angle) * 0.76, 0.56), (0.43, 0.35, 0.50), palette["rock_lit" if i % 3 == 0 else "rock_mid"], collection, (0, 0, angle))
    for side in (-1, 1):
        cube("Well roof post", (x + side * 0.72, y, 1.62), (0.16, 0.18, 2.20), palette["wood_mid"], collection)
    cube("Well roof", (x, y, 2.66), (2.25, 1.30, 0.22), palette["roof"], collection)
    cube("Well ridge", (x, y, 2.82), (2.38, 0.20, 0.20), palette["roof_lit"], collection)


def build_bridge(pixel: tuple[float, float], collection: bpy.types.Collection,
                 palette: dict[str, bpy.types.Material]) -> None:
    x, y = pixel_to_world(*pixel)
    for i in range(11):
        px = x + (i - 5) * 0.36
        height = 0.64 + 0.35 * (1 - ((i - 5) / 5) ** 2)
        cube("Bridge deck plank", (px, y, height), (0.34, 1.50, 0.13), palette["wood_mid" if i % 3 else "wood_lit"], collection)
    for side in (-1, 1):
        points = []
        for i in range(9):
            px = x + (i - 4) * 0.60
            zz = 1.12 + 0.30 * (1 - ((i - 4) / 4) ** 2)
            cube("Bridge rail post", (px, y + side * 0.84, zz), (0.18, 0.18, 0.67), palette["wood"], collection)
            points.append((px, y + side * 0.84, zz + 0.25))
        for (ax, ay, az), (bx, by, bz) in zip(points, points[1:]):
            mid = ((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)
            length = math.hypot(bx - ax, bz - az)
            angle = -math.atan2(bz - az, bx - ax)
            cube("Bridge handrail", mid, (length + 0.08, 0.14, 0.16), palette["wood_lit"], collection, (0, angle, 0))
    for side in (-1, 1):
        for dx in (-1.9, 1.9):
            cube("Bridge stone pier", (x + dx, y, 0.25), (0.72, 0.84, 0.50), palette["rock_mid"], collection)


def build_stall(pixel: tuple[float, float], collection: bpy.types.Collection,
                palette: dict[str, bpy.types.Material]) -> None:
    x, y = pixel_to_world(*pixel)
    cube("Market counter base", (x, y, 0.65), (3.30, 1.15, 1.25), palette["wood"], collection)
    cube("Market counter top", (x, y - 0.08, 1.34), (3.52, 1.32, 0.18), palette["wood_lit"], collection)
    for side in (-1, 1):
        for front in (-1, 1):
            cube("Market canopy post", (x + side * 1.45, y + front * 0.48, 1.60), (0.14, 0.14, 2.80), palette["wood_mid"], collection)
    cube("Market canopy cloth", (x, y, 2.99), (3.70, 1.70, 0.18), palette["paper"], collection, (math.radians(-5), 0, 0))
    for i in range(9):
        stripe_x = x + (i - 4) * 0.42
        cube("Canopy red stripe", (stripe_x, y, 3.10), (0.13, 1.62, 0.035), palette["red"], collection, (math.radians(-5), 0, 0))
    for idx, (dx, mat_key) in enumerate(((-1.0, "jade"), (-0.35, "crop"), (0.4, "gold"), (1.0, "leaf_lit"))):
        cylinder("Market bowl", (x + dx, y - 0.17, 1.48), 0.24, 0.22, palette["wood_mid"], collection, 10, 0.18)
        ico("Market produce", (x + dx, y - 0.17, 1.68), (0.18, 0.18, 0.12), palette[mat_key], collection)
    for side in (-1, 1):
        cube("Market side crate", (x + side * 2.0, y + 0.45, 0.36), (0.72, 0.72, 0.68), palette["wood_mid"], collection)


def build_barrel(pixel: tuple[float, float], collection: bpy.types.Collection,
                 palette: dict[str, bpy.types.Material], scale: float = 1.0) -> None:
    x, y = pixel_to_world(*pixel)
    cylinder("Barrel body", (x, y, 0.46 * scale), 0.36 * scale, 0.92 * scale, palette["wood_mid"], collection, 10, 0.30 * scale)
    for z in (0.18, 0.72):
        cylinder("Barrel iron band", (x, y, z * scale), 0.37 * scale, 0.08 * scale, palette["rock_mid"], collection, 10, 0.32 * scale)
    cylinder("Barrel lid", (x, y, 0.94 * scale), 0.30 * scale, 0.07 * scale, palette["wood_lit"], collection, 10)


def build_crate(pixel: tuple[float, float], collection: bpy.types.Collection,
                palette: dict[str, bpy.types.Material], scale: float = 1.0) -> None:
    x, y = pixel_to_world(*pixel)
    size = 0.74 * scale
    cube("Supply crate", (x, y, size / 2), (size, size, size), palette["wood_mid"], collection)
    for side in (-1, 1):
        cube("Crate vertical brace", (x + side * size * 0.33, y - size * 0.51, size / 2), (0.08, 0.08, size * 1.05), palette["wood_lit"], collection)
        cube("Crate cross brace", (x, y - size * 0.53, size / 2), (size, 0.08, 0.08), palette["wood_lit"], collection)


def build_tree(pixel: tuple[float, float], collection: bpy.types.Collection,
               palette: dict[str, bpy.types.Material], style: int = 0, scale: float = 1.0) -> None:
    x, y = pixel_to_world(*pixel)
    trunk_h = 1.5 * scale
    cylinder("Tree trunk", (x, y, trunk_h / 2), 0.17 * scale, trunk_h, palette["wood"], collection, 7, 0.10 * scale)
    if style == 2:
        for tier in range(3):
            cone_depth = (1.25 - tier * 0.18) * scale
            # Low-poly cone tiers form a distinct mountain pine silhouette.
            bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.83*scale-tier*0.13*scale,
                                            radius2=0.08*scale, depth=cone_depth,
                                            location=(x, y, trunk_h + 0.50 * scale + tier * 0.56 * scale))
            obj = bpy.context.object
            obj.name = "Layered pine canopy"
            obj.data.materials.append(palette["leaf"])
            for old in list(obj.users_collection): old.objects.unlink(obj)
            collection.objects.link(obj)
    else:
        leaf_key = "leaf_red" if style == 1 else "leaf_orange" if style == 3 else "leaf"
        alt = "leaf_orange" if style == 1 else "leaf_lit"
        ico("Tree crown", (x, y, trunk_h + 0.68 * scale), (1.02*scale, 0.88*scale, 0.93*scale), palette[leaf_key], collection)
        for dx, dy, dz in ((-0.44, 0.05, 0.30), (0.42, -0.03, 0.34), (0, 0.37, 0.50)):
            ico("Tree crown cluster", (x + dx*scale, y + dy*scale, trunk_h + dz*scale),
                (0.62*scale, 0.55*scale, 0.62*scale), palette[alt], collection)


def build_rock_cluster(pixel: tuple[float, float], collection: bpy.types.Collection,
                       palette: dict[str, bpy.types.Material], scale: float = 1.0, count: int = 5) -> None:
    x, y = pixel_to_world(*pixel)
    for _ in range(count):
        dx, dy = RNG.uniform(-0.55, 0.55)*scale, RNG.uniform(-0.40, 0.40)*scale
        sx, sy = RNG.uniform(0.30, 0.78)*scale, RNG.uniform(0.28, 0.68)*scale
        sz = RNG.uniform(0.40, 1.35)*scale
        stone = palette[RNG.choice(("rock", "rock_mid", "rock_lit"))]
        obj = ico("Faceted cliff boulder", (x + dx, y + dy, sz / 2), (sx, sy, sz), stone, collection)
        obj.rotation_euler[2] = RNG.uniform(0, math.tau)
        # A smaller cap plane catches the warm light and gives a stacked block edge.
        if sz > 0.85:
            cube("Cliff cap stone", (x + dx, y + dy, sz * 0.82), (sx * 0.75, sy * 0.78, 0.20*scale), palette["rock_lit"], collection, (0, 0, RNG.uniform(-0.12, 0.12)))


def build_crops(collection: bpy.types.Collection, palette: dict[str, bpy.types.Material]) -> None:
    # Fenced central wheat patch; each stalk is a tapered 3D stem with a seed head.
    for row in range(12):
        my = 1280 + row * 35
        for col in range(20):
            mx = 660 + col * 49 + (row % 2) * 14
            x, y = pixel_to_world(mx, my)
            h = RNG.uniform(0.48, 0.95)
            cylinder("Wheat stalk", (x, y, h * 0.48), 0.035, h, palette["crop"], collection, 5, 0.018)
            ico("Wheat head", (x, y, h + 0.08), (0.07, 0.06, 0.16), palette["crop_lit"], collection, 1)
    line_fence([(520, 1200), (1780, 1200), (1840, 1830), (560, 1850), (520, 1200)], collection, palette, 0.88, 0.60)


def build_clearing(collection: bpy.types.Collection, palette: dict[str, bpy.types.Material]) -> None:
    # The source has a dirt practice yard inside a low timber fence, not a raised
    # stone disk. Keep the ground continuous so actors do not appear embedded.
    x, y = pixel_to_world(3640, 1550)
    line_fence([(3290, 1280), (3830, 1260), (3990, 1500), (3880, 1800),
                (3390, 1830), (3220, 1570), (3290, 1280)], collection, palette, 0.88, 0.68)
    for dx, dy, turn in ((-0.78, -0.42, -0.08), (0.74, -0.30, 0.06), (0.08, 0.72, 0.10)):
        px, py = x + dx, y + dy
        cylinder("Timber practice post", (px, py, 0.85), 0.13, 1.62, palette["wood_mid"], collection, 8, 0.08)
        cube("Practice post crossbar", (px, py, 1.18), (0.88, 0.12, 0.12), palette["wood_lit"], collection, (0, 0, turn))
        cube("Practice post lower brace", (px, py, 0.72), (0.58, 0.10, 0.10), palette["red"], collection, (0, 0, -turn))


def build_forest_and_cliffs(collection: bpy.types.Collection, palette: dict[str, bpy.types.Material], roads: list[list[tuple[float, float]]]) -> None:
    # Chunky stone escarpments form the island boundary and the ravine edges.
    for mx in range(80, 4480, 180):
        if 1980 < mx < 2390:  # leave the main southern gate pass open
            continue
        build_rock_cluster((mx, 80 + RNG.randint(-50, 55)), collection, palette, 0.95, RNG.randint(3, 5))
        build_rock_cluster((mx, 3510 + RNG.randint(-55, 45)), collection, palette, 1.0, RNG.randint(3, 5))
    for my in range(180, 3480, 180):
        build_rock_cluster((70 + RNG.randint(-45, 55), my), collection, palette, 0.95, RNG.randint(3, 5))
        build_rock_cluster((4410 + RNG.randint(-55, 40), my), collection, palette, 1.0, RNG.randint(3, 5))
    # Cliff walls around the waterfall and river bends.
    for mx, my, scale in ((3740, 250, 1.1), (3710, 500, 1.1), (3650, 720, 0.9),
                          (3530, 1030, 0.85), (3240, 1170, 0.9), (3050, 1150, 0.85),
                          (3820, 1410, 1.0), (3910, 1610, 1.0)):
        build_rock_cluster((mx, my), collection, palette, scale, 5)

    # Deterministic maple, pine, and evergreen stands, excluding roads, buildings, fields and plaza.
    exclusion = [(1750, 100, 2250, 760), (2230, 170, 2760, 770),
                 # Keep actual building footprints and their doors clear. The
                 # previous broad rectangles erased whole belts of source-map
                 # foliage around the pharmacy, stall, inn and spawn.
                 (3000, 2160, 3240, 2450), (3790, 2550, 4150, 2900),
                 (2960, 2600, 3260, 2850), (500, 1180, 1870, 1880),
                 (3190, 1190, 4060, 1900), (1950, 2580, 2370, 2860),
                 # The opening trail and its first lantern are a deliberate clear spawn.
                 (2540, 2390, 2840, 2690)]
    if AUTUMN_MAPLE_GAME_READY.is_file():
        mx, my = AUTUMN_MAPLE_ANCHOR
        exclusion.append((mx - 190, my - 190, mx + 190, my + 190))
    made = 0
    attempts = 0
    while made < 125 and attempts < 3200:
        attempts += 1
        mx, my = RNG.randint(120, 4360), RNG.randint(120, 3460)
        if any(x0 <= mx <= x1 and y0 <= my <= y1 for x0, y0, x1, y1 in exclusion):
            continue
        # Pixel-space buffer maps to about one meter at the current 1.6 world
        # spread. The old 225px margin became a wide, empty moat around roads.
        if min(point_distance((mx, my), road) for road in _ROAD_PIXEL_PATHS) < 125:
            continue
        # Keep woods weighted toward map edges and ravines while allowing some
        # source-like clusters to frame the village paths.
        if not (mx < 1850 or mx > 3650 or my < 900 or my > 3000 or RNG.random() < 0.38):
            continue
        style = 2 if made % 5 == 0 else 1 if made % 4 == 0 else 3 if made % 7 == 0 else 0
        build_tree((mx, my), collection, palette, style, RNG.uniform(0.78, 1.28))
        made += 1
    # Individual small grass and flower clusters fill the forest floor.
    for _ in range(240):
        mx, my = RNG.randint(100, 4380), RNG.randint(100, 3480)
        if min(point_distance((mx, my), road) for road in _ROAD_PIXEL_PATHS) < 85:
            continue
        if any(x0 <= mx <= x1 and y0 <= my <= y1 for x0, y0, x1, y1 in exclusion):
            continue
        x, y = pixel_to_world(mx, my)
        for j in range(3):
            ox, oy = RNG.uniform(-0.16, 0.16), RNG.uniform(-0.16, 0.16)
            ico("Wild ground cover", (x + ox, y + oy, 0.12), (0.12, 0.12, 0.10), palette[RNG.choice(("moss", "leaf_lit", "red", "crop"))], collection)


def point_distance(point: tuple[float, float], path: list[tuple[float, float]]) -> float:
    px, py = point
    best = float("inf")
    for (ax, ay), (bx, by) in zip(path, path[1:]):
        vx, vy = bx - ax, by - ay
        denom = vx * vx + vy * vy
        t = 0 if denom == 0 else max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / denom))
        best = min(best, math.hypot(px - (ax + vx * t), py - (ay + vy * t)))
    return best


_ROAD_PIXEL_PATHS = [
    [(2040, 2700), (2250, 2530), (2490, 2490), (2700, 2520), (2910, 2630), (3090, 2710), (3440, 2680), (3970, 2730)],
    [(2700, 2520), (2860, 2410), (3050, 2335), (3110, 2300), (3470, 2390)],
    [(2040, 700), (1970, 900), (1810, 1110), (1900, 1320), (2180, 1510), (2350, 1750), (2390, 1980), (2240, 2220), (2040, 2500)],
    [(640, 1500), (950, 1470), (1280, 1530), (1510, 1700), (1770, 1770), (2060, 1680), (2350, 1750)],
    [(2630, 1760), (2920, 1580), (3180, 1310), (3380, 930), (3630, 800)],
    [(3380, 930), (3560, 1160), (3740, 1450), (3480, 1730), (3290, 1900), (3140, 2110), (3110, 2300)],
    [(2040, 2700), (1880, 2940), (1650, 3180), (1370, 3450)],
]


def build_water(collection: bpy.types.Collection, palette: dict[str, bpy.types.Material]) -> None:
    river = [(3720, 40), (3770, 300), (3690, 580), (3650, 820), (3500, 950), (3380, 930), (3260, 1020), (3160, 1240), (3000, 1330)]
    ribbon("Mountain stream", river, 2.3, 0.10, palette["water"], collection)
    # Narrow pale ribbons create tiered cascades over solid stone ledges.
    for mx, my, width, height in ((3745, 390, 0.9, 2.0), (3280, 1160, 0.65, 1.05)):
        x, y = pixel_to_world(mx, my)
        cube("Waterfall sheer", (x, y, height * 0.52), (width, 0.12, height), palette["water_lit"], collection)
        for row in range(5):
            cube("Waterfall ledge", (x, y - 0.08, height * (0.20 + row * 0.14)), (width * 1.25, 0.24, 0.10), palette["water"], collection)
    for i in range(46):
        mx = RNG.randint(2960, 3800)
        my = RNG.randint(160, 1360)
        if point_distance((mx, my), river) < 130:
            x, y = pixel_to_world(mx, my)
            ico("River foam", (x, y, 0.19), (RNG.uniform(0.05, 0.16), 0.06, 0.025), palette["water_lit"], collection)


def build_temple(pixel: tuple[float, float], collection: bpy.types.Collection,
                 palette: dict[str, bpy.types.Material], name: str = "Cangshan monastery") -> None:
    x, y = pixel_to_world(*pixel)
    cube(name + " lower terrace", (x, y, 0.23), (7.0, 5.6, 0.46), palette["rock_mid"], collection)
    cube(name + " upper step", (x, y - 0.02, 0.52), (6.1, 4.8, 0.22), palette["rock_lit"], collection)
    cube(name + " hall walls", (x, y, 1.95), (5.4, 3.8, 2.65), palette["wood"], collection)
    # Raised timber bays and recessed paper panels.
    for side in (-1, 1):
        cube(name + " front column", (x + side * 2.35, y + 1.96, 1.94), (0.30, 0.33, 2.62), palette["red"], collection)
        cube(name + " stone column foot", (x + side * 2.35, y + 1.96, 0.78), (0.54, 0.54, 0.30), palette["rock_lit"], collection)
        for wx in (-1.25, 1.25):
            cube(name + " lattice window", (x + wx, y + 1.96, 2.15), (0.80, 0.16, 1.05), palette["paper"], collection)
            for dx in (-0.24, 0, 0.24):
                cube(name + " window bar", (x + wx + dx, y + 1.84, 2.15), (0.07, 0.09, 1.12), palette["wood_lit"], collection)
    cube(name + " entrance", (x, y + 1.99, 1.45), (1.20, 0.14, 1.55), palette["charcoal"], collection)
    cube(name + " double doors", (x, y + 2.11, 1.45), (1.02, 0.10, 1.42), palette["wood_mid"], collection)
    cube(name + " front beam", (x, y + 1.92, 3.24), (6.2, 0.45, 0.30), palette["wood_lit"], collection)
    blocky_roof(name + " lower roof", (x, y), 6.2, 4.8, 3.42, 1.05, palette, collection, 1)
    # Two-level pagoda roof and finial.
    cube(name + " upper sanctum", (x, y - 0.34, 4.65), (2.7, 2.3, 1.25), palette["wood_mid"], collection)
    blocky_roof(name + " upper pagoda roof", (x, y - 0.34), 3.5, 2.8, 5.34, 0.74, palette, collection, 1)
    cylinder(name + " roof finial", (x, y - 0.34, 6.46), 0.12, 0.62, palette["gold"], collection, 8, 0.035)
    # Stair run climbs from the trail to the raised terrace.
    for i in range(9):
        sy = y + 4.35 + i * 0.42
        cube(name + " stone stair", (x, sy, 0.12 + i * 0.045), (2.3, 0.54, 0.24 + i * 0.02), palette["rock_lit" if i % 3 == 0 else "rock_mid"], collection)


def build_pavilion(pixel: tuple[float, float], collection: bpy.types.Collection,
                   palette: dict[str, bpy.types.Material]) -> None:
    x, y = pixel_to_world(*pixel)
    cube("Wayside shrine foundation", (x, y, 0.22), (3.1, 2.5, 0.42), palette["rock_mid"], collection)
    for dx in (-1.12, 1.12):
        for dy in (-0.82, 0.82):
            cylinder("Shrine pavilion column", (x + dx, y + dy, 1.32), 0.13, 2.05, palette["red"], collection, 8, 0.10)
    cube("Shrine offering table", (x, y + 0.45, 0.82), (1.5, 0.65, 0.18), palette["wood_lit"], collection)
    cube("Shrine drum roof", (x, y, 2.50), (3.65, 3.05, 0.22), palette["roof"], collection, (math.radians(-8), 0, 0))
    blocky_roof("Shrine eaves", (x, y), 3.4, 2.8, 2.55, 0.42, palette, collection, 1)


def path_stones(paths: list[list[tuple[float, float]]], collection: bpy.types.Collection,
                palette: dict[str, bpy.types.Material]) -> None:
    for path in paths:
        for idx in range(1, len(path) - 1, 5):
            x, y = path[idx]
            px, py = x + RNG.choice((-0.9, 0.9)), y + RNG.uniform(-0.30, 0.30)
            cube("Roadside paving stone", (px, py, 0.11), (0.28, 0.19, 0.09), palette["rock_mid"], collection, (0, 0, RNG.uniform(-0.3, 0.3)))


def build_landmarks(collections: dict[str, bpy.types.Collection], palette: dict[str, bpy.types.Material], roads: list[list[tuple[float, float]]]) -> None:
    arch, props, water = collections["Architecture"], collections["Props"], collections["Roads_Water"]
    build_temple((2040, 460), arch, palette)
    build_pavilion((580, 1170), arch, palette)
    build_pavilion((2230, 1320), arch, palette)
    # A standalone GLB can be replaced without rebuilding any other landmark.
    # Keep the original geometry only as a runnable fallback before generation.
    if not PAIFANG_GAME_READY.is_file():
        build_torii((2040, 2700), arch, palette)
    build_bridge((3380, 930), arch, palette)
    build_well((1940, 1040), props, palette)
    build_clearing(props, palette)
    build_crops(props, palette)
    if not PHARMACY_GAME_READY.is_file():
        build_house("Hundred Herbs pharmacy", (3110, 2300), 3.45, 2.8, 2.55, palette, arch, "plaster", "百草")
    build_stall((3090, 2710), arch, palette)
    # Three.js loads the authored Hunyuan GLB at its map anchor. Keep a
    # primitive fallback only on machines that have not generated that asset.
    if not INN_GAME_READY.is_file():
        build_house("Yunlai inn", (3970, 2730), 5.1, 3.35, 2.65, palette, arch, "plaster", "客栈")
    build_house("Mountain tea lodge", (2320, 520), 3.4, 2.9, 2.2, palette, arch, "wood_mid", "山茶")
    build_barrel((3470, 2800), props, palette, 0.9)
    build_barrel((3910, 2910), props, palette, 0.8)
    build_crate((3590, 2840), props, palette, 0.9)
    build_crate((2960, 2780), props, palette, 0.85)
    for point, scale in (((2580, 2390), 0.9), ((2160, 2180), 0.9), ((1460, 1120), 1.0),
                         ((3050, 2160), 0.9), ((4090, 2890), 0.85), ((850, 3020), 0.9),
                         ((1820, 1870), 0.8), ((2260, 1770), 0.8)):
        build_lantern(point, props, palette, scale)
    # A small shrine-like supply hut and stepping-stone trail add readable depth in the west forest.
    build_house("Trail keeper shelter", (1040, 2890), 2.25, 1.8, 1.45, palette, arch, "wood_mid")
    for i in range(12):
        px = 1550 + i * 44
        py = 2120 + int(45 * math.sin(i * 0.6))
        x, y = pixel_to_world(px, py)
        cube("Stepping stone", (x, y, 0.13), (0.38, 0.28, 0.13), palette["rock_lit" if i % 3 == 0 else "rock_mid"], water, (0, 0, 0.08 * math.sin(i)))


def point_light(name: str, pixel: tuple[float, float], z: float, color: tuple[float, float, float],
                power: float, collection: bpy.types.Collection) -> None:
    x, y = pixel_to_world(*pixel)
    data = bpy.data.lights.new(name, "POINT")
    data.energy = power
    data.color = color
    data.shadow_soft_size = 1.3
    obj = bpy.data.objects.new(name, data)
    obj.location = (x, y, z)
    collection.objects.link(obj)


def build_inn_room(collection: bpy.types.Collection, palette: dict[str, bpy.types.Material]) -> None:
    """A fully modeled interior; the room illustration is not a floor texture."""
    """Build real room geometry in the same coordinates as roomPoint()."""
    floor_w, floor_d, floor_z = 12.4, 7.55, 0.18

    def room_pixel(px: float, py: float) -> tuple[float, float]:
        # roomPoint() maps the 1280x768 illustration into Three X/Z; Blender Y
        # has the opposite sign because GLTF converts Blender Y to Three -Z.
        return (6.4 - px / 100.0, py / 100.0 - 3.84)

    def fixture(name: str, px: float, py: float, size: tuple[float, float, float], z: float,
                mat: bpy.types.Material, rotation: float = 0) -> tuple[float, float]:
        x, y = room_pixel(px, py)
        cube(name, (x, y, z), size, mat, collection, (0, 0, rotation))
        return x, y

    cube("Inn interior stone plinth", (0, 0, 0.02), (floor_w + 0.45, floor_d + 0.45, 0.30), palette["rock_mid"], collection)
    cube("Inn interior wooden floor", (0, 0, floor_z), (floor_w, floor_d, 0.14), palette["wood"], collection)
    for i in range(33):
        x = -floor_w * 0.48 + i * floor_w * 0.03
        cube("Inn floor plank seam", (x, 0, floor_z + 0.08), (0.035, floor_d - 0.12, 0.025), palette["wood_lit" if i % 4 == 0 else "wood_mid"], collection)
    for row in range(11):
        y = -floor_d * 0.45 + row * floor_d * 0.09
        cube("Inn floor cross seam", (0, y, floor_z + 0.075), (floor_w - 0.12, 0.025, 0.018), palette["wood"], collection)

    wall_h = 3.65
    # Solid back and side walls with timber bays; the entrance side is open.
    for side in (-1, 1):
        x = side * 6.15
        cube("Inn side wall", (x, -0.05, floor_z + wall_h / 2), (0.22, floor_d, wall_h), palette["plaster"], collection)
        for i in range(6):
            y = -3.05 + i * 1.18
            cube("Inn side timber post", (x + side * 0.14, y, floor_z + wall_h / 2), (0.12, 0.12, wall_h), palette["wood_mid"], collection)
    cube("Inn rear wall", (0, -3.72, floor_z + wall_h / 2), (12.35, 0.24, wall_h), palette["plaster"], collection)
    cube("Rear wall lower rail", (0, -3.55, 0.48), (12.3, 0.18, 0.22), palette["wood_mid"], collection)
    cube("Rear wall upper rail", (0, -3.55, 3.55), (12.3, 0.18, 0.24), palette["wood_mid"], collection)
    for i in range(13):
        x = -5.75 + i * 0.96
        cube("Rear wall timber", (x, -3.55, 1.98), (0.13, 0.14, 3.55), palette["wood_mid"], collection)

    # Bed and bedside cabinet align with the image's upper-left sleeping area.
    bx, by = room_pixel(257, 213)
    cube("Wooden bed frame", (bx, by, 0.48), (1.78, 1.88, 0.55), palette["wood_mid"], collection)
    cube("Bed mattress", (bx, by, 0.80), (1.62, 1.70, 0.16), palette["paper"], collection)
    cube("Indigo quilt", (bx, by + 0.18, 0.91), (1.53, 1.05, 0.08), palette["roof_mid"], collection)
    cube("Bed pillow", (bx, by - 0.57, 0.92), (1.28, 0.46, 0.11), palette["paper"], collection)
    cube("Bed headboard", (bx, by - 0.94, 0.98), (1.88, 0.13, 1.12), palette["wood"], collection)
    for i in range(4):
        cube("Quilt stitch", (bx - 0.54 + i * 0.36, by + 0.18, 0.96), (0.035, 0.92, 0.022), palette["gold"], collection)
    sx, sy = room_pixel(400, 73)
    cube("Bedside cabinet", (sx, sy, 0.51), (0.98, 0.82, 0.82), palette["wood"], collection)
    cube("Bedside cabinet top", (sx, sy, 0.96), (1.08, 0.90, 0.12), palette["wood_lit"], collection)
    cube("Bedside lantern base", (sx, sy, 1.12), (0.34, 0.34, 0.10), palette["rock_mid"], collection)
    cube("Bedside lantern glow", (sx, sy, 1.34), (0.22, 0.22, 0.34), palette["gold"], collection)
    cube("Bedside lantern canopy", (sx, sy, 1.54), (0.42, 0.40, 0.11), palette["roof"], collection)

    # Medicine cabinet: deep carcass, shelves, drawer fronts and individual jars.
    cx, cy = room_pixel(1093, 112)
    cube("Medicine cabinet carcass", (cx, cy, 1.58), (2.45, 1.48, 2.65), palette["wood"], collection)
    cube("Medicine cabinet back", (cx, cy - 0.77, 1.62), (2.30, 0.12, 2.52), palette["wood_mid"], collection)
    for shelf_z in (0.78, 1.48, 2.18, 2.85):
        cube("Cabinet shelf", (cx, cy + 0.02, shelf_z), (2.35, 1.42, 0.12), palette["wood_lit"], collection)
    for row, shelf_z in enumerate((1.00, 1.70, 2.39)):
        for col in range(5):
            bx2 = cx - 0.89 + col * 0.44
            color = ("jade", "crop", "paper", "red", "water_lit")[(col + row) % 5]
            cylinder("Medicine jar", (bx2, cy + 0.33, shelf_z), 0.13, 0.30 + (col % 2) * 0.08, palette[color], collection, 8, 0.085)
            cylinder("Medicine jar stopper", (bx2, cy + 0.33, shelf_z + 0.20), 0.08, 0.07, palette["wood_lit"], collection, 8)
    for drawer_z in (0.72, 1.16, 1.60, 2.04):
        for dx in (-0.56, 0.56):
            cube("Cabinet drawer face", (cx + dx, cy + 0.79, drawer_z), (0.98, 0.10, 0.34), palette["wood_mid"], collection)
            cylinder("Cabinet brass pull", (cx + dx, cy + 0.87, drawer_z), 0.045, 0.06, palette["gold"], collection, 8)

    # The writing desk is placed at the source artwork's lower-right clue point.
    tx, ty = room_pixel(1077, 480)
    cube("Writing desk top", (tx, ty, 1.06), (2.88, 1.32, 0.18), palette["wood_lit"], collection)
    for dx in (-1.23, 1.23):
        for dy in (-0.52, 0.52):
            cube("Writing desk leg", (tx + dx, ty + dy, 0.57), (0.14, 0.15, 0.98), palette["wood"], collection)
    cube("Open paper ledger", (tx - 0.10, ty, 1.19), (0.96, 0.78, 0.05), palette["paper"], collection, (0, 0, -0.07))
    for i in range(5):
        cube("Ledger ink line", (tx - 0.10, ty - 0.25 + i * 0.11, 1.225), (0.62, 0.018, 0.012), palette["wood_mid"], collection)
    cylinder("Ink bottle", (tx + 0.91, ty - 0.12, 1.34), 0.13, 0.32, palette["charcoal"], collection, 8, 0.085)
    cube("Oil lamp base", (tx + 1.02, ty + 0.42, 1.21), (0.32, 0.30, 0.16), palette["wood"], collection)
    ico("Oil lamp glow", (tx + 1.02, ty + 0.42, 1.40), (0.10, 0.10, 0.16), palette["gold"], collection)
    # The clue chest is centered on the existing search interaction.
    chest_x, chest_y = room_pixel(1120, 620)
    cube("Red lacquer clue chest", (chest_x, chest_y, 0.48), (1.95, 1.18, 0.72), palette["red"], collection)
    cube("Chest lid", (chest_x, chest_y, 0.89), (2.04, 1.24, 0.18), palette["red_lit"], collection)
    for side in (-1, 1):
        cube("Chest brass strap", (chest_x + side * 0.57, chest_y + 0.60, 0.56), (0.08, 0.08, 0.76), palette["gold"], collection)
    cube("Chest brass lock", (chest_x, chest_y + 0.67, 0.67), (0.22, 0.09, 0.29), palette["gold"], collection)

    # Tea table, cups and stools occupy the open center of the room.
    tx, ty = room_pixel(644, 360)
    cube("Tea table top", (tx, ty, 0.83), (1.92, 1.16, 0.16), palette["wood_lit"], collection)
    cube("Tea table apron", (tx, ty, 0.69), (1.72, 0.96, 0.16), palette["wood_mid"], collection)
    for dx in (-0.70, 0.70):
        for dy in (-0.39, 0.39):
            cube("Tea table leg", (tx + dx, ty + dy, 0.39), (0.12, 0.13, 0.64), palette["wood"], collection)
    cylinder("Tea pot body", (tx, ty, 1.04), 0.25, 0.30, palette["rock_mid"], collection, 10, 0.17)
    cylinder("Tea pot lid", (tx, ty, 1.22), 0.12, 0.06, palette["gold"], collection, 10)
    for dx, dy in ((-0.58, -0.18), (0.58, -0.18), (-0.58, 0.24), (0.58, 0.24)):
        cylinder("Tea cup", (tx + dx, ty + dy, 0.99), 0.09, 0.12, palette["paper"], collection, 8, 0.07)
    for px in (515, 773):
        stool_x, stool_y = room_pixel(px, 375)
        cube("Tea stool seat", (stool_x, stool_y, 0.48), (0.68, 0.60, 0.14), palette["wood_mid"], collection)
        for dx in (-0.23, 0.23):
            for dy in (-0.19, 0.19):
                cube("Tea stool leg", (stool_x + dx, stool_y + dy, 0.24), (0.08, 0.08, 0.43), palette["wood"], collection)

    # A freestanding folding screen and ceramic jar recreate the left foreground.
    sx, sy = room_pixel(225, 590)
    for i in range(4):
        x = sx + (i - 1.5) * 0.68
        angle = (i - 1.5) * -0.07
        cube("Folding screen frame", (x, sy, 1.15), (0.64, 0.14, 2.05), palette["wood_mid"], collection, (0, 0, angle))
        cube("Folding screen paper", (x, sy + 0.09, 1.15), (0.48, 0.06, 1.77), palette["paper"], collection, (0, 0, angle))
        for z in (0.20, 2.10):
            cube("Screen cross rail", (x, sy + 0.14, z), (0.62, 0.08, 0.08), palette["wood_lit"], collection)
    jar_x, jar_y = room_pixel(135, 665)
    cylinder("Large ceramic storage jar", (jar_x, jar_y, 0.52), 0.48, 0.95, palette["red"], collection, 12, 0.27)
    cylinder("Storage jar mouth", (jar_x, jar_y, 1.03), 0.28, 0.08, palette["wood_mid"], collection, 12)


def join_collection(collection: bpy.types.Collection) -> None:
    meshes = [obj for obj in collection.objects if obj.type == "MESH"]
    if len(meshes) < 2:
        return
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    meshes[0].name = collection.name + " 3D Mesh"


def setup_scene(collections: dict[str, bpy.types.Collection], palette: dict[str, bpy.types.Material]) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 8
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 864
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new("Cangshan dusk world")
    scene.world.color = (0.17, 0.17, 0.17)
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    data = bpy.data.lights.new("Soft moonlit key", "AREA")
    data.energy = 4500
    data.shape = "DISK"
    data.size = 18
    key = bpy.data.objects.new("Soft moonlit key", data)
    key.location = (-8, 4, 29)
    collections["Props"].objects.link(key)
    data = bpy.data.lights.new("Warm village fill", "AREA")
    data.energy = 2100
    data.color = (1.0, 0.69, 0.40)
    data.size = 12
    fill = bpy.data.objects.new("Warm village fill", data)
    fill.location = (15, 20, 14)
    collections["Props"].objects.link(fill)
    point_light("Lantern pool market", (2580, 2390), 1.5, (1, 0.58, 0.24), 45, collections["Props"])
    point_light("Lantern pool temple", (1460, 1120), 1.5, (1, 0.58, 0.24), 35, collections["Props"])

    camera_data = bpy.data.cameras.new("Full 3D world review camera")
    camera = bpy.data.objects.new("Full 3D world review camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0, 43, 43)
    target = Vector((0, 0, 0))
    direction = target - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 56 * LAYOUT_SPREAD
    scene.camera = camera


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    collections = reset_scene()
    palette = make_palette()
    ground_mesh(collections["Terrain"], palette)
    roads = road_network(collections["Roads_Water"], palette)
    build_water(collections["Roads_Water"], palette)
    path_stones(roads, collections["Props"], palette)
    build_landmarks(collections, palette, roads)
    build_forest_and_cliffs(collections["Nature"], palette, roads)
    build_inn_room(collections["InnInterior"], palette)
    setup_scene(collections, palette)
    # Join each authored layer into a compact, still-editable GLB mesh chunk.
    for name in COLLECTION_NAMES:
        join_collection(collections[name])
    scene = bpy.context.scene
    scene.render.filepath = str(PREVIEW_PATH)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    for obj in collections["InnInterior"].objects:
        obj.hide_render = True
    bpy.ops.render.render(write_still=True)
    for obj in collections["InnInterior"].objects:
        obj.hide_render = False

    # Exterior and interior stay as separate editable GLBs so entering the inn
    # swaps to its own modeled room instead of rendering it over the outdoor map.
    bpy.ops.object.select_all(action="DESELECT")
    exterior_names = set(COLLECTION_NAMES) - {"InnInterior"}
    for obj in bpy.context.scene.objects:
        if any(collection.name in exterior_names for collection in obj.users_collection):
            obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(GLB_PATH), export_format="GLB", use_selection=True,
                              export_apply=True, export_materials="EXPORT", export_cameras=False,
                              export_lights=False, export_animations=False)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collections["InnInterior"].objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(INTERIOR_GLB_PATH), export_format="GLB", use_selection=True,
                              export_apply=True, export_materials="EXPORT", export_cameras=False,
                              export_lights=False, export_animations=False)
    print(f"Built original Cangshan 3D environment: {GLB_PATH}")
    print(f"Built modeled inn interior: {INTERIOR_GLB_PATH}")
    print(f"Preview: {PREVIEW_PATH}")


if __name__ == "__main__":
    main()
