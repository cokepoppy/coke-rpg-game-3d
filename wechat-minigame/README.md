# 苍山侠影微信小游戏版

这个目录是原生微信小游戏工程，使用单 Canvas、竖屏布局和触控方向键，不依赖浏览器 DOM。

## 本地流程

在仓库根目录执行：

```bash
npm install
npm run wechat:debug
npm run wechat:test
npm run wechat:open
```

- `wechat:debug`：启动 `http://127.0.0.1:4174/wechat-debug/` Chrome 模拟器。
- `wechat:test`：验证菜单、对话、长按移动、客栈交互和房间切换，并输出截图。
- `wechat:open`：同步压缩资产后，用微信开发者工具打开当前目录。

## 发布前配置

`project.config.json` 里的 `touristappid` 只是仓库占位值。当前微信开发者工具不能用该值启动小游戏模拟器，发布前必须替换为《苍山侠影》自己的微信小游戏 AppID，不要复用其他小游戏的 AppID。

运行资产被拆成三个分包：

- `map-pack`：无损 WebP 世界地图和室内地图。
- `character-pack`：主角与 NPC 精灵表。
- `audio-pack`：低码率 AAC/M4A 背景音乐。

源资产变更后执行 `npm run wechat:assets`，不要手动编辑分包中的生成文件。
