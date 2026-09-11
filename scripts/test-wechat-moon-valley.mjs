import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-moon-valley";
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
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.moonValley, null, { timeout: 15000 });
  await clickButton(page, "new");
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "game", null, { timeout: 5000 });
  await closeOpeningDialog(page);

  const audit = { points: [], dialogs: [], battle: null, story: null, errors };
  await setPoint(page, "world", { x: 3180, y: 1480 }, false);
  audit.points.push(await state(page, "world-moon-gate"));
  await page.screenshot({ path: `${output}/01-world-moon-gate.png` });
  await clickButton(page, "interact");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "月华谷山口", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "world-moon-gate-dialog"));
  await page.screenshot({ path: `${output}/02-world-moon-gate-dialog.png` });
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.mapManager.id === "moonValley" && globalThis.__cangshanGame.dialog.active, null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "moon-valley-arrival-1"));
  await page.screenshot({ path: `${output}/03-moon-valley-arrival.png` });
  await closeOpeningDialog(page);

  await setPoint(page, "moonValley", { x: 390, y: 1575 }, false);
  audit.points.push(await state(page, "valley-spawn"));
  await page.screenshot({ path: `${output}/04-valley-spawn.png` });

  await setPoint(page, "moonValley", { x: 390, y: 710 }, false);
  audit.points.push(await state(page, "qin-wanyao"));
  await page.screenshot({ path: `${output}/05-qin-wanyao.png` });
  await clickButton(page, "interact");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.active, null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "qin-wanyao-dialog"));
  await page.screenshot({ path: `${output}/06-qin-wanyao-dialog.png` });
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "沈临川", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "qin-wanyao-hero-response"));
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "秦晚瑶", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "qin-wanyao-choice"));
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.items.palace_invitation === 1, null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "qin-wanyao-invitation"));
  await page.screenshot({ path: `${output}/07-qin-wanyao-invitation.png` });
  await clickIfButtonExists(page, "choice:0");

  await setPoint(page, "moonValley", { x: 555, y: 1160 }, false);
  audit.points.push(await state(page, "mu-zhiyan"));
  await page.screenshot({ path: `${output}/08-mu-zhiyan.png` });
  await clickButton(page, "interact");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "穆芷烟", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "mu-zhiyan-dialog"));
  await page.screenshot({ path: `${output}/09-mu-zhiyan-dialog.png` });
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "沈临川", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "mu-zhiyan-hero-response"));
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "穆芷烟", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "mu-zhiyan-choice"));
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.storyFlags.has("heard_swapped_children_clue"), null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "mu-zhiyan-clue"));
  await page.screenshot({ path: `${output}/10-mu-zhiyan-clue.png` });
  await clickIfButtonExists(page, "choice:0");

  await setPoint(page, "moonValley", { x: 640, y: 1000 }, false);
  audit.points.push(await state(page, "medicine-door"));
  await page.screenshot({ path: `${output}/11-medicine-door.png` });
  await clickButton(page, "interact");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "月华药庐", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "medicine-door-dialog"));
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.mapManager.id === "moonMedicineHall", null, { timeout: 3000 });
  audit.points.push(await state(page, "medicine-room"));
  await page.screenshot({ path: `${output}/12-medicine-room.png` });

  await setPoint(page, "moonValley", { x: 390, y: 345 }, false);
  audit.points.push(await state(page, "study-door"));
  await page.screenshot({ path: `${output}/13-study-door.png` });
  await clickButton(page, "interact");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "月华书房", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "study-door-dialog"));
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.mapManager.id === "moonStudy", null, { timeout: 3000 });
  audit.points.push(await state(page, "study-room"));
  await page.screenshot({ path: `${output}/14-study-room.png` });

  await setPoint(page, "moonValley", { x: 425, y: 575 }, true);
  audit.points.push(await state(page, "debug-collision-and-scout"));
  await page.screenshot({ path: `${output}/15-debug-collision-and-scout.png` });
  await page.evaluate(() => { globalThis.__cangshanGame.debugMap = false; });
  await clickButton(page, "interact");
  await page.waitForFunction(() => globalThis.__cangshanGame.dialog.page?.speaker === "谷中叛徒", null, { timeout: 3000 });
  audit.dialogs.push(await dialogState(page, "moon-scout-dialog"));
  await page.screenshot({ path: `${output}/16-moon-scout-dialog.png` });
  await clickButton(page, "choice:0");
  await page.waitForFunction(() => globalThis.__cangshanGame.mode === "battle", null, { timeout: 3000 });
  await page.evaluate(() => {
    const battle = globalThis.__cangshanGame.battle;
    for (const enemy of battle.units.filter((unit) => unit.side === "enemy")) {
      if (enemy.id !== "scoutA") {
        enemy.hp = 0;
        enemy.alive = false;
      }
    }
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${output}/17-moon-battle-start.png` });
  await clickBattleCell(page, 3, 7);
  await page.waitForTimeout(120);
  await clickButton(page, "battle:skill:guiyuan_sword");
  await page.waitForFunction(() => globalThis.__cangshanGame.battle?.phase === "target", null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/18-moon-battle-target.png` });
  await clickBattleCell(page, 4, 7);
  await page.waitForFunction(() => globalThis.__cangshanGame.mode === "game" && globalThis.__cangshanGame.dialog.active, null, { timeout: 3000 });
  await page.screenshot({ path: `${output}/19-moon-battle-victory.png` });

  const canvas = await page.evaluate(() => {
    const element = document.querySelector("#game");
    const pixels = element.getContext("2d").getImageData(0, 0, element.width, element.height).data;
    let coloredSamples = 0;
    for (let index = 0; index < pixels.length; index += 400) {
      if (pixels[index + 3] && (pixels[index] || pixels[index + 1] || pixels[index + 2])) coloredSamples += 1;
    }
    return { width: element.width, height: element.height, coloredSamples };
  });
  audit.canvas = canvas;
  audit.battle = await page.evaluate(() => ({
    defeated: globalThis.__cangshanGame.defeatedScouts.has("scout_moon"),
    dialog: globalThis.__cangshanGame.dialog.page?.speaker,
    audit: globalThis.__cangshanGame.lastBattleAudit,
    money: globalThis.__cangshanGame.money,
    items: globalThis.__cangshanGame.items
  }));
  audit.story = await page.evaluate(() => ({
    flags: [...globalThis.__cangshanGame.storyFlags],
    log: globalThis.__cangshanGame.storyLog,
    invitation: globalThis.__cangshanGame.items.palace_invitation || 0,
    qingxin: globalThis.__cangshanGame.items.qingxin_pill || 0
  }));

  const expectedTriggers = new Map([
    ["world-moon-gate", "moonValleyGate"],
    ["qin-wanyao", "qin_wanyao"],
    ["mu-zhiyan", "mu_zhiyan"],
    ["medicine-door", "moonMedicineDoor"],
    ["study-door", "moonStudyDoor"],
    ["debug-collision-and-scout", "scout_moon"]
  ]);
  for (const point of audit.points) {
    const expected = expectedTriggers.get(point.name);
    if (expected && point.trigger !== expected) throw new Error(`${point.name} expected trigger ${expected}, received ${point.trigger}`);
  }
  if (canvas.width !== 390 || canvas.height !== 844 || canvas.coloredSamples < 1000) throw new Error("Moon valley canvas audit failed.");
  if (!audit.points.some((point) => point.mapId === "moonMedicineHall")) throw new Error("Medicine hall transition failed.");
  if (!audit.points.some((point) => point.mapId === "moonStudy")) throw new Error("Study transition failed.");
  if (!audit.story.flags.includes("moon_valley_reached")) throw new Error("Moon valley arrival story did not set its flag.");
  if (!audit.story.flags.includes("heard_swapped_children_clue")) throw new Error("Mu Zhiyan clue did not advance story state.");
  if (audit.story.invitation !== 1) throw new Error("Qin Wanyao did not grant palace invitation.");
  if (!audit.battle.defeated || audit.battle.audit?.result !== "victory") throw new Error("Moon valley battle did not finish as victory.");
  if (!audit.battle.audit?.attacks?.some((event) => event.attackerId === "hero" && event.targetId === "scoutA")) throw new Error("Moon valley battle did not record hero attack.");
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  await writeFile(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
  setTimeout(() => globalThis.process.exit(0), 1500);
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

async function closeOpeningDialog(page) {
  for (let index = 0; index < 6; index += 1) {
    const active = await page.evaluate(() => globalThis.__cangshanGame.dialog.active);
    if (!active) break;
    await clickButton(page, "choice:0");
    await page.waitForTimeout(80);
  }
}

async function setPoint(page, mapId, point, debugMap) {
  await page.evaluate(({ mapId, point, debugMap }) => {
    const game = globalThis.__cangshanGame;
    game.enterMap(mapId, point);
    game.debugMap = debugMap;
    game.activeTrigger = game.resolveActiveTrigger();
  }, { mapId, point, debugMap });
  await page.waitForTimeout(150);
}

async function state(page, name) {
  return page.evaluate((pointName) => ({
    name: pointName,
    mapId: globalThis.__cangshanGame.mapManager.id,
    x: Math.round(globalThis.__cangshanGame.player.x),
    y: Math.round(globalThis.__cangshanGame.player.y),
    trigger: globalThis.__cangshanGame.activeTrigger?.id || null,
    collisions: globalThis.__cangshanGame.mapManager.map.collisions.length,
    triggers: globalThis.__cangshanGame.mapManager.map.triggers.length
  }), name);
}

async function dialogState(page, name) {
  return page.evaluate((dialogName) => ({
    name: dialogName,
    speaker: globalThis.__cangshanGame.dialog.page?.speaker,
    text: globalThis.__cangshanGame.dialog.page?.text,
    choices: globalThis.__cangshanGame.dialog.page?.choices?.map((choice) => choice.label) || []
  }), name);
}

async function clickButton(page, id) {
  const point = await buttonCenter(page, id);
  await page.mouse.click(point.x, point.y);
}

async function clickIfButtonExists(page, id) {
  const button = await page.evaluate((buttonId) => globalThis.__cangshanGame.ui.buttons.find((item) => item.id === buttonId) || null, id);
  if (!button) return false;
  await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
  await page.waitForTimeout(80);
  return true;
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
