#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const rosterPath = path.resolve(root, args.roster || "assets/characters/roster.json");
const outManifest = path.resolve(root, args.manifest || "src/assets/characterManifest.js");
const nodeBin = process.execPath;
const pluginRoot = args.plugin || "/Users/shangguanchenhuan/plugins/auto-sprite-studio";
const roster = JSON.parse(await fs.readFile(rosterPath, "utf8"));
const characters = {};
const reports = [];

for (const character of roster.characters) {
  if (character.source === "existing") {
    characters[character.id] = manifestEntry(character, {
      sheet: `./assets/${path.basename(character.sheet)}`,
      frameWidth: character.frameWidth,
      frameHeight: character.frameHeight,
      drawWidth: character.drawWidth,
      drawHeight: character.drawHeight
    });
    continue;
  }

  const dir = path.resolve(root, "assets/characters", character.id);
  const raw = path.join(dir, `${character.id}-walk-raw.png`);
  const normalized = path.join(dir, `${character.id}-walk-normalized.png`);
  const meta = path.join(dir, `${character.id}-walk-normalized.json`);
  const framesDir = path.join(dir, "frames");
  const audited = path.join(dir, `${character.id}-walk-audited.png`);
  const audit = path.join(dir, `${character.id}-walk-audited.json`);
  const contact = path.join(dir, `${character.id}-walk-contact.png`);

  await fs.access(raw);
  run(nodeBin, [
    path.join(pluginRoot, "scripts/auto_sprite_sheet.mjs"),
    "--input",
    raw,
    "--out",
    normalized,
    "--meta",
    meta,
    "--frames-dir",
    framesDir,
    "--rows",
    String(roster.contract.rows),
    "--cols",
    String(roster.contract.cols)
  ]);
  run(nodeBin, [
    path.join(pluginRoot, "scripts/sprite_animation_audit.mjs"),
    "--input",
    normalized,
    "--out",
    audited,
    "--report",
    audit,
    "--contact",
    contact,
    "--rows",
    String(roster.contract.rows),
    "--cols",
    String(roster.contract.cols)
  ]);

  const report = JSON.parse(await fs.readFile(audit, "utf8"));
  const frameWidth = report.cell.width;
  const frameHeight = report.cell.height;
  characters[character.id] = manifestEntry(character, {
    sheet: `./assets/characters/${character.id}/${character.id}-walk-audited.png`,
    frameWidth,
    frameHeight,
    drawWidth: character.drawWidth || roster.contract.drawWidth,
    drawHeight: character.drawHeight || roster.contract.drawHeight
  });
  reports.push({
    id: character.id,
    residueBefore: report.residue.beforePixels,
    residueAfter: report.residue.afterPixels,
    driftBefore: report.drift.before,
    driftAfter: report.drift.after,
    contact: path.relative(root, contact)
  });
}

await fs.writeFile(
  outManifest,
  `export const characters = ${JSON.stringify(characters, null, 2)};\n`,
  "utf8"
);

console.log(JSON.stringify({ manifest: path.relative(root, outManifest), reports }, null, 2));

function manifestEntry(character, sheet) {
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    sheet: sheet.sheet,
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight,
    drawWidth: sheet.drawWidth,
    drawHeight: sheet.drawHeight,
    directions: ["down", "left", "right", "up"],
    framesPerDirection: 4
  };
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_PATH: process.env.NODE_PATH || "/Users/shangguanchenhuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules"
    }
  });
  if (result.status !== 0) throw new Error(`Command failed: ${command} ${commandArgs.join(" ")}`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}
