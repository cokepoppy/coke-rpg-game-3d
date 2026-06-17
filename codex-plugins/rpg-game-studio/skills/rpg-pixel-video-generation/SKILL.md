---
name: rpg-pixel-video-generation
description: "Generate pixel-style RPG cutscene videos from existing game sprite style, Image Gen character references, and Seedance/Chrome workflows. Use when the user asks for wuxia/RPG pixel animations, NPC skill-teaching cutscenes, image-to-video generation, Seedance 2 Pro video prompts, or reusable Codex workflows for game cutscene production."
---

# RPG Pixel Video Generation

Use this skill to create short pixel-style RPG cutscenes that match this project's existing character and map art.

## Style Contract

Always match the runtime sprite style before generating video:

- Character source sheet: `1252x1252`, 4 rows by 4 columns, each frame `313x313`.
- Runtime look: compact chibi 2D RPG sprite, large readable head, short body, crisp pixel edges.
- Rows: down, left, right, up.
- Columns: idle, walk step A, idle, walk step B.
- Anchor: foot-center remains stable across frames.
- Do not use tall portrait illustrations, painterly concept art, cinematic full-body paintings, or high-detail anime key art as Seedance character references.

For this project, compare against:

- `assets/characters/hero/hero-walk-anchored-v4-motionfix.png`
- `assets/characters/a_luo/a_luo-walk-anchored.png`
- `assets/characters/medicine_vendor/medicine_vendor-walk-anchored.png`
- `assets/characters/inn_keeper/inn_keeper-walk-anchored.png`

## Workflow

1. Build a style reference contact sheet from existing characters and the new candidate.
2. Generate or select a sprite-style reference image, not a large illustration.
3. If Image Gen output uses chroma key, remove it locally and normalize the sheet to `1252x1252`.
4. Extract a clean single frame when the video tool needs one still image rather than a full sheet.
5. Write a short video prompt with camera, action, style, duration, and avoid rules.
6. Use Seedance 2 Pro through Chrome when the user is logged in.
7. Upload the sprite-style reference image.
8. Generate the cutscene, download the video, and save it under `assets/generated/videos/`.
9. Add a manifest entry with prompt, source image, provider, date, downloaded file, and intended story trigger.
10. Capture a still/contact sheet from the downloaded video for visual QA.

## Video Prompt Template

```text
Pixel-art wuxia RPG cutscene, vertical mobile game composition.
Use the uploaded sprite-style Daoist elder as the character reference.
Scene: the protagonist meets an old Daoist NPC beside a mountain path shrine, they speak briefly, then the Daoist teaches the skill "扶摇诀".
Action: the elder raises his bamboo staff; wind and pale cloud ribbons spiral upward; the protagonist receives a brief aura; the scene feels inspired by Zhuangzi's Xiaoyao You, free and airy.
Style: chibi 2D RPG sprite animation, same scale as classic top-down pixel RPG characters, crisp pixel edges, limited animation, no painterly realism.
Camera: fixed top-down/isometric RPG camera, no aggressive zoom, no cinematic live-action camera.
Duration: 5-8 seconds.
Avoid: realistic portrait, 3D render, anime key art, text captions, logos, watermarks, extra characters, changing the character outfit, large head drift, blurry scaling.
```

## Asset Paths

Use these default locations:

- Character source: `assets/generated/npcs/<id>-spritesheet-source.png`
- Character alpha sheet: `assets/generated/npcs/<id>-spritesheet-alpha.png`
- Seedance still reference: `assets/generated/npcs/<id>-seedance-reference.png`
- Video output: `assets/generated/videos/<id>.mp4`
- Video manifest: `assets/generated/videos/video-manifest.json`
- QA still/contact sheet: `screenshots/video-generation/<id>-contact.png`

## QA Rules

Reject or regenerate if:

- The reference character does not match the existing sprite scale.
- The video turns into a large painterly illustration.
- The character identity changes between frames.
- The animation introduces live-action/3D rendering.
- Text, watermark, or UI chrome appears in the generated video.
- The downloaded file is not saved into the workspace.

## References

- Read `references/seedance-workflow.md` before operating Seedance through Chrome.
- Read `references/seedance-api-contract.md` before using the captured web API.
- Use `scripts/seedance-submit.mjs` from the project root for dry-run validation
  and explicitly authorized generation. Never persist authentication material.
