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
  maps/CollisionSystem.js
  maps/MapManager.js
  maps/MapRenderer.js
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
