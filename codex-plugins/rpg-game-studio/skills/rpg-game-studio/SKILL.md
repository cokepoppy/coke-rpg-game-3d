---
name: rpg-game-studio
description: "Plan and scaffold modular browser RPG code in Codex using HTML, CSS, JavaScript, or TypeScript. Use this when a user wants maps, characters, asset manifests, input, camera, animation, collision, scenes, or battle logic separated into maintainable modules instead of one large app file."
---

# RPG Game Studio

Use this skill when the user wants a Codex-native workflow for turning generated 2D RPG assets into code that a browser game can use.

## Boundary With Asset Plugins

Keep responsibilities separate:

- `auto-map-studio`: generates and cleans map art, 64x64 tilesets, Tiled JSON, map design JSON, collision/object/trigger data.
- `auto-sprite-studio`: generates and normalizes character walk sheets, frame metadata, and drift checks.
- `rpg-game-studio`: generates code architecture and adapters that load those assets into an HTML/CSS/JS or TypeScript browser RPG.

Do not place gameplay architecture rules inside a map asset skill. Map plugins should export data; RPG Game Studio should consume that data.

## Runtime Conventions

Default to these conventions unless the project already has a stronger local standard:

- Fixed runtime tile size: `64x64`.
- Treat player/world coordinates as a foot anchor. Keep the visual sprite rectangle separate from the movement collision footprint.
- Default world player collision footprint: `34x28`, centered under the foot anchor. Tune per game only after the asset contract and map collision layer are updated together.
- Browser-first rendering: HTML/CSS shell plus Canvas 2D for map/sprite rendering.
- Keep generated game code as ES modules. Use plain `.js` for no-build prototypes; use `.ts` when the project has or will get a build step.
- Keep asset paths in one manifest file. Do not hard-code image paths across renderers, entities, and scenes.
- Keep map data in `src/maps`, not in entity or scene files.
- Keep battle logic behind a `BattleManager` boundary; world map triggers should request a battle, not run battle calculations directly.

## Recommended Structure

```text
src/
  assets/assetManifest.js
  battle/BattleManager.js
  core/Camera.js
  core/Game.js
  core/GameLoop.js
  core/InputController.js
  entities/Player.js
  entities/SpriteAnimator.js
  inventory/InventoryManager.js
  items/itemCatalog.js
  items/shopCatalog.js
  maps/CollisionSystem.js
  maps/MapManager.js
  maps/MapRenderer.js
  maps/MapTransitionManager.js
  story/GameState.js
  story/QuestLog.js
  story/ScriptRunner.js
  story/storyScripts.js
  ui/DialogBox.js
  ui/InventoryPanel.js
  ui/MenuSystem.js
  ui/ShopPanel.js
  scenes/WorldScene.js
  main.js
```

TypeScript projects use the same structure with `.ts` files.

## Scaffolding Command

```bash
node /Users/shangguanchenhuan/plugins/rpg-game-studio/scripts/scaffold_browser_rpg.mjs \
  --project /path/to/game \
  --language js \
  --tile-size 64 \
  --map-json ./maps/dali-temple-route-design-first/dali-temple-route-design-first.tiled.json \
  --map-image ./maps/dali-temple-route-design-first/dali-temple-route-design-first-rendered.png \
  --hero-sheet ./assets/hero-walk-sheet-normalized.png \
  --hero-frame-width 313 \
  --hero-frame-height 313 \
  --hero-frames 4 \
  --hero-draw-width 128 \
  --hero-draw-height 128
```

The script writes a modular browser RPG skeleton and avoids overwriting existing files unless `--force` is passed.

`--tile-size` is the runtime map grid size. `--hero-frame-width` and `--hero-frame-height` are source sprite sheet cell sizes; they can be larger than 64 because the renderer can draw the character at a fixed in-world size through `--hero-draw-width` and `--hero-draw-height`.

## Story System Command

Use this when the user asks for dialogue, quest scripting, puzzle scripting, treasure discovery, NPC scenes, or plot progress driven by data.

```bash
node /Users/shangguanchenhuan/plugins/rpg-game-studio/scripts/scaffold_story_system.mjs \
  --project /path/to/game \
  --language js
```

This writes:

- `src/story/GameState.js`: flags, inventory, quest state, recent story log
- `src/story/QuestLog.js`: active and completed quest views
- `src/story/ScriptRunner.js`: dialogue node traversal and action execution
- `src/story/storyScripts.js`: starter data format for branching story scripts
- `src/ui/DialogBox.js`: reusable dialogue UI controller

Story scripts should be data-first. Keep dialogue text, choices, conditions, and actions in story data; keep rendering in UI modules; keep battle math in `BattleManager`; keep map triggers in `MapManager`.

## Multi-Map Room Scenes

Use this pattern for entering buildings, rooms, caves, dungeons, or interior scenes:

- Put every map in `assets.maps` with `json`, `image`, and `spawns`.
- Allow `assets.maps[mapId].collision` overlays for hand-authored masks that do not belong in generated art files, such as roofs, stalls, walls, and large props.
- Use `MapTransitionManager` to load a map, renderer, collision system, and spawn point together.
- A door trigger should run a story script such as `inn_room_door`; the script emits an `enterMap` action.
- Room objects should be normal story triggers: `room_wardrobe`, `room_medicine_cabinet`, `room_chest`, `room_scroll_desk`, `room_exit`.
- Keep search results in `storyScripts.js`; keep inventory/flags in `GameState`; keep map switching in `WorldScene.enterMap`.
- End-to-end QA should include an automated tour script that walks to triggers, runs scripts, clicks choices, and saves screenshots.

## Collision And Occlusion Workflow

Use this pattern when maps, interiors, NPC placement, or generated scenery need reliable walkability and depth ordering:

- Keep blocking rectangles in map object layers with type `collision` or in `assets.maps[mapId].collision`.
- Use `collisionTypes` only for object types that are always blocking in the current map. Do not add broad types such as `prop` unless every prop is truly solid; bridges, doors, signs, and decorative props often need different behavior.
- Keep visual foreground/depth masks in `assets.maps[mapId].occlusion` or map objects with type `occlusion`.
- Draw order should be map base, NPCs/sprites, then occlusion masks. Occlusion masks can redraw the same map-image rectangle over sprites for roofs, furniture fronts, stall fronts, and screens.
- Door triggers must be reachable by the player foot collision box. Do not let roof/body collision masks cover the door trigger approach zone.
- NPC placement must be validated against collision before accepting a map pass. NPCs should appear on reachable ground near likely player routes, not on roofs or hidden in dense grass.
- Add machine-readable checks to `scripts/world_contract_check.mjs` for every critical map pass: world occlusion count, room occlusion count, reachable door zones, reachable NPC placements, and blocked furniture/roofs.

## Menu System Workflow

Use this when the game needs a reusable main menu, pause menu, settings screen, save/load controls, or future title-screen flow:

- Keep menu rendering and local storage behavior in `src/ui/MenuSystem.js`; do not put menu HTML generation in `Game` or `WorldScene`.
- `Game` owns global menu hotkeys such as `Esc` and `M` because it coordinates scene updates and overlays.
- `WorldScene` exposes `startNewGame()`, `snapshot()`, and `restoreSnapshot()` so the menu can start, save, and load without knowing map internals.
- Startup should show the main menu first. Automated tours must click `data-action="new"` before waiting for opening dialogue.
- Keep settings controls present even when some settings are placeholders; disabled controls are better than hidden, undocumented future state.
- Screenshot QA should include main menu, settings, pause menu, save feedback, load-enabled state, and returning to the world.

## Tactical Battle System Workflow

Use this when the user wants turn-based grid combat, battle encounters launched by NPC dialogue, combat skills, enemy AI, or reusable combat QA loops.

Recommended module boundaries:

- `src/battle/BattleManager.js`: converts story actions such as `startBattle` into battle configs.
- `src/tactics/TacticsMap.js`: loads battle map JSON, blocked cells, spawn cells, and 64px grid metadata.
- `src/tactics/BattleState.js`: owns turn state, selected units, legal movement, attacks, skill points, victory/defeat, and battle logs.
- `src/tactics/EnemyAI.js`: runs deterministic enemy turns against the same movement and attack rules as the player.
- `src/tactics/TacticsRenderer.js`: draws the battle background, grid, move highlights, units, HP bars, and attack animation feedback.
- `src/tactics/BattleScene.js`: connects map, state, renderer, input, HUD, and finish callbacks.
- `src/ui/BattleHud.js`: renders turn status, selected unit stats, skill buttons, end-turn, and combat log.

Workflow:

1. Add an enemy NPC or encounter trigger to the world map data.
2. Add a story script with a choice such as `拔剑迎战`; the accepted branch emits `{ type: "startBattle", enemyId }`.
3. Keep pre-battle dialogue in `storyScripts.js`; keep battle math in tactics modules.
4. Load a design-first tactics map JSON with fixed `64x64` cells.
5. On player click, select own unit, show legal move cells, move to a clicked legal cell, then allow attacks or skills when an enemy is in range.
6. After the player ends the turn, run enemy AI through the same movement and attack state APIs.
7. Skill buttons should enter a target-selection phase instead of auto-attacking. Highlight valid target cells, then resolve the attack after the player clicks a highlighted enemy.
8. Set attacker and target facing before damage is applied. Use hit flash, attack effects, and battle logs as machine-readable feedback.
9. On victory, show a result dialogue and return to the world scene. On defeat, show a game-over dialogue.
10. Write a Playwright QA script that screenshots the encounter dialogue, battle start, movement range, move, skill targeting, hit feedback, victory dialogue, and return to the world; also write a JSON battle log for Codex feedback.

Battle QA is part of the workflow, not an afterthought. If screenshots or logs show drift, missing highlights, invalid turn transitions, or broken attacks, fix the corresponding module and rerun the tour.

## Inventory And Shop Workflow

Use this when the user wants a backpack, item drops, money, equipment, consumables, vendors, shops, or item UI.

Recommended module boundaries:

- `src/items/itemCatalog.js`: item definitions, rarity, type, price, effect, description, and icon metadata.
- `src/items/shopCatalog.js`: shop stock, item prices, purchase limits, and shop identity.
- `src/inventory/InventoryManager.js`: buy, add item, add money, item listing, and inventory-facing operations.
- `src/ui/InventoryPanel.js`: backpack modal/panel only; no item economy math.
- `src/ui/ShopPanel.js`: vendor stock and purchase UI only; calls `InventoryManager`.
- `src/story/scripts/shopScripts.js`: vendor dialogue and `openShop` actions; do not fold every shop script into the global `storyScripts.js`.
- `scripts/inventory_tour.mjs`: screenshot tour for opening backpack, opening vendor shop, buying items, and checking money/items changed.

Keep the item set small until the economy is real: a few healing/qi consumables, a few weapon archetypes, money, and quest items. Do not generate dozens of items before there is gameplay pressure for them.

For AI item art, prefer a single atlas image over one image call per item:

- one atlas prompt
- fixed grid/cell size
- flat chroma-key background
- row-major item order
- local chroma-key removal or CSS placeholder fallback
- item IDs in code stay stable regardless of art changes

Inventory QA should capture:

1. empty or starting backpack
2. vendor dialogue
3. shop stock list
4. purchase feedback and money change
5. backpack after purchase
6. machine-readable inventory summary JSON

## World Contract QA

Every RPG map pass should include a small automated contract check before visual acceptance:

- runtime tile size is `64`
- player collision footprint matches the configured contract
- map collision overlays load through `MapManager`
- map occlusion overlays load through `MapManager`
- critical roofs/buildings are blocked
- critical door approach zones and NPC foot positions are reachable
- critical story triggers still exist after collision changes

Keep this check separate from screenshot tours. Screenshot tours prove the player-facing flow; contract checks prove the machine-readable constraints that prevent recurring issues such as walking onto roofs or missing door/battle triggers.

## Implementation Rules

When applying this skill to a repo:

1. Inspect the existing app entry point and asset locations first.
2. If the project is currently one large file, do not refactor everything blindly. Add the modular skeleton beside it first, then migrate one subsystem at a time.
3. Put map loading, tile size, world pixel size, object layers, triggers, and collision into `MapManager`.
4. Put camera following and viewport clamping into `Camera`.
5. Put keyboard state into `InputController`.
6. Put sprite frame selection and timing into `SpriteAnimator`.
7. Put player movement, facing, and collision response into `Player`.
8. Put drawing order and canvas rendering into `MapRenderer` or a scene renderer.
9. Keep battle UI and battle math outside map code.

## Output Expectations

Report:

- whether the project uses JS modules or TS modules
- fixed tile size
- generated module paths
- which existing game files were left untouched
- the next migration step
