#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const root = process.cwd();
const outDir = path.join(root, "screenshots/room-tour");
const baseUrl = process.env.BASE_URL || "http://localhost:5173";
await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const responses = [];

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400) responses.push(`${response.status()} ${response.url()}`);
});

await page.goto(`${baseUrl}/index.modular.html`, { waitUntil: "networkidle" });
await startNewGame();
await finishOpening();

await page.evaluate(async () => {
  await window.__rpgScene.walkToTrigger("inn_room_door");
  window.__rpgScene.runScript("inn_room_door");
});
await waitDialog();
await shot("01-outside-room-door");
await clickChoice("进入房间");
await waitDialog();
await shot("02-enter-room-choice");
await clickFirst();
await waitHidden();
await page.waitForFunction(() => window.__rpgScene?.mapId === "daliInnRoom");
await shot("03-room-loaded");

await visit("room_wardrobe", "04-wardrobe-closed", async () => {
  await clickChoice("打开木柜");
  await waitDialog();
  await shot("05-wardrobe-treasure");
  await clickFirst();
});

await visit("room_medicine_cabinet", "06-medicine-cabinet", async () => {
  await clickChoice("搜暗抽屉");
  await waitDialog();
  await shot("07-medicine-hidden-drawer");
  await clickFirst();
});

await visit("room_scroll_desk", "08-scroll-desk", async () => {
  await clickChoice("抄下线索");
  await waitDialog();
  await shot("09-scroll-clue");
  await clickFirst();
});

await visit("room_chest", "10-room-chest", async () => {
  await clickChoice("用铜钥匙试锁");
  await waitDialog();
  await shot("11-room-chest-map");
  await clickFirst();
});

await visit("room_exit", "12-room-exit", async () => {
  await clickChoice("离开房间");
  await waitDialog();
  await shot("13-leave-room-choice");
  await clickFirst();
});
await page.waitForFunction(() => window.__rpgScene?.mapId === "world");
await shot("14-back-outside");

await makeContactSheet(outDir);
await browser.close();

console.log(JSON.stringify({ outDir, errors, responses }, null, 2));

async function startNewGame() {
  await page.waitForSelector(".menu-panel", { timeout: 8000 });
  await page.locator('[data-action="new"]').click();
}

async function finishOpening() {
  await waitDialog();
  await clickFirst();
  await waitDialog();
  await clickFirst();
  await waitDialog();
  await clickFirst();
  await waitHidden();
}

async function visit(triggerName, screenshotName, interact) {
  await page.evaluate(async (name) => {
    await window.__rpgScene.walkToTrigger(name);
    window.__rpgScene.runScript(name);
  }, triggerName);
  await waitDialog();
  await shot(screenshotName);
  await interact();
  await waitHidden();
}

async function waitDialog() {
  await page.waitForSelector(".dialog-box:not([hidden]) .dialog-text", { timeout: 8000 });
}

async function waitHidden() {
  await page.waitForFunction(() => document.querySelector(".dialog-box")?.hidden, null, { timeout: 8000 });
}

async function clickFirst() {
  await page.locator(".dialog-actions button").first().click();
}

async function clickChoice(label) {
  await page.locator(".dialog-actions button", { hasText: label }).click();
}

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

async function makeContactSheet(dir) {
  const sharp = require("sharp");
  const files = (await fs.readdir(dir)).filter((file) => /^\d+-.+\.png$/.test(file)).sort();
  const thumbW = 360;
  const thumbH = 225;
  const labelH = 34;
  const cols = 3;
  const rows = Math.ceil(files.length / cols);
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const x = (index % cols) * thumbW;
    const y = Math.floor(index / cols) * (thumbH + labelH);
    const input = await sharp(path.join(dir, file)).resize({ width: thumbW, height: thumbH, fit: "cover" }).png().toBuffer();
    const label = Buffer.from(
      `<svg width="${thumbW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#15120e"/><text x="12" y="22" font-size="15" fill="#f5ead0" font-family="Arial, sans-serif">${file.replace(".png", "")}</text></svg>`
    );
    composites.push({ input, left: x, top: y });
    composites.push({ input: label, left: x, top: y + thumbH });
  }
  await sharp({
    create: {
      width: cols * thumbW,
      height: rows * (thumbH + labelH),
      channels: 4,
      background: "#11130f"
    }
  })
    .composite(composites)
    .png()
    .toFile(path.join(dir, "room-tour-contact.png"));
}
