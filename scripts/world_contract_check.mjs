#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const baseUrl = process.env.BASE_URL || "http://localhost:5173";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const responses = [];

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) responses.push(`${response.status()} ${response.url()}`);
});

await page.goto(`${baseUrl}/index.modular.html`, { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__rpgScene?.player?.bounds));

const report = await page.evaluate(() => {
  const scene = window.__rpgScene;
  const playerFoot = (x, y) => ({ x: x - 17, y: y - 28, width: 34, height: 28 });
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const npcPlacement = (scene.map.asset.npcs || []).map((npc) => ({
    id: npc.id,
    x: npc.x,
    y: npc.y,
    reachable: scene.collision.canMove(playerFoot(npc.x, npc.y)),
    occluded: scene.map.occlusion.some((mask) => overlaps(playerFoot(npc.x, npc.y), mask))
  }));
  return {
    mapId: scene.mapId,
    mainMenuVisible: Boolean(document.querySelector(".menu-panel")),
    tileSize: scene.map.tileSize,
    playerBounds: scene.player.bounds,
    collisionCount: scene.map.collision.length,
    occlusionCount: scene.map.occlusion.length,
    innRoofBlocked: scene.collision.canMove({ x: 2800, y: 2050, width: 34, height: 28 }) === false,
    templeRoofBlocked: scene.collision.canMove({ x: 2520, y: 650, width: 34, height: 28 }) === false,
    innDoorReachable: scene.collision.canMove(playerFoot(2860, 2365)),
    innDoorNearTrigger: scene.map.triggerNear(playerFoot(2685, 2390), 96)?.name === "inn_room_door",
    medicineVendorReachable: scene.collision.canMove(playerFoot(2940, 2520)),
    medicineVendorUnoccluded: !scene.map.occlusion.some((mask) => overlaps(playerFoot(2940, 2520), mask)),
    battleNpcReachable: scene.collision.canMove(playerFoot(895, 745)),
    innDoorTriggerExists: Boolean(scene.map.triggerByName("inn_room_door")),
    enemyTriggerExists: Boolean(scene.map.triggerByName("enemy_scout_npc")),
    npcPlacement
  };
});

const roomReport = await page.evaluate(async () => {
  const scene = window.__rpgScene;
  await scene.enterMap("daliInnRoom", "entrance");
  return {
    mapId: scene.mapId,
    collisionCount: scene.map.collision.length,
    occlusionCount: scene.map.occlusion.length,
    tableBlocked: scene.collision.canMove({ x: 550, y: 360, width: 34, height: 28 }) === false,
    wardrobeBlocked: scene.collision.canMove({ x: 1010, y: 300, width: 34, height: 28 }) === false,
    exitTriggerExists: Boolean(scene.map.triggerByName("room_exit"))
  };
});

await browser.close();

const failures = [];
if (report.tileSize !== 64) failures.push("tileSize must be 64");
if (report.playerBounds.width !== 34 || report.playerBounds.height !== 28) failures.push("player collision footprint must be 34x28");
if (!report.mainMenuVisible) failures.push("main menu must be visible before starting a new game");
if (report.occlusionCount < 3) failures.push("world occlusion masks are missing");
if (!report.innRoofBlocked) failures.push("inn roof collision mask is not blocking");
if (!report.templeRoofBlocked) failures.push("temple roof collision mask is not blocking");
if (!report.innDoorReachable) failures.push("inn door reachable zone is blocked");
if (!report.innDoorNearTrigger) failures.push("inn door proximity trigger does not work");
if (!report.medicineVendorReachable) failures.push("medicine vendor is placed on blocked ground");
if (!report.medicineVendorUnoccluded) failures.push("medicine vendor foot position is covered by occlusion");
if (!report.battleNpcReachable) failures.push("battle NPC is placed on blocked ground");
if (!report.innDoorTriggerExists) failures.push("inn room trigger is missing");
if (!report.enemyTriggerExists) failures.push("enemy battle trigger is missing");
for (const npc of report.npcPlacement) {
  if (!npc.reachable) failures.push(`NPC placement is blocked: ${npc.id}`);
  if (npc.occluded) failures.push(`NPC placement is occluded at foot position: ${npc.id}`);
}
if (roomReport.mapId !== "daliInnRoom") failures.push("room transition contract failed");
if (roomReport.occlusionCount < 4) failures.push("room occlusion masks are missing");
if (!roomReport.tableBlocked) failures.push("room table collision is not blocking");
if (!roomReport.wardrobeBlocked) failures.push("room wardrobe collision is not blocking");
if (!roomReport.exitTriggerExists) failures.push("room exit trigger is missing");
if (errors.length) failures.push(`console errors: ${errors.join(" | ")}`);
if (responses.length) failures.push(`bad responses: ${responses.join(" | ")}`);

console.log(JSON.stringify({ report, roomReport, errors, responses, failures }, null, 2));
if (failures.length) process.exit(1);
