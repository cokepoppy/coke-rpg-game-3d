import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-battle";
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
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.battleTemple, null, { timeout: 15000 });
  await page.screenshot({ path: `${output}/01-menu.png` });

  await clickButton(page, "new");
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "game", null, { timeout: 5000 });
  for (let index = 0; index < 6; index += 1) {
    const active = await page.evaluate(() => globalThis.__cangshanGame.dialog.active);
    if (!active) break;
    await clickButton(page, "choice:0");
    await page.waitForTimeout(80);
  }

  await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.enterMap("world");
    const trigger = game.mapManager.map.triggers.find((entry) => entry.id === "scout");
    game.player.x = trigger.x + trigger.width / 2;
    game.player.y = trigger.y + trigger.height / 2;
    game.activeTrigger = trigger;
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${output}/02-scout-trigger.png` });

  await clickButton(page, "interact");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "西岭密探", null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/03-scout-dialog.png` });

  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.mode === "battle", null, { timeout: 3000 });
  await page.evaluate(() => {
    const battle = globalThis.__cangshanGame.battle;
    const extraEnemy = battle.units.find((unit) => unit.id === "scoutB");
    extraEnemy.hp = 0;
    extraEnemy.alive = false;
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${output}/04-battle-start.png` });

  await clickBattleCell(page, 3, 7);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${output}/05-player-moved.png` });
  const moveLock = await page.evaluate(() => {
    const battle = globalThis.__cangshanGame.battle;
    const point = battle.cellCenter({ x: 2, y: 7 });
    battle.handleTap(point.x, point.y);
    const hero = battle.units.find((unit) => unit.id === "hero");
    return {
      hero: { x: hero.x, y: hero.y, moved: hero.moved, acted: hero.acted },
      phase: battle.phase,
      moves: battle.audit.moves.length
    };
  });

  await clickButton(page, "battle:skill:guiyuan_sword");
  await page.waitForFunction(() => globalThis.__cangshanGame.battle?.phase === "target", null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/06-targeting.png` });

  await clickBattleCell(page, 4, 7);
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${output}/07-hit-feedback.png` });
  await page.waitForFunction(() => globalThis.__cangshanGame.mode === "game" && globalThis.__cangshanGame.dialog.active, null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/08-victory-dialog.png` });

  const audit = await page.evaluate(() => ({
    viewport: { width: globalThis.__cangshanGame.viewport.width, height: globalThis.__cangshanGame.viewport.height },
    mode: globalThis.__cangshanGame.mode,
    dialog: {
      speaker: globalThis.__cangshanGame.dialog.page?.speaker,
      text: globalThis.__cangshanGame.dialog.page?.text
    },
    battle: globalThis.__cangshanGame.lastBattleAudit,
    money: globalThis.__cangshanGame.money,
    items: globalThis.__cangshanGame.items,
    audio: {
      world: globalThis.__cangshanGame.audio.audit,
      battle: globalThis.__cangshanGame.battleAudio.audit,
      hit: globalThis.__cangshanGame.hitSfx.audit
    },
    errors: []
  }));
  audit.moveLock = moveLock;
  audit.errors = errors;
  if (audit.viewport.width !== 390 || audit.viewport.height !== 844) throw new Error(`Expected portrait viewport, received ${audit.viewport.width}x${audit.viewport.height}`);
  if (audit.battle?.result !== "victory") throw new Error(`Expected victory, received ${audit.battle?.result}`);
  if (!audit.battle?.moves?.some((event) => event.id === "hero" && event.x === 3 && event.y === 7)) throw new Error("Missing audited hero move.");
  if (audit.moveLock.hero.x !== 3 || audit.moveLock.hero.y !== 7 || audit.moveLock.moves !== 1) throw new Error("Hero moved more than once in one turn.");
  if (!audit.battle?.attacks?.some((event) => event.attackerId === "hero" && event.targetId === "scoutA" && event.skillId === "guiyuan_sword" && event.damage === 38)) throw new Error("Missing audited hero skill attack.");
  if (!audit.battle?.rewards?.money || audit.money <= 120) throw new Error("Battle rewards did not add money.");
  if (!audit.items.hemostatic_powder) throw new Error("Guaranteed reward item was not added.");
  if (audit.audio.battle.playCount < 1 || audit.audio.world.pauseCount < 1) throw new Error("Battle music did not switch on battle start.");
  if (audit.audio.hit.playCount < 1) throw new Error("Hit sound effect did not play.");
  if (audit.dialog.speaker !== "战斗") throw new Error(`Expected victory dialog, received ${audit.dialog.speaker}`);
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  await writeFile(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
  setTimeout(() => globalThis.process.exit(0), 2000);
} finally {
  await Promise.race([
    page?.evaluate(() => globalThis.__cangshanGame?.audio?.pause?.()).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 500))
  ]);
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

async function clickBattleCell(page, x, y) {
  const point = await page.evaluate((cell) => globalThis.__cangshanGame.battle.cellCenter(cell), { x, y });
  await page.mouse.click(point.x, point.y);
}
