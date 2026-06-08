#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rosterPath = path.join(root, "assets/effects/effect-roster.json");
const promptDir = path.join(root, "assets/effects/prompts");
const roster = JSON.parse(await fs.readFile(rosterPath, "utf8"));
await fs.mkdir(promptDir, { recursive: true });

for (const effect of roster.effects) {
  const prompt = [
    `Generate one 1x6 sprite sheet for a 2D pixel-art wuxia battle effect: ${effect.name}.`,
    `Effect: ${effect.description}.`,
    `Shared style: ${roster.style}.`,
    "Exact 1 row x 6 columns, six animation frames from start to finish.",
    "Each frame centered in its cell, same scale, crisp alpha-ready silhouette.",
    "Perfectly flat solid #FF00FF chroma-key background.",
    "No characters, no labels, no grid lines, no text, no UI, no watermark."
  ].join("\n");
  await fs.writeFile(path.join(promptDir, `${effect.id}.prompt.txt`), prompt, "utf8");
}

console.log(JSON.stringify({ promptDir: path.relative(root, promptDir), count: roster.effects.length }, null, 2));
