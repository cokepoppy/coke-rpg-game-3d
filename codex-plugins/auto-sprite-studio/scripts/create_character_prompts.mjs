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
    `Asset contract: normalize to ${roster.contract.sourceFrameWidth || 128}x${roster.contract.sourceFrameHeight || 128} px per frame; in-game body fits ${roster.contract.drawWidth || 64}x${roster.contract.drawHeight || 96} px on a 64x64 map tile.`,
    `Anchor contract: foot-contact anchor stays at (${roster.contract.anchorX || 64}, ${roster.contract.anchorY || 112}) after normalization, with max drift ${roster.contract.maxAnchorDrift || 2}px.`,
    "Gait contract: down and up rows must clearly alternate opposite feet in columns 2 and 4; do not use the same stepping foot twice.",
    `Padding contract: keep at least ${roster.contract.minTopMargin || 8}px top padding and ${roster.contract.minSideMargin || 10}px side padding in every normalized frame.`,
    "Every frame centered in its cell with identical scale and a stable bottom-center feet anchor. Do not crop hair, head, robe, weapon, hands, or feet.",
    "Perfectly flat solid #FF00FF chroma-key background.",
    "No shadows outside the character, no labels, no grid lines, no text, no UI, no watermark."
  ].join("\n");
  await fs.writeFile(path.join(promptDir, `${character.id}.prompt.txt`), prompt, "utf8");
}

console.log(JSON.stringify({ promptDir: path.relative(root, promptDir), count: roster.characters.filter((item) => item.source !== "existing").length }, null, 2));
