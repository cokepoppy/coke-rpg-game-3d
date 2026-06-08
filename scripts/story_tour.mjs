#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const root = process.cwd();
const outDir = path.join(root, "screenshots/story-tour");
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
  await clickFirst();
});

await visit("training_yard", "09-training-puzzle", async () => {
  await clickChoice("按中下上");
  await waitDialog();
  await shot("10-training-treasure");
  await clickFirst();
});

await visit("main_temple", "11-temple-monk", async () => {
  await clickChoice("询问铜匣");
  await waitDialog();
  await shot("12-temple-box-clue");
  await clickFirst();
});

await shot("13-final-map-state");

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
