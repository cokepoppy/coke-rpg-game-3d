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
2. 日常端到端测试直接访问 `http://127.0.0.1:4174/wechat-debug/`，不要依赖微信开发者工具的窗口截图和坐标点击。
3. 用 `390x844` 视口检查主菜单、对话、长按移动、交互提示和地图切换。
4. `npm run wechat:test` 直接读取 Canvas 和游戏状态，验证画面非空、移动距离、触发器、对话选项、地图切换，同时收集 `pageerror` 和 console error。
5. HTML 调试通过后，再执行 `npm run wechat:preview` 或 `npm run wechat:open`，只用微信开发者工具做真机 API、分包和最终编译校验。
6. AppSecret 只供可信服务端调用微信接口，绝不能进入小游戏客户端、日志或 Git。

当前 E2E 的最低验收契约：

- Canvas 必须为 `390x844`，抽样非空像素数量必须超过阈值。
- 点击“新开始游戏”后必须进入 `game` 模式，开场对话必须能够完整结束。
- 长按方向键后玩家坐标必须产生足够位移，不能只验证动画播放。
- 到达客栈触发区后，交互对象必须是“云来客栈”，并出现“进入客房”和“暂时离开”。
- 选择进入后，`mapManager.id` 必须切换为 `room`。
- console error 与 `pageerror` 必须为空。

## 已踩问题

- 根项目设置为 ESM 时，微信 CommonJS 文件会被 esbuild 当成 ESM。当前根包使用 `commonjs`，Node 脚本使用 `.mjs`。
- Chrome 调试页和小游戏目录不同，资源路径必须通过 `wx.__assetBase` 仅在 shim 中加前缀。
- 同时靠近多个触发器时应按角色到触发器中心的距离选择，否则数组顺序会产生错误提示。
- 出生点不能同时覆盖药摊和客栈交互范围；当前出生点固定在客栈门前的独占提示区域。
- 行走序列 `[0,1,0,3]` 不能用 `indexOf(frame)` 推进，因为帧 `0` 重复；必须维护独立 `sequenceIndex`。
- 微信小游戏即使是纯资源分包，分包根目录也必须有 `game.js`；资产构建脚本会自动生成空入口。
- 当前打包器没有把 `.webp` 纳入资源分包，因此世界地图改用两张无损 PNG，并拆到两个分包。

## HTML 端口调试踩坑

- `4174` 是当前微信端 HTML 调试端口，入口固定为 `http://127.0.0.1:4174/wechat-debug/`。不要与网页主版本的 `5173` 端口混淆。
- `npm run wechat:test` 不负责启动服务；运行前先执行 `npm run wechat:debug`，并确认端口仍在监听：

```bash
lsof -nP -iTCP:4174 -sTCP:LISTEN
```

- 长时间或跨工具调用后，esbuild watch 进程可能已经退出。测试出现 `ERR_CONNECTION_REFUSED` 时，先检查并重启服务，不要立刻判断为游戏逻辑回归。
- 本机代理可能截获 `localhost`/`127.0.0.1` 请求，产生 `502`、`426 Upgrade Required` 或 WebSocket 连接异常。诊断本地端口时显式绕过代理，优先使用 `127.0.0.1`。
- Canvas 游戏的 DOM 只有一个 `<canvas>`，不能依赖按钮文字的 DOM locator。E2E 应读取 `game.ui.buttons` 获得按钮命中区域，再发送鼠标或触摸事件。
- 截图用于验收结果，不用于驱动主要自动化流程。坐标识图点击慢、脆弱，并且无法可靠断言内部地图、触发器和角色坐标状态。
- 浏览器截图正常并不等于游戏正确。必须同时保存机器可读的 `screenshots/wechat-portrait/audit.json`，让 AI 能判断位移、触发器、地图 ID 和错误列表。
- 战斗验收必须使用微信竖屏入口 `4174/wechat-debug` 和 `390x844` 视口。不要拿模块化网页版 `1280x720` 横屏 battle tour 截图当作手机端验收证据。
- 微信竖屏战斗 E2E 使用 `npm run wechat:battle:test`，输出 `screenshots/wechat-battle/audit.json`，必须断言移动事件、攻击事件、胜利结果和零错误。

## 微信开发者工具踩坑

- 微信开发者工具适合最终编译、分包和真机 API 校验，不适合承担每轮剧情与移动回归测试；高频回归放在 HTML shim 中效率更高。
- `miniprogram-automator` 连接开发者工具自动化端口时，可能在端口已经监听的情况下仍无响应。当前环境中 `9420` 端口曾被本机代理干扰，SDK 连接没有形成稳定闭环，因此不要默认安装或依赖该包。
- 开发者工具 CLI 的 `auto`/自动化端口和 HTML 调试端口是两套独立机制。HTML E2E 成功不能替代微信 CLI 预览，CLI 预览成功也不能替代剧情交互测试。
- 正确的高效顺序是：HTML E2E -> CLI preview 包体/编译检查 -> 必要时真机测试。不要反过来每次都操作开发者工具 GUI。
- CLI preview 曾因主包超过限制失败。资源必须通过 `game.json` 分包，主包只保留逻辑和必要入口；每个分包继续遵守微信单包大小限制。
- 修改分包名称、资源路径或输出格式后，必须同时检查 `copy-wechat-assets.mjs`、`game.json`、`config.js` 和 `platform.js`，否则 Chrome shim 成功但微信包内资源仍可能缺失。
- 微信项目只保存 AppID。AppSecret 一旦出现在对话、终端历史或其他非服务端位置，应视为已经暴露并轮换；绝不写入 `project.config.json` 或仓库文件。

## 依赖与配置踩坑

- 不要为了单次开发者工具实验长期保留未使用的自动化依赖。实验失败后移除依赖、临时脚本和无效桌面截图，避免增加供应链和维护成本。
- 编辑 `package.json` 时检查重复键。JSON 解析通常只保留最后一个同名键，npm 重写文件时可能暴露或删除重复脚本，造成看似无关的 diff。
- 测试截图中的细微二进制变化通常来自动画时序。是否回归以状态审计和明确视觉缺陷为准，不能只根据 PNG hash 判断。

## 固定排障顺序

1. `lsof` 或 `curl --noproxy '*'` 确认 `4174` 服务可访问。
2. 打开 HTML 调试页，确认标题、Canvas 尺寸和首屏非空。
3. 检查 console warning/error 与 `pageerror`。
4. 运行 `npm run wechat:test`，检查 `audit.json` 中的位移、触发器、选项和地图 ID。
5. 运行微信 CLI preview，检查主包、分包大小和资源完整性。
6. 只有涉及微信专属 API、设备差异或发布行为时，才进入开发者工具 GUI 或真机调试。
