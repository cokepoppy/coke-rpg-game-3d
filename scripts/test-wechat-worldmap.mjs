import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-worldmap";
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
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.worldMap, null, { timeout: 15000 });
  await clickButton(page, "new");
  for (let index = 0; index < 6; index += 1) {
    const active = await page.evaluate(() => globalThis.__cangshanGame.dialog.active);
    if (!active) break;
    await clickButton(page, "choice:0");
    await page.waitForTimeout(60);
  }

  await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    for (const scoutId of ["scout", "scout_road", "scout_gate"]) {
      game.currentBattleTriggerId = scoutId;
      const audit = { attacks: [{ attackerId: "hero", targetId: scoutId, damage: 38 }], moves: [], result: "victory" };
      const rewards = game.grantBattleRewards();
      game.defeatedScouts.add(scoutId);
      game.lastBattleAudit = { ...audit, rewards };
    }
    game.worldMapUnlocked = true;
    game.mode = "game";
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${output}/01-world-cleared.png` });
  await clickButton(page, "worldmap");
  await page.waitForFunction(() => globalThis.__cangshanGame.mode === "worldmap", null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/02-world-map.png` });

  const audit = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    return {
      mode: game.mode,
      defeatedScouts: [...game.defeatedScouts],
      worldMapUnlocked: game.worldMapUnlocked,
      nodes: game.worldNodes(),
      money: game.money,
      errors: []
    };
  });
  audit.errors = errors;
  if (audit.mode !== "worldmap") throw new Error(`World map did not open, received ${audit.mode}`);
  if (!audit.worldMapUnlocked || audit.defeatedScouts.length !== 3) throw new Error("World map unlock audit failed.");
  if (!audit.nodes.some((node) => node.id === "erhai" && node.status === "unlocked")) throw new Error("Next world node did not unlock.");
  if (audit.money <= 120) throw new Error("Battle reward money was not retained.");
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  await writeFile(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
  setTimeout(() => globalThis.process.exit(0), 1200);
} finally {
  await Promise.race([page?.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 800))]);
  await Promise.race([browser.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 1500))]);
  const process = browser.process?.();
  if (process && !process.killed) process.kill("SIGKILL");
}

async function clickButton(page, id) {
  const point = await buttonCenter(page, id);
  await page.mouse.click(point.x, point.y);
}

async function buttonCenter(page, id) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const button = await page.evaluate((buttonId) => globalThis.__cangshanGame.ui.buttons.find((item) => item.id === buttonId) || null, id);
    if (button) return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
    await page.waitForTimeout(50);
  }
  throw new Error(`Canvas button not rendered: ${id}`);
}
