# 混元 3D 输入图

这两个 1024×1536 的单人全身图由 Codex 内置 imagegen 根据旧游戏角色图扩展，用于腾讯混元生 3D 的单图生成。它们不是原行走帧的放大版：目标是保留颜色、轮廓、发饰与衣物识别点，同时给单图建模提供清楚的头、躯干、手臂、腿和鞋。

| 角色 | 原始外观参考 | 混元输入图 |
| --- | --- | --- |
| 沈临川 | `assets/characters/hero/hero-walk-anchored-v4-motionfix.png` | `shen-linchuan-imagegen-reference.png` |
| 苏萝 | `wechat-minigame/character-pack/companion.png` | `su-luo-imagegen-reference.png` |

## 沈临川 prompt

Use case: stylized-concept. Asset type: single-view image-to-3D character reference for a Three.js wuxia RPG. Image 1 is the source 4×4 pixel walk-cycle sheet; use the front-facing character as the design reference and do not reproduce the sheet. Create one high-resolution full-body Shen Linchuan: young male wuxia swordsman, compact appealing game-protagonist build, black high topknot with pale trailing ribbon, calm dark eyes, deep indigo-blue long robe, cream cross-body sash/cuffs/hem trim, tan waist belt, small jade pendant, dark boots. No sword because he wakes without it. Polished stylized 3D game-character render, clean readable materials, centered full-body front three-quarter view, relaxed A-pose with arms slightly away from torso, soft neutral studio lighting, plain warm light-gray background. Avoid multiple views, sprite sheet, collage, extra people, weapons, scenery, text, logo or watermark.

## 苏萝 prompt

Use case: stylized-concept. Asset type: single-view image-to-3D character reference for a Three.js wuxia RPG. Image 1 is the source 4×4 pixel walk-cycle sheet; use the front-facing character as the design reference and do not reproduce the sheet. Create one high-resolution full-body Su Luo: young female wuxia healer-companion, compact appealing game-character build, long black hair in a high bun with small jade-teal ornaments and a trailing lock, warm alert eyes, flowing teal and sea-green robe, ivory wide sleeves/inner layers, restrained turquoise trim, brown waist belt and small medicine pouch, dark boots. Polished stylized 3D game-character render with soft sculpted forms and readable materials, centered full-body front three-quarter view, relaxed A-pose with arms slightly away from torso, soft neutral studio lighting, plain warm light-gray background. Avoid multiple views, sprite sheet, grid, collage, extra people, weapons, scenery, text, logo or watermark.

## 模型状态

混元 3D 单体 GLB 与 Blender 工程会在生成、下载、检查和打包后登记于 `assets/generated/threejs-wuxia/README.md`。原图和 prompt 保留在本目录，方便再次生成。
