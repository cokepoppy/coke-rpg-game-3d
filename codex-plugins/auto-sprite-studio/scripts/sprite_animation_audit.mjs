#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const args = parseArgs(process.argv.slice(2));
const input = args.input;
const out = args.out;
const report = args.report || args.meta;
const contact = args.contact;
const rows = Number(args.rows || 4);
const cols = Number(args.cols || 4);
const alphaThreshold = Number(args.alphaThreshold || args["alpha-threshold"] || 24);
const minComponentArea = Number(args.minComponentArea || args["min-component-area"] || 40);

if (!input || !out) {
  console.error("Usage: sprite_animation_audit.mjs --input sheet.png --out cleaned.png [--report report.json --contact contact.png --rows 4 --cols 4]");
  process.exit(2);
}

const source = await sharp(input).ensureAlpha();
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
const cellW = Math.floor(info.width / cols);
const cellH = Math.floor(info.height / rows);
const canvasW = cellW * cols;
const canvasH = cellH * rows;
const sourcePng = await sharp(data, { raw: info }).png().toBuffer();

const frames = [];
for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < cols; col += 1) {
    const components = findComponents(data, info.width, cellW, cellH, row, col, alphaThreshold)
      .filter((component) => component.count >= minComponentArea)
      .sort((a, b) => b.count - a.count);
    const body = components[0] || emptyBounds(cellW, cellH);
    const all = mergeBounds(components, cellW, cellH);
    const residue = components.slice(1);
    frames.push({ row, col, all, body, residue, residuePixels: residue.reduce((sum, item) => sum + item.count, 0) });
  }
}

const composites = [];
for (const frame of frames) {
  const rowFrames = frames.filter((item) => item.row === frame.row);
  const targetCenter = Math.round(cellW / 2);
  const targetFoot = Math.max(...rowFrames.map((item) => item.body.bottom));
  const dx = targetCenter - frame.body.centerX;
  const dy = targetFoot - frame.body.bottom;
  const frameBuffer = await cleanFrameBuffer(sourcePng, frame, cellW, cellH, alphaThreshold);
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

const cleaned = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const afterFrames = [];
for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < cols; col += 1) {
    const components = findComponents(cleaned.data, cleaned.info.width, cellW, cellH, row, col, alphaThreshold)
      .filter((component) => component.count >= minComponentArea)
      .sort((a, b) => b.count - a.count);
    afterFrames.push({ row, col, body: components[0] || emptyBounds(cellW, cellH), residuePixels: components.slice(1).reduce((sum, item) => sum + item.count, 0) });
  }
}

const output = {
  input: path.resolve(input),
  output: path.resolve(out),
  rows,
  cols,
  cell: { width: cellW, height: cellH },
  drift: {
    before: drift(frames.map((frame) => ({ row: frame.row, col: frame.col, bounds: frame.body })), rows),
    after: drift(afterFrames.map((frame) => ({ row: frame.row, col: frame.col, bounds: frame.body })), rows)
  },
  residue: {
    beforePixels: frames.reduce((sum, frame) => sum + frame.residuePixels, 0),
    afterPixels: afterFrames.reduce((sum, frame) => sum + frame.residuePixels, 0),
    frames: frames.map((frame) => ({
      row: frame.row,
      col: frame.col,
      body: frame.body,
      all: frame.all,
      residuePixels: frame.residuePixels,
      residue: frame.residue,
      offset: frame.offset
    }))
  },
  generatedAt: new Date().toISOString()
};

if (report) {
  await fs.mkdir(path.dirname(path.resolve(report)), { recursive: true });
  await fs.writeFile(report, JSON.stringify(output, null, 2));
}

if (contact) await writeContactSheet(out, contact, cellW, cellH, rows, cols);

console.log(JSON.stringify(output, null, 2));

async function cleanFrameBuffer(sheetPng, frame, width, height, threshold) {
  const extracted = await sharp(sheetPng)
    .extract({ left: frame.col * width, top: frame.row * height, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = Buffer.from(extracted.data);
  const body = frame.body;
  const keep = new Set();
  const alphaAt = (x, y) => raw[(y * width + x) * 4 + 3];
  const start = findFirstOpaqueInBounds(alphaAt, body, threshold);
  if (!start) return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const queue = [start];
  keep.add(`${start[0]},${start[1]}`);
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1]
    ]) {
      if (nx < body.left || ny < body.top || nx > body.right || ny > body.bottom) continue;
      const key = `${nx},${ny}`;
      if (keep.has(key) || alphaAt(nx, ny) < threshold) continue;
      keep.add(key);
      queue.push([nx, ny]);
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (keep.has(`${x},${y}`)) continue;
      raw[(y * width + x) * 4 + 3] = 0;
    }
  }
  return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function findFirstOpaqueInBounds(alphaAt, bounds, threshold) {
  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      if (alphaAt(x, y) >= threshold) return [x, y];
    }
  }
  return null;
}

function findComponents(buffer, imageWidth, cellWidth, cellHeight, row, col, threshold) {
  const seen = new Uint8Array(cellWidth * cellHeight);
  const components = [];
  const offset = (x, y) => y * cellWidth + x;
  const alphaAt = (x, y) => buffer[((row * cellHeight + y) * imageWidth + (col * cellWidth + x)) * 4 + 3];
  for (let y = 0; y < cellHeight; y += 1) {
    for (let x = 0; x < cellWidth; x += 1) {
      const start = offset(x, y);
      if (seen[start] || alphaAt(x, y) < threshold) continue;
      const queue = [[x, y]];
      let cursor = 0;
      let left = x;
      let right = x;
      let top = y;
      let bottom = y;
      let count = 0;
      seen[start] = 1;
      while (cursor < queue.length) {
        const [px, py] = queue[cursor];
        cursor += 1;
        count += 1;
        left = Math.min(left, px);
        right = Math.max(right, px);
        top = Math.min(top, py);
        bottom = Math.max(bottom, py);
        for (const [nx, ny] of [
          [px + 1, py],
          [px - 1, py],
          [px, py + 1],
          [px, py - 1]
        ]) {
          if (nx < 0 || ny < 0 || nx >= cellWidth || ny >= cellHeight) continue;
          const next = offset(nx, ny);
          if (seen[next] || alphaAt(nx, ny) < threshold) continue;
          seen[next] = 1;
          queue.push([nx, ny]);
        }
      }
      components.push({ count, left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, centerX: Math.round((left + right) / 2) });
    }
  }
  return components;
}

function mergeBounds(components, cellWidth, cellHeight) {
  if (!components.length) return emptyBounds(cellWidth, cellHeight);
  const left = Math.min(...components.map((item) => item.left));
  const top = Math.min(...components.map((item) => item.top));
  const right = Math.max(...components.map((item) => item.right));
  const bottom = Math.max(...components.map((item) => item.bottom));
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, centerX: Math.round((left + right) / 2) };
}

function emptyBounds(cellWidth, cellHeight) {
  return { count: 0, left: 0, top: 0, right: cellWidth - 1, bottom: cellHeight - 1, width: cellWidth, height: cellHeight, centerX: Math.round(cellWidth / 2) };
}

function drift(frames, rowCount) {
  return Array.from({ length: rowCount }, (_, row) => {
    const rowFrames = frames.filter((frame) => frame.row === row);
    const centers = rowFrames.map((frame) => frame.bounds.centerX);
    const feet = rowFrames.map((frame) => frame.bounds.bottom);
    return {
      row,
      xDrift: Math.max(...centers) - Math.min(...centers),
      footDrift: Math.max(...feet) - Math.min(...feet)
    };
  });
}

async function writeContactSheet(sheetPath, outputPath, cellWidth, cellHeight, rowCount, colCount) {
  const composites = [];
  const scale = 2;
  for (let row = 0; row < rowCount; row += 1) {
    for (let col = 0; col < colCount; col += 1) {
      const frame = await sharp(sheetPath)
        .extract({ left: col * cellWidth, top: row * cellHeight, width: cellWidth, height: cellHeight })
        .resize({ width: cellWidth * scale, height: cellHeight * scale, kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();
      composites.push({ input: frame, left: col * cellWidth * scale, top: row * cellHeight * scale });
    }
  }
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await sharp({
    create: {
      width: colCount * cellWidth * scale,
      height: rowCount * cellHeight * scale,
      channels: 4,
      background: { r: 18, g: 20, b: 17, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
