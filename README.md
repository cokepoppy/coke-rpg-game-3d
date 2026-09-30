# 苍山侠影 RPG

一个参考 `agent-sprite-forge` 思路做的浏览器 RPG 原型：生成风格角色、Starter 选择、键盘操控地图探索、场景事件和回合制战斗 UI。

## 运行

```bash
python3 -m http.server 5173
```

然后打开 `http://localhost:5173`。

## Three.js 3D RPG

当前分支还包含一个独立的 Three.js 第三人称原型，复用沈临川、苏萝、苍山旧道布局、第一章剧情和云来客栈内室。户外地图与室内均由 Blender 网格模型搭建，原始像素图只作位置与风格参照，不作为运行时背景贴图：

```bash
npm install
npm run 3d:dev
```

打开 `http://127.0.0.1:5180/threejs-rpg.html`。WASD 移动、Shift 奔跑、空格轻功跳跃、Q 沉掌出招、E 交互；拖动视角，滚轮缩放。可以和苏萝、掌柜、药摊老人及逍遥道人交谈，打开云纹铜匣，进入客栈检查账册、木柜和红漆箱。`npm run 3d:build` 会输出静态版本到 `dist-threejs/`。

首次生成场景 GLB：

```bash
blender --background --factory-startup --python tools/build_cangshan_world.py
```

该命令会输出 Blender 工程、户外场景预览、户外世界 GLB 和独立客栈室内 GLB 到 `assets/generated/threejs-wuxia/world/`；构建静态站点时会把两个 GLB 复制到 `dist-threejs/`。

生成式图生 3D、Blender 打包与场景重建的记录在 [Three.js RPG 工作流](docs/threejs-rpg-pipeline.md)。

混元下载的角色 GLB 放入 `assets/generated/threejs-wuxia/source/` 后，可运行 `blender -b --python tools/package_wuxia_character.py`，输出可编辑 `.blend`、带 Idle/Walk/Run/Jump/Attack 动画的 Three.js GLB 和预览图。生成模型不会提交进 Git；图片参考与 Blender 打包脚本会保留在分支中。

也可以直接用浏览器打开 `index.html`。

模块化原型入口：

```text
http://localhost:5173/index.modular.html
```

这个入口使用 `src/` 下的 ES modules，把地图、角色、输入、摄像机、剧情脚本、对话 UI 和战斗边界拆开维护。

## Auto Sprite Studio

打开 `http://localhost:5173/sprite-studio.html`。

这个工具页参考 Sorceress 的 Auto-Sprite 思路做了本地原型，现在也是人物动画检查器：

- 载入 Codex 内置 `image_gen` 生成的 4x4 人物行走 sheet。
- 按 4 方向 x 4 帧切分。
- 检测每帧人物主体连通域、原始透明包围盒、残留像素和脚底锚点。
- 自动清理非主体残留块，重新按 body bottom-center 对齐。
- 实时预览 down / left / right / up 四方向动画。
- 单帧放大显示主体框、原始框、脚底线、残留块，方便看出切图脏像素。

当前人物使用 `assets/hero-walk-sheet-audited.png`。这版修掉了旧 sheet 左右方向底部的残留像素：

- 旧归一化 sheet 残留：`6386px`
- 清理后残留：`0px`
- 四方向清理后 `xDrift` / `footDrift` 都为 `0px`

动画检查截图：

```bash
NODE_PATH=/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/sprite_inspector_tour.mjs
```

输出在 `screenshots/sprite-inspector/`。

## 玩法

- 开局选择一位门派侠客作为 starter。
- 用方向键或 WASD 操控人物在江湖场景中移动。
- 靠近草丛、石井、市集、古道、演武场等区域会触发战斗、补给、招募、秘籍事件。
- 战斗中使用普攻、绝学、调息和丹药击败敌人。

## 模块化 RPG 系统

- `src/maps/MapManager.js`：加载 Tiled JSON、地图大图、触发区和碰撞对象。
- `src/entities/Player.js`：处理玩家移动、朝向和行走帧动画。
- `src/story/ScriptRunner.js`：执行剧情节点、选择、任务、物品、flag 和战斗请求。
- `src/story/storyScripts.js`：数据化剧情脚本，包括开场对话、草丛遭遇、药摊、演武解谜和 Boss 入口。
- `src/ui/DialogBox.js`：独立对话 UI 控制器。
- `src/battle/BattleManager.js`：战斗请求边界，后续可接战棋战斗系统。

## 房间内场景

`maps/dali-inn-room/` 是一个设计优先的室内地图样例：

- 先生成完整房间设计图，再导出为 `20x12` 个 `64px` tile 的运行底图。
- 房间 Tiled JSON 里包含门口、木柜、药柜、书桌、红漆箱等触发器。
- `MapTransitionManager` 负责 `world` 和 `daliInnRoom` 之间切换。
- `storyScripts.js` 负责柜子搜索、开药柜、发现线索、开箱获得密道地图、出门返回。

房间剧情验收截图：

```bash
NODE_PATH=/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/room_tour.mjs
```

输出在 `screenshots/room-tour/`。

## Codex 插件源码

`codex-plugins/` 里保存了本项目沉淀出的本地 Codex 插件源码：

- `auto-map-studio`：地图概念图、64x64 tileset、Tiled JSON 和地图调试预览。
- `auto-sprite-studio`：人物行走帧生成、切分、锚点漂移检测和重组。
- `rpg-game-studio`：浏览器 RPG 代码架构、地图管理、角色、对话和剧情脚本系统脚手架。

## 移动浏览器竖屏版与微信小游戏

移动浏览器版和微信小游戏共用 `wechat-minigame/` 的单 Canvas 运行时、竖屏触控方向键和资源分包。浏览器入口位于 `wechat-debug/`，微信开发者工具入口仍是 `wechat-minigame/`。

```bash
npm install
npm run wechat:debug
```

手机浏览器访问 `http://127.0.0.1:4174/wechat-debug/`。完成浏览器回归后，再执行：

```bash
npm run wechat:open
```

`project.config.json` 默认使用 `touristappid`，正式预览和上传前需要替换为该小游戏自己的 AppID。
