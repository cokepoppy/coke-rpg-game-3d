# WeChat Mini Game Simulator Debugging

## Principle

Use the WeChat Developer Tools simulator before a real phone for game state,
Canvas rendering, input, collision, and fallback behavior. Use a real-device
spot check for native media, audio policy, safe-area differences, and device
performance.

Do not drive the IDE by screenshot clicking. Use CLI startup plus in-game
diagnostic hooks and machine-readable files under `wx.env.USER_DATA_PATH`.

## Cutscene Test

Prepare runtime assets and run the real simulator test:

```bash
NO_PROXY='*' npm run wechat:assets
NO_PROXY='*' npm run wechat:devtools:cutscene:test
```

The test temporarily enables `daoistTeaching` in
`wechat-minigame/js/simulatorScenario.js`, opens the project through the
Developer Tools CLI, polls `cutscene-simulator-audit.json`, and restores the
scenario file in `finally`.

Expected event sequence for native playback:

```text
starting -> create -> created -> play -> waiting? -> first-frame -> finish
```

A callback-observable native-video result has `playEvent: true`,
`timeUpdates > 0`, no error, and no fallback. Developer Tools may instead
report `simulator-visual-window`: this means the native component was created
and given a playback window, while its event bridge remains unobservable.

## Current Simulator Limitation

With Developer Tools `2.01.2510290`, the pure Canvas Mini Game project returns
a `Video` object with `play`, `onPlay`, `onTimeUpdate`, and `onError`, and the
video is visibly rendered, but the simulator emits none of those callbacks and
does not advance the exposed `currentTime`. The same file is copied
byte-for-byte into `wx.env.USER_DATA_PATH`, so this is not a missing-file or
extension issue. Visible playback was manually confirmed on 2026-06-18.

`miniprogram-automator` can open its WebSocket connection, but Page-oriented
commands such as `App.callFunction`, `App.callWxMethod`, and
`App.captureScreenshot` do not answer for this pure Canvas Mini Game. Do not
use that SDK as the primary game-control loop.

Therefore:

1. Run the browser shim test to verify video lifecycle, visible first frame,
   skip, natural end, reward, and fallback logic.
2. Run the Developer Tools test to verify compilation, real `wx` API shape,
   persistent telemetry, and black-screen fallback.
3. Perform one real-device check for callback behavior and playback policy.

## Evidence And Logs

Cutscene events are mirrored to:

- `wx.getLogManager()` for Developer Tools and phone logs.
- Canvas debug text for direct phone reports.
- `wx.setStorageSync("cangshan-cutscene-audit", ...)`.
- `${wx.env.USER_DATA_PATH}/cutscene-simulator-audit.json` for automation.

On macOS the last file is normally mapped below:

```text
~/Library/Application Support/微信开发者工具/*/WeappSimulator/WeappFileSystem/*/*/usr/
```

Always use `NO_PROXY='*'` for localhost CLI/test traffic. A configured proxy
can turn local tool failures into misleading connection errors.
