# 苍山侠影 3D RPG 素材与场景流程

此流程在独立 Git 分支内进行。原始 `coke-rpg-game` 工作区保持只读；角色、章节、出生点、NPC 和地图均取自该 2D 游戏已提交内容。

## 已核对的游戏来源

- 开场主角：沈临川；开场同行女主：苏萝。第一章名为“钟断苍山”，开场在苍山旧道，苏萝提示先查灯亭的云纹铜匣。
- 可玩大地图是 `wechat-minigame/world-west-pack/world-west.png` 和 `world-east-pack/world-east.png` 拼成的 4480×3584 世界图。玩家从 `(2700, 2520)` 出生；云来客栈、药摊、逍遥道人、桥头和月华谷山门的位置沿用 `wechat-minigame/js/config.js`。
- 单独的客房画面是 `wechat-minigame/room-pack/inn-room.png`；室内搜索沿用旧剧情里的账册、木柜、红漆箱和出门触发。
- `wechat-minigame/world-map-pack/world-map.png` 是章节/区域总览图，不是实际移动地图；游戏里从“江湖地图”按钮查看它。

## 角色单图到 3D

1. 先以旧角色行走表为外观基准，生成干净浅色背景、完整全身、正面略偏 3/4、手臂离开身体的单人参考图：
   - `assets/characters/hero/hero-walk-anchored-v4-motionfix.png` → `assets/generated/hunyuan-references/shen-linchuan-imagegen-reference.png`
   - `wechat-minigame/character-pack/companion.png` → `assets/generated/hunyuan-references/su-luo-imagegen-reference.png`
2. 在腾讯混元生 3D 的“图生 3D”界面选择 3.1 模型和 500k 面数，单图提交。单体网格下载为 GLB 后，在 Blender 中检查方向/材质、简化、绑定骨架，制作 Idle / Walk / Run / Jump / Attack Action，再导出 Blender 工程与运行时 GLB。
3. Three.js 读取 `assets/generated/threejs-wuxia/models/` 下的游戏版 GLB。GLB 含命名 Action 时由 `AnimationMixer` 播放；未生成/未绑定时以可动画的程序化模型回退。

在确认 Hunyuan 原始模型方向与人物比例后，按以下路径保存并打包。脚本按人体区域建立简化权重并绑定原型骨架，生成五条可编辑动作；袖摆、长袍和权重边界仍需在 Blender 中逐角色检查和润色。

```sh
mkdir -p assets/generated/threejs-wuxia/source
cp ~/Downloads/<hunyuan-character>.glb assets/generated/threejs-wuxia/source/shen-linchuan.glb
# 苏萝模型同理，文件名改成 su-luo.glb
blender -b --python tools/package_wuxia_character.py
```

输出为 `assets/generated/threejs-wuxia/models/<name>-blender.blend`、`<name>-game-ready.glb` 与 `<name>-preview.png`。这些生成物由 `.gitignore` 排除，避免把大模型塞进源码提交。

图像生成 prompt 与来源记录见 `assets/generated/hunyuan-references/README.md`。原始外观参考图和优化后模型都保留在本分支，便于 Blender 打开或重新导出。

## 地图到场景

- `world-west.png` 与 `world-east.png` 只作为布局和造型参照。`tools/build_cangshan_world.py` 用 Blender 程序化搭建地形、土路、溪流、山石、树、田地、围栏、牌坊、桥、寺庙、药铺、客栈、市集和灯亭；运行时不会将两张地图图像铺到地面或建筑上。
- 地面由有厚度的地形网格构成，路径和水流是独立网格，房屋与大型地标由墙、梁、瓦片、台阶、门窗等立体零件组装。每个场景层在导出前合并为便于运行时加载的 GLB 网格块，Blender 工程保留可编辑的源对象。
- 客栈室内单独导出为 `cangshan-inn-interior.glb`，由真实木地板、三面墙和床、书桌、药柜、屏风、茶桌、灯、箱子等网格组成。进屋加载室内 GLB，回到户外显示大地图 GLB；不使用房间原图作为地板或家具贴片。
- 地图和房间的源图像素点位按同一个坐标转换到 3D 米制坐标，Three.js 使用透视相机跟随玩家。章节总览图仍可通过 HUD 查看，但它不参与运行场景渲染。
- 当前户外关卡采用 `1.571 m / 100 px` 的水平布局比例（基础比例乘以 1.6 的开阔系数）；出生点、药铺、药摊、客栈和练武围场的测量结果及苏萝避开石灯的原因记录在 [`cangshan-layout-calibration.md`](./cangshan-layout-calibration.md)。
- 主要建筑/树木的推荐建模流程、混元整图生成与单体图生模型的适用边界，见 [`threejs-environment-asset-pipeline.md`](./threejs-environment-asset-pipeline.md)。
- 生成 Blender 工程、户外预览和两个 GLB：

```sh
blender --background --factory-startup --python tools/build_cangshan_world.py
```

- `HunyuanWorld` 输出的 3DGS PLY 留作重建实验资产与独立预览；它是高斯点云而非带面的场景模型，因此不代替本轮用于游戏碰撞、遮挡和交互的 GLB 网格。
- HunyuanWorld“世界重建”使用开局出生点所在的 `world-east.png`，任务完成并导出了 3DGS PLY（50,173 个高斯点，约 3.3 MB），原始文件保存在 `assets/generated/threejs-wuxia/source/cangshan-opening-3dgs.ply`。这是场景重建资产，不是带面的 GLB 网格；可从游戏顶部“混元 3DGS”打开 Three.js 预览。
- 客房采用旧游戏的独立内室图做构图参考，建成可以从客栈门进入、与苏萝交谈、检查账册、翻木柜和开红漆箱后再返回的独立 3D 网格场景。
- 单图世界重建可在 `threejs-world.html` 查看；关卡碰撞、可达路径和交互由 Three.js RPG 项目代码控制。

## 动作与画面复核

- 修改角色权重或动作后，先用 Blender 对 `Walk` / `Run` 关键帧逐帧渲染，检查双腿与反向摆臂是否真的带动网格；再从 Three.js 里实际走一段路，观察动作和位移速度是否一致。只看 Action 名称或 GLB 中存在动画轨道，不代表姿态自然。
- 改地图模型后，分别截取苍山旧道开场和客栈室内，与同位置 2D 原图并排检查：先看家具/房屋像素落点和占地，再看瓦、木、布、石材细节，最后检查镜头是否把近景放大到遮住路径。

## 本轮对照记录

- 对照截图与原图后，确认红色牌坊在 2D 源图中立柱竖直、横梁平直；倾斜感来自在已画好牌坊的地图上又叠了一套尺寸、深度位置不同的圆柱/横梁模型。房屋、摊位也有相同的重复叠画问题，房顶和门面因此像压在地表上。
- 原先把 2.5D 原画直接贴在地面，同时叠加错位的牌坊和房屋模型，导致平面物件被压扁、牌坊倾斜感明显。现在移除户外地图贴图，改由 Blender 网格搭建全场景，并拆分户外/室内 GLB；透视相机只观察 3D 几何体。
- 客房家具按原图中心与占地换算到 Blender/Three 坐标，实际摆放床、柜、书桌、账册、药罐、屏风和红漆箱；账册、木柜与箱子的剧情交互点与相应模型位置对齐。
- 主角步态此前双臂与同侧腿同相，且长袍下摆被硬切分给左右腿。现在手臂与对侧腿反向摆动、裙摆跟随骨盆、露出的靴腿独立摆动；用 Blender 九帧接触表检查后，再进入浏览器实际行走和进客栈。

## 运行

```sh
npm install
npm run 3d:dev
```

打开 `http://127.0.0.1:5180/threejs-rpg.html`。游戏顶部的“混元 3DGS”可打开地图重建预览。构建使用 `npm run 3d:build`，输出到忽略目录 `dist-threejs/`；如果本机已有角色 GLB 和重建 PLY，构建脚本会一并复制到产物目录。

## 角色动作审看与剧情演示

- `assets/generated/hunyuan-references/shen-linchuan-pants-reference.png` 是 ImageGen 生成的裤装版角色参考。当前裤装 GLB 复用已有沈临川混元网格的头部与上身，在 `tools/package_wuxia_pants_character.py` 中裁掉长袍下摆，按参考重建分开的裤腿与靴子。这个版本明确标记为 Blender 修改，不是新的混元生成结果。
- 角色与 2D 原图的阶段差异、比例测量及正面查看器复核见 `docs/character-proportion-pipeline-audit.md`。
- `http://127.0.0.1:5180/threejs-character-viewer.html` 提供 Idle / Walk / Run / Jump / Attack 片段选择、播放速度、方向切换和逐相位滑块；滑块按 24 FPS 显示帧序号。检查走路时依次看双腿交替、脚抬离地面、手臂反向摆动，以及动作节奏和游戏移动速度是否一致。
- `npm run 3d:character:inspect` 会操作同一个查看器，把 Walk 的 8 个相位保存到 `screenshots/cangshan-character-viewer/` 并拼成接触表，作为可重复的 AI/人工步态审看入口。
- `http://127.0.0.1:5180/threejs-rpg.html?demo=1` 播放固定路线：走近苏萝并对话、沿集市外侧前往云来客栈、进入客房查看账册线索，再回到苍山旧道。演示模式不写入玩家剧情存档。
- `npm run 3d:demo:record` 按旧 2D 剧情 tour 的 Playwright `recordVideo` 做法录制路线，默认使用前台 Chrome 与本机 WebGL，生成 `assets/generated/videos/cangshan-3d-story-demo.webm`、封面和结尾截图。设 `DEMO_HEADLESS=1` 可切到无头 SwiftShader。Chrome、WebGL 或资源加载错误会反映在运行输出里，不会将未完成的片段报告为成功演示。
