---
name: auto-map-studio
description: "Create and postprocess 2D game maps and tilesets inside Codex: plan tilemap or layered-map pipelines, prompt image generation for map art or rough tile sheets, detect and clean AI tiles, normalize tiles into grid-perfect sheets, export metadata, and create simple map previews for Tiled/Godot-style workflows."
---

# Auto Map Studio

Use this skill when the user wants a Codex-native workflow like Sorceress Tileset Forge or Agent Sprite Forge `generate2dmap`: generate or clean 2D map assets, turn rough AI art into usable tilesets, or plan/export a playable 2D map pipeline.

## Recommended Reference Model

Use both references, but for different purposes:

- Sorceress Tileset Forge: product behavior reference. It detects rough tiles, chroma-cleans them, fixes edges, aligns cells, previews maps, and exports clean PNG tilesets.
- Agent Sprite Forge `generate2dmap`: Codex workflow reference. It treats maps as pipelines: base map, props, object layers, collision, trigger zones, and engine-friendly metadata.

For Codex plugin work, prefer the Agent Sprite Forge model: the agent plans the map pipeline, image generation creates visible art, and deterministic scripts clean and export assets.

## Map Pipeline Decision

Choose one of these modes first:

- `tilemap`: for RPG Maker, Tiled, Godot TileMap, Phaser, grid-based top-down maps.
- `layered_map`: for top-down RPG scenes where a base image is combined with separate props and y-sorted objects.
- `prop_pack`: for extracting rocks, trees, furniture, doors, signs, lamps, crates, pickups, and compact reusable scene objects.
- `baked_scene`: for a single battle background, menu background, or non-editable visual scene.

Default to `tilemap` if the user asks for "tiles", "tileset", "Tiled", "RPG Maker", "Godot TileMap", or map larger than one screen with reusable terrain.
Default to `layered_map` if the user wants a beautiful top-down exploration scene with independent props, collision, and trigger zones.

## Tileset Forge Workflow

When the user has a rough AI-generated tile sheet or prop sheet:

1. Copy the source image into the target project. Keep the original generated image in place.
2. Run the local processor:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-map-studio/scripts/auto_tileset_forge.mjs" \
  --input <rough-sheet.png> \
  --out <clean-tileset.png> \
  --meta <clean-tileset.json> \
  --preview <clean-tileset-preview.png> \
  --tile-width 64 \
  --tile-height 64
```

If the bundled runtime paths differ, call `load_workspace_dependencies` and use the reported Node.js executable and package directory.

3. Inspect the metadata:
   - component count
   - rejected components
   - tile grid dimensions
   - detected key color
   - per-tile source bounds and output cell placement
4. Use the exported clean PNG as the runtime tileset.

## Recommended Wuxia RPG Workflow

For a Tian Long Ba Bu / wuxia pixel RPG, prefer this hybrid pipeline:

1. Generate a full-map concept sketch with Codex built-in `image_gen` to establish mood, layout, landmarks, and camera composition.
2. Do not slice that full concept directly into runtime tiles. Treat it as reference only because AI concept maps usually have inconsistent seams, lighting, object scale, and edge continuity.
3. Generate a rough tileset sheet and prop pack from the concept direction.
4. Run `auto_tileset_forge.mjs` to clean and normalize the rough sheet.
5. Generate a deterministic map blueprint with `wuxia_map_blueprint.mjs`.
6. Use the blueprint's Tiled JSON/object layers as the runtime map skeleton.
7. Replace placeholder tile ids with the final clean tileset ids and place props as object-layer sprites.

Use the blueprint script:

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-map-studio/scripts/wuxia_map_blueprint.mjs" \
  --name dali-temple-route \
  --theme "Tian Long Ba Bu inspired Dali mountain temple route" \
  --width 64 \
  --height 48 \
  --tile-size 64 \
  --out-dir ./maps/dali-temple-route
```

This writes:

- `<name>.blueprint.json`: prompts, pipeline decision, tile palette, object plan
- `<name>.tiled.json`: Tiled-compatible map skeleton
- `<name>-tileset.tsx`: tileset reference stub

When speed matters, use a baked or layered full-map image for the prototype. When reuse and game logic matter, use the hybrid tile/object pipeline.

## Design-First Concept Workflow

Use this mode when the generated tilemap preview looks mechanical or too grid-like. Start from the full-map composition, then export engine-friendly data from that design.

1. Generate a full top-down concept map first. This is the art director pass: entrance, paths, landmarks, encounter zones, cliffs, water, shops, training yard, and visual rhythm are solved in one image.
2. Treat that concept as a `layered_map` base, not as raw tiles to slice. Directly slicing an AI full map usually creates broken seams, inconsistent tile edges, and non-reusable props.
3. Generate or reuse a separate rough tileset/prop pack for engine placeholders and object sprites.
4. Run `auto_tileset_forge.mjs` to normalize the tileset/prop pack.
5. Run `design_first_wuxia_map.mjs` with both the concept image and clean tileset.

```bash
NODE_PATH="/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules" \
"/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" \
"/Users/shangguanchenhuan/plugins/auto-map-studio/scripts/design_first_wuxia_map.mjs" \
  --name dali-temple-route-design-first \
  --concept ./maps/dali-temple-route/dali-temple-route-concept.png \
  --tileset ./maps/dali-temple-route/dali-temple-route-clean-tileset.png \
  --width 70 \
  --height 56 \
  --tile-size 64 \
  --source-cell 64 \
  --source-cols 6 \
  --out-dir ./maps/dali-temple-route-design-first
```

This writes:

- `<name>-rendered.png`: final concept-backed map preview, useful for the game prototype or visual approval
- `<name>-tile-layout.png`: debug view of the generated tile/object skeleton
- `<name>-tileset.png`: runtime 64x64 tileset sheet for Tiled-style editors
- `<name>.tiled.json`: Tiled-compatible tile layers, object points, triggers, and collision/interaction regions
- `<name>.design.json`: concept reference, prompts, region plan, and output metadata

Prefer this mode for early RPG scenes because it preserves the designer's composition while still giving Codex and the engine structured data to work with.

Use 64x64 as the fixed runtime tile size unless the user explicitly asks otherwise. Full-map concept images can be any useful resolution, but exported Tiled JSON, collision rectangles, object coordinates, and runtime tilesets should align to 64px units.

## Interior Room Workflow

Use this when the user wants enterable rooms, searchable cabinets, chests, desks, shelves, puzzle objects, or indoor story scenes.

Recommended shape:

1. Generate the whole room from a designer perspective first, as one coherent top-down or three-quarter top-down interior map.
2. Resize/crop the final room background to a fixed 64px grid, commonly `20x12` tiles (`1280x768`) for the current browser RPG viewport.
3. Keep the room as a layered map base during prototype work. Do not force early room art into tiny repeating tiles if the room is unique.
4. Export a Tiled JSON object layer with named triggers:
   - `room_exit`
   - `room_wardrobe`
   - `room_medicine_cabinet`
   - `room_chest`
   - `room_scroll_desk`
5. Put treasure, search, cabinet-open, puzzle, and map-transition behavior in story scripts, not in the renderer.
6. Use the RPG code plugin to wire room entry/exit through `MapTransitionManager`.

Prompt pattern:

```text
Create a complete top-down / three-quarter top-down pixel-inspired wuxia RPG room interior map concept.
The room must be one coherent playable scene with readable walkable floor space.
Include a doorway exit, searchable cabinet, medicine shelf, chest, desk with scrolls, bed, table, lanterns, and screen divider.
No characters, no labels, no UI, no text, no watermark.
```

## Tactical Battle Map Workflow

Use this when the user needs a Heroes of Might and Magic, SanGuoZhi 11, or grid tactics battle scene.

Recommended first-pass shape:

1. Generate the complete battlefield from a designer perspective first. This keeps lanes, cover, landmarks, and visual rhythm coherent.
2. Resize/crop the battle background to an exact runtime grid. For the current browser RPG, use `16x10` cells at `64x64`, which exports to `1024x640`.
3. Do not slice the whole concept directly into reusable terrain tiles during the prototype pass. Treat it as a battle background and author structured tactical data beside it.
4. Export a `<name>.tactics.json` file with:
   - `tileSize`
   - `width` and `height`
   - `blocked` grid cells
   - `playerSpawns`
   - `enemySpawns`
   - `objectives`
5. Keep encounter dialogue and start-battle triggers in the RPG story scripts. The map skill exports tactical data; the RPG code skill consumes it.
6. Add an automated QA tour that enters the encounter, screenshots the pre-battle dialogue, selected-unit move range, movement result, attack, enemy turn, and battle log.

Prompt pattern:

```text
Create a complete top-down / three-quarter top-down pixel-inspired wuxia tactical battle map.
The scene must be one coherent playable battlefield designed for a <W>x<H> grid with 64px runtime cells.
Include readable walkable lanes, obstacle clusters, cover, terrain landmarks, and clear spawn zones.
Do not draw visible UI grid lines.
No characters, no labels, no UI, no text, no watermark.
```

If the same battlefield later needs editor-grade reuse, generate a separate prop pack and tileset from the approved concept direction, then run the tileset forge workflow.

## AI Generation Prompt Pattern

For rough tilesets:

```text
Generate a rough 2D RPG tileset sheet for <theme>.
Include compact individual tiles and props separated by generous padding.
Top-down or 3/4 top-down game perspective.
Include terrain tiles such as grass, dirt path, stone floor, water edge, cliffs, walls, doors, crates, lamps, bushes, rocks, and signs.
Every tile or prop must be isolated as a separate component.
Use a perfectly flat solid #FF00FF chroma-key background.
No labels, no text, no grid lines, no shadows outside individual tiles.
```

For layered map base images:

```text
Generate a ground-only foundation map for <theme>.
Top-down 2D RPG perspective, readable paths and terrain boundaries.
Do not include runtime-controlled props, buildings, characters, doors, trees, chests, labels, UI, or text.
```

For dressed references:

```text
Use the visible base image as reference.
Preserve camera, terrain, roads, water, and boundaries.
Add a sparse in-world mockup of up to 9 intended gameplay objects such as trees, lamps, gates, signs, rocks, doors, and encounter grass.
No annotations, no labels, no arrows, no UI.
```

## What The Script Does

`scripts/auto_tileset_forge.mjs`:

- samples the corner background color
- chroma-keys rough AI backgrounds to alpha
- finds connected alpha components
- filters tiny noise and extreme aspect-ratio components
- crops each tile/prop to bounds
- fits it into a fixed output cell
- anchors to center or bottom-center
- composes a grid-perfect PNG tileset
- writes JSON metadata
- optionally writes a quick preview map PNG

## Map Design Guidance

Do not explain maps as "one giant picture" by default. Most 2D RPG maps are data:

- tile layers for terrain
- object layers for props/NPCs/chests/triggers
- collision layers or tile collision metadata
- camera bounds, exits, spawn points, encounter zones

For a map larger than one screen, the engine renders a camera viewport over a larger tilemap or scene. The designer builds the larger world in an editor like Tiled, LDtk, Godot, or RPG Maker.

## Output Expectations

Return:

- exported tileset path
- metadata path
- preview path if created
- component count and rejected count
- the exact command used
- recommendation for how to use the tileset in Tiled/Godot

If image generation was used, also report the prompt and raw generated image path.
