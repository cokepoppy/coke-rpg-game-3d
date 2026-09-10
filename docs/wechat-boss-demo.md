# 本地 Chrome 自动演示

这个演示从新游戏开始，使用真实的竖屏方向键和交互按钮完成第一段主线：

1. 进入客房，搜索木柜和账册。
2. 前往药摊购买青锋剑。
3. 进入松风茶肆，查看告示。
4. 沿苍山旧道前往北坡残灯禁地。
5. 自动移动、选技、治疗并击败引灯魇客。

先启动本地服务：

```bash
npm run wechat:debug
```

另开终端运行：

```bash
npm run wechat:boss:demo
```

默认会打开一个可见的 Chrome 窗口并自动播放。运行记录和关键截图写入 `screenshots/wechat-boss-demo/`。

如果只想看到进入 Boss 战的界面并暂停：

```bash
DEMO_AUTO_BATTLE=0 npm run wechat:boss:demo
```

无头回归验证使用：

```bash
DEMO_HEADLESS=1 npm run wechat:boss:demo
```

脚本只针对本地 `wechat-debug`，不部署 VPS，也不修改公共浏览器版本。
