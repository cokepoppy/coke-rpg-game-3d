#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const root = process.cwd();
const baseUrl = process.env.BASE_URL || "http://127.0.0.1:4174/wechat-debug/";
const output = path.join(root, "screenshots/wechat-boss-demo");
const headless = process.env.DEMO_HEADLESS === "1";
const autoBattleEnabled = process.env.DEMO_AUTO_BATTLE !== "0";
const recordVideo = process.env.DEMO_RECORD === "1";
const viewport = { width: 390, height: 844 };
const videoOutput = path.join(output, "coke-rpg-boss-demo-390x844.webm");

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--autoplay-policy=no-user-gesture-required", "--window-size=420,900"]
});
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  ...(recordVideo ? { recordVideo: { dir: output, size: viewport } } : {})
});
const page = await context.newPage();
const video = recordVideo ? page.video() : null;
const errors = [];
const responses = [];
const progress = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
    responses.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForFunction(() => globalThis.__cangshanGame?.images?.hero, null, { timeout: 15000 });

  log("从新游戏开始");
  await clickButton("new");
  await dismissDialogs();
  await shot("01-new-game");

  log("进入客房，搜索木柜和账册");
  // The new-game spawn overlaps the scout trigger; step east first so the inn prompt wins.
  await moveToTrigger("inn", [[2900, 2520]]);
  await interact();
  await choose("进入客房");
  await waitForMap("room");

  await moveToTrigger("wardrobe", [[1060, 650], [1060, 520]]);
  await interact();
  await dismissDialogs();
  await moveToTrigger("desk", [[820, 520], [820, 330]]);
  await interact();
  await dismissDialogs();
  await shot("02-room-clues");

  log("离开客房");
  await moveToTrigger("roomExit", [[820, 650], [610, 650]]);
  await interact();
  await choose("离开客房");
  await waitForMap("world");

  log("在药摊购买一把青锋剑");
  await moveToTrigger("vendor", [[2700, 2600], [3370, 2600]]);
  await interact();
  await choose("查看货物");
  await clickButton("shop:buy:iron_sword");
  await page.waitForTimeout(220);
  await clickButton("closeShop");
  await page.waitForTimeout(120);

  log("进入松风茶肆，查看告示");
  await moveToTrigger("teahouseDoor", [[2320, 2600], [2320, 1390]]);
  await interact();
  await choose("进入茶肆");
  await waitForMap("teahouseRoom");
  // The tea-house tables block the lower-right edge; use the center aisle.
  await moveToTrigger("desk", [[900, 650], [900, 500], [1030, 500], [1030, 300]]);
  await interact();
  await dismissDialogs();
  await shot("03-teahouse-clue");

  log("离开茶肆，前往北坡残灯禁地");
  await moveToTrigger("roomExit", [[1030, 500], [900, 500], [900, 650], [610, 650]]);
  await interact();
  await choose("离开松风茶肆");
  await waitForMap("world");

  await moveToTrigger("boss_lantern_wraith", [[1760, 1320], [1760, 1080]]);
  await interact();
  await shot("04-boss-door");
  await choose("进入 Boss 战");
  await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "battle" && globalThis.__cangshanGame?.battle?.active, null, { timeout: 5000 });
  await shot("05-boss-battle-start");

  let result;
  if (autoBattleEnabled) {
    log("自动战斗：移动、选技、攻击，直到 Boss 战结束");
    await autoBattle();
    await page.waitForFunction(() => globalThis.__cangshanGame?.mode === "game" && globalThis.__cangshanGame?.dialog?.active, null, { timeout: 15000 });
    await shot("06-boss-result");
    result = await page.evaluate(() => {
      const game = globalThis.__cangshanGame;
      return {
        mapId: game.mapManager.id,
        mode: game.mode,
        battleResult: game.lastBattleAudit?.result || null,
        bossDefeated: [...game.defeatedBosses],
        storyFlags: [...game.storyFlags],
        items: { ...game.items },
        player: { x: Math.round(game.player.x), y: Math.round(game.player.y) }
      };
    });
    if (result.battleResult !== "victory") throw new Error(`Boss battle did not end in victory: ${result.battleResult}`);
    if (!result.bossDefeated.includes("boss_lantern_wraith")) throw new Error("Boss defeat was not recorded.");
    await clickFirstChoice();
    await waitForDialogHidden();
  } else {
    log("已进入 Boss 战斗界面，演示在这里暂停，方便观察真实战斗操作");
    result = await page.evaluate(() => {
      const game = globalThis.__cangshanGame;
      return {
        mapId: game.mapManager.id,
        mode: game.mode,
        battleStarted: Boolean(game.battle?.active),
        battleTitle: game.battle?.config?.title || null,
        battleResult: null,
        bossDefeated: [...game.defeatedBosses],
        storyFlags: [...game.storyFlags],
        items: { ...game.items },
        player: { x: Math.round(game.player.x), y: Math.round(game.player.y) }
      };
    });
    if (!result.battleStarted || result.battleTitle !== "灯亭 · 引灯魇客") throw new Error("Boss battle screen was not reached.");
  }

  const audit = { baseUrl, headless, autoBattleEnabled, recordVideo, viewport, output, progress, result, errors, responses };
  await fs.writeFile(path.join(output, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit, null, 2));
  if (errors.length || responses.length) process.exitCode = 1;
} finally {
  await page.close().catch(() => {});
  await context.close().catch(() => {});
  if (video) {
    const recordedVideo = await video.path().catch(() => null);
    if (recordedVideo) {
      await fs.rename(recordedVideo, videoOutput);
      console.log(`[wechat-boss-demo] 视频已保存：${videoOutput}`);
    }
  }
  await browser.close().catch(() => {});
}

async function autoBattle() {
  for (let actionCount = 0; actionCount < 96; actionCount += 1) {
    await page.waitForFunction(() => {
      const battle = globalThis.__cangshanGame?.battle;
      return !battle || battle.finished || battle.side === "player" || !battle.active;
    }, null, { timeout: 15000 });

    const status = await page.evaluate(() => {
      const game = globalThis.__cangshanGame;
      const battle = game?.battle;
      return {
        mode: game?.mode,
        active: Boolean(battle?.active),
        finished: Boolean(battle?.finished),
        side: battle?.side,
        phase: battle?.phase,
        selectedId: battle?.selectedId,
        livingPlayers: battle?.living("player").filter((unit) => unit.alive).map((unit) => unit.id) || [],
        livingEnemies: battle?.living("enemy").filter((unit) => unit.alive).map((unit) => unit.id) || []
      };
    });
    if (status.mode !== "battle" || !status.active || status.finished) return;
    if (status.side !== "player") continue;
    if (!status.livingPlayers.length) throw new Error("The party was defeated during the demo battle.");
    if (!status.livingEnemies.length) return;

    if (!status.selectedId) {
      await page.waitForTimeout(80);
      continue;
    }

    const plan = await page.evaluate(() => {
      const battle = globalThis.__cangshanGame.battle;
      const unit = battle.selected;
      if (!unit) return null;
      const enemies = battle.living("enemy").filter((entry) => entry.alive);
      const nearest = (from, entries) => entries.slice().sort((a, b) => {
        const da = Math.abs(from.x - a.x) + Math.abs(from.y - a.y);
        const db = Math.abs(from.x - b.x) + Math.abs(from.y - b.y);
        return da - db;
      })[0] || null;
      const target = nearest(unit, enemies.filter((entry) => entry.id !== "lanternWraith")) || nearest(unit, enemies);
      if (!target) return { unitId: unit.id, action: "wait" };
      const moves = [{ x: unit.x, y: unit.y }, ...battle.movesFor(unit)];
      const heroSkills = unit.id === "hero"
        ? battle.skillsFor(unit).filter((skill) => skill.kind !== "ally_all" && unit.qi >= skill.cost)
        : [];
      const preferredHeroSkill = heroSkills.find((skill) => skill.id === "guiyuan_sword") || heroSkills.find((skill) => skill.id === "whirlwind") || heroSkills[0];
      const heroRange = preferredHeroSkill?.range || 1;
      const safeHeroMoves = unit.id === "hero"
        ? moves.filter((cell) => {
          const distance = Math.abs(cell.x - target.x) + Math.abs(cell.y - target.y);
          return distance >= Math.min(2, heroRange) && distance <= heroRange;
        })
        : [];
      const candidates = safeHeroMoves.length ? safeHeroMoves : moves;
      const bestMove = candidates.slice().sort((a, b) => {
        const da = Math.abs(a.x - target.x) + Math.abs(a.y - target.y);
        const db = Math.abs(b.x - target.x) + Math.abs(b.y - target.y);
        return da - db;
      })[0];
      return {
        unitId: unit.id,
        moveCell: bestMove.x === unit.x && bestMove.y === unit.y ? null : bestMove,
        targetId: target.id
      };
    });
    if (!plan) {
      await page.waitForTimeout(80);
      continue;
    }

    if (plan.moveCell) {
      await clickCell(plan.moveCell);
      await page.waitForFunction(() => {
        const battle = globalThis.__cangshanGame?.battle;
        return battle?.phase === "act" || battle?.side !== "player" || battle?.finished;
      }, null, { timeout: 3000 });
      if (await page.evaluate(() => globalThis.__cangshanGame?.battle?.side !== "player")) continue;
    }

    const action = await page.evaluate(() => {
      const battle = globalThis.__cangshanGame.battle;
      const unit = battle.selected;
      if (!unit) return { action: "wait" };
      const enemies = battle.living("enemy").filter((entry) => entry.alive);
      const targetPool = enemies.filter((entry) => entry.id !== "lanternWraith");
      const target = (targetPool.length ? targetPool : enemies).slice().sort((a, b) => {
        const da = Math.abs(unit.x - a.x) + Math.abs(unit.y - a.y);
        const db = Math.abs(unit.x - b.x) + Math.abs(unit.y - b.y);
        return da - db;
      })[0];
      if (!target) return { action: "wait" };
      const players = battle.living("player").filter((entry) => entry.alive);
      const allyNeedsHealing = players.some((entry) => entry.hp <= entry.maxHp * 0.5);
      const healing = battle.skillsFor(unit).find((candidate) => candidate.kind === "ally_all" && candidate.heal && unit.qi >= candidate.cost);
      const offensive = battle.skillsFor(unit)
        .filter((skill) => skill.kind !== "ally_all" && unit.qi >= skill.cost)
        .sort((a, b) => (b.damage || 0) - (a.damage || 0));
      const predictDamage = (skill, defender) => Math.max(1, (skill.damage ?? unit.damage) + (skill.damage ? unit.bonusAttack || 0 : 0) - (defender.defense || 0));
      const attackOptions = offensive
        .map((skill) => ({ skill, targets: battle.targetable(unit, skill) }))
        .filter((entry) => entry.targets.length);
      const basic = battle.skillById("basic_attack");
      const basicTargets = battle.targetable(unit, basic);
      const canFinishTarget = attackOptions.some(({ skill, targets }) => targets.some((entry) => predictDamage(skill, entry) >= entry.hp))
        || basicTargets.some((entry) => predictDamage(basic, entry) >= entry.hp);
      if (unit.id === "companion" && allyNeedsHealing && healing && !canFinishTarget) {
        return { action: "support", skillId: healing.id };
      }
      const skill = attackOptions[0]?.skill;
      if (skill) {
        const skillTarget = battle.targetable(unit, skill).slice().sort((a, b) => {
          const da = Math.abs(unit.x - a.x) + Math.abs(unit.y - a.y);
          const db = Math.abs(unit.x - b.x) + Math.abs(unit.y - b.y);
          return da - db;
        })[0];
        return { action: "skill", skillId: skill.id, target: { x: skillTarget.x, y: skillTarget.y } };
      }
      const basicTarget = basicTargets[0];
      return basicTarget
        ? { action: "basic", target: { x: basicTarget.x, y: basicTarget.y } }
        : { action: "wait" };
    });

    if (action.action === "support") {
      await clickButton(`battle:skill:${action.skillId}`);
    } else if (action.action === "skill") {
      await clickButton(`battle:skill:${action.skillId}`);
      await page.waitForFunction(() => globalThis.__cangshanGame?.battle?.phase === "target", null, { timeout: 2000 });
      await clickCell(action.target);
    } else if (action.action === "basic") {
      await clickButton("battle:attack");
      await page.waitForFunction(() => globalThis.__cangshanGame?.battle?.phase === "target", null, { timeout: 2000 });
      await clickCell(action.target);
    } else {
      await clickButton("battle:wait");
    }
    await page.waitForTimeout(180);
  }
  const state = await page.evaluate(() => {
    const battle = globalThis.__cangshanGame?.battle;
    return {
      side: battle?.side,
      phase: battle?.phase,
      selectedId: battle?.selectedId,
      units: battle?.units?.map((unit) => ({ id: unit.id, side: unit.side, hp: unit.hp, alive: unit.alive })) || [],
      audit: battle?.audit || null
    };
  });
  throw new Error(`Boss battle exceeded the 96-action demo limit: ${JSON.stringify(state)}`);
}

async function moveToTrigger(triggerId, waypoints) {
  const target = await page.evaluate((id) => {
    const game = globalThis.__cangshanGame;
    const trigger = game.mapManager.map.triggers.find((entry) => entry.id === id);
    if (!trigger) throw new Error(`Unknown trigger: ${id}`);
    return { x: trigger.x + trigger.width / 2, y: trigger.y + trigger.height / 2 };
  }, triggerId);
  for (const [x, y] of waypoints) await walkTo({ x, y });
  await page.waitForFunction((id) => globalThis.__cangshanGame?.activeTrigger?.id === id, triggerId, { timeout: 5000 });
  const state = await readPlayerState();
  log(`到达 ${triggerId} (${Math.round(state.x)}, ${Math.round(state.y)})`);
  return target;
}

async function walkTo(target) {
  const current = await readPlayerState();
  if (Math.abs(current.x - target.x) > 10) await holdDirection(current.x < target.x ? "right" : "left", "x", target.x);
  const updated = await readPlayerState();
  if (Math.abs(updated.y - target.y) > 10) await holdDirection(updated.y < target.y ? "down" : "up", "y", target.y);
}

async function holdDirection(direction, axis, target) {
  const current = await readPlayerState();
  const alreadyThere = direction === "right" || direction === "down"
    ? current[axis] >= target - 10
    : current[axis] <= target + 10;
  if (alreadyThere) return;
  const point = await buttonCenter(direction);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  try {
    await page.waitForFunction(({ axis: axisName, target: targetValue, direction: directionName }) => {
      const game = globalThis.__cangshanGame;
      if (!game || game.mode !== "game" || game.dialog.active) return false;
      const value = game.player[axisName];
      return directionName === "right" || directionName === "down"
        ? value >= targetValue - 10
        : value <= targetValue + 10;
    }, { axis, target, direction }, { timeout: 12000 });
  } catch (error) {
    const state = await page.evaluate(() => {
      const game = globalThis.__cangshanGame;
      return {
        mode: game?.mode,
        dialog: Boolean(game?.dialog?.active),
        mapId: game?.mapManager?.id,
        x: Math.round(game?.player?.x || 0),
        y: Math.round(game?.player?.y || 0),
        trigger: game?.activeTrigger?.id || null
      };
    });
    throw new Error(`Movement blocked on ${direction} ${axis} to ${target}; state=${JSON.stringify(state)}; ${error.message}`);
  } finally {
    await page.mouse.up();
  }
}

async function interact() {
  await clickButton("interact");
  await page.waitForFunction(() => globalThis.__cangshanGame?.dialog?.active, null, { timeout: 3000 });
}

async function choose(label) {
  const index = await page.evaluate((choiceLabel) => {
    const choices = globalThis.__cangshanGame?.dialog?.page?.choices || [];
    return choices.findIndex((choice) => choice.label === choiceLabel);
  }, label);
  if (index < 0) throw new Error(`Dialog choice not found: ${label}`);
  await clickButton(`choice:${index}`);
  await page.waitForTimeout(160);
}

async function dismissDialogs() {
  for (let index = 0; index < 12; index += 1) {
    const active = await page.evaluate(() => Boolean(globalThis.__cangshanGame?.dialog?.active));
    if (!active) return;
    await clickFirstChoice();
    await page.waitForTimeout(100);
  }
  throw new Error("Dialog did not close within the expected number of pages.");
}

async function clickFirstChoice() {
  await clickButton("choice:0");
}

async function waitForDialogHidden() {
  await page.waitForFunction(() => !globalThis.__cangshanGame?.dialog?.active, null, { timeout: 5000 });
}

async function waitForMap(mapId) {
  await page.waitForFunction((expected) => globalThis.__cangshanGame?.mapManager?.id === expected, mapId, { timeout: 5000 });
  await page.waitForTimeout(120);
}

async function readPlayerState() {
  return page.evaluate(() => {
    const game = globalThis.__cangshanGame;
    return { mapId: game.mapManager.id, x: game.player.x, y: game.player.y, trigger: game.activeTrigger?.id || null };
  });
}

async function clickButton(id) {
  const point = await buttonCenter(id);
  await page.mouse.click(point.x, point.y);
}

async function buttonCenter(id) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const button = await page.evaluate((buttonId) => globalThis.__cangshanGame?.ui?.buttons.find((item) => item.id === buttonId) || null, id);
    if (button && !button.disabled) return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
    await page.waitForTimeout(50);
  }
  throw new Error(`Canvas button not available: ${id}`);
}

async function clickCell(cell) {
  const point = await page.evaluate(({ x, y }) => {
    const game = globalThis.__cangshanGame;
    const battle = game.battle;
    return battle.cellCenter({ x, y });
  }, cell);
  await page.mouse.click(point.x, point.y);
}

async function shot(name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
}

function log(message) {
  progress.push(message);
  console.log(`[wechat-boss-demo] ${message}`);
}
