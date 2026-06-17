import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-battle-skills";
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
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.battleBamboo, null, { timeout: 15000 });
  await clickButton(page, "new");
  for (let index = 0; index < 6; index += 1) {
    const active = await page.evaluate(() => globalThis.__cangshanGame.dialog.active);
    if (!active) break;
    await clickButton(page, "choice:0");
    await page.waitForTimeout(60);
  }

  const audit = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.items = { steel_saber: 1, swift_boots: 1, leather_armor: 1 };
    game.startBattle("scout_archer");
    const battle = game.battle;
    const hero = battle.units.find((unit) => unit.id === "hero");
    const companion = battle.units.find((unit) => unit.id === "companion");
    const scoutA = battle.units.find((unit) => unit.id === "scoutA");
    const scoutB = battle.units.find((unit) => unit.id === "scoutB");
    scoutB.x = 5;
    scoutB.y = 7;
    const initial = {
      mapKey: battle.mapKey,
      hero: { move: hero.move, damage: hero.damage, defense: hero.defense, skills: battle.skillsFor(hero).map((skill) => skill.id) }
    };

    battle.castSkill(hero, scoutA, battle.skillById("daze"));
    const afterDaze = {
      scoutHp: scoutA.hp,
      stunned: scoutA.status.stunned || 0,
      stunSfx: game.skillSfx.stunned.audit.playCount,
      attack: battle.audit.attacks.at(-1)
    };

    hero.acted = false;
    hero.qi = 110;
    scoutA.hp = 38;
    scoutA.alive = true;
    scoutB.hp = 46;
    scoutB.alive = true;
    battle.castSkill(hero, scoutA, battle.skillById("whirlwind"));
    const aoeEvents = battle.audit.attacks.filter((event) => event.skillId === "whirlwind");
    const afterAoe = {
      targets: aoeEvents.map((event) => event.targetId),
      sweepSfx: game.skillSfx.aoe.audit.playCount
    };

    companion.acted = false;
    companion.qi = 90;
    hero.hp = 40;
    battle.castSupport(companion, battle.skillById("heal"));
    const afterHeal = {
      heroHp: hero.hp,
      healSfx: game.skillSfx.heal.audit.playCount,
      support: battle.audit.attacks.at(-1)
    };

    return { initial, afterDaze, afterAoe, afterHeal, errors: [] };
  });
  audit.errors = errors;
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${output}/01-skill-audit.png` });

  if (audit.initial.mapKey !== "battleBamboo") throw new Error(`Expected bamboo battle map, received ${audit.initial.mapKey}`);
  if (audit.initial.hero.move !== 4 || audit.initial.hero.damage !== 41 || audit.initial.hero.defense !== 5) throw new Error("Equipment modifiers were not applied.");
  if (audit.initial.hero.skills.length !== 3) throw new Error("Hero should expose exactly three skills.");
  if (audit.afterDaze.stunned !== 1 || audit.afterDaze.attack.skillId !== "daze" || audit.afterDaze.stunSfx < 1) throw new Error("Daze skill did not stun or play SFX.");
  if (audit.afterAoe.targets.length < 2 || audit.afterAoe.sweepSfx < 1) throw new Error("AOE skill did not hit multiple targets or play SFX.");
  if (audit.afterHeal.heroHp <= 40 || audit.afterHeal.healSfx < 1) throw new Error("Heal skill did not restore HP or play SFX.");
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
