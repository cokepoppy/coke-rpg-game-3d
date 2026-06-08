#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rosterPath = path.join(root, "assets/characters/roster.json");
const promptDir = path.join(root, "assets/characters/prompts");
const roster = JSON.parse(await fs.readFile(rosterPath, "utf8"));
await fs.mkdir(promptDir, { recursive: true });

for (const character of roster.characters.filter((item) => item.source !== "existing")) {
  const prompt = [
    `Generate one 4x4 sprite sheet for a 2D pixel-art wuxia RPG character: ${character.name}.`,
    `Character: ${character.description}.`,
    `Shared style: ${roster.style}.`,
    "Top-down 3/4 RPG perspective, compact readable game sprite, consistent identity.",
    "Exact 4 columns x 4 rows.",
    "Row 1 faces down walk cycle, row 2 faces left, row 3 faces right, row 4 faces up.",
    "Four frames per row: idle, left step, idle, right step.",
    "Every frame centered in its cell with identical scale and a stable bottom-center feet anchor.",
    "Perfectly flat solid #FF00FF chroma-key background.",
    "No shadows outside the character, no labels, no grid lines, no text, no UI, no watermark."
  ].join("\n");
  await fs.writeFile(path.join(promptDir, `${character.id}.prompt.txt`), prompt, "utf8");
}

console.log(JSON.stringify({ promptDir: path.relative(root, promptDir), count: roster.characters.filter((item) => item.source !== "existing").length }, null, 2));
