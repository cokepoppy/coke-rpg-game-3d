# 苍山地图单体 3D 样件

这组文件按“原图定位置、ImageGen 设计单体、混元生成网格、Blender 整理、Three.js 摆放”的流程保存。地图裁图和透明参考 PNG 只用于建模参考，不作为运行时贴图或场景底图。

## 当前资产

| 资产 | 地图锚点（拼接图像素） | 原图参考 | ImageGen 参考 | 混元网格 |
| --- | --- | --- | --- | --- |
| 云来客栈 | `(3970, 2730)` | [`cangshan-inn/source-map-crop.png`](./cangshan-inn/source-map-crop.png) | [`cangshan-inn/hunyuan-reference.png`](./cangshan-inn/hunyuan-reference.png) | 已生成、Blender 校正并接入独立 GLB |
| 秋枫树 | `(4100, 2390)` | [`autumn-maple/source-map-crop.png`](./autumn-maple/source-map-crop.png) | [`autumn-maple/hunyuan-reference-dense.png`](./autumn-maple/hunyuan-reference-dense.png) | 两次混元都保住了树干和枝杈，但没有生成叶冠；现以混元树干为主体，在 Blender 加入厚实的五裂枫叶 3D 网格 |
| 苍山牌坊 | `(2040, 2700)` | [`cangshan-paifang/source-map-crop.png`](./cangshan-paifang/source-map-crop.png) | [`cangshan-paifang/hunyuan-reference-sheet.png`](./cangshan-paifang/hunyuan-reference-sheet.png) | Blender 独立真 3D 网格已接入；Hunyuan 视图输入已备好，生成待执行 |
| 百草药铺 | `(3110, 2300)` | [`hundred-herbs-pharmacy/source-map-crop.png`](./hundred-herbs-pharmacy/source-map-crop.png) | [`hundred-herbs-pharmacy/hunyuan-reference-sheet.png`](./hundred-herbs-pharmacy/hunyuan-reference-sheet.png) | Blender 独立真 3D 网格已接入；Hunyuan 视图输入已备好，生成待执行 |

全场景的制作状态、锚点、占地、碰撞和替换队列维护在 [`scene-asset-manifest.json`](./scene-asset-manifest.json)。制作时先查清单，避免重复建模，也避免把规划项误报为已完成模型。

地图由 `world-west.png` 与 `world-east.png` 横向拼接；东图裁片坐标已经换算到整张拼接图。客栈中心锚点沿用 `tools/build_cangshan_world.py` 与 `threejs/game.js` 的 `(3970, 2730)`；门口交互锚点单独为 `(3970, 2900)`。替换模型时只调整模型的局部尺寸/朝向，不移动这两个锚点。

## 混元批次记录

- 平台：腾讯混元 3D 图/文生 3D 页面（`https://3d.hunyuan.tencent.com/`）。
- 客栈：3.1 V3.1 图生 3D，单张参考图，500k 面数；余额由 20 降到 19。约 50 万面源模型已留档，整理到约 10 万面。
- 树：两次 500k 结果都缺少叶冠，即使修订图已明确画出密实树冠，余额由 18 降到 17。没有把裸枝或 2D 叶片图塞进游戏；Blender 工程保留混元枝干，并补入 432 片带厚度、可编辑、五裂轮廓的枫叶网格，再按原图树冠范围组织。树高约 6.01 米，最终 GLB 为约 85.7k 个面。
- 原始输入与 ImageGen 提示词见各资产目录中的 `README.md`。

## 接入要求

每个原始 GLB 保存在忽略的本机生成目录，再用 Blender 检查模型是否倾斜、底面是否平、原点是否落在树根/建筑中心，最后另存整理版。客栈前门朝向地图南侧，坐标和占地不跟随模型自动缩放；秋枫树的 Hunyuan 枝干与 Blender 实心叶片组成单一可替换 GLB，在原图东侧红叶树簇落点生成。两个模型由 Three.js 独立加载，不把模型 PNG 用作地面、房屋贴片或背景图。

只有整理版通过 Blender 预览并导出 GLB 后，才替换 Blender 场景里的对应程序化物件；绝不把这里的 PNG 放进游戏地面来假装 3D。
