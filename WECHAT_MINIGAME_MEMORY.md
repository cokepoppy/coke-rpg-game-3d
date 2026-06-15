# 微信小游戏迁移记录

## 运行边界

- 微信小游戏没有浏览器 DOM，正式运行时只依赖 Canvas、`wx` 触摸事件、`wx` 存储和 `InnerAudioContext`。
- `wechat-minigame/` 是可直接导入微信开发者工具的独立目录；网页版本继续保留在仓库根目录。
- Chrome 快速调试通过 `wechat-debug/wx-shim.js` 模拟最小 `wx` API，不能把该 shim 打进正式小游戏。

## 竖屏契约

- 逻辑视口按设备 `windowWidth/windowHeight` 计算，设计基准为 `390x844`。
- 地图 tile 保持 `64x64`，地图和碰撞坐标不因手机端缩放而改变。
- 玩家碰撞盒固定为脚底 `34x28`，角色渲染锚点为脚底中心。
- HUD 根据 `getMenuButtonBoundingClientRect()` 给微信系统胶囊留出空间。
- 底部方向键和交互键尺寸至少 `52px`，支持按住连续移动，而不是每次点击只走一步。

## 资产与包体

- 只同步运行时使用的地图、角色和音乐，不复制 raw、audit、prompt 等生成中间文件。
- 世界地图拆成左右两个无损 PNG 分包；室内地图、角色和音乐分别放入独立分包，避免单个分包超过 `4 MB`。
- 世界地图使用左右两张无损 PNG，角色 PNG 使用调色板压缩，4 分半钟音乐转为低码率 AAC/M4A。
- `npm run wechat:assets` 是唯一资产同步入口；修改源资产后必须重新执行。
- 测试 AppID 的 CLI 预览已通过：总包约 `9.1 MB`，主包约 `32 KB`，所有分包均小于 `4 MB`。

## 调试闭环

1. `npm run wechat:debug` 启动 esbuild watch 和 Chrome 模拟器。
2. 用 `390x844` 视口检查主菜单、对话、长按移动、交互提示和地图切换。
3. 读取 Canvas 像素确认画面非空，同时收集 `pageerror` 和 console error。
4. `npm run wechat:open` 用微信开发者工具打开 `wechat-minigame/`。
5. AppSecret 只供可信服务端调用微信接口，绝不能进入小游戏客户端、日志或 Git。

## 已踩问题

- 根项目设置为 ESM 时，微信 CommonJS 文件会被 esbuild 当成 ESM。当前根包使用 `commonjs`，Node 脚本使用 `.mjs`。
- Chrome 调试页和小游戏目录不同，资源路径必须通过 `wx.__assetBase` 仅在 shim 中加前缀。
- 同时靠近多个触发器时应按角色到触发器中心的距离选择，否则数组顺序会产生错误提示。
- 出生点不能同时覆盖药摊和客栈交互范围；当前出生点固定在客栈门前的独占提示区域。
- 行走序列 `[0,1,0,3]` 不能用 `indexOf(frame)` 推进，因为帧 `0` 重复；必须维护独立 `sequenceIndex`。
- 微信小游戏即使是纯资源分包，分包根目录也必须有 `game.js`；资产构建脚本会自动生成空入口。
- 当前打包器没有把 `.webp` 纳入资源分包，因此世界地图改用两张无损 PNG，并拆到两个分包。
