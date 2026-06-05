#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const name = String(args.name || "wuxia-village");
const theme = String(args.theme || "Tian Long Ba Bu inspired Dali mountain temple route");
const width = Number(args.width || 64);
const height = Number(args.height || 48);
const tileSize = Number(args.tileSize || args["tile-size"] || 64);
const outDir = path.resolve(args.outDir || args["out-dir"] || `./${name}-map-blueprint`);

await fs.mkdir(outDir, { recursive: true });

const tileIds = {
  empty: 0,
  grass: 1,
  dirt: 2,
  stone: 3,
  tallGrass: 4,
  water: 5,
  cliff: 6,
  floor: 7
};

const ground = createLayer(width, height, tileIds.grass);
const details = createLayer(width, height, 0);

paintPath(ground, width, height);
paintTempleFloor(ground, width, height);
paintTallGrass(details, width, height);
paintWater(details, width, height);
paintCliffs(details, width, height);

const objects = buildObjects(width, height, tileSize);
const tiled = {
  type: "map",
  orientation: "orthogonal",
  renderorder: "right-down",
  width,
  height,
  tilewidth: tileSize,
  tileheight: tileSize,
  infinite: false,
  nextlayerid: 6,
  nextobjectid: objects.length + 1,
  tilesets: [
    {
      firstgid: 1,
      source: `${name}-tileset.tsx`
    }
  ],
  layers: [
    {
      id: 1,
      name: "ground",
      type: "tilelayer",
      width,
      height,
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      data: ground
    },
    {
      id: 2,
      name: "details",
      type: "tilelayer",
      width,
      height,
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      data: details
    },
    {
      id: 3,
      name: "objects-collision-triggers",
      type: "objectgroup",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects
    }
  ]
};

const blueprint = {
  name,
  theme,
  recommendedPipeline: "hybrid_concept_to_tileset_to_layered_tilemap",
  reason:
    "Use GPT Image 2 for concept and visual assets, but keep runtime maps as tile/object/collision data. Directly slicing a giant generated illustration is fast for mockups but produces poor reusable tiles and inconsistent seams.",
  map: {
    width,
    height,
    tileSize,
    viewport: {
      width: 20,
      height: 12,
      note: "The map is larger than one screen; camera scrolls over this tile grid."
    }
  },
  prompts: {
    conceptSketch: [
      `Create a top-down pixel-inspired RPG map concept for ${theme}.`,
      "Show a larger-than-screen mountain route with a temple hub, dirt paths, tall grass encounter area, training yard, water/stream edge, cliffs, gates, and a player spawn.",
      "This is a composition reference only, not a final tileset. No text, no UI, no labels."
    ].join(" "),
    foundationMap: [
      `Create a ground-only foundation map for ${theme}.`,
      "Top-down 2D RPG perspective. Include only terrain: grass, dirt paths, stone floor, water, cliffs, and walkable boundaries.",
      "Do not include characters, buildings, trees, furniture, gates, signs, chests, labels, UI, or text."
    ].join(" "),
    roughTileset: [
      `Generate a rough 2D pixel-inspired RPG tileset sheet for ${theme}.`,
      "Include isolated terrain tiles and compact props on a perfectly flat #FF00FF background.",
      "Needed tiles: grass, dirt path, stone floor, tall grass, water edge, cliff edge, wall/fence pieces, gate, lantern, sign, crate, rock, shrub, table, door.",
      "Every tile/prop must be separated with generous padding. No labels, no grid lines, no text."
    ].join(" "),
    propPack: [
      `Generate a compact prop pack for ${theme}, top-down 2D RPG perspective.`,
      "Include isolated props: stone lantern, wooden gate, inn sign, market table, medicine chest, rocks, shrubs, banner, door, training dummy.",
      "Perfectly flat #FF00FF background, generous padding, no text labels."
    ].join(" "),
    dressedReference: [
      "Use the foundation map as visual reference and add a sparse in-world mockup of gameplay objects.",
      "Place up to 9 objects: temple gate, inn sign, medicine stall, tall grass encounter patch, training yard, stream bridge, cliff blockers, player spawn, boss gate.",
      "No annotations, no labels, no UI."
    ].join(" ")
  },
  tilePalette: tileIds,
  objectPlan: objects.map(({ id, name: objectName, type, x, y, width: objectWidth, height: objectHeight, properties }) => ({
    id,
    name: objectName,
    type,
    rect: {
      x,
      y,
      width: objectWidth,
      height: objectHeight
    },
    properties
  })),
  outputs: {
    tiledJson: `${name}.tiled.json`,
    blueprintJson: `${name}.blueprint.json`,
    suggestedTileset: `${name}-tileset.png`,
    suggestedProps: `${name}-props.png`
  }
};

await fs.writeFile(path.join(outDir, `${name}.tiled.json`), JSON.stringify(tiled, null, 2));
await fs.writeFile(path.join(outDir, `${name}.blueprint.json`), JSON.stringify(blueprint, null, 2));
await fs.writeFile(path.join(outDir, `${name}-tileset.tsx`), makeTsx(name, tileSize));

console.log(
  JSON.stringify(
    {
      outDir,
      files: {
        blueprint: path.join(outDir, `${name}.blueprint.json`),
        tiled: path.join(outDir, `${name}.tiled.json`),
        tilesetSource: path.join(outDir, `${name}-tileset.tsx`)
      },
      recommendation: blueprint.recommendedPipeline
    },
    null,
    2
  )
);

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

function createLayer(layerWidth, layerHeight, fill) {
  return Array.from({ length: layerWidth * layerHeight }, () => fill);
}

function setTile(layer, layerWidth, x, y, value) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  layer[y * layerWidth + x] = value;
}

function fillRect(layer, layerWidth, x, y, rectWidth, rectHeight, value) {
  for (let yy = y; yy < y + rectHeight; yy += 1) {
    for (let xx = x; xx < x + rectWidth; xx += 1) setTile(layer, layerWidth, xx, yy, value);
  }
}

function paintPath(layer, layerWidth, layerHeight) {
  const center = Math.floor(layerWidth / 2);
  for (let y = 0; y < layerHeight; y += 1) {
    const bend = Math.round(Math.sin(y / 8) * 3);
    fillRect(layer, layerWidth, center - 3 + bend, y, 7, 1, tileIds.dirt);
  }
  fillRect(layer, layerWidth, 8, Math.floor(layerHeight * 0.48), Math.floor(layerWidth * 0.72), 5, tileIds.dirt);
}

function paintTempleFloor(layer, layerWidth) {
  fillRect(layer, layerWidth, Math.floor(width * 0.35), 4, Math.floor(width * 0.3), 10, tileIds.stone);
  fillRect(layer, layerWidth, Math.floor(width * 0.42), 14, Math.floor(width * 0.16), 5, tileIds.stone);
}

function paintTallGrass(layer, layerWidth, layerHeight) {
  fillRect(layer, layerWidth, 3, Math.floor(layerHeight * 0.31), 16, 14, tileIds.tallGrass);
  fillRect(layer, layerWidth, 5, Math.floor(layerHeight * 0.68), 14, 7, tileIds.tallGrass);
}

function paintWater(layer, layerWidth, layerHeight) {
  for (let y = 4; y < Math.floor(layerHeight * 0.35); y += 1) {
    const x = layerWidth - 8 + Math.round(Math.sin(y / 3) * 2);
    fillRect(layer, layerWidth, x, y, 4, 1, tileIds.water);
  }
}

function paintCliffs(layer, layerWidth, layerHeight) {
  fillRect(layer, layerWidth, 0, 0, layerWidth, 2, tileIds.cliff);
  fillRect(layer, layerWidth, 0, layerHeight - 3, layerWidth, 3, tileIds.cliff);
  fillRect(layer, layerWidth, 0, 0, 2, layerHeight, tileIds.cliff);
  fillRect(layer, layerWidth, layerWidth - 2, 0, 2, layerHeight, tileIds.cliff);
}

function buildObjects(layerWidth, layerHeight, size) {
  let id = 1;
  const obj = (name, type, tx, ty, tw, th, properties = []) => ({
    id: id++,
    name,
    type,
    x: tx * size,
    y: ty * size,
    width: tw * size,
    height: th * size,
    rotation: 0,
    visible: true,
    properties
  });
  return [
    obj("player_spawn", "spawn", Math.floor(layerWidth / 2), layerHeight - 7, 1, 1),
    obj("temple_rest", "trigger", Math.floor(layerWidth * 0.42), 8, 10, 5, [{ name: "event", type: "string", value: "rest" }]),
    obj("tall_grass_encounter", "trigger", 3, Math.floor(layerHeight * 0.31), 16, 14, [
      { name: "event", type: "string", value: "battle" }
    ]),
    obj("market_medicine", "trigger", Math.floor(layerWidth * 0.7), Math.floor(layerHeight * 0.48), 9, 6, [
      { name: "event", type: "string", value: "supply" }
    ]),
    obj("training_yard", "trigger", Math.floor(layerWidth * 0.72), Math.floor(layerHeight * 0.27), 12, 10, [
      { name: "event", type: "string", value: "battle" }
    ]),
    obj("boss_gate", "trigger", layerWidth - 10, Math.floor(layerHeight * 0.65), 6, 7, [
      { name: "event", type: "string", value: "boss" }
    ]),
    obj("north_cliff_blocker", "collision", 0, 0, layerWidth, 2),
    obj("south_cliff_blocker", "collision", 0, layerHeight - 3, layerWidth, 3),
    obj("west_cliff_blocker", "collision", 0, 0, 2, layerHeight),
    obj("east_cliff_blocker", "collision", layerWidth - 2, 0, 2, layerHeight)
  ];
}

function makeTsx(mapName, size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.10.2" name="${mapName}-tileset" tilewidth="${size}" tileheight="${size}" tilecount="64" columns="8">
 <image source="${mapName}-tileset.png" width="${size * 8}" height="${size * 8}"/>
</tileset>
`;
}
