#!/usr/bin/env node
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

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
  return {
    mapId: scene.mapId,
    tileSize: scene.map.tileSize,
    playerBounds: scene.player.bounds,
    collisionCount: scene.map.collision.length,
    innRoofBlocked: scene.collision.canMove({ x: 2800, y: 2050, width: 34, height: 28 }) === false,
    templeRoofBlocked: scene.collision.canMove({ x: 2520, y: 650, width: 34, height: 28 }) === false,
    innDoorTriggerExists: Boolean(scene.map.triggerByName("inn_room_door")),
    enemyTriggerExists: Boolean(scene.map.triggerByName("enemy_scout_npc"))
  };
});

await browser.close();

const failures = [];
if (report.tileSize !== 64) failures.push("tileSize must be 64");
if (report.playerBounds.width !== 34 || report.playerBounds.height !== 28) failures.push("player collision footprint must be 34x28");
if (!report.innRoofBlocked) failures.push("inn roof collision mask is not blocking");
if (!report.templeRoofBlocked) failures.push("temple roof collision mask is not blocking");
if (!report.innDoorTriggerExists) failures.push("inn room trigger is missing");
if (!report.enemyTriggerExists) failures.push("enemy battle trigger is missing");
if (errors.length) failures.push(`console errors: ${errors.join(" | ")}`);
if (responses.length) failures.push(`bad responses: ${responses.join(" | ")}`);

console.log(JSON.stringify({ report, errors, responses, failures }, null, 2));
if (failures.length) process.exit(1);
