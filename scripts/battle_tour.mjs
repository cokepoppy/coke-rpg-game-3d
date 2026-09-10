#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const sharp = require("sharp");

const root = process.cwd();
const outDir = path.join(root, "screenshots/battle-tour");
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

await page.goto(`${baseUrl}/index.modular.html`, { waitUntil: "domcontentloaded", timeout: 90000 });
await startNewGame();
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
await page.evaluate(() => {
  const enemies = window.__battleScene.state.living("enemy");
  enemies[0].hp = 24;
  for (const enemy of enemies.slice(1)) {
    enemy.hp = 0;
    enemy.alive = false;
  }
});

await clickCell(5, 7);
await page.waitForTimeout(120);
await shot("04-select-player-move-range");

await clickCell(7, 7);
await page.waitForTimeout(180);
await shot("05-player-moved");

await page.locator('[data-skill="six_meridians"]').click();
await page.waitForFunction(() => window.__battleScene?.state?.phase === "target");
await shot("06-skill-targeting");

await clickCell(8, 7);
await page.waitForTimeout(180);
await shot("07-player-skill-hit");
let attackAudit = await page.evaluate(() => {
  const scene = window.__battleScene;
  const attacker = scene.state.units.find((unit) => unit.id === "duan_yu");
  const target = scene.state.units.find((unit) => unit.id === "scout_1");
  return {
    phase: scene.state.phase,
    result: scene.state.result,
    attacker: {
      id: attacker.id,
      direction: attacker.direction,
      acted: attacker.acted,
      qi: attacker.qi
    },
    target: {
      id: target.id,
      direction: target.direction,
      hp: target.hp,
      alive: target.alive
    },
    sfxEvents: scene.sfx.played,
    impactTimer: scene.renderer.impactTimer,
    attackSpriteLoaded: Boolean(scene.renderer.spriteRenderer.sprites.get("duan_yu")?.attackImage),
    renderedAttackFrames: scene.renderer.renderedAttackFrames
  };
});
await waitDialog();
await shot("08-victory-dialog");
await clickFirst();
await waitHidden();
await page.waitForFunction(() => !window.__battleScene?.active);
attackAudit = await page.evaluate(() => {
  const scene = window.__battleScene;
  const attacker = scene.state.units.find((unit) => unit.id === "duan_yu");
  const target = scene.state.units.find((unit) => unit.id === "scout_1");
  return {
    phase: scene.state.phase,
    result: scene.state.result,
    attacker: {
      id: attacker.id,
      direction: attacker.direction,
      acted: attacker.acted,
      qi: attacker.qi
    },
    target: {
      id: target.id,
      direction: target.direction,
      hp: target.hp,
      alive: target.alive
    },
    sfxEvents: scene.sfx.played,
    impactTimer: scene.renderer.impactTimer,
    attackSpriteLoaded: Boolean(scene.renderer.spriteRenderer.sprites.get("duan_yu")?.attackImage),
    renderedAttackFrames: scene.renderer.renderedAttackFrames
  };
});
await shot("09-back-to-world");

const battleLog = await page.evaluate(() => window.__battleScene?.state?.log || []);
await fs.writeFile(path.join(outDir, "battle-log.json"), JSON.stringify(battleLog, null, 2));
await fs.writeFile(path.join(outDir, "battle-audit.json"), JSON.stringify(attackAudit, null, 2));
await makeContactSheet(outDir);
await browser.close();

const failures = [];
if (!attackAudit.sfxEvents.some((event) => event.type === "attack" && event.skillId === "six_meridians")) failures.push("attack sfx event was not recorded");
if (attackAudit.attacker.direction !== "right") failures.push(`attacker did not face target: ${attackAudit.attacker.direction}`);
if (attackAudit.target.direction !== "left") failures.push(`target did not face attacker: ${attackAudit.target.direction}`);
if (attackAudit.target.hp !== 0 || attackAudit.target.alive) failures.push("target was not defeated by audited skill hit");
if (attackAudit.result !== "victory") failures.push(`expected victory after audited hit, received ${attackAudit.result}`);
if (!attackAudit.attackSpriteLoaded) failures.push("duan_yu attack sprite was not loaded");
const renderedFrames = new Set(
  attackAudit.renderedAttackFrames
    .filter((entry) => entry.unitId === "duan_yu")
    .map((entry) => entry.frame)
);
for (const frame of [0, 1, 2, 3]) {
  if (!renderedFrames.has(frame)) failures.push(`attack frame ${frame} was not rendered for duan_yu`);
}

console.log(JSON.stringify({ outDir, errors, responses, battleLog, attackAudit, failures }, null, 2));
if (failures.length || errors.length || responses.length) process.exit(1);

async function startNewGame() {
  await page.waitForFunction(
    () => Boolean(window.__rpgScene && document.querySelector(".menu-panel")),
    null,
    { timeout: 90000 }
  );
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
