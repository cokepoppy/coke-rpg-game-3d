"""Build a trousers silhouette for Shen Linchuan from the existing Hunyuan mesh.

The ImageGen concept at assets/generated/hunyuan-references/shen-linchuan-pants-reference.png
is the clothing reference. This preserves the face, hair, and upper-body texture of
the already generated Hunyuan GLB, trims its robe at the hip, and authors separate
animated trousers and boots in Blender. It does not claim a second Hunyuan run.

Run: blender -b --python tools/package_wuxia_pants_character.py
"""

from pathlib import Path
import bpy
import bmesh
from mathutils import Euler, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/generated/threejs-wuxia/source/shen-linchuan.glb"
OUT = ROOT / "assets/generated/threejs-wuxia/models"
BLEND = OUT / "shen-linchuan-pants-blender.blend"
GLB = OUT / "shen-linchuan-pants-game-ready.glb"
PREVIEW = OUT / "shen-linchuan-pants-preview.png"
CROP_Z = 0.79

GAIT_AXES = {
    # The arms extend across X, so swing them around the lateral X axis. Using
    # global Z here made the mirrored shoulder bones move both hands together.
    "upper_arm.L": Vector((1, 0, 0)), "upper_arm.R": Vector((1, 0, 0)),
    "forearm.L": Vector((1, 0, 0)), "forearm.R": Vector((1, 0, 0)),
    "thigh.L": Vector((1, 0, 0)), "thigh.R": Vector((1, 0, 0)),
    "shin.L": Vector((1, 0, 0)), "shin.R": Vector((1, 0, 0)),
    "foot.L": Vector((1, 0, 0)), "foot.R": Vector((1, 0, 0)),
    "spine": Vector((1, 0, 0)), "head": Vector((1, 0, 0)),
}


def bone_spec():
    return {
        "root": ((0, 0, 0.0), (0, 0, 0.74), None),
        "pelvis": ((0, 0, 0.74), (0, 0, 0.91), "root"),
        "spine": ((0, 0, 0.84), (0, 0, 1.22), "pelvis"),
        "chest": ((0, 0, 1.19), (0, 0, 1.43), "spine"),
        "neck": ((0, 0, 1.40), (0, 0, 1.52), "chest"),
        "head": ((0, 0, 1.50), (0, 0, 1.70), "neck"),
        "upper_arm.L": ((0.16, 0, 1.39), (0.40, 0, 1.30), "chest"),
        "forearm.L": ((0.40, 0, 1.30), (0.50, 0, 1.06), "upper_arm.L"),
        "hand.L": ((0.50, 0, 1.06), (0.51, -0.02, 0.99), "forearm.L"),
        "upper_arm.R": ((-0.16, 0, 1.39), (-0.40, 0, 1.30), "chest"),
        "forearm.R": ((-0.40, 0, 1.30), (-0.50, 0, 1.06), "upper_arm.R"),
        "hand.R": ((-0.50, 0, 1.06), (-0.51, -0.02, 0.99), "forearm.R"),
        "thigh.L": ((0.11, 0, 0.83), (0.12, 0, 0.43), "pelvis"),
        "shin.L": ((0.12, 0, 0.43), (0.12, 0, 0.10), "thigh.L"),
        "foot.L": ((0.12, 0, 0.10), (0.12, -0.19, 0.055), "shin.L"),
        "thigh.R": ((-0.11, 0, 0.83), (-0.12, 0, 0.43), "pelvis"),
        "shin.R": ((-0.12, 0, 0.43), (-0.12, 0, 0.10), "thigh.R"),
        "foot.R": ((-0.12, 0, 0.10), (-0.12, -0.19, 0.055), "shin.R"),
    }


def create_rig():
    data = bpy.data.armatures.new("Shen_Linchuan_Pants_Rig")
    rig = bpy.data.objects.new("Shen_Linchuan_Pants_Rig", data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    spec = bone_spec()
    for name, (head, tail, parent_name) in spec.items():
        bone = data.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent_name:
            bone.parent = data.edit_bones[parent_name]
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.show_in_front = True
    return rig, spec


def assign_mesh_weights(mesh, spec):
    groups = {name: mesh.vertex_groups.get(name) or mesh.vertex_groups.new(name=name)
              for name in spec}
    for vertex in mesh.data.vertices:
        x, y, z = vertex.co
        side = "L" if x >= 0 else "R"
        ax = abs(x)
        if z > 1.51:
            weights = [("head", 1.0)]
        elif ax > 0.24 and 0.78 < z < 1.49:
            if z < 0.91:
                weights = [(f"hand.{side}", 0.34), (f"forearm.{side}", 0.52),
                           (f"upper_arm.{side}", 0.14)]
            elif z < 1.12 and ax > 0.28:
                weights = [(f"forearm.{side}", 0.58), (f"hand.{side}", 0.27),
                           (f"upper_arm.{side}", 0.15)]
            elif z < 1.31:
                weights = [(f"forearm.{side}", 0.62), (f"upper_arm.{side}", 0.23), ("chest", 0.15)]
            else:
                weights = [(f"upper_arm.{side}", 0.74), ("chest", 0.26)]
        elif z < 0.36:
            center = 0.15 if x >= 0 else -0.15
            amount = max(0.0, min(0.78, (0.12 - abs(x - center)) / 0.06 * 0.78))
            amount *= max(0.0, min(1.0, (0.43 - abs(y)) / 0.12))
            if z < 0.13:
                weights = [(f"foot.{side}", amount * 0.62), (f"shin.{side}", amount * 0.38), ("pelvis", 1 - amount)]
            elif z < 0.27:
                weights = [(f"shin.{side}", amount * 0.72), ("pelvis", 1 - amount * 0.72)]
            else:
                weights = [("pelvis", 1.0)]
        elif z > 1.40:
            weights = [("neck", 0.35), ("chest", 0.65)]
        else:
            weights = [("spine" if z < 1.19 else "chest", 0.82),
                       ("pelvis" if z < 0.92 else "neck", 0.18)]
        for name, weight in weights:
            if weight > 0.002:
                groups[name].add([vertex.index], weight, "REPLACE")


def add_armature(mesh, rig):
    mesh.parent = rig
    modifier = mesh.modifiers.new("Shen_Linchuan_Skin", "ARMATURE")
    modifier.object = rig
    modifier.use_vertex_groups = True


def assign_trouser_weights(mesh, side):
    thigh = mesh.vertex_groups.new(name=f"thigh.{side}")
    shin = mesh.vertex_groups.new(name=f"shin.{side}")
    pelvis = mesh.vertex_groups.new(name="pelvis")
    for vertex in mesh.data.vertices:
        z = vertex.co.z
        if z >= 0.78:
            pelvis.add([vertex.index], 0.35, "REPLACE")
            thigh.add([vertex.index], 0.65, "REPLACE")
        elif z >= 0.48:
            thigh.add([vertex.index], 1.0, "REPLACE")
        elif z >= 0.36:
            blend = (z - 0.36) / 0.12
            thigh.add([vertex.index], blend, "REPLACE")
            shin.add([vertex.index], 1.0 - blend, "REPLACE")
        else:
            shin.add([vertex.index], 1.0, "REPLACE")


def material(name, color, roughness=0.76, metallic=0.0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1.0)
    result.use_nodes = True
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return result


FABRIC = LEATHER = EDGE = IVORY = JADE = None


def create_clothing_materials():
    global FABRIC, LEATHER, EDGE, IVORY, JADE
    FABRIC = material("Pants | slate-indigo woven cloth", (0.025, 0.043, 0.075))
    LEATHER = material("Boots | dark umber leather", (0.045, 0.030, 0.021), 0.53)
    EDGE = material("Trouser seams | warm thread", (0.22, 0.15, 0.09), 0.7)
    IVORY = material("Jacket ties | ivory", (0.79, 0.72, 0.58))
    JADE = material("Jade pendant", (0.19, 0.49, 0.39), 0.27, 0.13)


def make_tube(name, side, rings, mat):
    verts, faces = [], []
    steps = 16
    for z, center_x, rx, ry in rings:
        for i in range(steps):
            angle = i * 2 * 3.141592653589793 / steps
            verts.append((center_x + rx * __import__("math").cos(angle),
                          ry * __import__("math").sin(angle), z))
    for ring in range(len(rings) - 1):
        for i in range(steps):
            a = ring * steps + i
            b = ring * steps + (i + 1) % steps
            faces.append((a, b, b + steps, a + steps))
    faces.append(tuple(reversed(range(steps))))
    faces.append(tuple((len(rings) - 1) * steps + i for i in range(steps)))
    mesh_data = bpy.data.meshes.new(name)
    mesh_data.from_pydata(verts, [], faces)
    mesh_data.materials.append(mat)
    mesh_data.update()
    obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(obj)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    assign_trouser_weights(obj, side)
    return obj


def make_ellipsoid(name, location, scale, mat, bone_name=None, rig=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    if rig and bone_name:
        group = obj.vertex_groups.new(name=bone_name)
        group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
        add_armature(obj, rig)
    return obj


def make_clothes(rig):
    clothes = []
    for side, sign in (("L", 1), ("R", -1)):
        x = lambda a: sign * a
        clothes.append(make_tube(f"Trousers {side}", side, [
            # Keep the trouser diameter below 36% of the 0.40 m thigh bone;
            # the previous 0.196 m maximum looked like two padded columns.
            (0.15, x(0.12), 0.052, 0.060),
            (0.24, x(0.12), 0.056, 0.064),
            (0.34, x(0.12), 0.060, 0.068),
            (0.43, x(0.12), 0.063, 0.072),
            (0.53, x(0.12), 0.066, 0.076),
            (0.64, x(0.12), 0.069, 0.079),
            (0.75, x(0.115), 0.071, 0.082),
            (0.84, x(0.11), 0.069, 0.080),
        ], FABRIC))
        boots = make_tube(f"Boot shaft {side}", side, [
            (0.07, x(0.12), 0.054, 0.057), (0.11, x(0.12), 0.060, 0.061),
            (0.20, x(0.12), 0.058, 0.058), (0.28, x(0.12), 0.057, 0.056),
        ], LEATHER)
        boots.name = f"Boot shaft {side}"
        clothes.append(boots)
        foot = make_ellipsoid(f"Boot foot {side}", (x(0.12), -0.055, 0.045), (0.056, 0.118, 0.045), LEATHER)
        foot_group = foot.vertex_groups.new(name=f"foot.{side}")
        foot_group.add(list(range(len(foot.data.vertices))), 1.0, "REPLACE")
        add_armature(foot, rig)
        clothes.append(foot)

        # A restrained cuff line makes the boot/trouser separation readable in motion.
        cuff = make_tube(f"Boot cuff {side}", side, [
            (0.245, x(0.12), 0.061, 0.059), (0.275, x(0.12), 0.061, 0.059),
        ], EDGE)
        clothes.append(cuff)

    for obj in clothes:
        if obj.type == "MESH" and not any(mod.type == "ARMATURE" for mod in obj.modifiers):
            if obj.name.startswith("Trousers"):
                side = "L" if "L" in obj.name else "R"
                assign_trouser_weights(obj, side)
            else:
                group_name = "shin.L" if "L" in obj.name else "shin.R"
                group = obj.vertex_groups.get(group_name) or obj.vertex_groups.new(name=group_name)
                group.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
            add_armature(obj, rig)
    return clothes


def key_pose(rig, name, frames):
    action = bpy.data.actions.new(name)
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame, pose in frames:
        bpy.context.scene.frame_set(frame)
        for bone_name, value in pose.items():
            bone = rig.pose.bones[bone_name]
            if bone_name == "root":
                bone.location = (0, 0, value)
                bone.keyframe_insert(data_path="location", frame=frame, group=bone_name)
            else:
                axis = GAIT_AXES.get(bone_name)
                bone.rotation_mode = "QUATERNION"
                bone.rotation_quaternion = (Quaternion(rig.data.bones[bone_name].matrix_local.to_3x3().inverted() @ axis, value)
                                            if axis else Euler((value, 0, 0), "XYZ").to_quaternion())
                bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone_name)
    slot = rig.animation_data.action_slot
    for curve in action.layers[0].strips[0].channelbag(slot).fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "BEZIER"
            point.handle_left_type = "AUTO_CLAMPED"
            point.handle_right_type = "AUTO_CLAMPED"
        if name in {"Idle", "Walk", "Run"}:
            curve.modifiers.new("CYCLES")
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    return action


def create_actions(rig):
    def pose(root=0, arms=0, legs=0, knees=0, feet=0, spine=0, head=0, forearms=0, arms_both=False):
        result = {"root": root}
        for side, sign in (("L", 1), ("R", -1)):
            # Mirrored shoulders reverse the local rotation response. The
            # negative sign makes each hand swing opposite its same-side foot.
            result[f"upper_arm.{side}"] = arms if arms_both else -arms * sign
            result[f"forearm.{side}"] = forearms
            result[f"thigh.{side}"] = legs * sign
            result[f"shin.{side}"] = knees * (1 if sign < 0 else -1)
            result[f"foot.{side}"] = feet * sign
        result["spine"] = spine
        result["head"] = head
        return result

    key_pose(rig, "Idle", [(1, pose()), (12, pose(0.022, spine=0.018, head=-0.012)), (24, pose())])
    key_pose(rig, "Walk", [
        (1, pose(0.02, arms=0.56, legs=0.57, knees=0.05, feet=-0.09, spine=-0.025, forearms=0.06)),
        (6, pose(0.055, arms=0.22, legs=0.17, knees=-0.26, feet=0.05, spine=0.018)),
        (11, pose(0.02, arms=-0.56, legs=-0.57, knees=-0.52, feet=0.12, spine=-0.025, forearms=0.06)),
        (16, pose(0.055, arms=-0.22, legs=-0.17, knees=-0.18, feet=-0.04, spine=0.018)),
        (21, pose(0.02, arms=0.56, legs=0.57, knees=0.05, feet=-0.09, spine=-0.025, forearms=0.06)),
    ])
    key_pose(rig, "Run", [
        (1, pose(0.04, arms=0.64, legs=0.66, knees=0.18, spine=0.055)),
        (5, pose(0.085, arms=0.24, legs=0.20, knees=-0.32, spine=0.07)),
        (9, pose(0.04, arms=-0.64, legs=-0.66, knees=-0.60, spine=0.055)),
        (13, pose(0.085, arms=-0.24, legs=-0.20, knees=-0.22, spine=0.07)),
        (17, pose(0.04, arms=0.64, legs=0.66, knees=0.18, spine=0.055)),
    ])
    key_pose(rig, "Jump", [
        (1, pose()), (5, pose(0.45, arms=-0.6, legs=0.32, knees=0.2, spine=-0.08, arms_both=True)),
        (10, pose(0.45, arms=-0.6, legs=0.32, knees=0.2, spine=-0.08, arms_both=True)), (16, pose()),
    ])
    key_pose(rig, "Attack", [
        (1, pose(0, arms=-0.22, legs=0.08, spine=-0.04)),
        (5, pose(0.06, arms=0.30, legs=-0.16, spine=0.12)), (9, pose(0, arms=-0.12, spine=-0.06)),
        (14, pose()),
    ])


def scene_preview(mesh):
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, 24
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("Pants hero studio")
    world.color = (0.04, 0.05, 0.07)
    scene.world = world
    target = Vector((0, 0, 0.9))
    camera_data = bpy.data.cameras.new("Pants Preview Camera")
    camera = bpy.data.objects.new("Pants Preview Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (1.65, -4.9, 1.8)
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.35
    scene.camera = camera
    for name, location, power, size in (
        ("Key", (2.8, -3.4, 4.1), 850, 3.0),
        ("Fill", (-3.0, -2.0, 2.0), 520, 2.5),
        ("Rim", (0.4, 2.7, 3.4), 1050, 2.2),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.shape, data.size = power, "DISK", size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
    floor_mat = material("Studio backdrop", (0.065, 0.075, 0.09))
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, 0.0))
    bpy.context.object.name = "Studio floor"
    bpy.context.object.data.materials.append(floor_mat)
    scene.render.image_settings.color_mode = "RGBA"
    scene.camera.data.lens = 55


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing existing Hunyuan source mesh: {SOURCE}")
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    create_clothing_materials()
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Hunyuan source contains no mesh")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    mesh = meshes[0]
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.join()
    mesh.name = "Shen_Linchuan_Hunyuan_Upper_Body"
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    mesh.scale *= 1.75 / max(mesh.dimensions)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mesh.location.x -= (mesh.bound_box[0][0] + mesh.bound_box[6][0]) * 0.5
    mesh.location.y -= (mesh.bound_box[0][1] + mesh.bound_box[6][1]) * 0.5
    bpy.context.view_layer.update()
    low = min((mesh.matrix_world @ Vector(corner)).z for corner in mesh.bound_box)
    mesh.location.z -= low
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
                           plane_co=(0, 0, CROP_Z), plane_no=(0, 0, 1), dist=0.00001,
                           clear_inner=False, clear_outer=False)
    bmesh.ops.delete(bm, geom=[face for face in bm.faces if face.calc_center_median().z < CROP_Z - 0.00001], context="FACES")
    bmesh.ops.delete(bm, geom=[vertex for vertex in bm.verts if not vertex.link_faces], context="VERTS")
    bm.to_mesh(mesh.data)
    bm.free()
    mesh.data.update()

    rig, spec = create_rig()
    assign_mesh_weights(mesh, spec)
    add_armature(mesh, rig)
    clothes = make_clothes(rig)
    create_actions(rig)
    scene_preview(mesh)
    bpy.context.scene.frame_set(1)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    mesh.select_set(True)
    for obj in clothes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(GLB), export_format="GLB", use_selection=True,
                              export_apply=True, export_animations=True, export_nla_strips=True,
                              export_force_sampling=True)
    # Keep every clip in the GLB, but open the editable Blender file and render
    # its preview with a single unblended Walk track for honest motion review.
    for track in rig.animation_data.nla_tracks:
        track.mute = track.name != "Walk"
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    bpy.ops.render.render(write_still=True)
    print(f"PANTS_HERO built from existing Hunyuan mesh; robe crop z={CROP_Z:.2f}")
    print(f"BLEND={BLEND}\nGLB={GLB}\nPREVIEW={PREVIEW}")


main()
