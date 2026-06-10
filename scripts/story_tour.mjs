#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");

const root = process.cwd();
const outDir = path.join(root, "screenshots/story-tour");
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
  if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) responses.push(`${response.status()} ${response.url()}`);
});

await page.goto(`${baseUrl}/index.modular.html`, { waitUntil: "networkidle" });
await startNewGame();

await waitDialog();
await shot("01-opening-alor");
await clickFirst();
await waitDialog();
await shot("02-opening-hero");
await clickFirst();
await waitDialog();
await shot("03-opening-quest");
await clickFirst();
await waitHidden();

await visit("bronze_box", "04-bronze-box-found", async () => {
  await clickChoice("按刻痕开锁");
  await waitDialog();
  await shot("05-bronze-box-opened");
  await clickFirst();
});

await visit("encounter_grass", "06-grass-ambush", async () => {
  await clickChoice("暂时离开");
  await waitDialog();
  await shot("07-grass-avoided");
  await clickFirst();
});

await visit("medicine_market", "08-medicine-market", async () => {
  await clickChoice("先告辞");
  await waitDialog();
  await shot("09-medicine-market-leave");
  await clickFirst();
});

await visit("training_yard", "10-training-puzzle", async () => {
  await clickChoice("按中下上");
  await waitDialog();
  await shot("11-training-treasure");
  await clickFirst();
});

await visit("main_temple", "12-temple-monk", async () => {
  await clickChoice("询问铜匣");
  await waitDialog();
  await shot("13-temple-box-clue");
  await clickFirst();
});

await shot("14-final-map-state");

await makeContactSheet(outDir);
await browser.close();

console.log(
  JSON.stringify(
    {
      outDir,
      errors,
      responses
    },
    null,
    2
  )
);

async function startNewGame() {
  await page.waitForSelector(".menu-panel", { timeout: 8000 });
  await page.locator('[data-action="new"]').click();
}

async function visit(triggerName, screenshotName, interact) {
  await page.evaluate(async (name) => {
    await window.__rpgScene.walkToTrigger(name);
  }, triggerName);
  await page.evaluate((name) => {
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
  const files = (await fs.readdir(dir)).filter((file) => /^\d+-.+\.png$/.test(file)).sort();
  const thumbW = 360;
  const thumbH = 225;
  const labelH = 34;
  const cols = 4;
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
    .toFile(path.join(dir, "story-tour-contact.png"));
}
