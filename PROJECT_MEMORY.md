# Project Memory

This file records pitfalls already found in this RPG prototype. Read it before changing maps, sprites, battle logic, QA scripts, or local dev setup.

## Fixed Runtime Contracts

- Map tile size is fixed at `64x64`.
- World player position is a foot anchor, not the top-left corner of the visible sprite.
- Default world player collision footprint is `34x28`, centered under the foot anchor.
- Character sprite generation should target a fixed source frame and draw contract:
  - source frame: `128x128`
  - runtime draw size: `64x96`
  - anchor: `64,112`
  - top margin: at least `8px`
  - side margin: at least `10px`
  - max anchor drift: `2px`
- If an asset fails the sprite contract, regenerate it instead of compensating with map or renderer hacks.

## Sprite Animation Pitfalls

- Main character walking can look like it is floating when each direction row has a different visual center. The fix is not just moving frames manually; the workflow needs a stable anchor check across all directions.
- Up/down walk can look unnatural when frame 1 and frame 3 do not alternate opposite feet. The sprite audit checks this with vertical gait metrics.
- Up-facing frames can crop the head if the generated sheet does not preserve enough top margin. The audit must check top contact/margin before accepting the asset.
- Do not judge sprite animation only inside the map. Use the sprite studio/player page with anchor crosshair and neutral background so clipping and drift are visible.
- The current runtime hero asset is `assets/characters/hero/hero-walk-anchored-v4-motionfix.png`. It is derived from `v3-gaitfix` by stabilizing per-frame body center drift to `0px`; this targets the visible left/right walking stutter reported on 2026-06-10.
- A sprite can pass foot-anchor checks and still look jittery if body center drift is high between frames. Run `codex-plugins/auto-sprite-studio/scripts/sprite_animation_audit.mjs` when left/right walking looks like it is stuttering.
- Do not treat `sprite_anchor_audit` and `sprite_animation_audit` as the same acceptance gate. The anchor audit infers foot-contact center and may flag intentional step-foot changes after body-center stabilization. For perceived walk jitter, inspect the animation audit `xDrift` and the sprite player/contact sheet.
- If image generation produces good identity/art but up/down step frames fail gait sign checks, a controlled post-process can mirror only the fourth frame of the down/up rows from the second frame, then rerun `sprite_anchor_audit`. Do this only after visual inspection confirms identity and framing are otherwise good.

Useful checks:

```bash
node scripts/sprite_anchor_audit.mjs
```

## Map And Collision Pitfalls

- The rendered map image is only visual. Collision must be explicit data.
- Generated Tiled objects are not all blocking by default. `MapManager` currently treats objects with type `collision` as blocking, selected `assets.maps[mapId].collisionTypes`, plus `assets.maps[mapId].collision` overlays.
- Do not make every `prop` object blocking. Bridges, signs, doors, and decorative props can share the same Tiled type but need different collision behavior. Prefer explicit masks or narrow `collisionTypes` such as `supply`, `battle`, and `boss`.
- Roofs, walls, stalls, beds, cabinets, screens, and large props need collision masks. Otherwise the player can walk onto roofs or through furniture.
- Occlusion/depth masks are separate from collision. Use `assets.maps[mapId].occlusion` or map objects with type `occlusion`, then draw base map, NPCs/sprites, player, and occlusion masks last.
- Do not use one large foreground rectangle for a complex prop near an NPC. The medicine stall needed split occlusion masks for roof/counter; a single `256x192` mask covered the vendor/player area.
- NPCs must be placed on reachable foot-anchor positions and near likely player routes. The contract check should fail if an NPC foot position overlaps collision.
- Door triggers should be large enough to touch the player foot collision box, but roof/body collision should not cover the reachable trigger zone.
- Large generated trigger zones can overlap small hand-authored triggers. `MapManager.triggerAt()` and `triggerNear()` should choose the nearest matching trigger, not the first object in Tiled order; otherwise the inn door can be swallowed by the broad medicine-market trigger.
- Scripted auto-walk is used for QA tours and may bypass some manual navigation friction. Manual movement must still obey `CollisionSystem`.

Useful check:

```bash
NO_PROXY='*' NODE_PATH=/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
BASE_URL=http://127.0.0.1:5173 \
/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/world_contract_check.mjs
```

This verifies:

- tile size is `64`
- player collision footprint is `34x28`
- roof collision masks block movement
- world and room occlusion masks load
- door and NPC foot positions are reachable
- room furniture blocks movement
- room and battle triggers still exist

## Menu System Pitfalls

- The game now boots to `MenuSystem` first. Automated Playwright tours must click `[data-action="new"]` before waiting for opening dialogue.
- Keep main/pause/settings/save/load UI in `src/ui/MenuSystem.js`; `Game` should only route global menu hotkeys, and `WorldScene` should only expose `startNewGame`, `snapshot`, and `restoreSnapshot`.
- Save/load should serialize game state through `GameState.snapshot()` and `GameState.restore()` rather than reading story flags, money, or inventory directly from UI code.
- Menu QA should capture the title menu, settings panel, pause menu, save feedback, load-enabled state, and loaded world state.

## Audio Pitfalls

- Browser background music must start from a user gesture. Call `AudioManager.play()` from menu button handlers such as New Game, Continue, or Load, not during app boot.
- Keep generated BGM metadata in `assets/audio/bgm-manifest.json` so later work knows which file is selected, which alternates exist, and what prompt produced the track.

## Map Rendering Pitfalls

- Pixel maps can look blurry even when `imageSmoothingEnabled = false` if the camera samples the source image at fractional coordinates.
- Camera follow positions should be rounded to integers before drawing.
- If a map still looks blurred after integer camera coordinates, check whether the source map image itself was upscaled or exported with interpolation.

## Room / Multi-Map Pitfalls

- Entering a room is a map transition, not a modal or overlay.
- Room interactables should be triggers with story scripts, not hard-coded click handlers in the scene.
- Room QA needs to walk to every room trigger and screenshot each branch. This catches missing triggers, wrong spawn positions, and hidden object regressions.
- Tour scripts should clear their screenshot output directory before running; otherwise old screenshots can pollute contact sheets and make QA misleading.

Useful check:

```bash
NO_PROXY='*' NODE_PATH=/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
BASE_URL=http://127.0.0.1:5173 \
/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/room_tour.mjs
```

Output contact sheet:

```text
screenshots/room-tour/room-tour-contact.png
```

## Battle System Pitfalls

- Skill buttons should not auto-pick the first enemy. They should enter a target-selection phase, highlight valid target cells, then resolve after the player clicks a target.
- After a move, the selected unit should be able to attack or use a skill if a target is in range.
- Before applying damage, set attacker direction toward the target and target direction toward the attacker.
- Hit feedback needs a visible animation, such as flash/alpha flicker, not only a small y-offset.
- Idle units should animate through frames so the battlefield does not look frozen.
- Victory must show a result dialog, apply rewards, then return to the world map. Defeat must show a game-over dialog.
- Battle QA should force a small deterministic victory case when the goal is to test UI flow, not full combat balance.

Useful check:

```bash
NO_PROXY='*' NODE_PATH=/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
BASE_URL=http://127.0.0.1:5173 \
/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/battle_tour.mjs
```

Output contact sheet:

```text
screenshots/battle-tour/battle-tour-contact.png
```

## Local Dev / QA Pitfalls

- This repo is currently a static HTML/JS prototype without `package.json`.
- Use a static server, not direct file open, for normal testing:

```bash
python3 -m http.server 5173 --bind 127.0.0.1
```

- A stale Python server on port `5173` can stay alive but return `ERR_EMPTY_RESPONSE` or `502`. If curl fails, restart the server.
- Always test with `127.0.0.1` and `NO_PROXY='*'` when running Playwright/curl locally; proxy settings can produce misleading `502` results.
- The system Node may not have `playwright` or `sharp`. Use the Codex bundled runtime:

```bash
NODE_PATH=/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node <script>
```

- Before trusting a browser failure, first confirm the local server:

```bash
curl --noproxy '*' -I --max-time 3 http://127.0.0.1:5173/index.modular.html
```

- Do not run multiple Playwright tours against the same static server in parallel. The pages are separate, but screenshots, timing, and startup waits become harder to interpret. Run contract/tour scripts sequentially when validating before a commit.

## Inventory / Shop Pitfalls

- Keep item definitions, shop stock, inventory economy logic, shop UI, and vendor story scripts in separate modules.
- A vendor script should emit an `openShop` action; it should not implement purchase/deduct-money logic inside the dialogue data.
- Screenshot QA for inventory must include both UI and state: capture the shop screens, then write an `inventory-summary.json` with money and item counts.
- Item art should be generated as a small atlas when possible. Runtime item IDs must not depend on atlas layout, because atlas generation may need to be retried or replaced.

## Image Generation Pitfalls

- `image_gen` can fail with generic service/server errors. Do not silently replace failed generations with placeholder art when the user specifically asked for GPT image generated assets.
- When generation fails, keep the asset contract and regeneration prompt in the report so the next run can continue from a precise failure state.
- Batch character work should generate prompts from roster/config, process all outputs through the same normalization script, then audit anchors/gait/cropping before accepting assets.
- `process_character_roster.mjs` must preserve subdirectories for `source: "existing"` characters. Taking only `path.basename(character.sheet)` breaks generated hero paths such as `hero/hero-walk-anchored-v3-gaitfix.png`.

## Workflow Rule

For every substantial gameplay change, run the relevant closed loop:

1. Implement the module change.
2. Run syntax checks.
3. Run contract checks for machine-readable constraints.
4. Run screenshot tours for player-facing flow.
5. Inspect contact sheets.
6. Update this memory file if a new class of pitfall appears.
