import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-romance";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--autoplay-policy=no-user-gesture-required"]
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:4174/wechat-debug/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.hero, null, { timeout: 15000 });
  await clickButton("new");
  await closeDialogs();

  const routes = [
    { id: "su_luo", mapId: "room", point: { x: 540, y: 260 }, label: "su-luo" },
    { id: "qin_wanyao", mapId: "moonValley", point: { x: 390, y: 710 }, label: "qin-wanyao" },
    { id: "mu_zhiyan", mapId: "moonValley", point: { x: 555, y: 1160 }, label: "mu-zhiyan" }
  ];
  const dialogs = [];
  for (const route of routes) {
    await setTrigger(route);
    await page.evaluate(() => globalThis.__cangshanGame.interact());
    await page.waitForFunction(() => globalThis.__cangshanGame?.dialog?.active, null, { timeout: 3000 });
    await page.screenshot({ path: `${output}/${route.label}-first-dialog.png` });
    dialogs.push({ route: route.label, stage: "first", pages: await advanceDialog(route.label, 0) });

    await setTrigger(route);
    await page.evaluate(() => globalThis.__cangshanGame.interact());
    await page.waitForFunction(() => globalThis.__cangshanGame?.dialog?.active, null, { timeout: 3000 });
    await page.screenshot({ path: `${output}/${route.label}-turning-dialog.png` });
    dialogs.push({ route: route.label, stage: "turning", pages: await advanceDialog(route.label, 0) });
  }

  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  const state = await page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    return {
      scores: { ...game.romanceScores },
      flags: [...game.storyFlags],
      items: { ...game.items },
      log: game.storyLog.slice(0, 8)
    };
  });
  for (const id of ["su_luo", "qin_wanyao", "mu_zhiyan"]) {
    if (state.scores[id] < 2) throw new Error(`Romance route did not record affection: ${id}`);
    if (!state.flags.includes(`romance_${id}_opened`)) throw new Error(`Romance opening flag missing: ${id}`);
    if (!state.flags.includes(`romance_${id}_turning`)) throw new Error(`Romance turning flag missing: ${id}`);
  }
  if (state.items.palace_invitation !== 1) throw new Error("Qin Wanyao route did not grant the palace invitation.");
  if (!state.flags.includes("heard_swapped_children_clue")) throw new Error("Mu Zhiyan route did not preserve the clue flag.");

  const audit = { dialogs, state, errors };
  await writeFile(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
} finally {
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
}

async function setTrigger({ id, mapId, point }) {
  await page.evaluate(({ id: triggerId, mapId: targetMap, point: targetPoint }) => {
    const game = globalThis.__cangshanGame;
    game.enterMap(targetMap, targetPoint);
    game.activeTrigger = game.mapManager.map.triggers.find((trigger) => trigger.id === triggerId);
    if (!game.activeTrigger) throw new Error(`Missing romance trigger: ${triggerId}`);
  }, { id, mapId, point });
  await page.waitForTimeout(80);
}

async function advanceDialog(route, choiceIndex) {
  const pages = [];
  for (let index = 0; index < 12; index += 1) {
    const pageState = await page.evaluate(() => {
      const page = globalThis.__cangshanGame.dialog.page;
      return {
        speaker: page?.speaker || null,
        text: page?.text || null,
        choices: page?.choices?.map((choice) => choice.label) || []
      };
    });
    pages.push(pageState);
    await page.evaluate((selected) => globalThis.__cangshanGame.dialog.advance(selected), pageState.choices.length ? choiceIndex : 0);
    await page.waitForTimeout(50);
    if (!await page.evaluate(() => globalThis.__cangshanGame.dialog.active)) return pages;
  }
  throw new Error(`Romance dialog did not close: ${route}`);
}

async function closeDialogs() {
  for (let index = 0; index < 12; index += 1) {
    if (!await page.evaluate(() => globalThis.__cangshanGame.dialog.active)) return;
    await clickButton("choice:0");
  }
  throw new Error("Opening dialog did not close.");
}

async function clickButton(id) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const button = await page.evaluate((buttonId) => globalThis.__cangshanGame?.ui?.buttons.find((item) => item.id === buttonId) || null, id);
    if (button && !button.disabled) {
      await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
      return;
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`Canvas button not available: ${id}`);
}
