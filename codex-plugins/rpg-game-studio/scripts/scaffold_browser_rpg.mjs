#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const project = path.resolve(String(args.project || args.cwd || process.cwd()));
const language = String(args.language || "js").toLowerCase() === "ts" ? "ts" : "js";
const ext = language;
const tileSize = Number(args.tileSize || args["tile-size"] || 64);
const force = Boolean(args.force);

const manifest = {
  mapJson: normalizeAssetPath(args.mapJson || args["map-json"] || "./maps/world.tiled.json"),
  mapImage: normalizeAssetPath(args.mapImage || args["map-image"] || "./maps/world-rendered.png"),
  heroSheet: normalizeAssetPath(args.heroSheet || args["hero-sheet"] || "./assets/hero-walk-sheet-normalized.png"),
  heroFrameWidth: Number(args.heroFrameWidth || args["hero-frame-width"] || 64),
  heroFrameHeight: Number(args.heroFrameHeight || args["hero-frame-height"] || 64),
  heroFrames: Number(args.heroFrames || args["hero-frames"] || 3),
  heroDrawWidth: Number(args.heroDrawWidth || args["hero-draw-width"] || 64),
  heroDrawHeight: Number(args.heroDrawHeight || args["hero-draw-height"] || 64)
};

const files = new Map([
  [`src/config/constants.${ext}`, constantsTemplate()],
  [`src/assets/assetManifest.${ext}`, assetManifestTemplate()],
  [`src/core/InputController.${ext}`, inputControllerTemplate()],
  [`src/core/GameLoop.${ext}`, gameLoopTemplate()],
  [`src/core/Camera.${ext}`, cameraTemplate()],
  [`src/core/Game.${ext}`, gameTemplate()],
  [`src/maps/MapManager.${ext}`, mapManagerTemplate()],
  [`src/maps/CollisionSystem.${ext}`, collisionSystemTemplate()],
  [`src/maps/MapRenderer.${ext}`, mapRendererTemplate()],
  [`src/entities/SpriteAnimator.${ext}`, spriteAnimatorTemplate()],
  [`src/entities/Player.${ext}`, playerTemplate()],
  [`src/battle/BattleManager.${ext}`, battleManagerTemplate()],
  [`src/scenes/WorldScene.${ext}`, worldSceneTemplate()],
  [`src/main.${ext}`, mainTemplate()],
  ["index.modular.html", htmlTemplate()],
  ["styles.modular.css", cssTemplate()]
]);

const written = [];
const skipped = [];
for (const [relativePath, content] of files) {
  const output = path.join(project, relativePath);
  await fs.mkdir(path.dirname(output), { recursive: true });
  if (!force && (await exists(output))) {
    skipped.push(output);
    continue;
  }
  await fs.writeFile(output, content);
  written.push(output);
}

console.log(
  JSON.stringify(
    {
      project,
      language,
      tileSize,
      written,
      skipped,
      entry: path.join(project, "index.modular.html")
    },
    null,
    2
  )
);

function constantsTemplate() {
  return `export const TILE_SIZE = ${tileSize};
export const PLAYER_SPEED = 220;
export const VIEWPORT = {
  width: 1280,
  height: 720
};
`;
}

function assetManifestTemplate() {
  return `export const assets = {
  maps: {
    world: {
      json: "${manifest.mapJson}",
      image: "${manifest.mapImage}"
    }
  },
  sprites: {
    hero: {
      sheet: "${manifest.heroSheet}",
      frameWidth: ${manifest.heroFrameWidth},
      frameHeight: ${manifest.heroFrameHeight},
      drawWidth: ${manifest.heroDrawWidth},
      drawHeight: ${manifest.heroDrawHeight},
      directions: ["down", "left", "right", "up"],
      framesPerDirection: ${manifest.heroFrames}
    }
  }
};
`;
}

function inputControllerTemplate() {
  return `export class InputController {
  constructor(target = window) {
    this.keys = new Set();
    target.addEventListener("keydown", (event) => this.keys.add(event.key.toLowerCase()));
    target.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
  }

  axis() {
    const left = this.keys.has("arrowleft") || this.keys.has("a");
    const right = this.keys.has("arrowright") || this.keys.has("d");
    const up = this.keys.has("arrowup") || this.keys.has("w");
    const down = this.keys.has("arrowdown") || this.keys.has("s");
    return {
      x: Number(right) - Number(left),
      y: Number(down) - Number(up)
    };
  }

  pressed(key) {
    return this.keys.has(key.toLowerCase());
  }
}
`;
}

function gameLoopTemplate() {
  return `export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.frame = 0;
    this.last = performance.now();
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const tick = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }
}
`;
}

function cameraTemplate() {
  return `export class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
  }

  follow(target, world) {
    this.x = clamp(target.x - this.width / 2, 0, Math.max(0, world.width - this.width));
    this.y = clamp(target.y - this.height / 2, 0, Math.max(0, world.height - this.height));
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
`;
}

function gameTemplate() {
  return `import { VIEWPORT } from "../config/constants.${ext}";
import { GameLoop } from "./GameLoop.${ext}";
import { InputController } from "./InputController.${ext}";
import { Camera } from "./Camera.${ext}";
import { WorldScene } from "../scenes/WorldScene.${ext}";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.canvas.width = VIEWPORT.width;
    this.canvas.height = VIEWPORT.height;
    this.input = new InputController();
    this.camera = new Camera(VIEWPORT.width, VIEWPORT.height);
    this.scene = new WorldScene(this.context, this.input, this.camera);
    this.loop = new GameLoop((dt) => this.scene.update(dt), () => this.scene.render());
  }

  async start() {
    await this.scene.load();
    this.loop.start();
  }
}
`;
}

function mapManagerTemplate() {
  return `import { TILE_SIZE } from "../config/constants.${ext}";

export class MapManager {
  constructor(asset) {
    this.asset = asset;
    this.data = null;
    this.image = null;
    this.tileSize = TILE_SIZE;
    this.triggers = [];
    this.collision = [];
  }

  async load() {
    const [data, image] = await Promise.all([loadJson(this.asset.json), loadImage(this.asset.image)]);
    this.data = data;
    this.image = image;
    this.width = data.width * this.tileSize;
    this.height = data.height * this.tileSize;
    this.triggers = objectsByType(data, "trigger");
    this.collision = objectsByType(data, "collision");
    return this;
  }

  objectLayer(name) {
    return this.data.layers.find((layer) => layer.type === "objectgroup" && layer.name === name);
  }

  triggerAt(rect) {
    return this.triggers.find((trigger) => intersects(rect, trigger));
  }
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(\`Failed to load map JSON: \${url}\`);
  return response.json();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(\`Failed to load image: \${url}\`));
    image.src = url;
  });
}

function objectsByType(data, type) {
  return data.layers
    .filter((layer) => layer.type === "objectgroup")
    .flatMap((layer) => layer.objects || [])
    .filter((object) => object.type === type);
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
`;
}

function collisionSystemTemplate() {
  return `export class CollisionSystem {
  constructor(map) {
    this.map = map;
  }

  canMove(rect) {
    return !this.map.collision.some((wall) => intersects(rect, wall));
  }
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
`;
}

function mapRendererTemplate() {
  return `export class MapRenderer {
  constructor(context, map, camera) {
    this.context = context;
    this.map = map;
    this.camera = camera;
  }

  drawBase() {
    this.context.drawImage(
      this.map.image,
      this.camera.x,
      this.camera.y,
      this.camera.width,
      this.camera.height,
      0,
      0,
      this.camera.width,
      this.camera.height
    );
  }
}
`;
}

function spriteAnimatorTemplate() {
  return `export class SpriteAnimator {
  constructor(config) {
    this.config = config;
    this.elapsed = 0;
    this.frame = 1;
  }

  update(dt, moving) {
    if (!moving) {
      this.frame = 1;
      this.elapsed = 0;
      return;
    }
    this.elapsed += dt;
    if (this.elapsed > 0.14) {
      this.elapsed = 0;
      this.frame = (this.frame + 1) % this.config.framesPerDirection;
    }
  }

  sourceRect(direction) {
    const row = Math.max(0, this.config.directions.indexOf(direction));
    return {
      x: this.frame * this.config.frameWidth,
      y: row * this.config.frameHeight,
      width: this.config.frameWidth,
      height: this.config.frameHeight
    };
  }
}
`;
}

function playerTemplate() {
  return `import { PLAYER_SPEED } from "../config/constants.${ext}";
import { SpriteAnimator } from "./SpriteAnimator.${ext}";

export class Player {
  constructor(spriteConfig, sheet) {
    this.x = 640;
    this.y = 640;
    this.width = 48;
    this.height = 56;
    this.direction = "down";
    this.sheet = sheet;
    this.animator = new SpriteAnimator(spriteConfig);
  }

  update(dt, input, collision) {
    const axis = input.axis();
    const moving = axis.x !== 0 || axis.y !== 0;
    if (axis.x < 0) this.direction = "left";
    if (axis.x > 0) this.direction = "right";
    if (axis.y < 0) this.direction = "up";
    if (axis.y > 0) this.direction = "down";

    const length = Math.hypot(axis.x, axis.y) || 1;
    const next = {
      x: this.x + (axis.x / length) * PLAYER_SPEED * dt,
      y: this.y + (axis.y / length) * PLAYER_SPEED * dt,
      width: this.width,
      height: this.height
    };
    if (!collision || collision.canMove(next)) {
      this.x = next.x;
      this.y = next.y;
    }
    this.animator.update(dt, moving);
  }

  draw(context, camera) {
    const source = this.animator.sourceRect(this.direction);
    const drawWidth = this.animator.config.drawWidth || 64;
    const drawHeight = this.animator.config.drawHeight || 64;
    context.drawImage(
      this.sheet,
      source.x,
      source.y,
      source.width,
      source.height,
      Math.round(this.x - camera.x - drawWidth / 2),
      Math.round(this.y - camera.y - drawHeight * 0.86),
      drawWidth,
      drawHeight
    );
  }
}
`;
}

function battleManagerTemplate() {
  return `export class BattleManager {
  requestBattle(trigger) {
    return {
      kind: "battle-requested",
      trigger,
      enemyId: property(trigger, "enemyId") || trigger.name
    };
  }
}

function property(object, name) {
  return object.properties?.find((item) => item.name === name)?.value;
}
`;
}

function worldSceneTemplate() {
  return `import { assets } from "../assets/assetManifest.${ext}";
import { MapManager } from "../maps/MapManager.${ext}";
import { MapRenderer } from "../maps/MapRenderer.${ext}";
import { CollisionSystem } from "../maps/CollisionSystem.${ext}";
import { Player } from "../entities/Player.${ext}";

export class WorldScene {
  constructor(context, input, camera) {
    this.context = context;
    this.input = input;
    this.camera = camera;
  }

  async load() {
    this.map = await new MapManager(assets.maps.world).load();
    this.renderer = new MapRenderer(this.context, this.map, this.camera);
    this.collision = new CollisionSystem(this.map);
    const heroSheet = await loadImage(assets.sprites.hero.sheet);
    this.player = new Player(assets.sprites.hero, heroSheet);
  }

  update(dt) {
    this.player.update(dt, this.input, this.collision);
    this.camera.follow(this.player, this.map);
    this.activeTrigger = this.map.triggerAt(this.player);
  }

  render() {
    this.context.clearRect(0, 0, this.camera.width, this.camera.height);
    this.renderer.drawBase();
    this.player.draw(this.context, this.camera);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(\`Failed to load image: \${url}\`));
    image.src = url;
  });
}
`;
}

function mainTemplate() {
  return `import { Game } from "./core/Game.${ext}";

const canvas = document.querySelector("#game");
const game = new Game(canvas);
game.start().catch((error) => {
  console.error(error);
  document.querySelector("#status").textContent = error.message;
});
`;
}

function htmlTemplate() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Modular RPG Prototype</title>
    <link rel="stylesheet" href="./styles.modular.css" />
  </head>
  <body>
    <main class="game-shell">
      <canvas id="game" width="1280" height="720"></canvas>
      <div id="status" class="status"></div>
    </main>
    <script type="module" src="./src/main.${ext}"></script>
  </body>
</html>
`;
}

function cssTemplate() {
  return `html,
body {
  margin: 0;
  min-height: 100%;
  background: #11130f;
  color: #f5ead0;
  font-family: ui-serif, "Songti SC", "Noto Serif CJK SC", serif;
}

.game-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
}

#game {
  width: min(100vw, 1280px);
  aspect-ratio: 16 / 9;
  height: auto;
  image-rendering: pixelated;
  background: #1b2118;
}

.status {
  position: fixed;
  left: 16px;
  bottom: 16px;
  max-width: min(720px, calc(100vw - 32px));
  color: #f5ead0;
}
`;
}

function normalizeAssetPath(value) {
  return String(value).replace(/\\/g, "/");
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
