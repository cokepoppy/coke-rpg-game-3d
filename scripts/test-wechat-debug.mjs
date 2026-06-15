import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";

const output = "screenshots/wechat-portrait";
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
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.hero, null, { timeout: 10000 });

  const canvas = await page.evaluate(() => {
    const element = document.querySelector("#game");
    const pixels = element.getContext("2d").getImageData(0, 0, element.width, element.height).data;
    let coloredSamples = 0;
    for (let index = 0; index < pixels.length; index += 400) {
      if (pixels[index + 3] && (pixels[index] || pixels[index + 1] || pixels[index + 2])) coloredSamples += 1;
    }
    return { width: element.width, height: element.height, coloredSamples };
  });

  await page.screenshot({ path: `${output}/01-menu.png` });
  await clickButton(page, "new");
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "game", null, { timeout: 5000 });
  for (let index = 0; index < 6; index += 1) {
    await page.waitForTimeout(120);
    const dialogActive = await page.evaluate(() => globalThis.__cangshanGame.dialog.active);
    if (!dialogActive) break;
    await clickButton(page, "choice:0");
  }
  const openingClosed = await page.evaluate(() => !globalThis.__cangshanGame.dialog.active);
  if (!openingClosed) throw new Error("Opening dialog did not finish after six attempts.");

  const beforeMove = await playerState(page);
  const up = await buttonCenter(page, "up");
  await page.mouse.move(up.x, up.y);
  await page.mouse.down();
  await page.waitForTimeout(850);
  await page.mouse.up();
  await page.waitForTimeout(100);
  const afterMove = await playerState(page);
  await page.screenshot({ path: `${output}/02-world.png` });

  await clickButton(page, "interact");
  await page.waitForTimeout(150);
  const interaction = await page.evaluate(() => ({
    speaker: globalThis.__cangshanGame.dialog.page?.speaker,
    choices: globalThis.__cangshanGame.dialog.page?.choices?.map((choice) => choice.label) || []
  }));
  if (interaction.speaker !== "云来客栈") throw new Error(`Expected inn interaction, received ${interaction.speaker}`);
  await clickButton(page, "choice:0");
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${output}/03-room.png` });

  const room = await playerState(page);
  const audit = { canvas, beforeMove, afterMove, interaction, room, errors };
  if (canvas.coloredSamples < 1000) throw new Error("Canvas pixel audit failed: rendered frame is mostly blank.");
  if (afterMove.y >= beforeMove.y - 80) throw new Error("Touch movement audit failed: player did not move far enough.");
  if (afterMove.trigger !== "inn") throw new Error(`Trigger audit failed: expected inn, received ${afterMove.trigger}`);
  if (room.mapId !== "room") throw new Error("Map transition audit failed.");
  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  await writeFile(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
} finally {
  await browser.close();
}

async function playerState(page) {
  return page.evaluate(() => ({
    mapId: globalThis.__cangshanGame.mapManager.id,
    x: globalThis.__cangshanGame.player.x,
    y: globalThis.__cangshanGame.player.y,
    trigger: globalThis.__cangshanGame.activeTrigger?.id || null
  }));
}

async function clickButton(page, id) {
  const point = await buttonCenter(page, id);
  await page.mouse.click(point.x, point.y);
}

async function buttonCenter(page, id) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const button = await page.evaluate((buttonId) => globalThis.__cangshanGame.ui.buttons.find((item) => item.id === buttonId) || null, id);
    if (button) return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
    await page.waitForTimeout(50);
  }
  throw new Error(`Canvas button not rendered: ${id}`);
}
