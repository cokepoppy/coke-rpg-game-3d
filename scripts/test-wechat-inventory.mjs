import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-inventory";
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

  await page.screenshot({ path: `${output}/01-world-with-inventory-button.png` });
  await clickButton(page, "inventory");
  await page.waitForFunction(() => globalThis.__cangshanGame.mode === "inventory", null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/02-inventory-open.png` });
  const audit = await page.evaluate(() => ({
    viewport: { width: globalThis.__cangshanGame.viewport.width, height: globalThis.__cangshanGame.viewport.height },
    mode: globalThis.__cangshanGame.mode,
    money: globalThis.__cangshanGame.money,
    items: globalThis.__cangshanGame.items,
    buttons: globalThis.__cangshanGame.ui.buttons.map((button) => button.id),
    errors: []
  }));
  audit.errors = errors;
  if (audit.viewport.width !== 390 || audit.viewport.height !== 844) throw new Error(`Expected portrait viewport, received ${audit.viewport.width}x${audit.viewport.height}`);
  if (audit.mode !== "inventory") throw new Error(`Inventory did not open, received ${audit.mode}`);
  if (!audit.items.hemostatic_powder || !audit.items.qingxin_pill) throw new Error("Initial inventory items are missing.");
  if (!audit.buttons.includes("closeInventory")) throw new Error("Inventory close button was not rendered.");
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
