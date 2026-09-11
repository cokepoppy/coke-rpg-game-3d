# 三线感情支线

当前版本在旧案主线之外增加三条可保存的感情线。三位女主不只是主角的陪伴角色，她们各自有目标、秘密、拒绝主角的权利，以及会被选择影响的关系状态。

## 三位女主

- 苏萝：灵动、温暖、嘴硬心软。她寻找失踪的母亲，核心冲突是“陪伴究竟是因为她，还是因为旧案”。
- 秦晚瑶：清冷、克制，把真心藏在王府礼法之后。她的冲突是家族责任与自己选择之间的撕裂。
- 穆芷烟：偏执、锋利、爱恨不留余地。她用毒和嫉恨确认自己不会再次被抛下。

## 运行时状态

`wechat-minigame/js/story/romanceStory.js` 提供三条路线的阶段对白：`first`、`turning`、`steady`。选择会写入 `storyFlags`、`romanceScores` 和 `storyLog`，并随存档恢复。

现有地图复用了原来的 NPC：客房新增苏萝对话触发区，秦晚瑶和穆芷烟继续使用月华谷触发区。没有新增重复地图或重复角色。

## 文风边界

对白使用原创人物、原创事件和原创关系，以自然对话为主，只保留少量《庄子》《诗经》式的自然意象、节奏和留白，不堆叠典故或比喻，也不直接搬用现代作品中的角色、门派、武功或标志性桥段。

## 验收

```bash
npm run story:campaign:test
npm run wechat:romance:test
npm run wechat:moon:test
```

浏览器测试会验证三条路线各自完成两次对话推进，并检查好感、关键 flag、王府请帖和调包孩子线索仍然存在。

## 自动播放演示

启动本地调试页后，可用同一套画布按钮和方向移动逻辑播放完整的感情线演示：

```bash
npm run wechat:debug
DEMO_HEADLESS=0 DEMO_RECORD=1 npm run wechat:romance:demo
```

演示会从新游戏开始，进入客房触发苏萝，再前往月华谷触发秦晚瑶和穆芷烟；视频与截图保存在 `screenshots/wechat-romance-demo/`。设置 `DEMO_STEP_DELAY_MS=0` 可用于快速验收，默认会放慢每一步方便观察。
