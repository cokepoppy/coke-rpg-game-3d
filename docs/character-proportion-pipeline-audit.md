# 沈临川角色比例流水线排查

日期：2026-10-01
比例修复分支：`codex/cangshan-character-proportion-audit`
步态修正分支：`codex/cangshan-natural-walk-cycle`

## 原裤装版本的排查结论

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

## 既有裤装版修正（仍保留作对照）

- 将 Blender 裤管最大半径从 0.098×0.105 m 调为 0.071×0.082 m，靴筒和鞋头同步收窄。
- 保留上身 Hunyuan 网格和五段动作；只重建裤装相关 Blender 网格并重新导出 GLB。
- 用 Three.js 查看器拍正面 Idle、斜前 Idle 和 Walk 八相位图；审查器同时采样 GLB 的手脚骨骼位置，检查同侧手臂是否与腿反向摆动。

## 新参考图与 Hunyuan 复跑

2026-10-01 又生成了 `assets/generated/hunyuan-references/shen-linchuan-pants-reference-v2.png`：以原始像素人物身份为基准，把头身约束为三头身、短上衣、清楚分开的修身裤腿和 A Pose。第一张 ImageGen 结果虽然好看，但没有按要求缩短衣摆，也没有把手臂张开，因此没有送入模型；第二张修正图作为本轮 Hunyuan 3.1 的输入。下文是这次复跑完成后的检查结果。

本轮 Hunyuan 页面选择 3.1 与 500k 面数；页面确认“今日剩余生成次数”从 20 降为 19，任务完成并下载原始 GLB。源 GLB 为单个 `node_0` 网格，325,308 顶点、497,804 面，Blender 轴向整理后的包围盒约 0.635×0.461×1.117 m；没有发现各轴非等比缩放。新模型保留短上衣、分开的裤腿和 A Pose，外观接近 ImageGen 输入。经 Blender 减面、重绑骨骼并生成 Idle/Walk/Run/Jump/Attack 后，游戏模型为 76,005 顶点、70,000 面、标准化高度 1.75 m，纹理分别降到 2048² 和 1024²。模型现已接入 Three.js 人物查看器和游戏角色路径。

本轮产物：`assets/generated/threejs-wuxia/source/shen-linchuan-proportion-v2-hunyuan.glb`（混元原始输入输出，git-ignored）；`assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-game-ready.glb`（游戏模型）；同目录下 `...-blender.blend`（可编辑工程）、`...-preview.png`（Blender 预览）。Blender 只负责轴向/原点整理、减面、贴图优化、骨骼权重和动作；角色基础造型来自 Hunyuan，而不是脚本建模。

## 当前结论和继续检查

逐环节证据把旧角色失真定位为**参考图比例 + 旧 Blender 裤管**两处共同造成；不是 Three.js 等比缩放把腿撑粗。新的 v2 让 Hunyuan 直接生成目标比例的完整裤装角色，避免旧流程“成人比例上身 + Blender 另造两根粗裤管”的拼接问题。当前游戏和动作查看器都指向 v2 GLB。生成记录中的 70,000 面预算已达成，原始混元 GLB 仍保存在本机忽略目录作可追溯源文件。

八相位审看又定位了几处 Walk 动作问题：

参考了 [Doodley 的 Walk Cycles and Weight](https://www.youtube.com/watch?v=6lGPvMLE8Oo) 中的支撑脚、髋部旋转与 contact/down/pass/up 关键姿势，也观察了 [Genshin Impact 中 Mona 的慢走实机片段](https://www.youtube.com/watch?v=9yxDSQ4gtpo) 里较放松的摆臂和脚步节奏。

1. **肩摆轴选错。** 把上臂绕世界 Z（竖直轴）旋转，只会令手臂绕肩横扫，不能沿身体前后方向摆动；而且 A Pose 的手臂会一直向外张开。v2 改绕世界 X（身体横向轴）摆动，并给双肩加轻微内收。旧角色仍使用原有肩轴，避免改动旧 rig。
2. **右臂补偿过期，旧指标漏检。** 原来的右臂符号修正是在 Z 轴上调出来的；改成 X 轴后会令双臂同相。检查不能只看“单侧手与同侧脚是否反相”，还要同时检查“左右手是否互相反相”。最终八相位相关系数：左手/左脚 -0.960、右手/右脚 -0.958、左右手 -0.927。仅看此前的同侧相关指标，会漏掉双臂同向摆动这一类缺陷。
3. **Walk 的腿角和脚路分开制作。** 旧周期用少量 thigh/shin 角度关键帧拼成摆腿，脚踝没有明确的地面轨迹。现在先按 24fps 给双脚定义支撑与摆动路径，再逐帧用两段腿骨解算髋、膝角；支撑脚沿地面向后匀速移动，摆动脚经过身体下方时抬高，脚跟着地和脚尖蹬离分别保留。
4. **游戏演示速度与 Walk 周期曾不一致。** 普通行走是 1.9 m/s；旧剧情演示用 2.35 m/s 并对位移做缓入缓出，脚步周期因此与根节点位移脱节。演示现按 1.9 m/s 等速移动，和玩家实际 Walk 保持一致。0.875 秒周期对应约 1.66 m 前进、每步约 0.83 m，约为 1.75 m 身高的 47%。
5. **靴底边界错绑。** 原先用 `abs(x) < 0.29` 先筛腿部顶点，导致相邻靴底顶点 x=0.2891 绑在 `foot.L`、x=0.2927 却绑在 `pelvis`。髋部摆动约 0.55 rad 时，这条原本 0.0038 m 的边被拉成 0.4932 m，形成脚下尖刺。修复为先按身体中心线给整个低位靴底分配脚骨，再应用裤腿宽度阈值。脚踝动作反向补偿髋、膝角度并保留脚尖/脚跟滚动。现 76,005 个顶点蒙皮权重和均为 1；八相位无地面截图和接触表确认尖刺消失。

6. **腰部“前后滑”是 root 平移轴写错。** Blender root 骨骼的局部 Y 轴沿骨骼朝上，局部 Z 轴指向角色前后。原代码把 `vertical_bob` 写进 `PoseBone.location.z`，导出后 Three.js 的 root/pelvis 高度一圈不变，却沿前后轴移动约 7.9 cm。现将目标 armature-space 位移先乘 root rest matrix 的逆矩阵，写入骨骼局部坐标；修后 root 前后位移范围为 0，高度起伏约 6.7 cm，左右摆幅约 2.6 cm。
7. **把脚路与游戏位移对齐。** 角色 0.875 秒走完一整步，游戏步速为 1.9 m/s；单脚支撑半周期内游戏前进约 0.83 m。逐帧 foot target 按同样的距离从身前移动到身后，避免只看手脚相关系数却忽略支撑脚滑动。审计会额外记录支撑期脚踝高度范围及“动画脚路 + 游戏前进”的世界漂移。

逐帧参考取自 [Mario 3D Walk Cycle](https://www.youtube.com/watch?v=kjsB4j4IJqA)、[Zelda/TOTK Link 动画分析](https://www.youtube.com/watch?v=cd_kwBKoavg) 和 [游戏角色 Walk Cycle 教程](https://www.youtube.com/watch?v=ynXadXE9UjU)。Mario 的短循环按 0.09 秒间隔采了 16 个画面；复刻要点是腿脚负责清楚的交替节奏，身体中心保持稳定，手臂与同侧腿反向。教程也采用先定 contact/down/pass/up 腿部主姿势、再加髋与脊柱、手臂和头部的顺序。Zelda 参考用于检查第三人称游戏角色的放松感与方向移动要求，不把 Link 的多状态动画直接套到单一 Walk clip 上。

最终检查：Three.js 查看器报告 5 段动作、模型高 1.75 m，页面错误为 0。21 帧采样的 root 前后位移范围为 0、上下起伏 0.0728 m、横向范围 0.0255 m；按 1.9 m/s 叠加游戏位移后，左右支撑脚前后漂移分别为 0.0022 m 与 0.0031 m，支撑期脚踝高度波动分别为 0.00063 m 与 0.00015 m。左右腿与同侧手的相关系数分别为 -0.992 / -0.992，双手为 -0.9998。21 帧侧视接触表和逐帧骨骼数据保存在 `screenshots/cangshan-walk-cycle-root-axis-fix/`。仍需以真实游戏镜头做最终手感复核；动作查看器的轨迹数据不能替代游戏内观感。

## 如果还要更贴近原 2D 角色

v2 已用三头身 ImageGen 参考图直接重跑 Hunyuan，基础造型不再是旧成人比例上身。原 2D 是长袍且裤腿被遮住，而 v2 按用户要求改为短上衣与分腿裤；这是服装剪影差异的有意改变。如果确认整体仍不像，优先对照原 4×4 精灵帧调整头身、腿长、发饰和衣摆，再重生成参考图与角色 GLB；不要在查看器里拉伸单一轴向补偿。

## 复核命令

```sh
npm run 3d:character:build
npm run 3d:character:inspect
npm run 3d:build
git diff --check
```
