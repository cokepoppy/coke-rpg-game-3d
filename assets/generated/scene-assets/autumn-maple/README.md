# 秋枫树：混元单体网格样件

## 来源

- 只读源图：`wechat-minigame/world-east-pack/world-east.png`（2240×3584）。
- 裁片：`source-map-crop.png`，从东图局部 `(1200, 1800)` 裁取 900×900；对应拼接地图全局像素 `(3440, 1800)` 到 `(4340, 2700)`。
- 场景单体锚点：拼接图 `(4100, 2390)`，位于原图东侧红叶树簇；该点落在树干根部，周边裁片只定造型和色彩。
- 第一版 ImageGen 输出 `hunyuan-reference.png` 有透明通道。混元把树误生成为没有叶冠的裸枝模型，已经在 Blender 预览中验出，未接入游戏。
- 修订版 `hunyuan-reference-dense.png` 是不透明浅灰背景，使用连续、重叠的叶冠团块，明确覆盖大部分树枝，以适应单图网格重建。它的 Hunyuan 输出仍然漏掉了叶冠；保留两版参考图、两版原始 GLB 和原始地图裁片用于比较。

## ImageGen 提示词

```text
Use case: stylized-concept. Asset type: Hunyuan3D image-to-3D reference for a reusable Blender and Three.js RPG tree model. Input images: Image 1 is a map crop of the Cangshan inn and is only a secondary style reference; ignore its building. Image 2 is the source map crop containing red autumn trees; use the branching silhouette, red-orange leaf colors, and hand-painted pixel-art texture language as the tree reference, ignore rocks and map ground. Primary request: create one isolated, complete, upright autumn maple tree as a polished 3D game asset concept. Subject: one medium-height maple with a clearly visible natural branching brown trunk from flat ground-contact roots to a broad but not spherical crown, several large organic foliage clusters, small readable red, vermilion, and burnt-orange leaves; sparse gold highlights; branch structure visible through gaps. Style/medium: refined stylized wuxia pixel-RPG art translated into a tactile 3D mesh, hand-painted leaf planes and sculpted clustered foliage, matching the inn's detailed material style, suitable for a standalone Hunyuan3D mesh. Scene/backdrop: transparent background if possible, otherwise a perfectly plain light-gray studio background; no ground plane. Composition/framing: one complete tree centered, whole crown and roots visible, front-right three-quarter view at eye level, upright trunk and vertical image composition. Lighting/mood: soft neutral studio lighting, even readable colors, restrained natural highlights. Constraints: tree alone and separable; keep the crown moderate, the full branching trunk visible, clean continuous silhouette, flat contact at its roots, realistic game-ready proportions. Avoid: buildings, characters, rocks, grass clumps, stumps, pots, scenery, extra trees, floating leaves, low-poly cubes, a ball-shaped crown, bent or leaning trunk, dramatic camera tilt, text, border, watermark, collage, multiple views.
```

## 混元生成状态

- 两次均为图生 3D，3.1 V3.1，单张参考图，500k 面数。第一次透明参考、第二次密实不透明叶冠参考；两次 Hunyuan 网格都有完整树干/枝杈，但都没有叶片。两版结果留档，第二版作为可用树干基网格。
- Blender 保留 Hunyuan 树干与枝杈，简化到约 65k 面；另外制作带厚度的五裂枫叶网格，按分层树冠排列 432 片真实几何叶片，没有使用 billboard、贴图卡片或地图裁图。合并结果统一以树根贴地，约 85.7k 个面，整体约 4.53 × 3.59 × 6.01 米。
- 可复现整理命令：`blender -b --factory-startup --python tools/package_cangshan_asset.py -- autumn-maple`。游戏版 GLB、Blender 工程和预览保存在 `assets/generated/threejs-wuxia/models/`。
- Three.js 在拼接图 `(4100, 2390)` 放置该 3D 单体。游戏运行时只加载 GLB 网格，不会显示以上 PNG。
