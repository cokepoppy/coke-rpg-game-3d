"""Prepare a Hunyuan image-to-3D wuxia character for Blender and Three.js.

Place downloaded source GLBs at assets/generated/threejs-wuxia/source/<name>.glb,
then run:
  blender -b --python tools/package_wuxia_character.py

The native .blend keeps the editable armature and five named Actions. The
playable GLB carries the same clips through glTF animation export.
"""

from pathlib import Path
from math import acos, atan2, cos, pi, sin
import os
import bpy
from mathutils import Euler, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_PROFILE = os.environ.get("CANGSHAN_CHARACTER_PROFILE", "legacy")
CHARACTER_WEIGHT_MODE = os.environ.get("CANGSHAN_WEIGHT_MODE", "heuristic")
CHARACTER_GAIT_MODE = os.environ.get("CANGSHAN_GAIT_MODE", "ik")
CHARACTER_OUTPUT_SUFFIX = os.environ.get("CANGSHAN_OUTPUT_SUFFIX", "")
CHARACTER_ARM_SWING = float(os.environ.get("CANGSHAN_ARM_SWING", "0.28"))
CHARACTER_FOREARM_BEND = float(os.environ.get("CANGSHAN_FOREARM_BEND", "0.04"))
CHARACTER_FOREARM_FOLLOW = float(os.environ.get("CANGSHAN_FOREARM_FOLLOW", "0.0"))
CHARACTER_STRIDE_HALF = float(os.environ.get("CANGSHAN_STRIDE_HALF", "0.21"))
CHARACTER_SWING_LIFT = float(os.environ.get("CANGSHAN_SWING_LIFT", "0.06"))
CHARACTER_ROOT_BOB_SCALE = float(os.environ.get("CANGSHAN_ROOT_BOB_SCALE", "1.0"))
CHARACTER_CONTACT_COMPRESSION = float(os.environ.get("CANGSHAN_CONTACT_COMPRESSION", "0.0"))
CHARACTER_IK_KNEE_DIRECTION = os.environ.get("CANGSHAN_IK_KNEE_DIRECTION", "backward")
CHARACTER_IK_USE_JOINT_PIVOTS = os.environ.get("CANGSHAN_IK_USE_JOINT_PIVOTS", "0") == "1"
CHARACTER_RIG_DEPTH_OFFSET = float(os.environ.get("CANGSHAN_RIG_DEPTH_OFFSET", "0.0"))
CHARACTER_LOWER_BODY_WIDTH = float(os.environ.get("CANGSHAN_LOWER_BODY_WIDTH", "1.0"))
if not 0.65 <= CHARACTER_LOWER_BODY_WIDTH <= 1.0:
    raise ValueError("CANGSHAN_LOWER_BODY_WIDTH must be between 0.65 and 1.0")
if CHARACTER_PROFILE == "proportion-v2":
    CHARACTERS = (("shen-linchuan-proportion-v2-hunyuan", "沈临川 · 比例修正版"),)
else:
    CHARACTERS = (("shen-linchuan", "沈临川"), ("su-luo", "苏萝"))

# The generated arms point sideways in the rest pose while the legs point down.
# Rotating every bone around Euler X twists some sleeves instead of swinging
# them. Express each intended world-space gait axis in that bone's rest frame.
GAIT_WORLD_AXES = {
    # The torso faces along Y. Shoulder swing must rotate around the lateral X
    # axis; Z is the vertical axis and only spins an arm around the shoulder,
    # leaving the elbows flared out instead of swinging naturally front/back.
    "upper_arm.L": Vector((1, 0, 0)), "upper_arm.R": Vector((1, 0, 0)),
    "forearm.L": Vector((1, 0, 0)), "forearm.R": Vector((1, 0, 0)),
    "thigh.L": Vector((1, 0, 0)), "thigh.R": Vector((1, 0, 0)),
    "shin.L": Vector((1, 0, 0)), "shin.R": Vector((1, 0, 0)),
    "foot.L": Vector((1, 0, 0)), "foot.R": Vector((1, 0, 0)),
    "spine": Vector((1, 0, 0)), "head": Vector((1, 0, 0)),
    "pelvis": Vector((0, 0, 1)), "chest": Vector((0, 0, 1)),
}


def lower_body_lateral_scale(height):
    """Blend lower-limb spacing back to the authored torso width."""
    t = max(0.0, min(1.0, height / 0.98))
    smooth = t * t * (3.0 - 2.0 * t)
    return CHARACTER_LOWER_BODY_WIDTH + (1.0 - CHARACTER_LOWER_BODY_WIDTH) * smooth


def narrow_lower_body(mesh):
    """Correct wide ankle spacing without shrinking the torso or arm silhouette."""
    if CHARACTER_PROFILE != "proportion-v2" or CHARACTER_LOWER_BODY_WIDTH >= 0.999:
        return
    moved = 0
    for vertex in mesh.data.vertices:
        x, _y, z = vertex.co
        if z >= 0.98 or abs(x) > 0.32:
            continue
        vertex.co.x *= lower_body_lateral_scale(z)
        moved += 1
    mesh.data.update()
    print(f"LOWER_BODY stance_scale={CHARACTER_LOWER_BODY_WIDTH:.3f} transformed_vertices={moved}")


def bone_spec(profile="legacy"):
    if profile == "proportion-v2":
        hip_pivot_z = (0.72 if CHARACTER_WEIGHT_MODE == "heuristic-v13" else
                       0.76 if CHARACTER_WEIGHT_MODE in {"heuristic-v11", "heuristic-v12", "heuristic-v15"} else 0.82)
        shoulder_pivot_x = 0.235 if CHARACTER_WEIGHT_MODE == "heuristic-v11" else 0.205
        spec = {
            "root": ((0, 0, 0.0), (0, 0, 0.78), None),
            # v5 put the hip pivots at the belt (z=.98). That let thigh motion
            # drag waist ornaments and the lower torso. Place the pelvis at the
            # trouser/crotch transition, with the leg pivots below the belt.
            "pelvis": ((0, 0, hip_pivot_z), (0, 0, 0.89), "root"),
            "spine": ((0, 0, 0.82), (0, 0, 1.13), "pelvis"),
            "chest": ((0, 0, 1.08), (0, 0, 1.25), "spine"),
            "neck": ((0, 0, 1.23), (0, 0, 1.34), "chest"),
            "head": ((0, 0, 1.29), (0, 0, 1.72), "neck"),
            # Shoulder roots sit at the outer shirt seam; elbows now meet the
            # sleeve cuff instead of cutting diagonally through the torso.
            "upper_arm.L": ((shoulder_pivot_x, 0, 1.16), (0.35, 0, 0.91), "chest"),
            "forearm.L": ((0.34, 0, 0.91), (0.46, 0, 0.70), "upper_arm.L"),
            "hand.L": ((0.46, 0, 0.70), (0.48, -0.11, 0.60), "forearm.L"),
            "upper_arm.R": ((-shoulder_pivot_x, 0, 1.16), (-0.35, 0, 0.91), "chest"),
            "forearm.R": ((-0.34, 0, 0.91), (-0.46, 0, 0.70), "upper_arm.R"),
            "hand.R": ((-0.46, 0, 0.70), (-0.48, -0.11, 0.60), "forearm.R"),
            "thigh.L": ((0.11, 0, hip_pivot_z), (0.14, 0, 0.42), "pelvis"),
            "shin.L": ((0.14, 0, 0.42), (0.14, 0, 0.07), "thigh.L"),
            "foot.L": ((0.14, 0, 0.12), (0.14, -0.24, 0.055), "shin.L"),
            "thigh.R": ((-0.11, 0, hip_pivot_z), (-0.14, 0, 0.42), "pelvis"),
            "shin.R": ((-0.14, 0, 0.42), (-0.14, 0, 0.07), "thigh.R"),
            "foot.R": ((-0.14, 0, 0.12), (-0.14, -0.24, 0.055), "shin.R"),
        }
        if CHARACTER_LOWER_BODY_WIDTH < 0.999:
            for name, (head, tail, parent) in list(spec.items()):
                if not name.startswith(("thigh.", "shin.", "foot.")):
                    continue
                head = (head[0] * lower_body_lateral_scale(head[2]), head[1], head[2])
                tail = (tail[0] * lower_body_lateral_scale(tail[2]), tail[1], tail[2])
                spec[name] = (head, tail, parent)
        if abs(CHARACTER_RIG_DEPTH_OFFSET) > 1e-8:
            # Hunyuan's imported character is not centered on Y=0: its torso,
            # sleeves, and trousers sit forward of that plane. Move every bone
            # pivot onto the mesh depth axis before binding, so rotations do
            # not orbit limbs around a point behind the body.
            for name, (head, tail, parent) in list(spec.items()):
                head = (head[0], head[1] + CHARACTER_RIG_DEPTH_OFFSET, head[2])
                tail = (tail[0], tail[1] + CHARACTER_RIG_DEPTH_OFFSET, tail[2])
                spec[name] = (head, tail, parent)
        return spec
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


def create_rig(mesh, profile="legacy"):
    data = bpy.data.armatures.new("Wuxia_Humanoid_Skeleton")
    rig = bpy.data.objects.new("Wuxia_Humanoid_Rig", data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    spec = bone_spec(profile)
    for name, (head, tail, parent_name) in spec.items():
        bone = data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent_name:
            bone.parent = data.edit_bones[parent_name]
            bone.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.show_in_front = True

    # Hunyuan's dense triangulated surface frequently defeats Blender heat weights.
    # Assign predictable groups directly and explicitly attach the deform modifier;
    # parent_set can return without creating an exportable skin after that warning.
    for group in list(mesh.vertex_groups):
        mesh.vertex_groups.remove(group)
    if CHARACTER_WEIGHT_MODE == "component-rigid":
        component_rigid_weights(mesh, spec)
    elif CHARACTER_WEIGHT_MODE in {"heuristic", "heuristic-v9", "heuristic-v11", "heuristic-v12", "heuristic-v13", "heuristic-v15"}:
        manual_weights(mesh, spec, profile)
    else:
        raise ValueError(f"Unsupported CANGSHAN_WEIGHT_MODE: {CHARACTER_WEIGHT_MODE}")
    if profile == "proportion-v2":
        allowed_groups = {mesh.vertex_groups[name].index for name in spec}
        totals = [sum(group.weight for group in vertex.groups if group.group in allowed_groups)
                  for vertex in mesh.data.vertices]
        max_deviation = max(abs(total - 1.0) for total in totals)
        if max_deviation > 0.001:
            raise RuntimeError(f"Skin weights must sum to 1.0; max deviation is {max_deviation:.5f}")
        print(f"SKIN weights normalized: vertices={len(totals)} max_deviation={max_deviation:.6f}")
    mesh.parent = rig
    deform = mesh.modifiers.new("Wuxia_Humanoid_Deform", "ARMATURE")
    deform.object = rig
    deform.use_vertex_groups = True
    return rig


def manual_weights(mesh, spec, profile="legacy"):
    groups = {name: mesh.vertex_groups.get(name) or mesh.vertex_groups.new(name=name)
              for name in spec}

    def smooth_band(value, start, end):
        t = max(0.0, min(1.0, (value - start) / (end - start)))
        return t * t * (3.0 - 2.0 * t)

    for vertex in mesh.data.vertices:
        x, _y, z = vertex.co
        ax = abs(x)
        side = "L" if x >= 0 else "R"
        if profile == "proportion-v2":
            if z > 1.31:
                names = [("head", 1.0)]
            elif z > 1.16 and ax < 0.18:
                names = [("head", 0.62), ("neck", 0.38)]
            elif CHARACTER_WEIGHT_MODE in {"heuristic-v12", "heuristic-v13", "heuristic-v15"} and z > 1.08 and ax > 0.16:
                # Preserve the proven closed-sleeve seam from v9 while the
                # v12/v13 variants keep the shoulder seam closed during swing.
                shoulder = max(0.0, min(0.88, (ax - 0.13) / 0.12 * 0.88))
                names = [(f"upper_arm.{side}", shoulder), ("chest", 1.0 - shoulder)]
            elif CHARACTER_WEIGHT_MODE == "heuristic-v11" and z > 1.08 and ax > 0.18:
                shoulder = smooth_band(ax, 0.205, 0.325) * 0.78
                names = [(f"upper_arm.{side}", shoulder), ("chest", 1.0 - shoulder)]
            elif CHARACTER_WEIGHT_MODE == "heuristic-v9" and z > 1.08 and ax > 0.16:
                # Keep v6's closed shirt/sleeve seam: v7/v8's broad spatial
                # blend opened the source mesh's underarm patch during swing.
                shoulder = max(0.0, min(0.88, (ax - 0.13) / 0.12 * 0.88))
                names = [(f"upper_arm.{side}", shoulder), ("chest", 1.0 - shoulder)]
            elif CHARACTER_WEIGHT_MODE == "heuristic-v9" and z > 0.98 and ax > 0.20:
                names = [(f"upper_arm.{side}", 0.88), ("chest", 0.12)]
            elif CHARACTER_WEIGHT_MODE == "heuristic-v9" and z > 0.86 and ax > 0.23:
                names = [(f"forearm.{side}", 0.72), (f"upper_arm.{side}", 0.28)]
            elif 0.89 < z < 1.21 and ax > 0.20:
                t = max(0.0, min(1.0, (1.10 - z) / 0.21))
                t = t * t * (3.0 - 2.0 * t)
                # The imported shirt is one shell around the armpit. Fade arm
                # ownership from the torso seam toward the sleeve's outer edge
                # so swinging the humerus cannot drag a strip of ribcage away.
                arm_share = smooth_band(ax, 0.205, 0.315)
                names = [(f"upper_arm.{side}", (1.0 - t) * arm_share),
                         (f"forearm.{side}", t * arm_share), ("chest", 1.0 - arm_share)]
            elif z > 0.70 and z < 0.88 and ax > 0.27:
                t = max(0.0, min(1.0, (0.89 - z) / 0.19))
                t = t * t * (3.0 - 2.0 * t)
                names = [(f"forearm.{side}", 1.0 - t), (f"hand.{side}", t)]
            elif z > 0.56 and ax > 0.32:
                names = [(f"hand.{side}", 0.90), (f"forearm.{side}", 0.10)]
            elif z < 0.11 and ax > 0.045:
                # Hunyuan's boot soles extend beyond the trouser centerline.
                # Bind the whole sole before the narrower leg-width test below,
                # or adjacent sole vertices split between foot and pelvis.
                names = [(f"foot.{side}", 1.0)]
            elif z < (0.76 if CHARACTER_WEIGHT_MODE in {"heuristic-v13", "heuristic-v15"} else
                      0.80 if CHARACTER_WEIGHT_MODE in {"heuristic-v11", "heuristic-v12"} else 0.90) and 0.045 < ax < 0.29:
                center = 0.14 if x >= 0 else -0.14
                leg_weight = max(0.0, min(0.92, (0.105 - abs(x - center)) / 0.065 * 0.92))
                depth_weight = max(0.0, min(1.0, (0.33 - abs(_y)) / 0.11))
                leg_weight *= depth_weight
                if z < 0.17:
                    names = [(f"foot.{side}", leg_weight * 0.55),
                             (f"shin.{side}", 1.0 - leg_weight * 0.55)]
                elif z < 0.32:
                    shin_weight = max(0.72, leg_weight)
                    names = [(f"shin.{side}", shin_weight),
                             (f"thigh.{side}", 1.0 - shin_weight)]
                elif z < 0.42:
                    # Put the strongest influence from the shin just below the
                    # knee pivot, then taper to an even split at the joint. The
                    # transition now matches the measured knee height at 0.42 m.
                    t = max(0.0, min(1.0, (z - 0.32) / 0.10))
                    t = t * t * (3.0 - 2.0 * t)
                    shin_weight = 0.86 - 0.36 * t
                    names = [(f"shin.{side}", shin_weight),
                             (f"thigh.{side}", 1.0 - shin_weight)]
                elif z < 0.51:
                    t = max(0.0, min(1.0, (z - 0.42) / 0.09))
                    t = t * t * (3.0 - 2.0 * t)
                    shin_weight = 0.50 * (1.0 - t)
                    names = [(f"shin.{side}", shin_weight),
                             (f"thigh.{side}", 1.0 - shin_weight)]
                elif z < 0.68:
                    names = [(f"thigh.{side}", 1.0)]
                else:
                    hip_top = (0.76 if CHARACTER_WEIGHT_MODE in {"heuristic-v13", "heuristic-v15"} else
                               0.80 if CHARACTER_WEIGHT_MODE in {"heuristic-v11", "heuristic-v12"} else 0.89)
                    hip_fade = smooth_band(hip_top - z, 0.0, 0.12 if CHARACTER_WEIGHT_MODE in {"heuristic-v13", "heuristic-v15"} else 0.14)
                    weight = leg_weight * hip_fade
                    names = [(f"thigh.{side}", weight), ("pelvis", 1.0 - weight)]
            elif z > 1.24:
                names = [("neck", 0.58), ("chest", 0.42)]
            elif z > 1.10:
                names = [("chest", 0.82), ("neck", 0.18)]
            elif z > 0.89:
                names = [("spine", 0.72), ("pelvis", 0.28)]
            else:
                names = [("pelvis", 1.0)]
            positive = [(name, weight) for name, weight in names if weight > 1e-8]
            total = sum(weight for _name, weight in positive)
            if total <= 0:
                raise RuntimeError(f"No skin weights assigned to vertex {vertex.index}")
            for name, weight in positive:
                groups[name].add([vertex.index], weight / total, "REPLACE")
            continue
        if z > 1.51:
            names = [("head", 1.0)]
        elif ax > 0.20 and 1.00 < z < 1.49:
            # The generated sleeves merge into the torso at the shoulders.
            # A narrower cutoff left only a handful of shoulder vertices posed,
            # so the arms looked glued to the body during the walk cycle.
            if z < 1.12 and ax > 0.28:
                names = [(f"forearm.{side}", 0.58), (f"hand.{side}", 0.27),
                         (f"upper_arm.{side}", 0.15)]
            elif z < 1.31:
                names = [(f"forearm.{side}", 0.62), (f"upper_arm.{side}", 0.23), ("chest", 0.15)]
            else:
                names = [(f"upper_arm.{side}", 0.74), ("chest", 0.26)]
        elif z < 0.36:
            # The source is one textured shell. Weighting its entire lower half
            # by x splits the long robe down the middle when the legs swing.
            # The two trouser/boot columns blend smoothly into the pelvis so
            # no hard vertex-group boundary tears a triangular flap in the hem.
            leg_center = 0.15 if x >= 0 else -0.15
            leg_distance = abs(x - leg_center)
            leg_weight = max(0.0, min(0.76, (0.12 - leg_distance) / 0.06 * 0.76))
            depth_weight = max(0.0, min(1.0, (0.43 - abs(_y)) / 0.12))
            leg_weight *= depth_weight
            if leg_weight > 0.02:
                if z < 0.12:
                    names = [(f"foot.{side}", leg_weight * 0.62),
                             (f"shin.{side}", leg_weight * 0.38), ("pelvis", 1 - leg_weight)]
                elif z < 0.27:
                    # The trousers are mostly hidden by the long robe. Let the
                    # shin drive only the exposed boot/ankle; keep the broad hem
                    # and skirt panels rigid with the pelvis to avoid clipping.
                    names = [(f"shin.{side}", leg_weight * 0.72),
                             ("pelvis", 1 - leg_weight * 0.72)]
                else:
                    names = [("pelvis", 1.0)]
            else:
                names = [("pelvis", 1.0)]
        elif z > 1.40:
            names = [("neck", 0.35), ("chest", 0.65)]
        else:
            names = [("spine" if z < 1.19 else "chest", 0.82),
                     ("pelvis" if z < 0.92 else "neck", 0.18)]
        for name, weight in names:
            groups[name].add([vertex.index], weight, "REPLACE")


def component_rigid_weights(mesh, spec):
    """Bind each disconnected source surface island rigidly to its nearest bone.

    The Hunyuan mesh is a triangle patchwork with thousands of disconnected
    islands. Vertex-height bands cross those patch boundaries and can pull a
    single patch between unrelated joints. This prototype keeps each island
    intact and only blends across an actual parent/child joint when both bones
    are almost equally close to the island's center.
    """
    groups = {name: mesh.vertex_groups.get(name) or mesh.vertex_groups.new(name=name)
              for name in spec}
    adjacency = [[] for _ in mesh.data.vertices]
    for edge in mesh.data.edges:
        a, b = edge.vertices
        adjacency[a].append(b)
        adjacency[b].append(a)

    segments = {}
    for name, (head, tail, _parent) in spec.items():
        if name == "root":
            continue
        start, end = Vector(head), Vector(tail)
        axis = end - start
        segments[name] = (start, axis, max(axis.length_squared, 1e-8))

    parent_of = {name: parent for name, (_head, _tail, parent) in spec.items() if parent}
    visited = bytearray(len(mesh.data.vertices))
    assigned_vertices = {name: [] for name in spec}
    component_count = 0
    component_size_min = len(mesh.data.vertices)
    component_size_max = 0
    joint_blends = 0

    def point_segment_distance(point, segment):
        start, axis, length_sq = segment
        t = max(0.0, min(1.0, (point - start).dot(axis) / length_sq))
        return (point - (start + axis * t)).length

    def inside_limb_envelope(name, center, bounds):
        # Nearest-bone distance alone can attach waist ornaments to the thigh
        # or trouser panels to the shin. Keep leg candidates inside the
        # anatomical span of the segment; the 4.5 cm thigh/shin overlap leaves
        # room for parent/child blending at the hip and knee. The foot envelope
        # also covers the low boot shaft above the ankle pivot.
        z = center.z
        min_x, max_x, min_z, max_z = bounds
        if name.startswith(("upper_arm.", "forearm.", "hand.")):
            side_sign = 1.0 if name.endswith(".L") else -1.0
            lateral = center.x * side_sign
            # Arm islands close to the centerline belong to chest/spine. Requiring
            # the whole island to stay on its own side prevents shoulder patches
            # from being pulled through the ribcage during a swing.
            if side_sign > 0 and min_x < -0.045:
                return False
            if side_sign < 0 and max_x > 0.045:
                return False
            if name.startswith("upper_arm."):
                return 0.155 <= lateral and 0.84 <= z <= 1.27 and max_z <= 1.34
            if name.startswith("forearm."):
                return 0.235 <= lateral and 0.61 <= z <= 1.02 and max_z <= 1.10
            return 0.32 <= lateral and 0.53 <= z <= 0.91 and max_z <= 0.98
        if name.startswith("thigh."):
            side_sign = 1.0 if name.endswith(".L") else -1.0
            if side_sign > 0 and min_x < 0.025:
                return False
            if side_sign < 0 and max_x > -0.025:
                return False
            # Keep belt, sash and abdomen islands on the torso even when their
            # centers happen to be closer to the old high thigh pivots.
            return 0.37 <= z <= 0.90 and max_z <= 0.97 and center.x * side_sign >= 0.055
        if name.startswith("shin."):
            side_sign = 1.0 if name.endswith(".L") else -1.0
            return 0.035 <= z <= 0.58 and max_z <= 0.63 and center.x * side_sign >= 0.035
        if name.startswith("foot."):
            side_sign = 1.0 if name.endswith(".L") else -1.0
            return z <= 0.30 and center.x * side_sign >= 0.035
        return True

    for seed in range(len(mesh.data.vertices)):
        if visited[seed]:
            continue
        visited[seed] = 1
        stack = [seed]
        vertices = []
        center = Vector((0.0, 0.0, 0.0))
        while stack:
            index = stack.pop()
            vertices.append(index)
            center += mesh.data.vertices[index].co
            for neighbor in adjacency[index]:
                if not visited[neighbor]:
                    visited[neighbor] = 1
                    stack.append(neighbor)
        center /= len(vertices)
        xs = [mesh.data.vertices[index].co.x for index in vertices]
        zs = [mesh.data.vertices[index].co.z for index in vertices]
        bounds = (min(xs), max(xs), min(zs), max(zs))
        component_count += 1
        component_size_min = min(component_size_min, len(vertices))
        component_size_max = max(component_size_max, len(vertices))
        eligible = [(point_segment_distance(center, segment), name)
                    for name, segment in segments.items()
                    if inside_limb_envelope(name, center, bounds)]
        # Every character point should have at least one valid deform joint,
        # but retain the unfiltered ranking as a defensive fallback for future
        # profiles whose bone endpoints change.
        if not eligible:
            eligible = [(point_segment_distance(center, segment), name)
                        for name, segment in segments.items()]
        ranked = sorted(eligible)
        primary_distance, primary_name = ranked[0]
        secondary_distance, secondary_name = ranked[1]
        parent_child = (parent_of.get(primary_name) == secondary_name or
                        parent_of.get(secondary_name) == primary_name)
        if parent_child and secondary_distance - primary_distance < 0.045:
            secondary_weight = 0.5 * (1.0 - (secondary_distance - primary_distance) / 0.045)
            secondary_weight = max(0.0, min(0.5, secondary_weight))
            assigned_vertices[primary_name].append((vertices, 1.0 - secondary_weight))
            assigned_vertices[secondary_name].append((vertices, secondary_weight))
            joint_blends += 1
        else:
            assigned_vertices[primary_name].append((vertices, 1.0))

    for name, assignments in assigned_vertices.items():
        group = groups[name]
        for indices, weight in assignments:
            if weight > 0.001:
                group.add(indices, weight, "REPLACE")

    if CHARACTER_PROFILE == "proportion-v2":
        # Keep an explicit bind report in the .blend/build log so future rig
        # edits can catch a waist/torso island migrating back to a limb.
        for name in ("thigh.L", "thigh.R", "upper_arm.L", "upper_arm.R"):
            indices = [index for indices, _weight in assigned_vertices[name] for index in indices]
            if not indices:
                continue
            heights = [mesh.data.vertices[index].co.z for index in indices]
            laterality = [mesh.data.vertices[index].co.x * (1 if name.endswith(".L") else -1)
                          for index in indices]
            print(f"RIG_ENVELOPE {name} vertices={len(indices)} z_max={max(heights):.3f} "
                  f"min_own_side_x={min(laterality):.3f}")

    print(f"ISLAND_RIG components={component_count} min_vertices={component_size_min} "
          f"max_vertices={component_size_max} joint_blends={joint_blends}")


def make_action(rig, name, frames, gait_gain=1.0, profile="legacy"):
    action = bpy.data.actions.new(name)
    rig.animation_data_create()
    rig.animation_data.action = action
    pose = rig.pose.bones
    for frame, pose_data in frames:
        whole_frame = int(frame)
        bpy.context.scene.frame_set(whole_frame, subframe=frame - whole_frame)
        for bone_name, values in pose_data.items():
            bone = pose[bone_name]
            if profile == "proportion-v2" and name in {"Walk", "Run"} and bone_name in {"foot.L", "foot.R"}:
                # Cancel inherited leg pitch, then retain the keyed ankle pitch:
                # toe-up on heel contact and toe-down during push-off.
                side = bone_name[-1]
                leg_angle = pose_data[f"thigh.{side}"][0] + pose_data[f"shin.{side}"][0]
                values = (values[0] - leg_angle, 0.0, 0.0)
            if bone_name == "root":
                bob_gain = gait_gain if name in {"Walk", "Run"} else 1.0
                side_shift, vertical_bob = values
                # PoseBone.location is expressed in the root bone's rest axes.
                # This rig's root local Y points up and local Z points forward;
                # writing vertical_bob into local Z made the torso slide forward
                # and back while its world-space height stayed fixed. Convert the
                # intended armature-space offset through the rest basis instead.
                desired_offset = Vector((side_shift, 0.0, vertical_bob)) * bob_gain
                root_local_offset = rig.data.bones[bone_name].matrix_local.to_3x3().inverted() @ desired_offset
                bone.location = root_local_offset
                bone.keyframe_insert(data_path="location", frame=frame, group=bone_name)
            elif profile == "proportion-v2" and bone_name in {"upper_arm.L", "upper_arm.R"}:
                rest_inverse = rig.data.bones[bone_name].matrix_local.to_3x3().inverted()
                side_sign = 1.0 if bone_name.endswith(".L") else -1.0
                adduction_axis = (rest_inverse @ Vector((0, 1, 0))).normalized()
                # Keep the relaxed arm close to the outer torso contour; v5's
                # 31-degree constant roll folded the upper sleeves into chest.
                adduction = Quaternion(adduction_axis, side_sign * 0.50 *
                                       (gait_gain if name in {"Walk", "Run"} else 1.0))
                if name in {"Walk", "Run"}:
                    # The two shoulder swings must be opposite in world space.
                    # The old right-side sign compensation became wrong when
                    # the shoulder axis was corrected from vertical to lateral.
                    swing_axis = (rest_inverse @ Vector((1, 0, 0))).normalized()
                    # On this imported rest orientation, a positive shoulder
                    # value tracks the same-side foot. Reverse it for the
                    # human contralateral arm/leg rhythm.
                    swing = Quaternion(swing_axis, -values[0] * gait_gain)
                    bone.rotation_quaternion = adduction @ swing
                else:
                    bone.rotation_quaternion = adduction @ Euler(values, "XYZ").to_quaternion()
                bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone_name)
            elif (profile == "proportion-v2" and name in {"Idle", "Walk", "Run"}
                  and bone_name in {"foot.L", "foot.R"}):
                rest_inverse = rig.data.bones[bone_name].matrix_local.to_3x3().inverted()
                pitch_axis = (rest_inverse @ Vector((1, 0, 0))).normalized()
                yaw_axis = (rest_inverse @ Vector((0, 0, 1))).normalized()
                side_sign = 1.0 if bone_name.endswith(".L") else -1.0
                # The source shoe mesh splays about 17 degrees: for foot.L at
                # +X its toe vertex centroid is also +X, and foot.R mirrors it.
                # Since the character faces -Y, inward is -Z yaw on L and +Z
                # on R. Apply a measured 0.20 rad correction in Idle as well as
                # Walk so the transition does not snap the feet sideways.
                toe_in = Quaternion(yaw_axis, -side_sign * 0.26)
                pitch_gain = gait_gain if name in {"Walk", "Run"} else 1.0
                ankle_pitch = Quaternion(pitch_axis, values[0] * pitch_gain)
                bone.rotation_quaternion = toe_in @ ankle_pitch
                bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone_name)
            elif name in {"Walk", "Run"} and bone_name in GAIT_WORLD_AXES:
                world_axis = GAIT_WORLD_AXES[bone_name]
                if profile != "proportion-v2" and bone_name in {"upper_arm.L", "upper_arm.R"}:
                    # Keep the older character rigs on their previously tuned
                    # shoulder axis; the lateral swing is specific to this rig.
                    world_axis = Vector((0, 0, 1))
                local_axis = rig.data.bones[bone_name].matrix_local.to_3x3().inverted() @ world_axis
                bone.rotation_mode = "QUATERNION"
                bone.rotation_quaternion = Quaternion(local_axis.normalized(), values[0] * gait_gain)
                bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone_name)
            else:
                bone.rotation_mode = "QUATERNION"
                bone.rotation_quaternion = Euler(values, "XYZ").to_quaternion()
                bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone_name)
    slot = rig.animation_data.action_slot
    curves = action.layers[0].strips[0].channelbag(slot).fcurves
    for curve in curves:
        bone_name = curve.group.name if curve.group else ""
        for key in curve.keyframe_points:
            preserve_foot_plant = (profile == "proportion-v2" and name == "Walk" and
                                   bone_name in {"root", "thigh.L", "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R"})
            key.interpolation = "LINEAR" if preserve_foot_plant else "BEZIER"
            if not preserve_foot_plant:
                key.handle_left_type = "AUTO_CLAMPED"
                key.handle_right_type = "AUTO_CLAMPED"
        if name in {"Idle", "Walk", "Run"}:
            curve.modifiers.new("CYCLES")
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    return action


def solve_walk_leg(profile, side, forward, lift, root_vertical):
    """Solve a two-bone leg for a sagittal-plane ankle target."""
    spec = bone_spec(profile)
    thigh_head, thigh_tail, _ = spec[f"thigh.{side}"]
    shin_head, shin_tail, _ = spec[f"shin.{side}"]
    foot_head, _, _ = spec[f"foot.{side}"]
    if CHARACTER_IK_USE_JOINT_PIVOTS:
        # Rotations pivot at bone heads, and the foot bone head is the ankle
        # target. Using the shin's display tail overstates the lower segment
        # (the current rig tail sits 5 cm below that ankle pivot), which makes
        # a centered, planted leg fold at the knee. Measure pivot-to-pivot.
        upper_length = (Vector(shin_head) - Vector(thigh_head)).length
        lower_length = (Vector(foot_head) - Vector(shin_head)).length
    else:
        upper_length = (Vector(thigh_tail) - Vector(thigh_head)).length
        lower_length = (Vector(shin_tail) - Vector(shin_head)).length
    hip_z = thigh_head[2] + root_vertical
    ankle_z = foot_head[2] + lift
    down = hip_z - ankle_z
    distance = max(0.001, (forward * forward + down * down) ** 0.5)
    max_reach = upper_length + lower_length - 0.001
    if CHARACTER_IK_USE_JOINT_PIVOTS and distance > max_reach:
        # Keep the target direction while projecting unreachable heel-strike
        # poses onto the leg's actual reach, rather than mixing a clamped
        # triangle length with the original (longer) target angle.
        scale = max_reach / distance
        forward *= scale
        down *= scale
        distance = max_reach
    elif distance > max_reach:
        distance = max_reach

    base = atan2(forward, down)
    offset_cos = (upper_length ** 2 + distance ** 2 - lower_length ** 2) / (2 * upper_length * distance)
    internal_cos = (upper_length ** 2 + lower_length ** 2 - distance ** 2) / (2 * upper_length * lower_length)
    offset = acos(max(-1.0, min(1.0, offset_cos)))
    knee_bend = pi - acos(max(-1.0, min(1.0, internal_cos)))
    if CHARACTER_IK_KNEE_DIRECTION == "forward":
        # The mirrored 2-bone solution bends the knee toward travel and lets
        # the heel trail behind. The old base-offset branch selected the
        # opposite solution, folding the knee backward during swing.
        upper_direction = base + offset
        lower_direction = upper_direction - knee_bend
    else:
        upper_direction = base - offset
        lower_direction = upper_direction + knee_bend
    return -upper_direction, -(lower_direction - upper_direction)


def create_actions(rig, gait_gain=1.0, profile="legacy"):
    zero = (0.0, 0.0, 0.0)
    def frame(root=0, side_shift=0, arm_l=zero, arm_r=zero, leg_l=zero, leg_r=zero,
              shin_l=zero, shin_r=zero, foot_l=zero, foot_r=zero,
              pelvis=zero, spine=zero, chest=zero, head=zero, fore_l=zero, fore_r=zero):
        return {"root": (side_shift, root), "pelvis": pelvis,
                "upper_arm.L": arm_l, "upper_arm.R": arm_r,
                "thigh.L": leg_l, "thigh.R": leg_r,
                "shin.L": shin_l, "shin.R": shin_r,
                "foot.L": foot_l, "foot.R": foot_r, "spine": spine,
                "chest": chest, "head": head,
                "forearm.L": fore_l, "forearm.R": fore_r}

    def walk_frames():
        frames = []
        # The 21-frame, 24 fps cycle is authored for a 1.2 m/s brisk walk.
        # Solve both bones to heel/toe targets so support feet stay planted.
        def smoothstep(value):
            value = max(0.0, min(1.0, value))
            return value * value * (3.0 - 2.0 * value)

        def root_height(local_phase):
            # Pose-to-pose arc: neutral contact, slight weight absorption,
            # passing, then a modest rise before the next contact.
            compression = CHARACTER_CONTACT_COMPRESSION
            keys = (((0.0, -compression), (0.25, -compression * 0.5), (0.50, 0.0),
                     (0.75, -compression * 0.5), (1.0, -compression))
                    if compression > 0 else
                    ((0.0, 0.0), (0.25, -0.012), (0.50, 0.0), (0.75, 0.018), (1.0, 0.0)))
            for (start, start_height), (end, end_height) in zip(keys, keys[1:]):
                if local_phase <= end:
                    t = smoothstep((local_phase - start) / (end - start))
                    return (start_height + (end_height - start_height) * t) * CHARACTER_ROOT_BOB_SCALE
            return keys[-1][1]

        for index in range(22):
            phase = index / 21.0
            loop_phase = 0.0 if index == 21 else phase
            step_phase = (loop_phase * 2.0) % 1.0
            support = "R" if loop_phase < 0.5 else "L"

            # Calibrated from exported ankle positions. At the reference speed,
            # each support phase advances about 0.52 m without skating.
            stride_half = CHARACTER_STRIDE_HALF
            stance_forward = stride_half * (1.0 - 2.0 * step_phase)
            swing_forward = -stride_half + 2.0 * stride_half * step_phase
            toe_off = smoothstep((step_phase - 0.78) / 0.22)
            swing_lift = CHARACTER_SWING_LIFT * sin(pi * step_phase)
            stance_pitch = 0.10 * (1.0 - smoothstep(step_phase / 0.16)) - 0.12 * toe_off
            swing_pitch = 0.10 * sin(pi * step_phase)

            step_l = ((stance_forward, 0.010 * toe_off) if support == "L"
                      else (swing_forward, swing_lift))
            step_r = ((stance_forward, 0.010 * toe_off) if support == "R"
                      else (swing_forward, swing_lift))
            foot_l = stance_pitch if support == "L" else swing_pitch
            foot_r = stance_pitch if support == "R" else swing_pitch
            root = root_height(step_phase)
            side = -0.008 if support == "R" else 0.008
            arm = -CHARACTER_ARM_SWING * cos(2.0 * pi * loop_phase)
            forearm_follow = CHARACTER_FOREARM_FOLLOW * sin(2.0 * pi * loop_phase)
            twist = 0.010 * cos(2.0 * pi * loop_phase)
            pose = frame(root=root, side_shift=side,
                         arm_l=(-arm, 0, 0), arm_r=(arm, 0, 0),
                         foot_l=(foot_l, 0, 0), foot_r=(foot_r, 0, 0),
                         pelvis=(twist, 0, 0), spine=(0.004, 0, 0),
                         chest=(-twist * 0.45, 0, 0), head=(-0.003 * sin(2*pi*loop_phase), 0, 0),
                         fore_l=(CHARACTER_FOREARM_BEND + forearm_follow, 0, 0),
                         fore_r=(CHARACTER_FOREARM_BEND - forearm_follow, 0, 0))
            for side_name, (forward, lift) in (("L", step_l), ("R", step_r)):
                thigh_angle, shin_angle = solve_walk_leg(
                    profile, side_name, forward, lift, root)
                pose[f"thigh.{side_name}"] = (thigh_angle, 0.0, 0.0)
                pose[f"shin.{side_name}"] = (shin_angle, 0.0, 0.0)
            frames.append((index, pose))
        return frames

    def zelda_walk_frames():
        """Use Zelda's contralateral bone rhythm with locked IK foot contacts."""
        frames = []
        amplitude = 0.94

        def smoothstep(value):
            value = max(0.0, min(1.0, value))
            return value * value * (3.0 - 2.0 * value)

        def root_height(local_phase):
            # Contact / down / passing / up key-pose arc. The body follows the
            # legs with a restrained 3 cm response instead of leading the step.
            compression = CHARACTER_CONTACT_COMPRESSION
            keys = (((0.0, -compression), (0.25, -compression * 0.5), (0.50, 0.0),
                     (0.75, -compression * 0.5), (1.0, -compression))
                    if compression > 0 else
                    ((0.0, 0.0), (0.25, -0.012), (0.50, 0.0), (0.75, 0.018), (1.0, 0.0)))
            for (start, start_height), (end, end_height) in zip(keys, keys[1:]):
                if local_phase <= end:
                    t = smoothstep((local_phase - start) / (end - start))
                    return (start_height + (end_height - start_height) * t) * CHARACTER_ROOT_BOB_SCALE
            return keys[-1][1]

        for index in range(22):
            phase = 0.0 if index == 21 else index / 21.0
            step_phase = (phase * 2.0) % 1.0
            support = "R" if phase < 0.5 else "L"
            arm_signal = cos(2.0 * pi * phase) * amplitude
            stride_half = CHARACTER_STRIDE_HALF
            stance_forward = stride_half * (1.0 - 2.0 * step_phase)
            swing_forward = -stride_half + 2.0 * stride_half * step_phase
            toe_off = smoothstep((step_phase - 0.78) / 0.22)
            swing_lift = CHARACTER_SWING_LIFT * sin(pi * step_phase)
            stance_pitch = 0.10 * (1.0 - smoothstep(step_phase / 0.16)) - 0.12 * toe_off
            swing_pitch = 0.10 * sin(pi * step_phase)
            step_l = ((stance_forward, 0.010 * toe_off) if support == "L"
                      else (swing_forward, swing_lift))
            step_r = ((stance_forward, 0.010 * toe_off) if support == "R"
                      else (swing_forward, swing_lift))
            foot_l = stance_pitch if support == "L" else swing_pitch
            foot_r = stance_pitch if support == "R" else swing_pitch
            vertical_bob = root_height(step_phase)
            side_shift = -0.008 if support == "R" else 0.008
            pelvis_twist = 0.035 * sin(2.0 * pi * phase)
            spine_pitch = 0.016 * sin(4.0 * pi * phase)
            pose = frame(
                root=vertical_bob,
                side_shift=side_shift,
                # This model's shoulder conversion reverses the authored local
                # sign; positive input here produces the required opposite-side
                # hand/foot motion in world space.
                arm_l=(arm_signal * 0.46, 0, 0),
                arm_r=(-arm_signal * 0.46, 0, 0),
                foot_l=(foot_l, 0, 0),
                foot_r=(foot_r, 0, 0),
                pelvis=(pelvis_twist, 0, 0),
                spine=(spine_pitch, 0, 0),
                chest=(-pelvis_twist * 0.55, 0, 0),
                head=(-spine_pitch * 0.35, 0, 0),
                fore_l=(max(0.0, arm_signal) * 0.16, 0, 0),
                fore_r=(max(0.0, -arm_signal) * 0.16, 0, 0),
            )
            for side_name, (forward, lift) in (("L", step_l), ("R", step_r)):
                thigh_angle, shin_angle = solve_walk_leg(
                    profile, side_name, forward, lift, vertical_bob)
                pose[f"thigh.{side_name}"] = (thigh_angle, 0.0, 0.0)
                pose[f"shin.{side_name}"] = (shin_angle, 0.0, 0.0)
            frames.append((index, pose))
        return frames

    make_action(rig, "Idle", [
        (1, frame()), (12, frame(0.025, spine=(0.015, 0, 0), head=(-0.015, 0, 0))),
        (24, frame()),
    ], profile=profile)
    if profile == "proportion-v2":
        if CHARACTER_GAIT_MODE == "ik":
            walk = walk_frames()
        elif CHARACTER_GAIT_MODE == "zelda":
            walk = zelda_walk_frames()
        else:
            raise ValueError(f"Unsupported CANGSHAN_GAIT_MODE: {CHARACTER_GAIT_MODE}")
        make_action(rig, "Walk", walk, gait_gain=gait_gain, profile=profile)
    else:
        def legacy_walk_pose(root, side, arm, leg, shin_l, shin_r, foot_l, foot_r, twist):
            return frame(
                root=root, side_shift=side,
                arm_l=(-arm, 0, 0), arm_r=(arm, 0, 0),
                leg_l=(leg, 0, 0), leg_r=(-leg, 0, 0),
                shin_l=(shin_l, 0, 0), shin_r=(shin_r, 0, 0),
                foot_l=(foot_l, 0, 0), foot_r=(foot_r, 0, 0),
                pelvis=(twist, 0, 0), spine=(0.018, 0, 0),
                chest=(-twist * 0.65, 0, 0), head=(-0.008, 0, 0),
                fore_l=(0.10, 0, 0), fore_r=(0.10, 0, 0))

        make_action(rig, "Walk", [
            (1, legacy_walk_pose(0.022, -0.015, -0.30, 0.43, 0.03, 0.18, -0.12, 0.12, 0.022)),
            (3.5, legacy_walk_pose(0.000, 0.000, -0.21, 0.30, 0.10, 0.26, -0.04, 0.18, 0.018)),
            (6, legacy_walk_pose(0.034, 0.018, 0.000, 0.00, 0.05, 0.42, 0.00, -0.10, 0.000)),
            (8.5, legacy_walk_pose(0.052, 0.000, 0.21, -0.30, 0.18, 0.24, 0.12, -0.08, -0.018)),
            (11, legacy_walk_pose(0.022, 0.015, 0.30, -0.43, 0.18, 0.03, 0.12, -0.12, -0.022)),
            (13.5, legacy_walk_pose(0.000, 0.000, 0.21, -0.30, 0.26, 0.10, 0.18, -0.04, -0.018)),
            (16, legacy_walk_pose(0.034, -0.018, 0.000, 0.00, 0.42, 0.05, -0.10, 0.00, 0.000)),
            (18.5, legacy_walk_pose(0.052, 0.000, -0.21, 0.30, 0.24, 0.18, -0.08, 0.12, 0.018)),
            (21, legacy_walk_pose(0.022, -0.015, -0.30, 0.43, 0.03, 0.18, -0.12, 0.12, 0.022)),
        ], gait_gain=gait_gain, profile=profile)
    make_action(rig, "Run", [
        (1, frame(0.038, arm_l=(-0.26, 0, 0), arm_r=(0.26, 0, 0),
                  leg_l=(0.38, 0, 0), leg_r=(-0.38, 0, 0),
                  shin_l=(0.10, 0, 0), shin_r=(0.52, 0, 0), spine=(0.045, 0, 0))),
        (5, frame(0.058, arm_l=(-0.12, 0, 0), arm_r=(0.12, 0, 0),
                  leg_l=(0.12, 0, 0), leg_r=(-0.12, 0, 0),
                  shin_l=(0.26, 0, 0), shin_r=(0.20, 0, 0), spine=(0.045, 0, 0))),
        (9, frame(0.038, arm_l=(0.26, 0, 0), arm_r=(-0.26, 0, 0),
                  leg_l=(-0.38, 0, 0), leg_r=(0.38, 0, 0),
                  shin_l=(0.52, 0, 0), shin_r=(0.10, 0, 0), spine=(0.045, 0, 0))),
        (13, frame(0.058, arm_l=(0.12, 0, 0), arm_r=(-0.12, 0, 0),
                   leg_l=(-0.12, 0, 0), leg_r=(0.12, 0, 0),
                   shin_l=(0.20, 0, 0), shin_r=(0.26, 0, 0), spine=(0.045, 0, 0))),
        (17, frame(0.038, arm_l=(-0.26, 0, 0), arm_r=(0.26, 0, 0),
                   leg_l=(0.38, 0, 0), leg_r=(-0.38, 0, 0),
                   shin_l=(0.10, 0, 0), shin_r=(0.52, 0, 0), spine=(0.045, 0, 0))),
    ], gait_gain=gait_gain, profile=profile)
    make_action(rig, "Jump", [
        (1, frame()), (5, frame(0.48, arm_l=(-0.65, 0, 0), arm_r=(-0.65, 0, 0),
                                 leg_l=(0.36, 0, 0), leg_r=(0.36, 0, 0))),
        (10, frame(0.48, arm_l=(-0.65, 0, 0), arm_r=(-0.65, 0, 0),
                   leg_l=(0.36, 0, 0), leg_r=(0.36, 0, 0))),
        (16, frame()),
    ], profile=profile)
    make_action(rig, "Attack", [
        (1, frame(0, arm_r=(-0.30, 0, 0.28), fore_r=(0, 0, -0.35))),
        (5, frame(0.08, arm_r=(0.10, 0, -0.48), fore_r=(0, 0, 0.18), spine=(0, 0.08, 0))),
        (9, frame(0, arm_r=(-0.18, 0, 0.20), fore_r=(0, 0, -0.12))),
        (14, frame()),
    ], profile=profile)


def add_preview_rig(scene, mesh):
    bpy.context.view_layer.update()
    corners = [mesh.matrix_world @ Vector(corner) for corner in mesh.bound_box]
    center = sum(corners, Vector()) / 8
    extent = max(mesh.dimensions)
    camera_data = bpy.data.cameras.new("Preview_Camera")
    camera = bpy.data.objects.new("Preview_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = center + Vector((2.2, -4.6, 1.6)) * extent
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = extent * 1.35
    scene.camera = camera
    for name, offset, power in (("Key_Light", (3, -4, 4), 900),
                                ("Fill_Light", (-3, -2, 1.8), 500),
                                ("Rim_Light", (1, 3, 3), 750)):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = power
        light_data.shape = "DISK"
        light_data.size = extent * 0.8
        light = bpy.data.objects.new(name, light_data)
        bpy.context.collection.objects.link(light)
        light.location = center + Vector(offset) * extent
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()


def optimize_character_textures(profile):
    if profile != "proportion-v2":
        return
    for image in bpy.data.images:
        width, height = image.size
        if not width or not height or max(width, height) <= 2048:
            continue
        is_auxiliary = "normal" in image.name.lower() or "metallic" in image.name.lower() or "roughness" in image.name.lower()
        target = 1024 if is_auxiliary else 2048
        image.scale(target, target)
        if image.packed_file:
            image.pack()
        print(f"TEXTURE {image.name}: {width}x{height} -> {target}x{target}")


def package_character(slug, display_name):
    source = ROOT / "assets/generated/threejs-wuxia/source" / f"{slug}.glb"
    if not source.exists():
        print(f"SKIP missing Hunyuan source: {source}")
        return
    out_dir = ROOT / "assets/generated/threejs-wuxia/models"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_blend = out_dir / f"{slug}{CHARACTER_OUTPUT_SUFFIX}-blender.blend"
    out_glb = out_dir / f"{slug}{CHARACTER_OUTPUT_SUFFIX}-game-ready.glb"
    out_preview = out_dir / f"{slug}{CHARACTER_OUTPUT_SUFFIX}-preview.png"

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"No mesh in generated GLB: {source}")
    if len(meshes) != 1 and CHARACTER_PROFILE == "proportion-v2":
        raise RuntimeError(f"Expected one Hunyuan mesh, found {len(meshes)}")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    mesh = meshes[0]
    bpy.context.view_layer.objects.active = mesh
    if len(meshes) > 1:
        bpy.ops.object.join()
    mesh.name = f"{slug.replace('-', '_').title()}_Textured_Mesh"
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    dims = mesh.dimensions.copy()
    if dims.z < max(dims.x, dims.y):
        raise RuntimeError(f"Expected upright character, got dimensions {tuple(round(v, 3) for v in dims)}")
    mesh.scale *= 1.75 / max(dims.z, 0.001)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mesh.location.x -= (mesh.bound_box[0][0] + mesh.bound_box[6][0]) * 0.5
    mesh.location.y -= (mesh.bound_box[0][1] + mesh.bound_box[6][1]) * 0.5
    bpy.context.view_layer.update()
    bounds = [mesh.matrix_world @ Vector(corner) for corner in mesh.bound_box]
    mesh.location.z -= min(point.z for point in bounds)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    narrow_lower_body(mesh)
    optimize_character_textures(CHARACTER_PROFILE)

    before = (len(mesh.data.vertices), len(mesh.data.polygons))
    if len(mesh.data.polygons) > 85000:
        modifier = mesh.modifiers.new("Realtime_Polygon_Budget", "DECIMATE")
        modifier.ratio = min(1.0, 70000 / len(mesh.data.polygons))
        bpy.context.view_layer.objects.active = mesh
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = (len(mesh.data.vertices), len(mesh.data.polygons))

    rig = create_rig(mesh, CHARACTER_PROFILE)
    create_actions(rig, gait_gain=1.0,
                   profile=CHARACTER_PROFILE)
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 25
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(out_preview)
    scene.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("Wuxia_Preview_World")
    world.color = (0.025, 0.035, 0.055)
    scene.world = world
    add_preview_rig(scene, mesh)

    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(out_glb), export_format="GLB", use_selection=True,
        export_apply=True, export_animations=True, export_nla_strips=True,
        export_force_sampling=True,
    )
    if CHARACTER_PROFILE == "proportion-v2":
        for track in rig.animation_data.nla_tracks:
            track.mute = track.name != "Walk"
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(out_blend))
    bpy.ops.render.render(write_still=True)
    print(f"PACKAGED {display_name} source_vertices={before[0]} source_faces={before[1]} "
          f"game_vertices={after[0]} game_faces={after[1]}")
    print(f"BLEND={out_blend}\nGLB={out_glb}\nPREVIEW={out_preview}")


for character in CHARACTERS:
    package_character(*character)
