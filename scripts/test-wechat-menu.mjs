import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const output = process.env.WECHAT_MENU_TEST_OUTPUT || path.join(os.tmpdir(), "cangshan-wechat-menu");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--autoplay-policy=no-user-gesture-required"]
});

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("http://127.0.0.1:4174/wechat-debug/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.hero, null, { timeout: 15000 });

  const titleButtons = await page.evaluate(() => globalThis.__cangshanGame.ui.buttons.map(({ id, disabled }) => ({ id, disabled })));
  assertButton(titleButtons, "resume", true);
  assertButton(titleButtons, "save", true);
  assertButton(titleButtons, "continue", true);

  await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.newGame();
    while (game.dialog.active) game.dialog.advance(0);
    game.money = 321;
    game.items = { hemostatic_powder: 4, iron_sword: 1 };
    game.player.x = 1337;
    game.player.y = 2112;
    game.openMenu();
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(output, "01-pause-menu.png") });

  await clickButton(page, "save");
  const saved = await page.evaluate(() => ({
    notice: globalThis.__cangshanGame.menuNotice,
    payload: wx.getStorageSync("cangshan-rpg-save-v1")
  }));
  if (saved.notice !== "存档成功") throw new Error(`Missing save confirmation: ${saved.notice}`);
  if (saved.payload.money !== 321 || saved.payload.x !== 1337 || saved.payload.y !== 2112) throw new Error("Saved state did not match the current game.");

  await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.money = 7;
    game.items = {};
    game.player.x = 10;
    game.player.y = 20;
  });
  await clickButton(page, "continue");
  const loaded = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    return {
      mode: game.mode,
      money: game.money,
      items: game.items,
      x: game.player.x,
      y: game.player.y,
      mapId: game.mapManager.id
    };
  });
  if (loaded.mode !== "game" || loaded.money !== 321 || loaded.x !== 1337 || loaded.y !== 2112) throw new Error("Load did not restore the saved game state.");
  if (loaded.items.hemostatic_powder !== 4 || loaded.items.iron_sword !== 1) throw new Error("Load did not restore inventory state.");

  await page.evaluate(() => globalThis.__cangshanGame.openMenu());
  await page.waitForFunction(() => globalThis.__cangshanGame.ui.buttons.some((entry) => entry.id === "resume" && !entry.disabled));
  await clickButton(page, "resume");
  const resumed = await page.evaluate(() => ({ mode: globalThis.__cangshanGame.mode, money: globalThis.__cangshanGame.money }));
  if (resumed.mode !== "game" || resumed.money !== 321) throw new Error("Return to game did not preserve the active session.");
  await page.screenshot({ path: path.join(output, "02-resumed-game.png") });

  const audit = { titleButtons, saved, loaded, resumed, errors };
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  await writeFile(path.join(output, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
  await page.close();
} finally {
  await browser.close();
}

function assertButton(buttons, id, disabled) {
  const button = buttons.find((entry) => entry.id === id);
  if (!button || button.disabled !== disabled) throw new Error(`Unexpected ${id} button state.`);
}

async function clickButton(page, id) {
  const button = await page.evaluate((buttonId) => globalThis.__cangshanGame.ui.buttons.find((entry) => entry.id === buttonId && !entry.disabled) || null, id);
  if (!button) throw new Error(`Canvas button not available: ${id}`);
  await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
  await page.waitForTimeout(80);
}
