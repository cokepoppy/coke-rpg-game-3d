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
const reportPath = args.report;
const contactPath = args.contact;
const rows = Number(args.rows || 4);
const cols = Number(args.cols || 4);
const alphaThreshold = Number(args.alphaThreshold || args["alpha-threshold"] || 24);
const minComponentArea = Number(args.minComponentArea || args["min-component-area"] || 40);
const footBand = Number(args.footBand || args["foot-band"] || 14);
const maxAnchorDrift = Number(args.maxAnchorDrift || args["max-anchor-drift"] || 2);
const minTopMargin = Number(args.minTopMargin || args["min-top-margin"] || 8);
const minSideMargin = Number(args.minSideMargin || args["min-side-margin"] || 10);
const minVerticalStride = Number(args.minVerticalStride || args["min-vertical-stride"] || 3);

if (!input) {
  console.error("Usage: sprite_anchor_audit.mjs --input sheet.png [--out anchored.png --report report.json --contact contact.png --rows 4 --cols 4]");
  process.exit(2);
}

const source = await sharp(input).ensureAlpha();
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
const cellW = Math.floor(info.width / cols);
const cellH = Math.floor(info.height / rows);
const sourcePng = await sharp(data, { raw: info }).png().toBuffer();
const beforeFrames = measureFrames(data, info.width, cellW, cellH);
const target = {
  x: Math.round(cellW / 2),
  y: Math.max(...beforeFrames.map((frame) => frame.anchor.y))
};

let outputPath = input;
let afterFrames = beforeFrames;
if (out) {
  const composites = [];
  for (const frame of beforeFrames) {
    const dx = Math.round(target.x - frame.anchor.x);
    const dy = Math.round(target.y - frame.anchor.y);
    const frameBuffer = await sharp(sourcePng)
      .extract({ left: frame.col * cellW, top: frame.row * cellH, width: cellW, height: cellH })
      .png()
      .toBuffer();
    composites.push({
      input: frameBuffer,
      left: frame.col * cellW + dx,
      top: frame.row * cellH + dy
    });
    frame.anchorOffset = { x: dx, y: dy };
  }
  await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await sharp({
    create: {
      width: cellW * cols,
      height: cellH * rows,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .png()
    .toFile(out);
  outputPath = out;
  const output = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  afterFrames = measureFrames(output.data, output.info.width, cellW, cellH);
}

const before = summarize(beforeFrames);
const after = summarize(afterFrames);
const contract = validateContract(afterFrames);
const regenerate = !contract.pass;
const report = {
  input: path.resolve(input),
  output: out ? path.resolve(out) : null,
  rows,
  cols,
  cell: { width: cellW, height: cellH },
  targetAnchor: target,
  thresholds: {
    alphaThreshold,
    minComponentArea,
    footBand,
    maxAnchorDrift,
    minTopMargin,
    minSideMargin,
    minVerticalStride
  },
  before,
  after,
  contract,
  regenerate,
  regenerationPrompt: regenerate ? buildRegenerationPrompt(contract.failures) : null,
  pass: after.global.anchorXDrift <= maxAnchorDrift && after.global.anchorYDrift <= maxAnchorDrift && contract.pass,
  frames: beforeFrames.map((frame, index) => ({
    row: frame.row,
    col: frame.col,
    direction: directionName(frame.row),
    body: frame.body,
    anchor: frame.anchor,
    centroid: frame.centroid,
    residuePixels: frame.residuePixels,
    anchorOffset: frame.anchorOffset || { x: 0, y: 0 },
    afterAnchor: afterFrames[index]?.anchor
  })),
  generatedAt: new Date().toISOString()
};

if (reportPath) {
  await fs.mkdir(path.dirname(path.resolve(reportPath)), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
}
if (contactPath) await writeContactSheet(outputPath, contactPath, report, afterFrames);

console.log(JSON.stringify(report, null, 2));

function measureFrames(buffer, imageWidth, cellWidth, cellHeight) {
  const frames = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const components = findComponents(buffer, imageWidth, cellWidth, cellHeight, row, col)
        .filter((component) => component.count >= minComponentArea)
        .sort((a, b) => b.count - a.count);
      const body = components[0] || emptyBounds(cellWidth, cellHeight);
      const residue = components.slice(1);
      frames.push({
        row,
        col,
        cellWidth,
        cellHeight,
        body,
        anchor: findFootAnchor(buffer, imageWidth, cellWidth, cellHeight, row, col, body),
        centroid: findCentroid(buffer, imageWidth, cellWidth, cellHeight, row, col, body),
        residuePixels: residue.reduce((sum, item) => sum + item.count, 0)
      });
    }
  }
  return frames;
}

function findComponents(buffer, imageWidth, cellWidth, cellHeight, row, col) {
  const seen = new Uint8Array(cellWidth * cellHeight);
  const components = [];
  const offset = (x, y) => y * cellWidth + x;
  const alphaAt = (x, y) => buffer[((row * cellHeight + y) * imageWidth + (col * cellWidth + x)) * 4 + 3];
  for (let y = 0; y < cellHeight; y += 1) {
    for (let x = 0; x < cellWidth; x += 1) {
      const start = offset(x, y);
      if (seen[start] || alphaAt(x, y) < alphaThreshold) continue;
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
          if (seen[next] || alphaAt(nx, ny) < alphaThreshold) continue;
          seen[next] = 1;
          queue.push([nx, ny]);
        }
      }
      components.push({ count, left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, centerX: Math.round((left + right) / 2) });
    }
  }
  return components;
}

function findFootAnchor(buffer, imageWidth, cellWidth, cellHeight, row, col, body) {
  const xs = [];
  const startY = Math.max(body.top, body.bottom - footBand + 1);
  for (let y = startY; y <= body.bottom; y += 1) {
    for (let x = body.left; x <= body.right; x += 1) {
      const index = ((row * cellHeight + y) * imageWidth + (col * cellWidth + x)) * 4;
      if (buffer[index + 3] >= alphaThreshold) xs.push(x);
    }
  }
  if (!xs.length) return { x: body.centerX, y: body.bottom, rawX: body.centerX };
  xs.sort((a, b) => a - b);
  const rawX = Math.round(median(xs));
  return { x: rawX, y: body.bottom, rawX };
}

function findCentroid(buffer, imageWidth, cellWidth, cellHeight, row, col, body) {
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = body.top; y <= body.bottom; y += 1) {
    for (let x = body.left; x <= body.right; x += 1) {
      const index = ((row * cellHeight + y) * imageWidth + (col * cellWidth + x)) * 4;
      if (buffer[index + 3] < alphaThreshold) continue;
      count += 1;
      sumX += x;
      sumY += y;
    }
  }
  if (!count) return { x: body.centerX, y: Math.round((body.top + body.bottom) / 2) };
  return { x: Math.round(sumX / count), y: Math.round(sumY / count) };
}

function summarize(frames) {
  const anchorsX = frames.map((frame) => frame.anchor.x);
  const anchorsY = frames.map((frame) => frame.anchor.y);
  const centroidsX = frames.map((frame) => frame.centroid.x);
  return {
    global: {
      anchorXDrift: range(anchorsX),
      anchorYDrift: range(anchorsY),
      centroidXDrift: range(centroidsX),
      maxResiduePixels: Math.max(...frames.map((frame) => frame.residuePixels))
    },
    byDirection: Array.from({ length: rows }, (_, row) => {
      const rowFrames = frames.filter((frame) => frame.row === row);
      return {
        row,
        direction: directionName(row),
        anchorXDrift: range(rowFrames.map((frame) => frame.anchor.x)),
        anchorYDrift: range(rowFrames.map((frame) => frame.anchor.y)),
        centroidXDrift: range(rowFrames.map((frame) => frame.centroid.x)),
        residuePixels: rowFrames.reduce((sum, frame) => sum + frame.residuePixels, 0)
      };
    })
  };
}

function validateContract(frames) {
  const failures = [];
  const global = summarize(frames).global;
  const topMargin = Math.min(...frames.map((frame) => frame.body.top));
  const leftMargin = Math.min(...frames.map((frame) => frame.body.left));
  const rightMargin = Math.min(...frames.map((frame) => frame.cellWidth - frame.body.right - 1));
  const verticalGait = ["down", "up"].map((direction) => verticalStride(frames, direction));

  if (global.anchorXDrift > maxAnchorDrift || global.anchorYDrift > maxAnchorDrift) {
    failures.push(`global foot anchor drift ${global.anchorXDrift},${global.anchorYDrift}px exceeds ${maxAnchorDrift}px`);
  }
  if (topMargin < minTopMargin) {
    failures.push(`top margin ${topMargin}px is below ${minTopMargin}px; head, hair, or weapon may be cropped`);
  }
  if (leftMargin < minSideMargin || rightMargin < minSideMargin) {
    failures.push(`side margins ${leftMargin}/${rightMargin}px are below ${minSideMargin}px`);
  }
  for (const gait of verticalGait) {
    if (!gait.pass) failures.push(`${gait.direction} walk does not alternate feet: frame1 ${gait.frame1Offset}px, frame3 ${gait.frame3Offset}px`);
  }

  return {
    pass: failures.length === 0,
    failures,
    margins: { top: topMargin, left: leftMargin, right: rightMargin },
    verticalGait
  };
}

function verticalStride(frames, direction) {
  const row = ["down", "left", "right", "up"].indexOf(direction);
  const rowFrames = frames.filter((frame) => frame.row === row);
  const frame1 = rowFrames.find((frame) => frame.col === 1);
  const frame3 = rowFrames.find((frame) => frame.col === 3);
  const offset1 = frame1 ? frame1.anchor.rawX - frame1.body.centerX : 0;
  const offset3 = frame3 ? frame3.anchor.rawX - frame3.body.centerX : 0;
  return {
    direction,
    frame1Offset: offset1,
    frame3Offset: offset3,
    pass: Math.abs(offset1) >= minVerticalStride && Math.abs(offset3) >= minVerticalStride && Math.sign(offset1) !== Math.sign(offset3)
  };
}

function buildRegenerationPrompt(failures) {
  return [
    "Regenerate this character as a strict 4x4 top-down pixel-art RPG walk sprite sheet.",
    "Canvas contract: 4 columns x 4 rows; the final asset must normalize cleanly to 128x128 px per frame.",
    "Runtime contract: character body fits a 64x96 px in-game display on a 64x64 map tile; feet anchor is bottom-center and stable.",
    "Rows: down, left, right, up. Columns: idle, left-foot step, idle, right-foot step.",
    "Down and up rows must clearly alternate opposite feet in columns 2 and 4.",
    "Keep at least 8 px top padding and 10 px side padding in every frame after normalization; do not crop head, hair, robe, weapon, hands, or feet.",
    "Every frame uses identical scale, consistent identity, and the same foot-contact map anchor.",
    "Perfectly flat #FF00FF chroma-key background; no shadows, text, labels, grid, UI, or watermark.",
    `Previous QA failures: ${failures.join("; ")}.`
  ].join("\n");
}

async function writeContactSheet(sheetPath, outputPath, reportData, frames) {
  const scale = 2;
  const labelH = 28;
  const composites = [];
  const targetX = reportData.targetAnchor.x * scale;
  const targetY = reportData.targetAnchor.y * scale;
  for (const frame of frames) {
    const left = frame.col * cellW * scale;
    const top = frame.row * (cellH * scale + labelH);
    const framePng = await sharp(sheetPath)
      .extract({ left: frame.col * cellW, top: frame.row * cellH, width: cellW, height: cellH })
      .resize({ width: cellW * scale, height: cellH * scale, kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();
    const overlay = Buffer.from(
      `<svg width="${cellW * scale}" height="${cellH * scale}" xmlns="http://www.w3.org/2000/svg">
        <line x1="${targetX}" y1="0" x2="${targetX}" y2="${cellH * scale}" stroke="#58d68d" stroke-width="2"/>
        <line x1="0" y1="${targetY}" x2="${cellW * scale}" y2="${targetY}" stroke="#f5c542" stroke-width="2"/>
        <circle cx="${frame.anchor.x * scale}" cy="${frame.anchor.y * scale}" r="6" fill="none" stroke="#ff4f6d" stroke-width="3"/>
        <rect x="${frame.body.left * scale}" y="${frame.body.top * scale}" width="${frame.body.width * scale}" height="${frame.body.height * scale}" fill="none" stroke="#6fca9f" stroke-width="2"/>
      </svg>`
    );
    const label = Buffer.from(
      `<svg width="${cellW * scale}" height="${labelH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#15120e"/><text x="10" y="19" font-size="14" fill="#f5ead0" font-family="Arial">${directionName(frame.row)} ${frame.col} anchor ${frame.anchor.x},${frame.anchor.y}</text></svg>`
    );
    composites.push({ input: framePng, left, top });
    composites.push({ input: overlay, left, top });
    composites.push({ input: label, left, top: top + cellH * scale });
  }
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  await sharp({
    create: {
      width: cols * cellW * scale,
      height: rows * (cellH * scale + labelH),
      channels: 4,
      background: "#11130f"
    }
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

function emptyBounds(cellWidth, cellHeight) {
  return { count: 0, left: 0, top: 0, right: cellWidth - 1, bottom: cellHeight - 1, width: cellWidth, height: cellHeight, centerX: Math.round(cellWidth / 2) };
}

function range(values) {
  return Math.max(...values) - Math.min(...values);
}

function median(values) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
}

function directionName(row) {
  return ["down", "left", "right", "up"][row] || `row-${row}`;
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
