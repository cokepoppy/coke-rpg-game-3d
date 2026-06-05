#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("Missing dependency: sharp. Use the Codex bundled Node runtime with NODE_PATH pointing at its node_modules.");
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const name = String(args.name || "design-first-wuxia-map");
const outDir = path.resolve(args.outDir || args["out-dir"] || `./${name}`);
const tileset = path.resolve(args.tileset || "");
const concept = args.concept ? path.resolve(args.concept) : null;
const width = Number(args.width || 80);
const height = Number(args.height || 56);
const tileSize = Number(args.tileSize || args["tile-size"] || 64);
const sourceCell = Number(args.sourceCell || args["source-cell"] || 64);
const sourceCols = Number(args.sourceCols || args["source-cols"] || 6);
const sourceMeta = await sharp(tileset).metadata();
const sourceRows = Math.max(1, Math.floor((sourceMeta.height || sourceCell) / sourceCell));

if (!tileset) {
  console.error("Missing --tileset <clean-tileset.png>");
  process.exit(2);
}

await fs.mkdir(outDir, { recursive: true });

const palette = {
  grass: 0,
  dirt: 1,
  cliff: 2,
  meadow: 3,
  stone: 4,
  water: 5,
  torii: 6,
  medicine: 7,
  lantern: 8,
  fence: 9,
  dummy: 10,
  sign: 11,
  crate: 12,
  rock: 13,
  shrub: 14,
  banner: 15,
  door: 16,
  bridge: 17
};

const tileIds = {
  empty: 0,
  grass: 1,
  dirt: 2,
  stone: 3,
  tallGrass: 4,
  water: 5,
  cliff: 6,
  meadow: 7
};

const design = makeDesignPlan(width, height);
const layers = rasterizeDesign(design, width, height);
const objects = buildObjectLayer(design, tileSize);
const rendered = path.join(outDir, `${name}-rendered.png`);
const tileLayout = path.join(outDir, `${name}-tile-layout.png`);
const runtimeTileset = path.join(outDir, `${name}-tileset.png`);
await writeRuntimeTileset(runtimeTileset);
await renderTileMap(tileLayout, layers, objects);
if (concept) {
  await renderConceptBackedMap(rendered);
} else {
  await renderTileMap(rendered, layers, objects);
}

const tiled = makeTiledMap(width, height, tileSize, layers, objects, name);
const blueprint = {
  name,
  concept,
  pipeline: "design_first_concept_to_layout_to_tilemap",
  note:
    "This map starts from a full-map design composition, then rasterizes named regions, organic paths, landmarks, triggers, and collision/object layers.",
  design,
  prompts: {
    concept:
      "Generate a complete top-down pixel-inspired wuxia RPG map concept with entrance, winding road, temple, tall grass encounter area, market stall, training yard, stream bridge, cliffs, lanterns, and red maple framing. No labels, no UI, no grid.",
    tileset:
      "Generate isolated top-down pixel-inspired wuxia RPG terrain tiles and props on #FF00FF: grass, dirt path, stone floor, tall grass, water edge, cliff edge, gate, lantern, medicine stall, sign, crate, rock, shrub, training dummy, bridge, door, banner."
  },
  outputs: {
    rendered,
    tileLayout,
    tileset: runtimeTileset,
    tiled: path.join(outDir, `${name}.tiled.json`),
    blueprint: path.join(outDir, `${name}.design.json`)
  }
};

await fs.writeFile(path.join(outDir, `${name}.tiled.json`), JSON.stringify(tiled, null, 2));
await fs.writeFile(path.join(outDir, `${name}.design.json`), JSON.stringify(blueprint, null, 2));
await fs.writeFile(path.join(outDir, `${name}-tileset.tsx`), makeTsx(name, tileSize, sourceCols, sourceRows));

console.log(
  JSON.stringify(
    {
      outDir,
      rendered,
      tileLayout,
      tiled: path.join(outDir, `${name}.tiled.json`),
      design: path.join(outDir, `${name}.design.json`),
      tileset: runtimeTileset,
      concept
    },
    null,
    2
  )
);

function makeDesignPlan(mapWidth, mapHeight) {
  const sx = (value) => Math.round(value * mapWidth);
  const sy = (value) => Math.round(value * mapHeight);
  return {
    regions: [
      { name: "main_temple_courtyard", type: "stone", ellipse: [sx(0.5), sy(0.2), sx(0.15), sy(0.11)] },
      { name: "left_tall_grass_field", type: "tallGrass", ellipse: [sx(0.22), sy(0.43), sx(0.16), sy(0.18)] },
      { name: "training_yard", type: "meadow", ellipse: [sx(0.79), sy(0.42), sx(0.13), sy(0.12)] },
      { name: "market_flat", type: "dirt", ellipse: [sx(0.68), sy(0.68), sx(0.15), sy(0.1)] },
      { name: "entry_steps", type: "stone", rect: [sx(0.45), sy(0.89), sx(0.1), sy(0.08)] }
    ],
    water: {
      name: "right_stream",
      width: 5,
      points: [
        [sx(0.88), sy(0.02)],
        [sx(0.84), sy(0.16)],
        [sx(0.86), sy(0.29)],
        [sx(0.78), sy(0.38)],
        [sx(0.75), sy(0.5)]
      ]
    },
    paths: [
      {
        name: "main_climb",
        width: 6,
        points: [
          [sx(0.5), sy(0.96)],
          [sx(0.5), sy(0.78)],
          [sx(0.46), sy(0.63)],
          [sx(0.48), sy(0.5)],
          [sx(0.5), sy(0.35)],
          [sx(0.5), sy(0.23)]
        ]
      },
      {
        name: "market_branch",
        width: 5,
        points: [
          [sx(0.48), sy(0.63)],
          [sx(0.58), sy(0.63)],
          [sx(0.68), sy(0.67)],
          [sx(0.77), sy(0.68)]
        ]
      },
      {
        name: "grass_branch",
        width: 5,
        points: [
          [sx(0.48), sy(0.5)],
          [sx(0.38), sy(0.48)],
          [sx(0.29), sy(0.44)],
          [sx(0.19), sy(0.52)]
        ]
      },
      {
        name: "training_branch",
        width: 5,
        points: [
          [sx(0.54), sy(0.36)],
          [sx(0.64), sy(0.34)],
          [sx(0.74), sy(0.38)],
          [sx(0.82), sy(0.4)]
        ]
      },
      {
        name: "stream_bridge_branch",
        width: 4,
        points: [
          [sx(0.6), sy(0.28)],
          [sx(0.7), sy(0.22)],
          [sx(0.83), sy(0.22)]
        ]
      }
    ],
    landmarks: [
      { name: "player_spawn", tile: "lantern", x: sx(0.5), y: sy(0.91), type: "spawn" },
      { name: "red_gate", tile: "torii", x: sx(0.5), y: sy(0.7), type: "prop" },
      { name: "temple_gate", tile: "torii", x: sx(0.5), y: sy(0.25), type: "rest" },
      { name: "medicine_stall", tile: "medicine", x: sx(0.68), y: sy(0.68), type: "supply" },
      { name: "training_dummy", tile: "dummy", x: sx(0.79), y: sy(0.42), type: "battle" },
      { name: "bridge", tile: "bridge", x: sx(0.77), y: sy(0.34), type: "prop" },
      { name: "boss_banner", tile: "banner", x: sx(0.86), y: sy(0.66), type: "boss" },
      { name: "left_sign", tile: "sign", x: sx(0.13), y: sy(0.67), type: "prop" }
    ],
    scatter: [
      { tile: "rock", count: 34, avoidPaths: true },
      { tile: "shrub", count: 26, avoidPaths: true },
      { tile: "lantern", count: 12, nearPaths: true },
      { tile: "fence", count: 18, aroundRegions: ["left_tall_grass_field", "training_yard"] }
    ]
  };
}

function rasterizeDesign(design, mapWidth, mapHeight) {
  const ground = Array.from({ length: mapWidth * mapHeight }, () => tileIds.grass);
  const details = Array.from({ length: mapWidth * mapHeight }, () => 0);

  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      const border = x < 2 || y < 2 || x >= mapWidth - 2 || y >= mapHeight - 2;
      const cornerNoise = noise(x, y) > 0.58;
      if (border || (cornerNoise && distanceToEdge(x, y, mapWidth, mapHeight) < 7)) set(details, mapWidth, x, y, tileIds.cliff);
    }
  }

  for (const region of design.regions) paintRegion(ground, mapWidth, mapHeight, region, tileIds[region.type]);
  paintPolyline(details, mapWidth, mapHeight, design.water.points, design.water.width, tileIds.water);
  for (const path of design.paths) paintPolyline(ground, mapWidth, mapHeight, path.points, path.width, tileIds.dirt);

  return { ground, details };
}

function buildObjectLayer(design, size) {
  let id = 1;
  const objects = [];
  for (const landmark of design.landmarks) {
    objects.push({
      id: id++,
      name: landmark.name,
      type: landmark.type,
      x: landmark.x * size,
      y: landmark.y * size,
      width: size * 2,
      height: size * 2,
      visible: true,
      properties: [{ name: "tile", type: "string", value: landmark.tile }]
    });
  }
  for (const point of scatterPoints(design)) {
    objects.push({
      id: id++,
      name: `${point.tile}_${id}`,
      type: "decor",
      x: point.x * size,
      y: point.y * size,
      width: size,
      height: size,
      visible: true,
      properties: [{ name: "tile", type: "string", value: point.tile }]
    });
  }
  objects.push(...triggerObjects(design, size, id));
  return objects;
}

function triggerObjects(design, size, startId) {
  let id = startId;
  const trigger = (name, type, x, y, w, h) => ({
    id: id++,
    name,
    type: "trigger",
    x: x * size,
    y: y * size,
    width: w * size,
    height: h * size,
    visible: true,
    properties: [{ name: "event", type: "string", value: type }]
  });
  const grass = design.regions.find((item) => item.name === "left_tall_grass_field").ellipse;
  const training = design.regions.find((item) => item.name === "training_yard").ellipse;
  const market = design.regions.find((item) => item.name === "market_flat").ellipse;
  return [
    trigger("encounter_grass", "battle", grass[0] - grass[2], grass[1] - grass[3], grass[2] * 2, grass[3] * 2),
    trigger("training_yard", "battle", training[0] - training[2], training[1] - training[3], training[2] * 2, training[3] * 2),
    trigger("medicine_market", "supply", market[0] - market[2], market[1] - market[3], market[2] * 2, market[3] * 2),
    trigger("main_temple", "rest", 34, 9, 12, 8),
    trigger("boss_gate", "boss", 66, 34, 7, 7)
  ];
}

async function renderTileMap(output, layers, objects) {
  const tileBuffers = new Map();
  async function getTile(tileNameOrIndex, size = tileSize) {
    const tileIndex = typeof tileNameOrIndex === "string" ? palette[tileNameOrIndex] : tileNameOrIndex;
    const key = `${tileIndex}-${size}`;
    if (!tileBuffers.has(key)) {
      const left = (tileIndex % sourceCols) * sourceCell;
      const top = Math.floor(tileIndex / sourceCols) * sourceCell;
      tileBuffers.set(
        key,
        await sharp(tileset)
          .extract({ left, top, width: sourceCell, height: sourceCell })
          .resize({ width: size, height: size, fit: "contain" })
          .png()
          .toBuffer()
      );
    }
    return tileBuffers.get(key);
  }

  const composites = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const groundTile = layers.ground[y * width + x];
      composites.push({ input: await getTile(tileForGround(groundTile)), left: x * tileSize, top: y * tileSize });
      const detailTile = layers.details[y * width + x];
      if (detailTile) composites.push({ input: await getTile(tileForGround(detailTile)), left: x * tileSize, top: y * tileSize });
    }
  }

  const renderObjects = objects.filter((object) => object.properties?.some((prop) => prop.name === "tile"));
  renderObjects.sort((a, b) => a.y - b.y);
  for (const object of renderObjects) {
    const tile = object.properties.find((prop) => prop.name === "tile").value;
    const size = object.type === "decor" ? 56 : tile === "torii" || tile === "medicine" || tile === "bridge" ? 132 : 88;
    composites.push({
      input: await getTile(tile, size),
      left: Math.round(object.x - size / 2),
      top: Math.round(object.y - size * 0.8)
    });
  }

  await sharp({
    create: {
      width: width * tileSize,
      height: height * tileSize,
      channels: 4,
      background: { r: 26, g: 36, b: 23, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toFile(output);
}

async function renderConceptBackedMap(output) {
  await sharp(concept)
    .resize({
      width: width * tileSize,
      height: height * tileSize,
      fit: "cover",
      position: "center"
    })
    .png()
    .toFile(output);
}

async function writeRuntimeTileset(output) {
  const composites = [];
  for (let index = 0; index < sourceCols * sourceRows; index += 1) {
    const left = (index % sourceCols) * sourceCell;
    const top = Math.floor(index / sourceCols) * sourceCell;
    if (left + sourceCell > (sourceMeta.width || 0) || top + sourceCell > (sourceMeta.height || 0)) continue;
    const input = await sharp(tileset)
      .extract({ left, top, width: sourceCell, height: sourceCell })
      .resize({ width: tileSize, height: tileSize, fit: "contain" })
      .png()
      .toBuffer();
    composites.push({
      input,
      left: (index % sourceCols) * tileSize,
      top: Math.floor(index / sourceCols) * tileSize
    });
  }
  await sharp({
    create: {
      width: sourceCols * tileSize,
      height: sourceRows * tileSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .png()
    .toFile(output);
}

function makeTiledMap(mapWidth, mapHeight, size, layers, objects, mapName) {
  return {
    type: "map",
    orientation: "orthogonal",
    renderorder: "right-down",
    width: mapWidth,
    height: mapHeight,
    tilewidth: size,
    tileheight: size,
    infinite: false,
    tilesets: [{ firstgid: 1, source: `${mapName}-tileset.tsx` }],
    layers: [
      { id: 1, name: "ground", type: "tilelayer", width: mapWidth, height: mapHeight, data: layers.ground, visible: true, opacity: 1, x: 0, y: 0 },
      { id: 2, name: "details", type: "tilelayer", width: mapWidth, height: mapHeight, data: layers.details, visible: true, opacity: 1, x: 0, y: 0 },
      { id: 3, name: "objects-triggers-collision", type: "objectgroup", objects, visible: true, opacity: 1, x: 0, y: 0 }
    ]
  };
}

function tileForGround(id) {
  if (id === tileIds.dirt) return "dirt";
  if (id === tileIds.stone) return "stone";
  if (id === tileIds.tallGrass) return "grass";
  if (id === tileIds.water) return "water";
  if (id === tileIds.cliff) return "cliff";
  if (id === tileIds.meadow) return "meadow";
  return "grass";
}

function paintRegion(layer, mapWidth, mapHeight, region, value) {
  if (region.ellipse) {
    const [cx, cy, rx, ry] = region.ellipse;
    for (let y = Math.max(0, cy - ry - 2); y <= Math.min(mapHeight - 1, cy + ry + 2); y += 1) {
      for (let x = Math.max(0, cx - rx - 2); x <= Math.min(mapWidth - 1, cx + rx + 2); x += 1) {
        const d = ((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2);
        if (d < 1 + noise(x, y) * 0.22) set(layer, mapWidth, x, y, value);
      }
    }
  }
  if (region.rect) {
    const [x, y, w, h] = region.rect;
    for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) set(layer, mapWidth, xx, yy, value);
  }
}

function paintPolyline(layer, mapWidth, mapHeight, points, radius, value) {
  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      let min = Infinity;
      for (let i = 0; i < points.length - 1; i += 1) {
        min = Math.min(min, distanceToSegment(x, y, points[i], points[i + 1]));
      }
      if (min < radius * (0.78 + noise(x, y) * 0.34)) set(layer, mapWidth, x, y, value);
    }
  }
}

function scatterPoints(design) {
  const points = [];
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 3; x < width - 3; x += 1) {
      const edge = distanceToEdge(x, y, width, height);
      if (edge < 8 && noise(x * 3, y * 5) > 0.8) points.push({ tile: noise(x, y) > 0.5 ? "rock" : "shrub", x, y });
      if (edge >= 8 && edge < 16 && noise(x * 7, y * 2) > 0.92) points.push({ tile: "rock", x, y });
    }
  }
  for (const landmark of design.landmarks.filter((item) => item.type === "prop" || item.type === "rest")) {
    if (noise(landmark.x, landmark.y) > 0.25) points.push({ tile: "lantern", x: landmark.x - 4, y: landmark.y + 2 });
    if (noise(landmark.y, landmark.x) > 0.25) points.push({ tile: "lantern", x: landmark.x + 4, y: landmark.y + 2 });
  }
  return points.slice(0, 96);
}

function set(layer, mapWidth, x, y, value) {
  const mapHeight = Math.floor(layer.length / mapWidth);
  if (x < 0 || y < 0 || x >= mapWidth || y >= mapHeight) return;
  layer[y * mapWidth + x] = value;
}

function distanceToSegment(px, py, a, b) {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len)) : 0;
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return Math.hypot(px - x, py - y);
}

function distanceToEdge(x, y, mapWidth, mapHeight) {
  return Math.min(x, y, mapWidth - 1 - x, mapHeight - 1 - y);
}

function noise(x, y) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function makeTsx(mapName, size, cols, rows) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.10.2" name="${mapName}-tileset" tilewidth="${size}" tileheight="${size}" tilecount="${cols * rows}" columns="${cols}">
 <image source="${mapName}-tileset.png" width="${size * cols}" height="${size * rows}"/>
</tileset>
`;
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
