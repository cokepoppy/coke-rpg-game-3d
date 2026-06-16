import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-map-debug";
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
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.hero, null, { timeout: 15000 });
  await clickButton(page, "new");
  for (let index = 0; index < 6; index += 1) {
    const active = await page.evaluate(() => globalThis.__cangshanGame.dialog.active);
    if (!active) break;
    await clickButton(page, "choice:0");
    await page.waitForTimeout(60);
  }

  const points = [
    ["01-inn-vendor", "world", { x: 2860, y: 2440 }],
    ["02-scout", "world", { x: 895, y: 745 }],
    ["03-apothecary-door", "world", { x: 3440, y: 2520 }],
    ["04-teahouse-door", "world", { x: 2320, y: 1250 }],
    ["05-scout-bridge", "world", { x: 1620, y: 2585 }],
    ["06-scout-archer", "world", { x: 2130, y: 1925 }],
    ["07-scout-monk", "world", { x: 2970, y: 1245 }],
    ["08-room", "room", { x: 610, y: 650 }],
    ["09-apothecary-room", "apothecaryRoom", { x: 610, y: 650 }],
    ["10-teahouse-room", "teahouseRoom", { x: 610, y: 650 }]
  ];
  const audit = [];
  for (const [name, mapId, point] of points) {
    const state = await page.evaluate(({ mapId, point }) => {
      const game = globalThis.__cangshanGame;
      game.enterMap(mapId, point);
      game.debugMap = true;
      game.activeTrigger = game.resolveActiveTrigger();
      return {
        mapId: game.mapManager.id,
        player: { x: Math.round(game.player.x), y: Math.round(game.player.y) },
        trigger: game.activeTrigger?.id || null,
        collisions: game.mapManager.map.collisions.length,
        triggers: game.mapManager.map.triggers.length
      };
    }, { mapId, point });
    audit.push({ name, ...state });
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${output}/${name}.png` });
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  await writeFile(`${output}/audit.json`, `${JSON.stringify({ audit, errors }, null, 2)}\n`);
  console.log(JSON.stringify({ audit, errors }, null, 2));
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
