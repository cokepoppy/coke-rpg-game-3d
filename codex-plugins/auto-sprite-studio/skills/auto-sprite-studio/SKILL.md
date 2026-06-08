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
6. Run animation audit before using the sheet in the game. This catches hidden residue pixels, bad frame bounds, cropped feet, and frame wobble that are hard to see on a map.
7. Use the audited sheet in the game runtime, not the raw AI sheet.

## Existing Sheet Workflow

If the user already has a sheet, skip image generation and run the postprocessor directly. For non-4x4 sheets, pass `--rows` and `--cols`.

```bash
node scripts/auto_sprite_sheet.mjs --input actor.png --out actor-normalized.png --rows 4 --cols 4
```

## Animation QA Workflow

Use this after every generated or normalized character sheet.

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/sprite_animation_audit.mjs" \
  --input <sheet.png> \
  --out <sheet-audited.png> \
  --report <sheet-audited.json> \
  --contact <sheet-audit-contact.png>
```

What the audit does:

- slices the sheet by the declared grid
- finds alpha connected components in each frame
- treats the largest component as the character body
- flags all smaller components as residue pixels
- removes residue components from the audited output
- realigns each direction row by body bottom-center anchors
- writes before/after drift metrics and residue counts
- writes a contact sheet for visual review

For browser projects, also provide a local animation inspector page. It should show:

- four direction playback
- one-frame zoom
- body bounds
- original alpha bounds
- foot anchor line
- residue component overlays
- source/cleaned sheet switching

Do not rely only on checking the character inside the world map. Map art can hide crop mistakes, dirty pixels, and foot-anchor drift.

## Batch Character Roster Workflow

Use this when the user wants many RPG characters made efficiently from AI image generation.

Recommended shape:

1. Create `assets/characters/roster.json` with one entry per character. Include `id`, `name`, `role`, `description`, and the shared 4x4 walk-sheet contract.
2. Generate prompt files from the roster:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/create_character_prompts.mjs"
```

3. Use GPT Image 2 / built-in image generation once per character prompt. Save each result as:

```text
assets/characters/<character-id>/<character-id>-walk-raw.png
```

4. Run the roster processor:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/process_character_roster.mjs"
```

This runs `auto_sprite_sheet.mjs`, then `sprite_animation_audit.mjs`, then writes `src/assets/characterManifest.js`.

Quality gate:

- residue pixels after audit should be `0`
- row foot drift should be close to `0`
- row x drift should be low enough that playback does not wobble
- inspect the generated contact sheets before using sprites in game scenes

The game should consume `characterManifest.js` by `spriteId`; world NPCs and battle units should not hard-code image paths.

## Battle Effect Roster Workflow

Use this for reusable combat animation effects such as sword slash, sword energy projectile, hit spark, heal glow, dust step, stun ring, or elemental effects.

1. Create `assets/effects/effect-roster.json`.
2. Generate prompt files:

```bash
node /Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/create_effect_prompts.mjs
```

3. Use GPT Image 2 once per effect prompt and save each raw effect as:

```text
assets/effects/<effect-id>/<effect-id>-raw.png
```

4. Process the effects:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
node /Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/process_effect_roster.mjs
```

This writes cleaned chroma-keyed PNG sheets and updates `src/assets/effectManifest.js`.

Prefer reusable shared effects over one bespoke attack animation per character in early prototypes. This gives the best production speed while still replacing crude canvas placeholders with real GPT Image 2 generated animation art.

## Drift Explanation

When an animation appears to wobble or float, measure the alpha bounding box of each frame. AI-generated sheets often keep the character visually consistent but place each frame at a different center inside its cell. Runtime code then crops fixed cells, so the character appears to drift. This plugin fixes that by aligning each row to a shared bottom-center anchor.

## Output Files

Expected outputs:

- normalized sprite sheet PNG
- audited sprite sheet PNG
- metadata JSON containing dimensions, drift metrics, frame bounds, and row/column metadata
- audit JSON containing body components and residue pixels
- contact sheet or browser screenshots for QA
- optional extracted individual frame PNGs

Report final paths and the before/after drift numbers to the user.
