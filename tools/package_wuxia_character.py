"""Prepare a Hunyuan image-to-3D wuxia character for Blender and Three.js.

Place downloaded source GLBs at assets/generated/threejs-wuxia/source/<name>.glb,
then run:
  blender -b --python tools/package_wuxia_character.py

The native .blend keeps the editable armature and five named Actions. The
playable GLB carries the same clips through glTF animation export.
"""

from pathlib import Path
import os
import bpy
from mathutils import Euler, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_PROFILE = os.environ.get("CANGSHAN_CHARACTER_PROFILE", "legacy")
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


def bone_spec(profile="legacy"):
    if profile == "proportion-v2":
        return {
            "root": ((0, 0, 0.0), (0, 0, 0.78), None),
            "pelvis": ((0, 0, 0.90), (0, 0, 1.02), "root"),
            "spine": ((0, 0, 0.95), (0, 0, 1.15), "pelvis"),
            "chest": ((0, 0, 1.12), (0, 0, 1.25), "spine"),
            "neck": ((0, 0, 1.23), (0, 0, 1.33), "chest"),
            "head": ((0, 0, 1.29), (0, 0, 1.72), "neck"),
            "upper_arm.L": ((0.15, 0, 1.17), (0.34, 0, 0.99), "chest"),
            "forearm.L": ((0.34, 0, 0.99), (0.48, 0, 0.74), "upper_arm.L"),
            "hand.L": ((0.48, 0, 0.74), (0.50, -0.11, 0.62), "forearm.L"),
            "upper_arm.R": ((-0.15, 0, 1.17), (-0.34, 0, 0.99), "chest"),
            "forearm.R": ((-0.34, 0, 0.99), (-0.48, 0, 0.74), "upper_arm.R"),
            "hand.R": ((-0.48, 0, 0.74), (-0.50, -0.11, 0.62), "forearm.R"),
            "thigh.L": ((0.11, 0, 0.98), (0.14, 0, 0.52), "pelvis"),
            "shin.L": ((0.14, 0, 0.52), (0.14, 0, 0.12), "thigh.L"),
            "foot.L": ((0.14, 0, 0.12), (0.14, -0.24, 0.055), "shin.L"),
            "thigh.R": ((-0.11, 0, 0.98), (-0.14, 0, 0.52), "pelvis"),
            "shin.R": ((-0.14, 0, 0.52), (-0.14, 0, 0.12), "thigh.R"),
            "foot.R": ((-0.14, 0, 0.12), (-0.14, -0.24, 0.055), "shin.R"),
        }
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
    manual_weights(mesh, spec, profile)
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
    for vertex in mesh.data.vertices:
        x, _y, z = vertex.co
        ax = abs(x)
        side = "L" if x >= 0 else "R"
        if profile == "proportion-v2":
            if z > 1.31:
                names = [("head", 1.0)]
            elif z > 1.16 and ax < 0.18:
                names = [("head", 0.62), ("neck", 0.38)]
            elif z > 1.08 and ax > 0.16:
                names = [(f"upper_arm.{side}", 0.72), ("chest", 0.28)]
            elif z > 0.98 and ax > 0.20:
                names = [(f"upper_arm.{side}", 0.88), ("chest", 0.12)]
            elif z > 0.86 and ax > 0.23:
                names = [(f"forearm.{side}", 0.72), (f"upper_arm.{side}", 0.28)]
            elif z > 0.70 and ax > 0.27:
                names = [(f"forearm.{side}", 0.76), (f"hand.{side}", 0.24)]
            elif z > 0.58 and ax > 0.30:
                names = [(f"hand.{side}", 0.88), (f"forearm.{side}", 0.12)]
            elif z < 0.11 and ax > 0.045:
                # Hunyuan's boot soles extend beyond the trouser centerline.
                # Bind the whole sole before the narrower leg-width test below,
                # or adjacent sole vertices split between foot and pelvis.
                names = [(f"foot.{side}", 1.0)]
            elif z < 1.03 and 0.045 < ax < 0.29:
                center = 0.14 if x >= 0 else -0.14
                leg_weight = max(0.0, min(0.92, (0.105 - abs(x - center)) / 0.065 * 0.92))
                depth_weight = max(0.0, min(1.0, (0.33 - abs(_y)) / 0.11))
                leg_weight *= depth_weight
                if z < 0.17:
                    names = [(f"foot.{side}", leg_weight * 0.55),
                             (f"shin.{side}", 1.0 - leg_weight * 0.55)]
                elif z < 0.46:
                    shin_weight = max(0.72, leg_weight)
                    names = [(f"shin.{side}", shin_weight),
                             (f"thigh.{side}", 1.0 - shin_weight)]
                elif z < 0.58:
                    names = [(f"shin.{side}", 0.42), (f"thigh.{side}", 0.58)]
                elif z < 0.65:
                    names = [(f"thigh.{side}", 0.70), ("pelvis", 0.30)]
                else:
                    names = [(f"thigh.{side}", leg_weight), ("pelvis", 1.0 - leg_weight)]
            elif z > 1.24:
                names = [("neck", 0.58), ("chest", 0.42)]
            elif z > 1.10:
                names = [("chest", 0.82), ("neck", 0.18)]
            elif z > 0.99:
                names = [("spine", 0.72), ("pelvis", 0.28)]
            else:
                names = [("pelvis", 1.0)]
            for name, weight in names:
                if weight > 0.001:
                    groups[name].add([vertex.index], weight, "REPLACE")
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
                bone.location = (side_shift * bob_gain, 0, vertical_bob * bob_gain)
                bone.keyframe_insert(data_path="location", frame=frame, group=bone_name)
            elif profile == "proportion-v2" and bone_name in {"upper_arm.L", "upper_arm.R"}:
                rest_inverse = rig.data.bones[bone_name].matrix_local.to_3x3().inverted()
                side_sign = 1.0 if bone_name.endswith(".L") else -1.0
                adduction_axis = (rest_inverse @ Vector((0, 1, 0))).normalized()
                adduction = Quaternion(adduction_axis, side_sign * 0.34 *
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
        for key in curve.keyframe_points:
            key.interpolation = "BEZIER"
            key.handle_left_type = "AUTO_CLAMPED"
            key.handle_right_type = "AUTO_CLAMPED"
        if name in {"Idle", "Walk", "Run"}:
            curve.modifiers.new("CYCLES")
    rig.animation_data.action = None
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    return action


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

    def walk_pose(root, side, arm, leg, shin_l, shin_r, foot_l, foot_r, twist):
        return frame(
            root=root, side_shift=side,
            arm_l=(-arm, 0, 0), arm_r=(arm, 0, 0),
            leg_l=(leg, 0, 0), leg_r=(-leg, 0, 0),
            shin_l=(shin_l, 0, 0), shin_r=(shin_r, 0, 0),
            foot_l=(foot_l, 0, 0), foot_r=(foot_r, 0, 0),
            pelvis=(twist, 0, 0), spine=(0.018, 0, 0),
            chest=(-twist * 0.65, 0, 0), head=(-0.008, 0, 0),
            fore_l=(0.10, 0, 0), fore_r=(0.10, 0, 0))

    make_action(rig, "Idle", [
        (1, frame()), (12, frame(0.025, spine=(0.015, 0, 0), head=(-0.015, 0, 0))),
        (24, frame()),
    ], profile=profile)
    make_action(rig, "Walk", [
        # Eight clear poses per stride: contact, down, pass, rise, then mirror.
        # 21 frames at 24 fps keeps the 0.875 s cycle aligned with game speed.
        (1, walk_pose(0.022, -0.015, -0.30, 0.43, 0.03, 0.18, -0.12, 0.12, 0.022)),
        (3.5, walk_pose(0.000, 0.000, -0.21, 0.30, 0.10, 0.26, -0.04, 0.18, 0.018)),
        (6, walk_pose(0.034, 0.018, 0.000, 0.00, 0.05, 0.42, 0.00, -0.10, 0.000)),
        (8.5, walk_pose(0.052, 0.000, 0.21, -0.30, 0.18, 0.24, 0.12, -0.08, -0.018)),
        (11, walk_pose(0.022, 0.015, 0.30, -0.43, 0.18, 0.03, 0.12, -0.12, -0.022)),
        (13.5, walk_pose(0.000, 0.000, 0.21, -0.30, 0.26, 0.10, 0.18, -0.04, -0.018)),
        (16, walk_pose(0.034, -0.018, 0.000, 0.00, 0.42, 0.05, -0.10, 0.00, 0.000)),
        (18.5, walk_pose(0.052, 0.000, -0.21, 0.30, 0.24, 0.18, -0.08, 0.12, 0.018)),
        (21, walk_pose(0.022, -0.015, -0.30, 0.43, 0.03, 0.18, -0.12, 0.12, 0.022)),
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
    out_blend = out_dir / f"{slug}-blender.blend"
    out_glb = out_dir / f"{slug}-game-ready.glb"
    out_preview = out_dir / f"{slug}-preview.png"

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
    optimize_character_textures(CHARACTER_PROFILE)

    before = (len(mesh.data.vertices), len(mesh.data.polygons))
    if len(mesh.data.polygons) > 85000:
        modifier = mesh.modifiers.new("Realtime_Polygon_Budget", "DECIMATE")
        modifier.ratio = min(1.0, 70000 / len(mesh.data.polygons))
        bpy.context.view_layer.objects.active = mesh
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    after = (len(mesh.data.vertices), len(mesh.data.polygons))

    rig = create_rig(mesh, CHARACTER_PROFILE)
    create_actions(rig, gait_gain=1.28 if CHARACTER_PROFILE == "proportion-v2" else 1.0,
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
