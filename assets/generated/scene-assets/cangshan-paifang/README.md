# 苍山牌坊资产记录

## 来源与用途

- 地图源：只读拼接图 `world-west.png + world-east.png`，拼接后大小 `4480 × 3584`。
- 地图裁片：[`source-map-crop.png`](./source-map-crop.png)，从拼接图 `(1650, 2050)` 裁取 `1050 × 1300`。牌坊跨越左右子图边界，先拼接再裁，避免漏掉一侧。
- 参考图：[`hunyuan-reference-sheet.png`](./hunyuan-reference-sheet.png) 是 ImageGen 生成的一致四视图设计稿；[`hunyuan-view-front.png`](./hunyuan-view-front.png)、`hunyuan-view-left.png`、`hunyuan-view-back.png`、`hunyuan-view-right.png` 为单视图输入候选。
- 锚点：拼接地图 `(2040, 2700)`。尺寸约 `5.44 × 1.49 × 3.44 m`；模型原点在底面中心，立柱保持垂直，梁保持水平。

## 当前运行资产

`tools/build_cangshan_paifang.py` 生成可编辑的 Blender 场景和独立 GLB。模型包含石基、直柱、横梁、斗拱、弧形实心瓦顶、瓦片和牌匾，不包含地图图片或 billboard。它是 Blender 制作的真 3D 校准模型，不是 Hunyuan 结果。

`tools/build_cangshan_world.py` 在该 GLB 存在时跳过旧的临时牌坊几何；`threejs/game.js` 在地图锚点加载该 GLB，并用两块简化柱基碰撞代理保持路径可走。原始/编辑模型、预览和运行时 GLB 位于忽略目录 `assets/generated/threejs-wuxia/models/`，运行 `npm run 3d:build` 会将 GLB 复制进 Three.js 输出。

## Hunyuan 替换记录

四视图参考已准备，尚未提交 Hunyuan 任务；因此当前运行资产仍是 Blender 网格。以后确认可用点数和单次成本后，使用这些独立视图生成并保留原始 GLB，再通过 `tools/package_cangshan_asset.py cangshan-paifang` 规范化尺寸、原点、网格和材质。打包版经过 Blender 检查并覆盖游戏版 GLB 后，再对照同一锚点和柱基碰撞验收。
