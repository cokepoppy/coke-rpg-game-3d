#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const root = process.cwd();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4174/wechat-debug/";
const output = path.join(root, "screenshots/wechat-romance-demo");
const headless = process.env.DEMO_HEADLESS === "1";
const recordVideo = process.env.DEMO_RECORD === "1";
const stepDelay = Number(process.env.DEMO_STEP_DELAY_MS || 700);
const viewport = { width: 390, height: 844 };
const videoOutput = path.join(output, "coke-rpg-romance-demo-390x844.webm");

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--autoplay-policy=no-user-gesture-required", "--window-size=420,900"]
});
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  ...(recordVideo ? { recordVideo: { dir: output, size: viewport } } : {})
});
const page = await context.newPage();
const video = recordVideo ? page.video() : null;
const errors = [];
const responses = [];
const progress = [];
const dialogs = [];

page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
    responses.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.hero, null, { timeout: 15000 });

  log("从新游戏开始");
  await clickButton("new");
  await dismissDialogs();
  await shot("01-new-game");

  log("走进客房，先触发苏萝的第一段对话");
  await moveToTrigger("inn", [[2900, 2520]]);
  await interact();
  await choose("进入客房");
  await waitForMap("room");
  await moveToTrigger("su_luo", [[480, 650], [480, 250]]);
  await playRomance("su_luo", "02-su-luo-first", 0);
  await playRomance("su_luo", "03-su-luo-turning", 0);
  await shot("04-su-luo-route-state");

  log("离开客房，前往月华谷");
  await moveToTrigger("roomExit", [[480, 650], [610, 650]]);
  await interact();
  await choose("离开客房");
  await waitForMap("world");
  // The inn exit is above a broad stone barrier; drop below it before moving east.
  await moveToTrigger("moonValleyGate", [[2700, 2600], [3500, 2600], [3500, 1700], [3180, 1500]]);
  await interact();
  await choose("进入月华谷");
  await waitForMap("moonValley");
  await dismissDialogs();
  await shot("05-moon-valley-arrival");

  log("在月华谷拜会秦晚瑶");
  await moveToTrigger("qin_wanyao", [[390, 1160], [390, 710]]);
  await playRomance("qin_wanyao", "06-qin-wanyao-first", 0);
  await playRomance("qin_wanyao", "07-qin-wanyao-turning", 0);

  log("继续向谷中走，触发穆芷烟的冲突线");
  // Approach Mu Zhiyan from the left; the right edge of her trigger borders a wall.
  await moveToTrigger("mu_zhiyan", [[390, 1160], [520, 1160]]);
  await playRomance("mu_zhiyan", "08-mu-zhiyan-first", 0);
  await playRomance("mu_zhiyan", "09-mu-zhiyan-turning", 0);
  await shot("10-romance-route-state");

  const result = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    return {
      mapId: game.mapManager.id,
      romanceScores: { ...game.romanceScores },
      flags: [...game.storyFlags].filter((flag) => flag.startsWith("romance_") || flag.includes("palace") || flag.includes("swapped")),
      items: { ...game.items },
      player: { x: Math.round(game.player.x), y: Math.round(game.player.y) }
    };
  });

  if (result.romanceScores.su_luo < 4 || result.romanceScores.qin_wanyao < 4 || result.romanceScores.mu_zhiyan < 4) {
    throw new Error(`Romance routes did not complete the demo choices: ${JSON.stringify(result.romanceScores)}`);
  }
  if (!result.items.palace_invitation) throw new Error("Qin Wanyao demo did not grant the palace invitation.");
  if (!result.flags.includes("heard_swapped_children_clue")) throw new Error("Mu Zhiyan demo did not preserve the clue flag.");
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  const audit = { baseUrl, headless, recordVideo, viewport, stepDelay, output, progress, dialogs, result, errors, responses };
  await fs.writeFile(path.join(output, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
} finally {
  await page.close().catch(() => {});
  await context.close().catch(() => {});
  if (video) {
    const recordedVideo = await video.path().catch(() => null);
    if (recordedVideo) {
      await fs.rename(recordedVideo, videoOutput);
      console.log(`[wechat-romance-demo] 视频已保存：${videoOutput}`);
    }
  }
  await browser.close().catch(() => {});
}

async function playRomance(trackId, screenshotName, choiceIndex) {
  await interact();
  const pages = [];
  for (let index = 0; index < 12; index += 1) {
    await page.waitForFunction(() => globalThis.__cangshanGame?.dialog?.active, null, { timeout: 3000 });
    const pageState = await page.evaluate(() => {
      const current = globalThis.__cangshanGame.dialog.page;
      return {
        speaker: current?.speaker || null,
        text: current?.text || null,
        choices: current?.choices?.map((choice) => choice.label) || []
      };
    });
    pages.push(pageState);
    await shot(`${screenshotName}-${String(index + 1).padStart(2, "0")}`);
    await pause();
    await clickButton(`choice:${pageState.choices.length ? choiceIndex : 0}`);
    await pause();
    if (!await page.evaluate(() => globalThis.__cangshanGame.dialog.active)) break;
  }
  if (await page.evaluate(() => globalThis.__cangshanGame.dialog.active)) {
    throw new Error(`Romance dialog did not close: ${trackId}`);
  }
  dialogs.push({ trackId, pages });
}

async function moveToTrigger(triggerId, waypoints) {
  const target = await page.evaluate((id) => {
    const game = globalThis.__cangshanGame;
    const trigger = game.mapManager.map.triggers.find((entry) => entry.id === id);
    if (!trigger) throw new Error(`Unknown trigger: ${id}`);
    return { x: trigger.x + trigger.width / 2, y: trigger.y + trigger.height / 2 };
  }, triggerId);
  for (const [x, y] of waypoints) await walkTo({ x, y });
  await page.waitForFunction((id) => globalThis.__cangshanGame?.activeTrigger?.id === id, triggerId, { timeout: 12000 });
  const state = await readPlayerState();
  log(`到达 ${triggerId} (${Math.round(state.x)}, ${Math.round(state.y)})`);
  await shot(`location-${triggerId}`);
  await pause();
  return target;
}

async function walkTo(target) {
  const current = await readPlayerState();
  if (Math.abs(current.x - target.x) > 10) await holdDirection(current.x < target.x ? "right" : "left", "x", target.x);
  const updated = await readPlayerState();
  if (Math.abs(updated.y - target.y) > 10) await holdDirection(updated.y < target.y ? "down" : "up", "y", target.y);
}

async function holdDirection(direction, axis, target) {
  const current = await readPlayerState();
  const alreadyThere = direction === "right" || direction === "down"
    ? current[axis] >= target - 10
    : current[axis] <= target + 10;
  if (alreadyThere) return;
  const point = await buttonCenter(direction);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  try {
    await page.waitForFunction(({ axis: axisName, target: targetValue, direction: directionName }) => {
      const game = globalThis.__cangshanGame;
      if (!game || game.mode !== "game" || game.dialog.active) return false;
      const value = game.player[axisName];
      return directionName === "right" || directionName === "down"
        ? value >= targetValue - 10
        : value <= targetValue + 10;
    }, { axis, target, direction }, { timeout: 12000 });
  } finally {
    await page.mouse.up();
  }
}

async function interact() {
  await clickButton("interact");
  await page.waitForFunction(() => globalThis.__cangshanGame?.dialog?.active, null, { timeout: 5000 });
}

async function choose(label) {
  const index = await page.evaluate((choiceLabel) => {
    const choices = globalThis.__cangshanGame?.dialog?.page?.choices || [];
    return choices.findIndex((choice) => choice.label === choiceLabel);
  }, label);
  if (index < 0) throw new Error(`Dialog choice not found: ${label}`);
  await clickButton(`choice:${index}`);
  await pause();
}

async function dismissDialogs() {
  for (let index = 0; index < 12; index += 1) {
    if (!await page.evaluate(() => Boolean(globalThis.__cangshanGame?.dialog?.active))) return;
    await clickButton("choice:0");
    await pause();
  }
  throw new Error("Dialog did not close within the expected number of pages.");
}

async function waitForMap(mapId) {
  await page.waitForFunction((expected) => globalThis.__cangshanGame?.mapManager?.id === expected, mapId, { timeout: 5000 });
  await pause();
}

async function readPlayerState() {
  return page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    return { mapId: game.mapManager.id, x: game.player.x, y: game.player.y, trigger: game.activeTrigger?.id || null };
  });
}

async function clickButton(id) {
  const point = await buttonCenter(id);
  await page.mouse.click(point.x, point.y);
}

async function buttonCenter(id) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const button = await page.evaluate((buttonId) => globalThis.__cangshanGame?.ui?.buttons.find((item) => item.id === buttonId) || null, id);
    if (button && !button.disabled) return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
    await page.waitForTimeout(50);
  }
  throw new Error(`Canvas button not available: ${id}`);
}

async function shot(name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
}

async function pause() {
  if (stepDelay > 0) await page.waitForTimeout(stepDelay);
}

function log(message) {
  progress.push(message);
  console.log(`[wechat-romance-demo] ${message}`);
}
