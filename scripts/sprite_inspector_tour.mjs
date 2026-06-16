#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const sharp = require("sharp");

const outDir = path.join(process.cwd(), "screenshots/sprite-inspector");
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
const responses = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400) responses.push(`${response.status()} ${response.url()}`);
});

await page.goto("http://localhost:5173/sprite-studio.html", { waitUntil: "networkidle" });
await page.waitForSelector("#residueMetric");

const auditedResidue = await page.locator("#residueMetric").innerText();
await page.click('[data-dir="left"]');
await shot("01-audited-left");
await page.click('[data-dir="right"]');
await shot("02-audited-right");

await page.click('[data-name="Normalized sheet"]');
await page.waitForFunction(() => document.querySelector("#residueMetric")?.textContent !== "0px");
const normalizedResidue = await page.locator("#residueMetric").innerText();
await page.click('[data-dir="left"]');
await shot("03-old-normalized-left-residue");
await page.click('[data-dir="right"]');
await shot("04-old-normalized-right-residue");

await makeContactSheet();
await browser.close();

console.log(JSON.stringify({ outDir, errors, responses, auditedResidue, normalizedResidue }, null, 2));

async function shot(name) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

async function makeContactSheet() {
  const files = ["01-audited-left.png", "02-audited-right.png", "03-old-normalized-left-residue.png", "04-old-normalized-right-residue.png"];
  const thumbW = 520;
  const thumbH = 346;
  const labelH = 34;
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const x = (index % 2) * thumbW;
    const y = Math.floor(index / 2) * (thumbH + labelH);
    const image = await sharp(path.join(outDir, file)).resize({ width: thumbW, height: thumbH, fit: "cover" }).png().toBuffer();
    const label = Buffer.from(
      `<svg width="${thumbW}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#15120e"/><text x="12" y="22" font-size="15" fill="#f5ead0" font-family="Arial, sans-serif">${file.replace(".png", "")}</text></svg>`
    );
    composites.push({ input: image, left: x, top: y });
    composites.push({ input: label, left: x, top: y + thumbH });
  }
  await sharp({
    create: {
      width: thumbW * 2,
      height: (thumbH + labelH) * 2,
      channels: 4,
      background: "#11130f"
    }
  })
    .composite(composites)
    .png()
    .toFile(path.join(outDir, "sprite-inspector-contact.png"));
}
