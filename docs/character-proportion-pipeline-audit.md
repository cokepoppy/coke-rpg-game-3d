# 沈临川角色比例流水线排查

日期：2026-10-01
分支：`codex/cangshan-character-proportion-audit`

## 排查结论

角色不像原始 2D 参考，有两个不同来源：

1. **整体头身风格在 ImageGen 参考图阶段变成成年写实比例。** 原始像素角色是一张 4×4 动画表；单个正面帧的非透明包围框约 115×234 px，宽高比约 0.49，头部相对身体很大。ImageGen prompt 只写了“compact appealing game-protagonist build”，没有头身比、腿长或像素角色比例约束，生成图随后被用作 Hunyuan 输入。Hunyuan 因此沿用了参考图里的成年比例。这一段决定了整体风格差异。
2. **裤腿显粗是在 Blender 裤装脚本阶段引入。** 裤装 GLB 没有重新走 Hunyuan：它复用旧 Hunyuan 网格的头和上身，在 Blender 里裁袍、另建两条管状裤腿和靴子。排查开始时，大腿裤管半径最大为 0.098×0.105 m；横向直径约 0.196 m，对比 0.40 m 大腿骨长度是 49%，正面看成两根直筒。此分支已把半径最大值降到 0.071×0.082 m，横向直径约 0.142 m，即大腿骨长度的 35.5%，并收窄靴筒。

## 分段证据

| 环节 | 实际检查 | 结论 |
| --- | --- | --- |
| 2D 原图 | `/Users/shangguan/Documents/home2026/coke-rpg-game/assets/characters/hero/hero-walk-anchored-v4-motionfix.png`；1252×1252，4×4；正面首帧包围框约 115×234 px | 明显是大头、短腿的像素比例；原图穿长衫，裤腿大部分被袍摆遮住 |
| ImageGen 参考图 | `assets/generated/hunyuan-references/shen-linchuan-imagegen-reference.png` 和 `shen-linchuan-pants-reference.png`，均为 1024×1536 全身图 | 视觉上扩成成年角色；没有从 2D 帧锁定头身比、裤腿宽度或腿长。裤装版只是 Blender 造型参考，不是裤装 GLB 的模型输入 |
| Hunyuan 原始 GLB → Blender 导入 | 原始网格导入尺寸约 0.438×1.110×0.387 m；轴向整理后按统一系数 1.576878 归一到约 0.691×0.611×1.75 m | 单一网格；脚本旋转后均匀缩放，没有 X/Y/Z 分别拉伸。上身比例来自 ImageGen 参考图，导入环节未发现横向变胖 |
| Blender 裁袍与裤腿 | `CROP_Z=0.79 m`；两条独立的 16 边管状网格，手工指定骨骼权重 | 这是裤腿体积的直接来源。审查前最大直径约为大腿骨长度的 49%；本分支收窄后约 35.5%，仍保留裤装外观。袍摆裁到离地 0.79 m 也使腿部大面积露出，与原 2D 长袍剪影不同 |
| Blender → GLB | 游戏 GLB 导出五个 Idle/Walk/Run/Jump/Attack 动作；Blender 工程保存时只启用 Walk 轨道供预览，避免多个 NLA 动作叠加 | 导出保留命名动作；没有发现额外横向缩放 |
| Three.js 查看器 | 页面报告导入高度 1.75 m；之后执行 `model.scale.setScalar(2.18 / actualModelHeight)`，约 1.246 倍统一缩放 | 等比放大，不会单独撑宽腿。斜前镜头有少量透视影响；正面 Idle 截图仍显出旧裤腿的直筒粗度，确认几何才是腿粗的来源 |

## 本分支已做的修正

- 将 Blender 裤管最大半径从 0.098×0.105 m 调为 0.071×0.082 m，靴筒和鞋头同步收窄。
- 保留上身 Hunyuan 网格和五段动作；只重建裤装相关 Blender 网格并重新导出 GLB。
- 用 Three.js 查看器拍正面 Idle、斜前 Idle 和 Walk 八相位图；审查器同时采样 GLB 的手脚骨骼位置，检查同侧手臂是否与腿反向摆动。

## 接下来若要更像 2D 原图

先为 ImageGen 参考图加明确的头身比例、腿长和服装剪影目标，再将这张参考图送入 Hunyuan。当前 Hunyuan 上身已经由成年比例参考图生成；只改查看器或裤腿无法把头身比例变回像素角色。用户此前要求改穿裤装，因此后续目标应在“保留裤装”和“保留原图大头短腿比例”之间同时设定，而不是沿用含糊的 `compact` 描述。

## 复核命令

```sh
npm run 3d:character:build
npm run 3d:character:inspect
npm run 3d:build
git diff --check
```
