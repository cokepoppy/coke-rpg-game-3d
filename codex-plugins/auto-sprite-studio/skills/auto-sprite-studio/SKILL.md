---
name: auto-sprite-studio
description: "Generate and postprocess 2D game sprite sheets inside Codex: prompt GPT Image 2 for a character sheet, remove chroma-key backgrounds, slice frames, measure drift, align frames by bottom-center foot anchors, preview results, and export engine-ready PNG sheets plus metadata."
---

# Auto Sprite Studio

Use this skill when the user wants a Codex-native workflow like Sorceress Auto-Sprite: generate a character, turn it into a frame sheet, fix frame drift, preview the animation, and export files for a game.

## What This Plugin Does

This is a Codex workflow plugin, not a hosted SaaS backend. It provides:

- a generation prompt pattern for GPT Image 2 / built-in image generation
- a deterministic postprocessor at `scripts/auto_sprite_sheet.mjs`
- frame drift metrics before and after alignment
- normalized PNG sheet output
- optional individual frame PNG export
- JSON metadata for engine integration

## Default Sprite Contract

Default to a 4x4 top-down walker:

- 4 columns x 4 rows
- row 1: facing down
- row 2: facing left
- row 3: facing right
- row 4: facing up
- frames per row: idle, left step, idle, right step
- fixed cell grid
- solid `#FF00FF` chroma-key background if true transparency is not available
- stable bottom-center foot anchor in every frame

## Workflow

1. Clarify only if the output shape is genuinely ambiguous. Otherwise choose the 4x4 walker contract.
2. Generate the raw sheet with the built-in image generation tool when the user wants AI generation. Use a prompt like:

```text
Generate a single 4x4 sprite sheet of <character description>.
Top-down 3/4 RPG perspective, compact readable game sprite, consistent identity.
Exact 4 columns x 4 rows. Row 1 faces down walk cycle, row 2 faces left, row 3 faces right, row 4 faces up.
Four frames per row: idle, left step, idle, right step.
Every frame centered in its cell with identical scale and a stable bottom-center feet anchor.
Perfectly flat solid #FF00FF chroma-key background. No shadows outside the character, no labels, no grid lines, no text.
```

3. Copy the generated image from `$CODEX_HOME/generated_images/...` into the target project. Keep the original generated image in place.
4. Run the postprocessor from this plugin:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/auto_sprite_sheet.mjs" \
  --input <raw-sheet.png> \
  --out <normalized-sheet.png> \
  --meta <normalized-sheet.json> \
  --frames-dir <frames-dir>
```

If the bundled runtime paths are different in the current session, call `load_workspace_dependencies` first and use the reported Node.js executable and package directory.

5. Read the metadata. A successful alignment should reduce each row's `xDrift` and `footDrift` close to `0`.
6. Use the normalized sheet in the game runtime, not the raw AI sheet.

## Existing Sheet Workflow

If the user already has a sheet, skip image generation and run the postprocessor directly. For non-4x4 sheets, pass `--rows` and `--cols`.

```bash
node scripts/auto_sprite_sheet.mjs --input actor.png --out actor-normalized.png --rows 4 --cols 4
```

## Drift Explanation

When an animation appears to wobble or float, measure the alpha bounding box of each frame. AI-generated sheets often keep the character visually consistent but place each frame at a different center inside its cell. Runtime code then crops fixed cells, so the character appears to drift. This plugin fixes that by aligning each row to a shared bottom-center anchor.

## Output Files

Expected outputs:

- normalized sprite sheet PNG
- metadata JSON containing dimensions, drift metrics, frame bounds, and row/column metadata
- optional extracted individual frame PNGs

Report final paths and the before/after drift numbers to the user.
