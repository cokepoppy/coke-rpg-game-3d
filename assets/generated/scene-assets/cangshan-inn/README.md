# 云来客栈：混元单体网格样件

## 来源

- 只读源图：`wechat-minigame/world-east-pack/world-east.png`（2240×3584）。
- 裁片：`source-map-crop.png`，从东图局部 `(1240, 2100)` 裁取 1000×1000；对应拼接地图全局像素 `(3480, 2100)` 到 `(4480, 3100)`。
- 客栈布局锚点：拼接图 `(3970, 2730)`；门口交互点 `(3970, 2900)`。
- ImageGen 输入：原图裁片作为造型和风格参考；只建低矮木构客栈，不把周边石块、红旗和树合并进房屋网格。
- ImageGen 输出：`hunyuan-reference.png`，1254×1254，有透明通道。用于混元图生 3D，不是游戏里的 2D 替代品。

## ImageGen 提示词

```text
Use case: stylized-concept. Asset type: Hunyuan3D image-to-3D reference for a reusable Blender and Three.js RPG building. Input images: Image 1 is the source map crop; use only the small timber inn near its center as the design reference, ignore the map background. Image 2 is another map crop and is not part of this building. Primary request: create one isolated, polished 3D game-asset concept of that same modest Cangshan mountain village inn, keeping the original building's footprint, low single-story height, central double wooden door, dark charcoal curved-tile roof, timber frame, warm brown wall panels, and squat gray stone foundation. Scene/backdrop: plain neutral light-gray studio background, no floor plane. Subject: the complete inn building only; include the attached signboard as a separate upright piece beside the entrance only if it remains clearly detached from the wall; do not include surrounding map objects. Style/medium: detailed hand-painted wuxia pixel-RPG art translated into a refined stylized 3D mesh concept, tactile wood grain, individually readable roof tiles, clean game-ready forms. Composition/framing: one building only, centered, full silhouette visible, front-right three-quarter view at character eye level, straight vertical walls and upright posts, orthographic-like perspective. Lighting/mood: soft neutral studio lighting with readable shadows and warm restrained lantern glow. Constraints: preserve the source building's recognizable proportions and roof profile; ground contact flat; front facade and one side wall visible. Avoid: people, trees, rocks, paths, other buildings, clutter, extra roof levels, bent or leaning posts, dramatic camera tilt, text, watermark, image border, collage, multiple views.
```

## 混元生成状态

- 腾讯混元 3D 图/文生 3D，3.1 V3.1，单张图生 3D，500k 面数。
- 原始下载保存在 `assets/generated/threejs-wuxia/source/yunlai-inn-hunyuan-raw.glb`；没有覆盖参考图。原模型约 50 万面，Blender 简化到 10 万面，统一缩放后尺寸约 4.16 × 3.35 × 2.97 米，客栈仍保持原始比例。
- 可复现整理命令：`blender -b --factory-startup --python tools/package_cangshan_asset.py -- yunlai-inn`。生成的 `.blend`、游戏版 GLB 和预览位于 `assets/generated/threejs-wuxia/models/`；大模型目录由 `.gitignore` 排除。
- Three.js 以独立模型加载，锚在拼接地图 `(3970, 2730)`；客栈门口交互点仍为 `(3970, 2900)`。运行时不是 PNG 贴片。
