# 百草药铺资产记录

## 来源和地图锚点

- 原图参考来自 `world-east.png` 的 `(560, 1950, 700, 700)` 裁片，对应拼接地图 `(2800, 1950)` 起始位置。
- 拼接图锚点 `(3110, 2300)`，沿用原程序化药铺的朝向和碰撞范围 `[(2925, 2110, 370, 330)]`。
- ImageGen 四视图为 [`hunyuan-reference-sheet.png`](./hunyuan-reference-sheet.png)；可单独输入的正面/左/背/右参考分别保存为 `hunyuan-view-*.png`。

## 当前可运行资产

`tools/build_hundred_herbs_pharmacy.py` 复用项目的建筑尺寸、材质和地图朝向约定，生成一个可编辑 Blender 源场景、预览和独立运行时 GLB。药铺包含石基、墙体、木构架、双扇门、门环、窗格、药铺匾额和分层瓦顶，均为网格几何；地图裁片和 ImageGen 图不进入运行场景。当前 Blender 模型范围约 `4.4 × 3.398 × 3.74 m`，原点位于建筑中心底面。

世界构建器发现独立 GLB 后会跳过旧的药铺几何；Three.js 在原有锚点加载此模型。玩家碰撞仍使用地图像素矩形，不随 AI 模型的拓扑变化。

## Hunyuan 替换状态

尚未提交混元任务。后续确认可用点数和任务成本后，将四视图依次提供给混元 3D 3.1，保留原始下载，再通过 `tools/package_cangshan_asset.py -- hundred-herbs-pharmacy` 调整统一缩放、底面原点、拓扑和材质。Blender 预览验收后替换游戏版 GLB，重新对照 2D 药铺轮廓、门向和碰撞区。
