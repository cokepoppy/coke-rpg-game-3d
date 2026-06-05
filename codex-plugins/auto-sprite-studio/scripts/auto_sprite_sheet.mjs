#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let sharp;
try {
  sharp = require("sharp");
} catch (error) {
  console.error(
    "Missing dependency: sharp. Use Codex bundled Node runtime and set NODE_PATH to its node_modules directory, or install sharp in this plugin environment."
  );
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const input = args.input;
const out = args.out;

if (!input || !out) {
  console.error("Usage: auto_sprite_sheet.mjs --input raw.png --out normalized.png [--rows 4 --cols 4 --meta meta.json --frames-dir frames]");
  process.exit(2);
}

const rows = Number(args.rows || 4);
const cols = Number(args.cols || 4);
const alphaThreshold = Number(args.alphaThreshold || 24);
const transparentThreshold = Number(args.transparentThreshold || 46);
const opaqueThreshold = Number(args.opaqueThreshold || 135);

const source = await sharp(input).ensureAlpha();
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
const keyed = Buffer.from(data);
const keyColor = sampleKeyColor(keyed, info.width, info.height);
applyChromaKey(keyed, keyColor, transparentThreshold, opaqueThreshold);

const keyedPng = await sharp(keyed, { raw: info }).png().toBuffer();
const cellW = Math.floor(info.width / cols);
const cellH = Math.floor(info.height / rows);
const canvasW = cellW * cols;
const canvasH = cellH * rows;

const beforeFrames = measureFrames(keyed, info.width, cellW, cellH, rows, cols, alphaThreshold);
const beforeDrift = measureDrift(beforeFrames, rows);

const composites = [];
for (const frame of beforeFrames) {
  const rowFrames = beforeFrames.filter((item) => item.row === frame.row);
  const targetCenter = Math.round(cellW / 2);
  const targetFoot = Math.max(...rowFrames.map((item) => item.bounds.bottom));
  const dx = Math.round(targetCenter - frame.bounds.centerX);
  const dy = Math.round(targetFoot - frame.bounds.bottom);
  const frameBuffer = await sharp(keyedPng)
    .extract({ left: frame.col * cellW, top: frame.row * cellH, width: cellW, height: cellH })
    .png()
    .toBuffer();
  composites.push({
    input: frameBuffer,
    left: frame.col * cellW + dx,
    top: frame.row * cellH + dy
  });
  frame.offset = { x: dx, y: dy };
}

await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
await sharp({
  create: {
    width: canvasW,
    height: canvasH,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite(composites)
  .png()
  .toFile(out);

const normalized = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const afterFrames = measureFrames(normalized.data, normalized.info.width, cellW, cellH, rows, cols, alphaThreshold);
const afterDrift = measureDrift(afterFrames, rows);

if (args.framesDir) {
  await exportFrames(out, args.framesDir, cellW, cellH, rows, cols);
}

const meta = {
  input: path.resolve(input),
  output: path.resolve(out),
  rows,
  cols,
  width: canvasW,
  height: canvasH,
  cell: { width: cellW, height: cellH },
  keyColor,
  drift: {
    before: beforeDrift,
    after: afterDrift
  },
  frames: beforeFrames.map((frame) => ({
    row: frame.row,
    col: frame.col,
    bounds: frame.bounds,
    offset: frame.offset
  })),
  generatedAt: new Date().toISOString()
};

if (args.meta) {
  await fs.mkdir(path.dirname(path.resolve(args.meta)), { recursive: true });
  await fs.writeFile(args.meta, JSON.stringify(meta, null, 2));
}

console.log(JSON.stringify(meta, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      i += 1;
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

function measureFrames(buffer, imageWidth, cellWidth, cellHeight, rowCount, colCount, threshold) {
  const frames = [];
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      frames.push({ row, col, bounds: findBounds(buffer, imageWidth, cellWidth, cellHeight, row, col, threshold) });
    }
  }
  return frames;
}

function findBounds(buffer, imageWidth, cellWidth, cellHeight, row, col, threshold) {
  let left = cellWidth;
  let top = cellHeight;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < cellHeight; y += 1) {
    for (let x = 0; x < cellWidth; x += 1) {
      const index = ((row * cellHeight + y) * imageWidth + (col * cellWidth + x)) * 4;
      if (buffer[index + 3] < threshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (left > right) {
    return { left: 0, top: 0, right: cellWidth - 1, bottom: cellHeight - 1, centerX: Math.round(cellWidth / 2) };
  }
  return { left, top, right, bottom, centerX: Math.round((left + right) / 2) };
}

function measureDrift(frames, rowCount) {
  const rowsOut = [];
  for (let row = 0; row < rowCount; row += 1) {
    const rowFrames = frames.filter((frame) => frame.row === row);
    const xs = rowFrames.map((frame) => frame.bounds.centerX);
    const ys = rowFrames.map((frame) => frame.bounds.bottom);
    rowsOut.push({
      row,
      xDrift: Math.max(...xs) - Math.min(...xs),
      footDrift: Math.max(...ys) - Math.min(...ys)
    });
  }
  return rowsOut;
}

async function exportFrames(sheetPath, framesDir, cellWidth, cellHeight, rowCount, colCount) {
  await fs.mkdir(framesDir, { recursive: true });
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      await sharp(sheetPath)
        .extract({ left: col * cellWidth, top: row * cellHeight, width: cellWidth, height: cellHeight })
        .png()
        .toFile(path.join(framesDir, `r${row}_c${col}.png`));
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
