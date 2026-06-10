#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");

const root = process.cwd();
const outDir = path.join(root, "screenshots/menu-tour");
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
await page.evaluate(() => localStorage.removeItem("coke-game-rpg-save-v1"));
await page.evaluate(() => localStorage.removeItem("coke-game-rpg-music-enabled"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector(".menu-panel");
await shot("01-main-menu");

await page.locator('[data-action="settings"]').click();
await page.waitForSelector(".menu-setting");
await shot("02-settings");
await page.locator('[data-action="back"]').click();
await page.waitForSelector('[data-action="new"]');
await shot("03-main-menu-return");

await page.locator('[data-action="new"]').click();
await finishOpening();
await shot("04-new-game-world");

await page.keyboard.press("m");
await page.waitForSelector(".menu-panel");
await shot("05-pause-menu");

await page.locator('[data-action="save"]').click();
await page.waitForFunction(() => localStorage.getItem("coke-game-rpg-save-v1"));
await shot("06-save-feedback");

await page.locator('[data-action="settings"]').click();
await page.waitForSelector(".menu-setting");
await shot("07-pause-settings");
await page.locator('[data-action="back"]').click();
await page.waitForSelector('[data-action="load"]:not([disabled])');
await shot("08-load-enabled");

await page.locator('[data-action="load"]').click();
await page.waitForFunction(() => !window.__rpgGame?.menu?.opened);
await shot("09-loaded-world");

const summary = await page.evaluate(() => ({
  started: window.__rpgScene?.started,
  mapId: window.__rpgScene?.mapId,
  hasSave: Boolean(localStorage.getItem("coke-game-rpg-save-v1")),
  menuOpen: window.__rpgGame?.menu?.opened
}));
await fs.writeFile(path.join(outDir, "menu-summary.json"), JSON.stringify(summary, null, 2));
await makeContactSheet(outDir);
await browser.close();

console.log(JSON.stringify({ outDir, errors, responses, summary }, null, 2));
if (errors.length || responses.length || !summary.started || !summary.hasSave || summary.menuOpen) process.exit(1);

async function finishOpening() {
  await waitDialog();
  await clickFirst();
  await waitDialog();
  await clickFirst();
  await waitDialog();
  await clickFirst();
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

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

async function makeContactSheet(dir) {
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
    .toFile(path.join(dir, "menu-tour-contact.png"));
}
