# 天龙群侠录 RPG

一个参考 `agent-sprite-forge` 思路做的浏览器 RPG 原型：生成风格角色、Starter 选择、键盘操控地图探索、场景事件和回合制战斗 UI。

## 运行

```bash
python3 -m http.server 5173
```

然后打开 `http://localhost:5173`。

也可以直接用浏览器打开 `index.html`。

## Auto Sprite Studio

打开 `http://localhost:5173/sprite-studio.html`。

这个工具页参考 Sorceress 的 Auto-Sprite 思路做了本地原型：

- 载入 GPT Image 2 生成的 4x4 人物行走 sheet。
- 按 4 方向 x 4 帧切分。
- 检测每帧人物透明像素包围盒，计算横向中心和脚底锚点漂移。
- 自动重组 sheet，让每行动作的脚底锚点一致。
- 实时预览 down / left / right / up 四方向动画并下载修正后的 PNG。

## 玩法

- 开局选择一位门派侠客作为 starter。
- 用方向键或 WASD 操控人物在江湖场景中移动。
- 靠近草丛、石井、市集、古道、演武场等区域会触发战斗、补给、招募、秘籍事件。
- 战斗中使用普攻、绝学、调息和丹药击败敌人。
