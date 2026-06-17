import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-cutscene";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--autoplay-policy=no-user-gesture-required"]
});
let page;

try {
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4174/wechat-debug/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.daoistMaster, null, { timeout: 15000 });
  await clickButton(page, "new");
  await closeDialog(page);

  const trigger = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.enterMap("world", { x: 2700, y: 2900 });
    game.activeTrigger = game.resolveActiveTrigger();
    return game.activeTrigger?.id || null;
  });
  if (trigger !== "daoist_master") throw new Error(`Expected daoist trigger, received ${trigger}`);

  await clickButton(page, "interact");
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${output}/01-daoist-dialog.png` });
  await clickButton(page, "choice:0");
  await clickButton(page, "choice:0");
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "cutscene");
  await page.waitForFunction(() => document.querySelector("video[data-wechat-video='true']"));
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${output}/02-fuyao-video.png` });

  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "game" && globalThis.__cangshanGame?.dialog?.active, null, { timeout: 10000 });
  await page.screenshot({ path: `${output}/03-skill-learned.png` });
  const endedCutscene = await page.evaluate(() => ({ ...globalThis.__cangshanGame.lastCutsceneAudit }));
  await clickButton(page, "choice:0");
  await page.evaluate(() => globalThis.__cangshanGame.playCutscene("daoistTeaching"));
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "cutscene");
  await clickButton(page, "cutscene:skip");
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "game" && globalThis.__cangshanGame?.dialog?.active);
  const skippedCutscene = await page.evaluate(() => ({ ...globalThis.__cangshanGame.lastCutsceneAudit }));
  await clickButton(page, "choice:0");

  await page.evaluate(() => {
    globalThis.__originalCreateVideo = wx.createVideo;
    wx.createVideo = () => ({
      play() {},
      stop() {},
      show() {},
      hide() {},
      destroy() {},
      onEnded() {},
      onPlay() {},
      onTimeUpdate() {},
      onError() {}
    });
    globalThis.__cangshanGame.playCutscene("daoistTeaching");
  });
  await page.waitForFunction(() => globalThis.__cangshanGame?.cutsceneFallback);
  await page.screenshot({ path: `${output}/04-fallback-storyboard.png` });
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "game" && globalThis.__cangshanGame?.dialog?.active, null, { timeout: 9000 });
  const fallbackCutscene = await page.evaluate(() => {
    wx.createVideo = globalThis.__originalCreateVideo;
    delete globalThis.__originalCreateVideo;
    return { ...globalThis.__cangshanGame.lastCutsceneAudit };
  });
  const audit = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    const rewardDialog = game.dialog.page;
    const learned = [...game.learnedSkills];
    game.dialog.advance(0);
    game.startBattle("scout");
    const hero = game.battle.units.find((unit) => unit.id === "hero");
    const battleSkills = game.battle.skillsFor(hero).map((skill) => skill.id);
    game.battle.active = false;
    return {
      rewardDialog: { speaker: rewardDialog?.speaker, text: rewardDialog?.text },
      learned,
      battleSkills,
      videoRemoved: !document.querySelector("video[data-wechat-video='true']")
    };
  });

  audit.trigger = trigger;
  audit.endedCutscene = endedCutscene;
  audit.skippedCutscene = skippedCutscene;
  audit.fallbackCutscene = fallbackCutscene;
  audit.errors = errors;
  if (!audit.endedCutscene?.started || audit.endedCutscene.result !== "ended") throw new Error("Natural cutscene completion failed.");
  if (audit.skippedCutscene?.result !== "skipped") throw new Error("Cutscene skip lifecycle failed.");
  if (audit.fallbackCutscene?.result !== "fallback" || !audit.fallbackCutscene?.fallback) throw new Error("Cutscene fallback lifecycle failed.");
  if (!audit.learned.includes("fuyou_step")) throw new Error("扶摇诀 was not learned after the cutscene.");
  if (!audit.battleSkills.includes("fuyou_step")) throw new Error("扶摇诀 was not added to the hero battle skills.");
  if (!audit.videoRemoved) throw new Error("Video overlay remained after the cutscene.");
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  await writeFile(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
  setTimeout(() => globalThis.process.exit(0), 1200);
} finally {
  await page?.evaluate(() => {
    globalThis.__cangshanGame?.cutscene?.finish?.("test-cleanup");
    globalThis.__cangshanGame?.audio?.pause?.();
    globalThis.__cangshanGame?.battleAudio?.pause?.();
  }).catch(() => {});
  await Promise.race([page?.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 800))]);
  await Promise.race([browser.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1500))]);
  const process = browser.process?.();
  if (process && !process.killed) process.kill("SIGKILL");
}

async function closeDialog(page) {
  for (let index = 0; index < 8; index += 1) {
    const active = await page.evaluate(() => globalThis.__cangshanGame.dialog.active);
    if (!active) return;
    await clickButton(page, "choice:0");
    await page.waitForTimeout(60);
  }
  throw new Error("Dialog did not close.");
}

async function clickButton(page, id) {
  const point = await buttonCenter(page, id);
  await page.mouse.click(point.x, point.y);
}

async function buttonCenter(page, id) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const button = await page.evaluate((buttonId) => globalThis.__cangshanGame.ui.buttons.find((item) => item.id === buttonId) || null, id);
    if (button) return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
    await page.waitForTimeout(50);
  }
  throw new Error(`Canvas button not rendered: ${id}`);
}
