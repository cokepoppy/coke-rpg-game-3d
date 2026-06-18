import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-battle-actions";
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
  await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.startBattle("scout");
    const battle = game.battle;
    const hero = battle.units.find((unit) => unit.id === "hero");
    const companion = battle.units.find((unit) => unit.id === "companion");
    const scout = battle.units.find((unit) => unit.id === "scoutA");
    hero.x = 3;
    hero.y = 7;
    hero.qi = 0;
    companion.x = 1;
    companion.y = 7;
    scout.x = 4;
    scout.y = 7;
    battle.selectedId = "hero";
    battle.phase = "move";
    battle.highlights = battle.movesFor(hero);
  });
  const undoAudit = await page.evaluate(() => {
    const battle = globalThis.__cangshanGame.battle;
    const hero = battle.units.find((unit) => unit.id === "hero");
    const start = { x: hero.x, y: hero.y };
    const target = battle.highlights.find((cell) => cell.x === 2 && cell.y === 7) || battle.highlights[0];
    const center = battle.cellCenter(target);
    battle.handleTap(center.x, center.y);
    const moved = { x: hero.x, y: hero.y, phase: battle.phase, canUndo: Boolean(hero.previousCell) };
    battle.undoMove();
    return { start, moved, afterUndo: { x: hero.x, y: hero.y, phase: battle.phase, moved: hero.moved, canUndo: Boolean(hero.previousCell) } };
  });
  await page.evaluate(() => {
    const battle = globalThis.__cangshanGame.battle;
    const hero = battle.units.find((unit) => unit.id === "hero");
    battle.selectedId = "hero";
    battle.phase = "act";
    battle.highlights = [];
    hero.previousCell = null;
    hero.moved = false;
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${output}/01-battle-actions-ready.png` });
  await clickButton(page, "battle:attack");
  await page.waitForFunction(() => globalThis.__cangshanGame.battle.phase === "target", null, { timeout: 3000 });
  await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    const battle = game.battle;
    const target = battle.units.find((unit) => unit.id === "scoutA");
    battle.castSkill(battle.selected, target, battle.skillById("basic_attack"));
  });
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${output}/02-basic-attack-hit.png` });
  await clickButton(page, "battle:wait");
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${output}/03-after-wait.png` });
  await page.waitForTimeout(760);
  const afterEnemy = await page.evaluate(() => {
    const battle = globalThis.__cangshanGame.battle;
    const selected = battle.selected;
    const target = battle.highlights[0];
    const before = selected ? { id: selected.id, x: selected.x, y: selected.y } : null;
    if (target) {
      const center = battle.cellCenter(target);
      battle.handleTap(center.x, center.y);
    }
    const after = selected ? { id: selected.id, x: selected.x, y: selected.y, moved: selected.moved, phase: battle.phase } : null;
    return { side: battle.side, phase: battle.phase, selectedId: battle.selectedId, before, after, enemyActions: battle.audit.enemyActions };
  });
  await page.screenshot({ path: `${output}/04-next-turn-direct-move.png` });

  const audit = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    const battle = game.battle;
    const hero = battle.units.find((unit) => unit.id === "hero");
    const companion = battle.units.find((unit) => unit.id === "companion");
    const scout = battle.units.find((unit) => unit.id === "scoutA");
    return {
      side: battle.side,
      phase: battle.phase,
      hero: { qi: hero.qi, moved: hero.moved, acted: hero.acted },
      companion: { moved: companion.moved, acted: companion.acted },
      scout: { hp: scout.hp, animation: scout.animation?.type || null },
      attacks: battle.audit.attacks,
      waits: battle.audit.moves.filter((event) => event.wait),
      undoMoves: battle.audit.moves.filter((event) => event.undo),
      enemyActions: battle.audit.enemyActions,
      hitSfx: game.hitSfx.audit,
      waitSfx: game.skillSfx.wait.audit,
      postEnemy: {
        side: battle.side,
        phase: battle.phase,
        selectedId: battle.selectedId
      }
    };
  });
  audit.undo = undoAudit;
  audit.afterEnemy = afterEnemy;
  audit.errors = errors;

  if (audit.undo.afterUndo.x !== audit.undo.start.x || audit.undo.afterUndo.y !== audit.undo.start.y || audit.undo.afterUndo.moved) throw new Error("Undo move did not restore the selected unit.");
  if (audit.hero.qi !== 0) throw new Error(`Basic attack should not consume qi, received ${audit.hero.qi}`);
  if (!audit.attacks.some((event) => event.skillId === "basic_attack" && event.damage > 0)) throw new Error("Basic attack did not damage an adjacent enemy.");
  if (audit.hitSfx.playCount < 1) throw new Error("Basic attack did not trigger hit SFX.");
  if (!audit.waits.some((event) => event.id === "companion")) throw new Error("Wait action was not recorded.");
  if (audit.waitSfx.playCount < 1) throw new Error("Wait action did not trigger wait SFX.");
  if (!audit.enemyActions.some((event) => event.action === "attack" || event.action === "move")) throw new Error("Enemy turn did not move or attack.");
  if (audit.afterEnemy.side !== "player" || audit.afterEnemy.before?.x === audit.afterEnemy.after?.x && audit.afterEnemy.before?.y === audit.afterEnemy.after?.y) throw new Error("Next player turn did not allow direct movement from the default selected unit.");
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  await writeFile(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
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
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const button = await page.evaluate((buttonId) => globalThis.__cangshanGame.ui.buttons.find((item) => item.id === buttonId) || null, id);
    if (button) return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
    await page.waitForTimeout(50);
  }
  throw new Error(`Canvas button not rendered: ${id}`);
}
