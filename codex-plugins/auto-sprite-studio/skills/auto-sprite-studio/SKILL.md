---
name: auto-sprite-studio
description: "Generate and postprocess 2D game sprite sheets inside Codex: prompt Codex built-in image_gen for a character sheet, remove chroma-key backgrounds, slice frames, measure drift, align frames by bottom-center foot anchors, preview results, and export engine-ready PNG sheets plus metadata."
---

# Auto Sprite Studio

Use this skill when the user wants a Codex-native workflow like Sorceress Auto-Sprite: generate a character, turn it into a frame sheet, fix frame drift, preview the animation, and export files for a game.

## What This Plugin Does

This is a Codex workflow plugin, not a hosted SaaS backend. It provides:

- a generation prompt pattern for Codex built-in `image_gen`
- a deterministic postprocessor at `scripts/auto_sprite_sheet.mjs`
- frame drift metrics before and after alignment
- normalized PNG sheet output
- global foot-anchor audit and correction across all directions
- optional individual frame PNG export
- JSON metadata for engine integration

## Default Sprite Contract

Default to a 4x4 top-down walker:

- world map tile size: `64x64`
- final normalized source frame: `128x128`
- runtime draw size: `64x96`
- runtime foot anchor: `(64,112)` inside the normalized source frame
- collision footprint: `34x28`, centered under the foot anchor
- 4 columns x 4 rows
- row 1: facing down
- row 2: facing left
- row 3: facing right
- row 4: facing up
- frames per row: idle, left step, idle, right step
- fixed cell grid
- solid `#FF00FF` chroma-key background if true transparency is not available
- stable bottom-center foot anchor in every frame
- at least 8 px top padding and 10 px side padding after normalization
- down/up walk rows must alternate opposite feet in columns 2 and 4

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

5. Read the metadata. A successful first-pass alignment should reduce each row's `xDrift` and `footDrift` close to `0`.
6. Run animation audit before using the sheet in the game. This catches hidden residue pixels, bad frame bounds, cropped feet, and frame wobble that are hard to see on a map.
7. Run global anchor audit. This aligns the foot-contact anchor across all directions, not just within each row.
8. If the anchor report says `regenerate: true`, do not keep patching the image. Use `regenerationPrompt` with Codex built-in `image_gen`, copy the new raw sheet into the project, and rerun the pipeline.
9. Use the anchored sheet in the game runtime only after `pass: true`.

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

Then run the global foot-anchor audit:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/sprite_anchor_audit.mjs" \
  --input <sheet-audited.png> \
  --out <sheet-anchored.png> \
  --report <sheet-anchored.json> \
  --contact <sheet-anchor-contact.png>
```

What the anchor audit does:

- finds the largest body component in each frame
- estimates the foot-contact anchor from the lowest opaque pixel band
- measures `anchorXDrift` and `anchorYDrift` across the entire 4x4 sheet
- shifts frames so every direction shares the same logical map anchor
- fails the sheet when post-correction anchor drift is above 2 px
- fails the sheet when top/side padding suggests cropping
- fails the sheet when down/up walk rows do not alternate opposite stepping feet
- writes `regenerate: true` plus a ready-to-use `regenerationPrompt` when the problem needs a new image
- writes an overlay contact sheet with crosshair and per-frame anchor dots

For browser projects, also provide a local animation inspector page. It should show:

- four direction playback
- one-frame zoom
- body bounds
- original alpha bounds
- foot anchor line
- global anchor crosshair and PASS/FAIL status
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

3. Use Codex built-in `image_gen` once per character prompt. Save each result as:

```text
assets/characters/<character-id>/<character-id>-walk-raw.png
```

4. Run the roster processor:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/process_character_roster.mjs"
```

This runs `auto_sprite_sheet.mjs`, then `sprite_animation_audit.mjs`, then `sprite_anchor_audit.mjs`, then writes `src/assets/characterManifest.js`.

Quality gate:

- residue pixels after audit should be `0`
- row foot drift should be close to `0`
- row x drift should be low enough that playback does not wobble
- global `anchorXDrift` and `anchorYDrift` after anchor audit should be `0`, or at most `2`
- `regenerate` must be `false`
- if `regenerate` is `true`, feed `regenerationPrompt` to Codex built-in `image_gen` and repeat the loop
- inspect the generated contact sheets before using sprites in game scenes

The game should consume `characterManifest.js` by `spriteId`; world NPCs and battle units should not hard-code image paths.

## Battle Effect Roster Workflow

Use this for reusable combat animation effects such as sword slash, sword energy projectile, hit spark, heal glow, dust step, stun ring, or elemental effects.

1. Create `assets/effects/effect-roster.json`.
2. Generate prompt files:

```bash
node /Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/create_effect_prompts.mjs
```

3. Use Codex built-in `image_gen` once per effect prompt and save each raw effect as:

```text
assets/effects/<effect-id>/<effect-id>-raw.png
```

4. Process the effects:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
node /Users/shangguanchenhuan/plugins/auto-sprite-studio/scripts/process_effect_roster.mjs
```

This writes cleaned chroma-keyed PNG sheets and updates `src/assets/effectManifest.js`.

Prefer reusable shared effects over one bespoke attack animation per character in early prototypes. This gives the best production speed while still replacing crude canvas placeholders with real `image_gen` animation art.

## Character Attack Sheet Workflow

Use a separate character attack sheet when body and weapon motion must match a
specific actor. Keep the same 4x4 direction order as the walk sheet:

- rows: down, left, right, up
- columns: guard, weapon raised, strike impact, recovery
- fixed bottom-center foot anchor in every frame
- final runtime sheet: `512x512`, or `128x128` per frame

Use the actor's accepted walk sheet as the identity/style reference for
`image_gen`. Pass `--motion attack` through all three processing stages. The
first two stages remove the chroma key and residue without centering on a long
weapon bounding box; the anchor stage extracts the actor body separately from
the blade and performs the actual alignment:

```bash
node scripts/sprite_anchor_audit.mjs \
  --motion attack \
  --input actor-attack-audited.png \
  --out actor-attack-anchored.png \
  --report actor-attack-anchored.json \
  --contact actor-attack-anchor-contact.png
```

`--motion attack` preserves the shared crop, residue, margin, and anchor gates
but skips the walk-only opposite-foot gait check. Do not use a walk frame as a
stand-in after an accepted actor attack sheet exists.

## Drift Explanation

When an animation appears to wobble or float, measure the alpha body and foot-contact anchor of each frame. AI-generated sheets often keep the character visually consistent but place each direction at a different vertical or horizontal position inside its cell. Runtime code draws fixed cells, so the transparent padding becomes visible motion drift. This plugin fixes that in two passes: first aligning each row, then aligning the global foot-contact anchor across all directions.

## Output Files

Expected outputs:

- normalized sprite sheet PNG
- audited sprite sheet PNG
- anchored sprite sheet PNG
- metadata JSON containing dimensions, drift metrics, frame bounds, and row/column metadata
- audit JSON containing body components and residue pixels
- anchor JSON containing global foot-anchor drift and pass/fail state
- contact sheet or browser screenshots for QA
- optional extracted individual frame PNGs

Report final paths and the before/after drift numbers to the user.
