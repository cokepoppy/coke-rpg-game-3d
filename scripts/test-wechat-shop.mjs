import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-shop";
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
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.vendor, null, { timeout: 15000 });
  await clickButton(page, "new");
  for (let index = 0; index < 6; index += 1) {
    const active = await page.evaluate(() => globalThis.__cangshanGame.dialog.active);
    if (!active) break;
    await clickButton(page, "choice:0");
    await page.waitForTimeout(60);
  }

  await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.enterMap("world", { x: 3370, y: 2600 });
    game.activeTrigger = game.resolveActiveTrigger();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${output}/01-vendor-trigger.png` });
  await clickButton(page, "interact");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "药摊老人", null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/02-vendor-dialog.png` });
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.mode === "shop", null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/03-shop-open.png` });
  await clickButton(page, "shop:buy:qingxin_pill");
  await page.waitForTimeout(160);
  await page.screenshot({ path: `${output}/04-after-buy.png` });

  const audit = await page.evaluate(() => ({
    viewport: { width: globalThis.__cangshanGame.viewport.width, height: globalThis.__cangshanGame.viewport.height },
    mode: globalThis.__cangshanGame.mode,
    money: globalThis.__cangshanGame.money,
    items: globalThis.__cangshanGame.items,
    shopAudit: globalThis.__cangshanGame.lastShopAudit,
    buttons: globalThis.__cangshanGame.ui.buttons.map((button) => button.id),
    errors: []
  }));
  audit.errors = errors;
  if (audit.viewport.width !== 390 || audit.viewport.height !== 844) throw new Error(`Expected portrait viewport, received ${audit.viewport.width}x${audit.viewport.height}`);
  if (audit.mode !== "shop") throw new Error(`Shop did not stay open, received ${audit.mode}`);
  if (!audit.shopAudit?.ok || audit.shopAudit.itemId !== "qingxin_pill") throw new Error("Shop purchase audit failed.");
  if (audit.money !== 98) throw new Error(`Expected money 98 after buying qingxin_pill, received ${audit.money}`);
  if (audit.items.qingxin_pill !== 2) throw new Error(`Expected qingxin_pill x2, received ${audit.items.qingxin_pill}`);
  if (!audit.buttons.includes("closeShop")) throw new Error("Shop close button was not rendered.");
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
