import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-bosses";
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
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.lanternWraith && globalThis.__cangshanGame?.images?.boneMirrorHag, null, { timeout: 15000 });

  await clickButton(page, "new");
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "game", null, { timeout: 5000 });
  await dismissDialogs(page);

  const clueAudit = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.enterMap("room");
    const wardrobe = game.mapManager.map.triggers.find((trigger) => trigger.id === "wardrobe");
    game.player.x = wardrobe.x + wardrobe.width / 2;
    game.player.y = wardrobe.y + wardrobe.height / 2;
    game.activeTrigger = wardrobe;
    game.interact();
    return { mapId: game.mapManager.id, items: { ...game.items }, flags: [...game.storyFlags] };
  });
  await dismissDialogs(page);
  const deskAudit = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    const desk = game.mapManager.map.triggers.find((trigger) => trigger.id === "desk");
    game.player.x = desk.x + desk.width / 2;
    game.player.y = desk.y + desk.height / 2;
    game.activeTrigger = desk;
    game.interact();
    return { items: { ...game.items }, flags: [...game.storyFlags] };
  });
  await dismissDialogs(page);
  const teaAudit = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.enterMap("teahouseRoom");
    const desk = game.mapManager.map.triggers.find((trigger) => trigger.id === "desk");
    game.player.x = desk.x + desk.width / 2;
    game.player.y = desk.y + desk.height / 2;
    game.activeTrigger = desk;
    game.interact();
    return { items: { ...game.items }, flags: [...game.storyFlags] };
  });
  await dismissDialogs(page);
  const moonAudit = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    game.enterMap("moonStudy");
    const desk = game.mapManager.map.triggers.find((trigger) => trigger.id === "desk");
    game.player.x = desk.x + desk.width / 2;
    game.player.y = desk.y + desk.height / 2;
    game.activeTrigger = desk;
    game.interact();
    return { items: { ...game.items }, flags: [...game.storyFlags] };
  });
  await dismissDialogs(page);

  const bossAudits = [];
  for (const setup of [
    { triggerId: "boss_lantern_wraith", mapId: "world", flags: ["lantern_order_clue", "tea_house_cipher"] },
    { triggerId: "boss_bone_mirror_hag", mapId: "moonValley", flags: ["moon_cipher_ready"], defeatedBoss: "boss_lantern_wraith" }
  ]) {
    const before = await page.evaluate((value) => {
      const game = globalThis.__cangshanGame;
      game.enterMap(value.mapId);
      for (const flag of value.flags) game.storyFlags.add(flag);
      if (value.defeatedBoss) game.defeatedBosses.add(value.defeatedBoss);
      const trigger = game.mapManager.map.triggers.find((entry) => entry.id === value.triggerId);
      game.player.x = trigger.x + trigger.width / 2;
      game.player.y = trigger.y + trigger.height / 2;
      game.activeTrigger = trigger;
      game.interact();
      return { triggerId: value.triggerId, dialogSpeaker: game.dialog.page?.speaker, dialogText: game.dialog.page?.text };
    }, setup);
    await clickButton(page, "choice:0");
    await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "battle", null, { timeout: 3000 });
    await page.screenshot({ path: `${output}/${setup.triggerId}.png` });
    const audit = await page.evaluate(() => {
      const game = globalThis.__cangshanGame;
      const battle = game.battle;
      const boss = battle.units.find((unit) => unit.side === "enemy" && unit.drawWidth);
      boss.hp = boss.maxHp * 0.4;
      return {
        title: battle.config.title,
        boss: { id: boss.id, hp: boss.maxHp, drawWidth: boss.drawWidth, drawHeight: boss.drawHeight },
        enragedSkill: battle.enemySkillFor(boss)?.id,
        enemies: battle.units.filter((unit) => unit.side === "enemy").map((unit) => ({ id: unit.id, hp: unit.maxHp }))
      };
    });
    bossAudits.push({ before, audit });
    await page.evaluate(() => {
      const game = globalThis.__cangshanGame;
      game.battle.active = false;
      game.mode = "game";
      game.dialog.hide?.();
    });
  }

  const result = {
    viewport: { width: 390, height: 844 },
    clueAudit,
    deskAudit,
    teaAudit,
    moonAudit,
    bossAudits,
    errors
  };
  if (!clueAudit.items.unsigned_letter || !clueAudit.items.copper_lantern_shard) throw new Error("Opening clue items were not collected.");
  if (!deskAudit.items.lantern_order_clue) throw new Error("Desk puzzle did not produce the lantern order clue.");
  if (!teaAudit.items.tea_house_cipher) throw new Error("Tea house puzzle did not produce the cipher clue.");
  if (!moonAudit.flags.includes("moon_cipher_ready")) throw new Error("Moon study puzzle did not unlock the mirror garden.");
  if (bossAudits.some(({ before, audit }) => before.dialogSpeaker !== audit.title.split(" · ")[1] && before.dialogSpeaker !== (audit.title.includes("照骨婆") ? "照骨婆" : "引灯魇客"))) throw new Error("Boss dialogue did not match the configured boss.");
  if (bossAudits.some(({ audit }) => !audit.boss.drawWidth || !audit.enragedSkill)) throw new Error("Boss size or enrage skill was not configured.");
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  await writeFile(`${output}/audit.json`, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await page?.close().catch(() => {});
  await browser.close().catch(() => {});
}

async function dismissDialogs(page) {
  for (let index = 0; index < 8; index += 1) {
    const active = await page.evaluate(() => globalThis.__cangshanGame?.dialog?.active);
    if (!active) return;
    await clickButton(page, "choice:0");
  }
}

async function clickButton(page, id) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const button = await page.evaluate((buttonId) => globalThis.__cangshanGame?.ui?.buttons.find((item) => item.id === buttonId) || null, id);
    if (button) {
      await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
      return;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`Canvas button not rendered: ${id}`);
}
