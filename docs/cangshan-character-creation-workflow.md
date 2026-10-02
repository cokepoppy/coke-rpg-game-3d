# Cangshan 角色从 2D 到 3D 的制作工作流

这份流程把已有角色的经验整理成可重复的制作与审查步骤。下一位新角色按此流程建立女性角色；先从剧情和 2D 角色图确定她是谁、穿什么、怎样行动，再做概念图和 3D，不预设身材或衣着模板。

与场景流程配合阅读：[`threejs-rpg-pipeline.md`](./threejs-rpg-pipeline.md)、[`character-proportion-pipeline-audit.md`](./character-proportion-pipeline-audit.md)，以及个人记忆中的 `20261002-cangshan-rigged-walk-pipeline.md`。

## 资产链与命名

```text
剧情设定 + 原 2D 角色图
  -> ImageGen 单人全身概念图
  -> Hunyuan 图生 3D 原始 GLB
  -> Blender 轴向/比例检查、骨架校准、权重与动作
  -> Blender 工程 + 游戏 GLB + 预览图
  -> Three.js 角色查看器
  -> 实际游戏相机和剧情演示
```

新角色用稳定 slug 保存输入和输出，例如 `assets/generated/threejs-wuxia/source/qing-he.glb`。每轮迭代加输出后缀，例如 `-review-v1`、`-review-v2`；不覆盖上轮 GLB、`.blend`、预览图。记录 2D 输入、ImageGen prompt/结果、混元源 GLB、Blender 改动和运行时 GLB 的对应关系。ImageGen 是概念参考；除非实际用其结果做混元输入，不把它说成 3D 模型来源。骨架、权重、重拓扑或动作由 Blender 加工的部分如实标注。

## 分阶段制作与通过条件

### 1. 盘点来源与角色目标

- 先读角色剧情、已有精灵图、已有 ImageGen 参考图和 GLB；检查现有 Su Luo 资产是否可直接复用，避免重复生成相同角色。
- 选出原 2D 图中最清楚的站立/行走帧。记录全身像素包围框、头部高度、肩宽、腿长、服装轮廓、发型、配色、武器/道具和性格动作。
- 为新女性角色写一页造型 brief：剧情身份、年龄设定、性格、轮廓、衣物层次、材质色彩、标志配件、行走气质。服装和体型来自角色设定与原图，不套用通用女性化比例。
- **通过条件：** 有唯一 2D 基准、brief 和资产 slug；没有把地图 NPC 或现有女主重复做一遍。

### 2. 生成并审查概念图

- 用 ImageGen 以原图作身份/造型参考，出一张完整、单人、简洁背景的全身图。写明头身比例、身高观感、衣摆长度、袖口、腰线、靴子和可见关节；使用自然的 A-pose，双臂稍离开躯干，左右手和腿分开。
- 首轮目标是与原角色剪影一致，避免让概念图擅自变成年模特比例、改变年龄观感、换装、加多余人物或遮住腿部关节。
- 先人工对照原 2D 图并修正概念图，只有外观和姿势都合格才送入 Hunyuan。
- **通过条件：** 正面 3/4 全身可读、姿势利于建模和骨架绑定，角色身份与原图一致。

### 3. 生成 Hunyuan 模型并核对输入输出

- 将**审查通过的同一张**参考图提交给 Hunyuan 图生 3D；原始 GLB 按 slug 存到 `assets/generated/threejs-wuxia/source/`，保留生成记录。
- 在 Blender 以静止姿势检查正面、侧面、背面：前向轴、站立方向、地面接触、包围盒、关节可见度、网格是否连续/分岛、衣物是否和身体粘成一块、纹理是否齐全。
- 记录 Blender 导入前后尺寸。只做**等比**归一化；不得用单轴拉伸修比例。概念图好看但模型拓扑差、关节被衣服封住时，先修输入或换生成结果，不以动画曲线掩盖模型问题。
- **通过条件：** GLB 与输入图同一角色、直立轴正确、尺寸可解释、材质正常，且网格允许预期动作。

### 4. 校准骨架与权重

- 先按这一个角色的 mesh 实测肩、肘、腕、髋、膝、踝及骨盆/胸腔高度，再校准骨骼枢轴；不要把沈临川 v2 的绝对坐标、裤腿宽度或权重阈值直接复制到女性模型。
- 骨架层级按髋/脊柱/胸/头、肩/肘/手、髋/膝/踝/脚组织。rest pose 与蒙皮姿势一致，膝盖弯曲方向正确，脚踝 pivot 对齐脚骨。
- 检查权重和为 1，肩/肘、髋/膝边界有连续过渡。长袖、裙摆、腰带、发辫、披风等需要独立判断是否作为独立骨骼、辅助骨或刚性配件；不能把穿体的骨骼当成已绑定成功。
- Hunyuan 碎片网格可以先作为审查原型，但若拓扑岛多、变形像硬片拼接，应考虑重拓扑、重新生成或独立附件绑定；不能把刚性分岛权重写成专业连续蒙皮。
- **通过条件：** 静止与单关节测试无明显穿插/拉裂，双侧枢轴在人体关节处，裙摆/袖口/发饰按预期跟随。

### 5. 做动作并逐帧复核

- 先搭 Contact、Down、Passing、Up 四个姿势，左右腿相位相反；接着用双段腿 IK 设脚踝轨迹，支撑脚保持地面接触，摆动脚才抬起。手臂与对侧腿反相，骨盆和躯干克制跟随，最后加肘、手腕、袖摆、发尾等次级动作。
- Walk 以 24 fps 导出相位 `0, .125, .25, .375, .5, .625, .75, .875` 的截图；正面、侧面和 3/4 同尺度审看，并至少各看一次骨架开/关。检查腿从胯以下活动、膝弯方向、脚跟落地到脚尖离地、脚滑、外八/内八、同侧摆臂、身体穿插和首尾循环。
- 播放速率要与游戏速度、步幅一致。每次只改一个主要因素（骨骼位置、脚路、根骨、摆臂或衣物权重），用同一组相位与视角对照前后。
- 现有检查器可用 `DEMO_HEADLESS=0 CHARACTER_AUDIT_ASSET=qing-he-review-v1-game-ready.glb CHARACTER_AUDIT_OUTPUT=screenshots/qing-he-review-v1 npm run 3d:character:inspect` 生成阶段采样/动作数据；自定义角色会保留截图和指标、检查页面错误，但不套用男主 v19 的脚距/摆幅自动阈值。数值指标用于定位可疑帧，不能替代肉眼审查。
- **通过条件：** 8 相位没有明显关节穿体，支撑脚没有肉眼可见漂移，人物比例在运行时尺寸下协调，首尾连续。

### 6. 导出、查看器和游戏内验收

先用单角色入口生成候选资产，不覆盖其他角色：

```sh
CANGSHAN_CHARACTER_ID=qing-he \
CANGSHAN_CHARACTER_NAME="清禾" \
CANGSHAN_CHARACTER_PROFILE=legacy \
CANGSHAN_OUTPUT_SUFFIX=-review-v1 \
npm run 3d:character:build:single
```

输入需预先放在 `assets/generated/threejs-wuxia/source/qing-he.glb`。新角色若需不同的 rest pose、枢轴和权重边界，先在 `tools/package_wuxia_character.py` 中为她校准 rig/weight profile，再打包；`proportion-v2` 是沈临川专用 profile，不能因为目标角色是女性就直接选它。缺源文件时入口会报错，不静默跳过。

- 打开 `threejs-character-viewer.html?asset=qing-he-review-v1-game-ready.glb` 加载该角色；核对 5 个 clip、模型身高、朝向、正/侧/3/4、各相位，以及浏览器错误。`asset` 只接受生成模型目录中的 GLB 文件名。
- 作为女主/同行角色时，用 `threejs-rpg.html?heroineAsset=qing-he-review-v1-game-ready.glb&heroineName=清禾&demo=1`；作为可操作主角时改用 `heroAsset` / `heroName`。这样在不覆盖正式资产的情况下验收游戏相机下的尺寸、地面高度、朝向、行走与剧情路线。不要只根据查看器通过就宣称游戏通过。
- 这些 URL 参数只替换模型并更新模型状态栏名称，适合视觉试装；对话、肖像和剧情仍来自当前角色数据。正式新增女主时，还要按剧情设定接好角色 id、对话和肖像资产。
- 保留 `.blend`、游戏 GLB、预览图和 QA 截图。达到通过条件后再将版本接入主游戏和剧情演示，并更新 [`threejs-rpg-pipeline.md`](./threejs-rpg-pipeline.md) 中的角色资产来源。

## 复用前必读的已知坑

- Blender armature bone 的显示尾端不一定是实际关节 pivot；腿长应用 thigh-head 到 shin-head、shin-head 到 foot-head 的距离计算。
- Blender root 骨骼的局部轴不等于 Three.js 世界轴；修改 root 上下运动前，先用 rest matrix 转换。
- 21 帧指标正常不等于画面正常；网格可能不随骨架、裙摆可能盖住腿、镜头可能掩盖穿插。必须看目标尺寸下的截图和实际游戏。
- Playwright headless 曾在 WebGL 初始化或字体等待卡住；如自动审查挂起，不要连续重复同一调用，改用已打开的前台 Chrome 查看器并记录失败原因。
- 参考记录：[`character-proportion-pipeline-audit.md`](./character-proportion-pipeline-audit.md)、[`threejs-rpg-pipeline.md`](./threejs-rpg-pipeline.md)、`/Users/shangguan/.codex/memories/extensions/ad_hoc/notes/20261002-cangshan-rigged-walk-pipeline.md`。
