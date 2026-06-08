#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");

const root = process.cwd();
const outDir = path.join(root, "screenshots/battle-tour");
const baseUrl = process.env.BASE_URL || "http://localhost:5173";
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
await finishOpening();

await page.evaluate(async () => {
  await window.__rpgScene.walkToTrigger("enemy_scout_npc");
  window.__rpgScene.runScript("enemy_scout_npc");
});
await waitDialog();
await shot("01-enemy-npc-dialog");
await clickChoice("拔剑迎战");
await waitDialog();
await shot("02-confirm-battle");
await clickFirst();
await page.waitForFunction(() => window.__battleScene?.active);
await shot("03-battle-start");

await clickCell(5, 7);
await page.waitForTimeout(120);
await shot("04-select-player-move-range");

await clickCell(7, 7);
await page.waitForTimeout(180);
await shot("05-player-moved");

await clickCell(8, 7);
await page.waitForTimeout(260);
await shot("06-player-attack");

await page.locator(".battle-end-turn").click();
await page.waitForFunction(() => window.__battleScene?.state?.side === "enemy");
await shot("07-enemy-turn");
await page.waitForFunction(() => window.__battleScene?.state?.side === "player" || window.__battleScene?.state?.finished, null, { timeout: 6000 });
await shot("08-after-enemy-ai");

const battleLog = await page.evaluate(() => window.__battleScene?.state?.log || []);
await fs.writeFile(path.join(outDir, "battle-log.json"), JSON.stringify(battleLog, null, 2));
await makeContactSheet(outDir);
await browser.close();

console.log(JSON.stringify({ outDir, errors, responses, battleLog }, null, 2));

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

async function clickChoice(label) {
  await page.locator(".dialog-actions button", { hasText: label }).click();
}

async function clickCell(x, y) {
  const point = await page.evaluate(({ x, y }) => {
    const renderer = window.__battleScene.renderer;
    const cellSize = renderer.map.tileSize;
    const canvas = renderer.context.canvas;
    const rect = canvas.getBoundingClientRect();
    const canvasX = renderer.view.x + x * cellSize + cellSize / 2;
    const canvasY = renderer.view.y + y * cellSize + cellSize / 2;
    return {
      x: rect.left + (canvasX / canvas.width) * rect.width,
      y: rect.top + (canvasY / canvas.height) * rect.height
    };
  }, { x, y });
  await page.mouse.click(point.x, point.y);
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
    .toFile(path.join(dir, "battle-tour-contact.png"));
}
