#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const sharp = require("sharp");

const root = process.cwd();
const outDir = path.join(root, "screenshots/inventory-tour");
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
await finishOpening();

await page.keyboard.press("b");
await page.waitForSelector(".inventory-panel");
await shot("01-inventory-empty");
await page.keyboard.press("Escape");
await page.waitForFunction(() => document.querySelector("#inventory-ui")?.hidden);

await page.evaluate(async () => {
  await window.__rpgScene.walkToTrigger("medicine_market");
  window.__rpgScene.runScript("medicine_market");
});
await waitDialog();
await shot("02-shopkeeper-dialog");
await clickChoice("看看货架");
await waitDialog();
await shot("03-open-shop-confirm");
await clickFirst();
await page.waitForSelector(".shop-panel");
await shot("04-shop-stock");

await buy("hemostatic_powder");
await page.waitForFunction(() => window.__rpgScene.state.itemCount("hemostatic_powder") === 1);
await shot("05-bought-hemostatic");

await buy("qingxin_pill");
await page.waitForFunction(() => window.__rpgScene.state.itemCount("qingxin_pill") === 1);
await shot("06-bought-qingxin");

await page.locator(".shop-header button").click();
await page.waitForFunction(() => document.querySelector("#shop-ui")?.hidden);
await shot("07-back-to-map");

await page.keyboard.press("i");
await page.waitForSelector(".inventory-panel");
await shot("08-inventory-after-shopping");

const summary = await page.evaluate(() => ({
  money: window.__rpgScene.state.money,
  items: window.__rpgScene.state.inventoryEntries()
}));
await fs.writeFile(path.join(outDir, "inventory-summary.json"), JSON.stringify(summary, null, 2));
await makeContactSheet(outDir);
await browser.close();

console.log(JSON.stringify({ outDir, errors, responses, summary }, null, 2));
if (errors.length || responses.length) process.exit(1);

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

async function buy(itemId) {
  await page.locator(`[data-buy="${itemId}"]`).click();
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
    .toFile(path.join(dir, "inventory-tour-contact.png"));
}
