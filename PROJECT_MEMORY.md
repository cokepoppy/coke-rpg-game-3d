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
- Character attack sheets use the same 4x4 direction order but a different
  motion contract: guard, weapon raised, strike impact, recovery. Pass
  `--motion attack` through normalization, animation cleanup, and anchor audit
  so walk-only opposite-foot checks do not reject valid combat poses.
- A connected sword or spear can dominate the largest alpha component and make
  generic centering align the actor to the weapon tip. Attack processing must
  preserve the raw pose through chroma/residue cleanup, separate the low-
  saturation bright blade from the actor body for anchor detection, and still
  use the complete visual bounds for crop/margin validation.
- Long-weapon attack anchors may need a second deterministic anchor pass to
  converge after body segmentation changes. Do not relax the 2 px global
  anchor limit; rerun the same correction and accept only the final passing
  report.
- The accepted protagonist attack runtime is
  `assets/characters/hero/hero-attack-runtime-v1.png` (`512x512`, `128x128` per
  frame). Its source, cleanup reports, contacts, and accepted pass-2 anchor
  report remain beside it for regeneration and QA.

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

## Story System Pitfalls

- Long-form wuxia剧情应先沉淀到 `src/story/wuxiaStoryBible.js`，再拆到地图触发器、战斗配置和具体脚本。不要在场景代码里临时发明核心人物、门派、武功或主线真相。
- 参考经典武侠时只抽取人物功能、主题结构和戏剧冲突，必须改成原创姓名、势力、武功和事件。不要使用既有小说的专有角色名、门派名、武功名、国家名或标志性桥段。
- 剧情脚本只发出动作意图，例如 `setFlag`、`addQuest`、`learnSkill`、`enterMap`、`startBattle`、`playCutscene`、`unlockWorldNode`。不要把扣血、Canvas 移动、UI 渲染或商店扣钱写进对话文本或单个大脚本。
- 浏览器侧剧情规划验收入口是 `story-planner.html`；它读取同一份 Story Bible，能检查人物群像、章节推进、世界地图节点和脚本动作契约是否连贯。
- 可执行长线剧情脚本放在 `src/story/wuxiaCampaignScripts.js`，再由 `src/story/storyScripts.js` 合并。新增章节脚本时先补 `chapterId`、`mapId`、`start`、`nodes` 和动作列表，再用假 DialogBox 跑 `ScriptRunner` 验证 flags、party、skills、inventory、world node 和 battle/cutscene 请求。

## Audio Pitfalls

- Browser background music must start from a user gesture. Call `AudioManager.play()` from menu button handlers such as New Game, Continue, or Load, not during app boot.
- Keep generated BGM metadata in `assets/audio/bgm-manifest.json` so later work knows which file is selected, which alternates exist, and what prompt produced the track.
- Formal BGM/SFX/voice production should use `codex-plugins/rpg-game-studio/skills/rpg-audio-generation/`. Keep provider prompts and source URLs in manifests, use local deterministic WAV only as test placeholders, and assert SFX play counts in E2E audits.

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
- A defeated unit must stay renderable until its hit animation finishes. Removing it from the render list immediately makes damage text, flash, and impact frames invisible.
- Attack feedback must produce both visual evidence and a machine-readable event. `BattleState` should emit attack events, `BattleScene` should consume them for SFX/impact, and the tour should assert the recorded SFX event.
- Idle units should animate through frames so the battlefield does not look frozen.
- Victory must show a result dialog, apply rewards, then return to the world map. Defeat must show a game-over dialog.
- Battle QA should force a small deterministic victory case when the goal is to test UI flow, not full combat balance.
- The battle tour writes both screenshots and `screenshots/battle-tour/battle-audit.json`; treat the audit as the source of truth for direction, damage, SFX events, and result state.
- Do not display a fixed walk frame as an attack after a character-specific
  attack sheet exists. Battle units declare `attackSprite`; render frames
  0-3 from elapsed attack time and return to the walk sheet afterward.
- Recording an intended frame list is not enough. `BattleScene` must record
  `renderedAttackFrames`, and E2E must assert that all four attack frames were
  actually presented. This catches duration/frame-timing bugs that static
  screenshots can miss.

Useful check:

```bash
BASE_URL=http://127.0.0.1:5173 node scripts/battle_tour.mjs
```

Output contact sheet:

```text
screenshots/battle-tour/battle-tour-contact.png
```

## Local Dev / QA Pitfalls

- This repo is currently a static HTML/JS prototype with lightweight npm scripts for the WeChat build and test helpers.
- Use a static server, not direct file open, for normal testing:

```bash
python3 -m http.server 5173 --bind 127.0.0.1
```

- A stale Python server on port `5173` can stay alive but return `ERR_EMPTY_RESPONSE` or `502`. If curl fails, restart the server.
- Always test with `127.0.0.1` and `NO_PROXY='*'` when running Playwright/curl locally; proxy settings can produce misleading `502` results.
- Tour scripts should use the installed `playwright-core` package and the explicit Chrome executable path. Do not switch them back to `playwright` unless the dependency is intentionally added.

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
- Purchases need explicit feedback beyond a changing money count. Render a short
  in-shop toast or dialog for success/failure so phone users can tell that the
  tap landed.

## Image Generation Pitfalls

- `image_gen` can fail with generic service/server errors. Do not silently replace failed generations with placeholder art when the user specifically asked for GPT image generated assets.
- When generation fails, keep the asset contract and regeneration prompt in the report so the next run can continue from a precise failure state.
- Batch character work should generate prompts from roster/config, process all outputs through the same normalization script, then audit anchors/gait/cropping before accepting assets.
- `process_character_roster.mjs` must preserve subdirectories for `source: "existing"` characters. Taking only `path.basename(character.sheet)` breaks generated hero paths such as `hero/hero-walk-anchored-v3-gaitfix.png`.
- Seedance video references must match the project's sprite style first. Do not feed tall painterly NPC concept art into video generation when the game uses compact `1252x1252` 4x4 chibi RPG sprite sheets; generate or normalize a sprite-style reference first.

## Seedance Automation Pitfalls

- Seedance uses a private web contract that can change without notice. Keep the
  observed contract in
  `codex-plugins/rpg-game-studio/skills/rpg-pixel-video-generation/references/seedance-api-contract.md`
  and re-capture it after UI or request failures.
- The current unified workspace submits to `/api/seedance/submit`; an older
  bundle still contains `/api/seedance2/submit`. Do not assume the legacy route
  is the active one.
- Upload is a two-step flow: request `/api/s3/sts`, then PUT bytes to the
  returned short-lived URL. Only the returned `completedUrl` belongs in the
  generation payload.
- Never persist or print the Clerk token, cookies, STS response, signed upload
  URL, or Authorization headers. `scripts/seedance-submit.mjs` reads the token
  from `SEEDANCE_BEARER_TOKEN` at runtime.
- API discovery must not spend credits. The automation defaults to dry-run and
  requires explicit `--execute` before upload and task submission.
- A zero-credit account redirects Generate to pricing before the submit request
  is emitted. In that case, recover field names from the exact production
  bundle loaded by the current page and clearly mark that limitation.

## Cutscene Integration Pitfalls

- Keep generated MP4 files in a dedicated `video-pack` subpackage. Do not load
  them through the image asset loader or mix them into map packs.
- The browser simulator needs a `wx.createVideo` shim that positions a DOM video
  relative to the scaled canvas. The game runtime should use the same
  `CutscenePlayer` lifecycle in browser and WeChat.
- Leave canvas space below the native video for the Skip button. A native video
  overlay can consume touches in its own rectangle and hide canvas controls
  placed beneath it.
- Test both terminal paths: natural `ended` and explicit `skipped`. Both must
  destroy the overlay, resume map music, return to story mode, and apply the
  same deterministic reward.
- A cutscene reward must be persisted in save data and injected into battle
  configuration explicitly. Showing a reward dialog alone does not make the
  learned skill usable.
- Phone preview can show a black native video even when the browser shim plays
  the same file. Track `onPlay`, `onTimeUpdate`, and `onError`; if no time
  update arrives quickly, destroy the native video and switch to a canvas
  poster/storyboard fallback instead of leaving the user on a black screen.
- AI-generated mp4 should be converted to a conservative mobile runtime copy
  and paired with a poster image in the same video pack. Keep the original
  provider file for provenance, but do not make true-device playback depend on
  that exact export.
- NPC placement requires rendered-map inspection. Coordinate-only placement can
  put a character on a roof, stall, lantern, or rock even when collision data
  says the location is reachable.
- Simulator-first cutscene debugging uses `npm run wechat:devtools:cutscene:test`.
  The test temporarily enables a scenario, opens Developer Tools through its
  CLI, reads a JSON audit from `wx.env.USER_DATA_PATH`, and restores the config.
  It does not click the IDE through screenshots.
- `miniprogram-automator` is Page-oriented. It can connect to a Canvas Mini Game
  automation port while `App.callFunction`, `App.callWxMethod`, and screenshot
  commands never answer. Use in-game hooks plus persisted telemetry instead.
- Developer Tools `2.01.2510290` visibly plays the staged H.264/AAC MP4, but its
  `Video` object emits no play/time-update/error callbacks and does not advance
  exposed `currentTime`. This was visually confirmed on 2026-06-18. On
  `platform === "devtools"`, use the known clip duration instead of the phone
  watchdog so a playing video is not destroyed as a false black-screen result.
  See `docs/wechat-simulator-debugging.md`.
- Keep the simulator-first layers explicit: browser shim validates visible
  frames and lifecycle; Developer Tools validates compilation, real API shape,
  telemetry, and fallback; a phone validates native codec/playback policy.

## WeChat Mobile UI / Battle Pitfalls

- Place HUD text and top-right game buttons below `wx.getMenuButtonBoundingClientRect()`.
  The simulator can look fine while a real WeChat phone capsule overlaps the
  same area.
- Do not render D-pad arrows with text glyphs such as `◀` / `▶`; some mobile
  fonts render them as colored emoji. Draw the triangles on canvas and make the
  hit boxes larger than 64 px for thumb input.
- Battle must always expose a no-cost adjacent basic attack and a wait action.
  Skill-only controls break when qi is exhausted or when a moved unit has no
  target in range.
- Validate combat feel with machine-readable audit and screenshots: SFX
  `playCount`/`playEvents`, attack log, target hit animation, damage number,
  and side transition after all player units act.
- Keep combat NPCs on the main road or near intended choke points. Hidden
  battle triggers make mobile exploration feel broken even when the trigger
  technically exists.
- Enemy turns must include movement toward a target, not just attack-if-in-range.
  Otherwise the turn appears to skip whenever enemies start outside skill range.
- After enemy turns reset to player control, set the phase to `move` for the
  default selected unit. Showing movement highlights while leaving phase as
  `select` creates a broken state where green tiles are visible but untappable.
- A moved-but-not-acted unit needs an explicit undo affordance. Store the
  previous cell before movement and clear it after attack, wait, or turn reset.
- Treat sound as a first-class gameplay feedback layer. Short UI/prompt/buy
  cues should be generated locally and audited with `playCount`/`playEvents`;
  higher-fidelity combat sounds should use ElevenLabs Sound Effects first,
  with licensed libraries as fallback, then be normalized, trimmed, and tested
  against the actual animation timing.
- For phone-only video failures, do not rely only on `console.info`. Mirror
  cutscene events into `wx.getLogManager` and show compact event/frame status in
  the canvas UI so users can report `create`, `play`, `first-frame`,
  `watchdog`, or `error` directly from the phone screen.
- Treat the in-game main menu as a pause state, not a one-way title screen.
  Opening it must preserve the active dialog/map state and expose an explicit
  Return action. Do not silently overwrite the save slot when the menu opens;
  save only from the Save action and show a visible success/failure result.
- Save/load E2E must mutate money, inventory, map coordinates, and then verify
  that Load restores all of them. Checking only whether a save key exists does
  not prove restoration works.
- Battle tours must locate overworld encounters by stable trigger ID such as
  `scout`, not copied map coordinates. NPC placement changes frequently while
  trigger identity is part of the gameplay contract.

## Workflow Rule

For every substantial gameplay change, run the relevant closed loop:

1. Implement the module change.
2. Run syntax checks.
3. Run contract checks for machine-readable constraints.
4. Run screenshot tours for player-facing flow.
5. Inspect contact sheets.
6. Update this memory file if a new class of pitfall appears.
