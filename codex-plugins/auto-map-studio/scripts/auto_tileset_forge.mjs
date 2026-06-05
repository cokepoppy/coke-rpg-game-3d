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
  console.error(
    "Missing dependency: sharp. Use Codex bundled Node runtime and set NODE_PATH to its node_modules directory, or install sharp in this plugin environment."
  );
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.out) {
  console.error(
    "Usage: auto_tileset_forge.mjs --input rough.png --out tileset.png [--meta tileset.json --preview preview.png --tile-width 64 --tile-height 64 --cols 8]"
  );
  process.exit(2);
}

const tileWidth = Number(args.tileWidth || args["tile-width"] || 64);
const tileHeight = Number(args.tileHeight || args["tile-height"] || 64);
const outCols = Number(args.cols || 8);
const minArea = Number(args.minArea || args["min-area"] || 256);
const minSize = Number(args.minSize || args["min-size"] || 8);
const maxAspect = Number(args.maxAspect || args["max-aspect"] || 6);
const transparentThreshold = Number(args.transparentThreshold || args["transparent-threshold"] || 46);
const opaqueThreshold = Number(args.opaqueThreshold || args["opaque-threshold"] || 135);
const anchor = String(args.anchor || "bottom-center");

const source = await sharp(args.input).ensureAlpha();
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
const keyed = Buffer.from(data);
const keyColor = sampleKeyColor(keyed, info.width, info.height);
applyChromaKey(keyed, keyColor, transparentThreshold, opaqueThreshold);

const components = findComponents(keyed, info.width, info.height);
const accepted = [];
const rejected = [];

for (const component of components) {
  const width = component.right - component.left + 1;
  const height = component.bottom - component.top + 1;
  const aspect = Math.max(width / Math.max(1, height), height / Math.max(1, width));
  if (component.area < minArea || width < minSize || height < minSize || aspect > maxAspect) {
    rejected.push({ ...component, reason: "filter" });
  } else {
    accepted.push(component);
  }
}

accepted.sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top));

const keyedPng = await sharp(keyed, { raw: info }).png().toBuffer();
const rows = Math.max(1, Math.ceil(accepted.length / outCols));
const outWidth = outCols * tileWidth;
const outHeight = rows * tileHeight;
const composites = [];
const tiles = [];

for (let index = 0; index < accepted.length; index += 1) {
  const component = accepted[index];
  const sourceWidth = component.right - component.left + 1;
  const sourceHeight = component.bottom - component.top + 1;
  const fit = fitRect(sourceWidth, sourceHeight, tileWidth, tileHeight, Number(args.padding || 8));
  const tileCol = index % outCols;
  const tileRow = Math.floor(index / outCols);
  const left = tileCol * tileWidth + anchorX(anchor, tileWidth, fit.width);
  const top = tileRow * tileHeight + anchorY(anchor, tileHeight, fit.height);
  const buffer = await sharp(keyedPng)
    .extract({ left: component.left, top: component.top, width: sourceWidth, height: sourceHeight })
    .resize({ width: fit.width, height: fit.height, fit: "fill", kernel: "nearest" })
    .png()
    .toBuffer();

  composites.push({ input: buffer, left, top });
  tiles.push({
    id: index,
    row: tileRow,
    col: tileCol,
    source: {
      left: component.left,
      top: component.top,
      width: sourceWidth,
      height: sourceHeight,
      area: component.area
    },
    output: {
      left,
      top,
      width: fit.width,
      height: fit.height
    }
  });
}

await fs.mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
await sharp({
  create: {
    width: outWidth,
    height: outHeight,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite(composites)
  .png()
  .toFile(args.out);

if (args.preview) {
  await writePreview(args.out, args.preview, accepted.length, tileWidth, tileHeight, outCols);
}

const meta = {
  input: path.resolve(args.input),
  output: path.resolve(args.out),
  preview: args.preview ? path.resolve(args.preview) : null,
  source: {
    width: info.width,
    height: info.height,
    keyColor
  },
  tile: {
    width: tileWidth,
    height: tileHeight,
    cols: outCols,
    rows
  },
  detection: {
    components: components.length,
    accepted: accepted.length,
    rejected: rejected.length,
    minArea,
    minSize,
    maxAspect
  },
  anchor,
  tiles,
  rejected: rejected.slice(0, 100),
  generatedAt: new Date().toISOString()
};

if (args.meta) {
  await fs.mkdir(path.dirname(path.resolve(args.meta)), { recursive: true });
  await fs.writeFile(args.meta, JSON.stringify(meta, null, 2));
}

console.log(JSON.stringify(meta, null, 2));

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

function sampleKeyColor(buffer, width, height) {
  const samples = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ].map(([x, y]) => {
    const index = (y * width + x) * 4;
    return [buffer[index], buffer[index + 1], buffer[index + 2]];
  });
  return samples
    .reduce((acc, rgb) => acc.map((value, index) => value + rgb[index]), [0, 0, 0])
    .map((value) => Math.round(value / samples.length));
}

function applyChromaKey(buffer, key, transparent, opaque) {
  for (let index = 0; index < buffer.length; index += 4) {
    const dr = buffer[index] - key[0];
    const dg = buffer[index + 1] - key[1];
    const db = buffer[index + 2] - key[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist < transparent) {
      buffer[index + 3] = 0;
    } else if (dist < opaque) {
      buffer[index + 3] = clamp(Math.round(((dist - transparent) / (opaque - transparent)) * 255), 0, 255);
      const keyIsMagenta = key[0] > 180 && key[2] > 180 && key[1] < 120;
      if (keyIsMagenta) {
        const cleanup = Math.round((opaque - dist) * 0.35);
        buffer[index] = clamp(buffer[index] - cleanup, 0, 255);
        buffer[index + 2] = clamp(buffer[index + 2] - cleanup, 0, 255);
      }
    }
  }
}

function findComponents(buffer, width, height) {
  const seen = new Uint8Array(width * height);
  const components = [];
  const stack = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (seen[start] || alphaAt(buffer, start) < 24) continue;
      let left = x;
      let right = x;
      let top = y;
      let bottom = y;
      let area = 0;
      seen[start] = 1;
      stack.push(start);
      while (stack.length) {
        const current = stack.pop();
        const cx = current % width;
        const cy = Math.floor(current / width);
        area += 1;
        left = Math.min(left, cx);
        right = Math.max(right, cx);
        top = Math.min(top, cy);
        bottom = Math.max(bottom, cy);
        for (let ny = cy - 1; ny <= cy + 1; ny += 1) {
          if (ny < 0 || ny >= height) continue;
          for (let nx = cx - 1; nx <= cx + 1; nx += 1) {
            if (nx < 0 || nx >= width) continue;
            const next = ny * width + nx;
            if (seen[next] || alphaAt(buffer, next) < 24) continue;
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
      components.push({ left, right, top, bottom, area });
    }
  }
  return components;
}

function alphaAt(buffer, pixelIndex) {
  return buffer[pixelIndex * 4 + 3];
}

function fitRect(width, height, cellWidth, cellHeight, padding) {
  const maxW = Math.max(1, cellWidth - padding * 2);
  const maxH = Math.max(1, cellHeight - padding * 2);
  const scale = Math.min(maxW / width, maxH / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

function anchorX(anchorName, cellWidth, width) {
  if (anchorName.includes("left")) return 0;
  if (anchorName.includes("right")) return cellWidth - width;
  return Math.round((cellWidth - width) / 2);
}

function anchorY(anchorName, cellHeight, height) {
  if (anchorName.includes("top")) return 0;
  if (anchorName.includes("bottom")) return cellHeight - height;
  return Math.round((cellHeight - height) / 2);
}

async function writePreview(tilesetPath, previewPath, count, tileW, tileH, cols) {
  const previewCols = 12;
  const previewRows = 8;
  const composites = [];
  for (let y = 0; y < previewRows; y += 1) {
    for (let x = 0; x < previewCols; x += 1) {
      const tileId = count ? (x + y * 3) % count : 0;
      const sourceCol = tileId % cols;
      const sourceRow = Math.floor(tileId / cols);
      const tile = await sharp(tilesetPath)
        .extract({ left: sourceCol * tileW, top: sourceRow * tileH, width: tileW, height: tileH })
        .png()
        .toBuffer();
      composites.push({ input: tile, left: x * tileW, top: y * tileH });
    }
  }
  await fs.mkdir(path.dirname(path.resolve(previewPath)), { recursive: true });
  await sharp({
    create: {
      width: previewCols * tileW,
      height: previewRows * tileH,
      channels: 4,
      background: { r: 28, g: 38, b: 28, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toFile(previewPath);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
