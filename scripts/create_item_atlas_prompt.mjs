#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "assets/items");
await fs.mkdir(outDir, { recursive: true });

const atlasItems = [
  ["hemostatic_powder", "止血散", "大理药铺常备的外伤药，适合战后应急"],
  ["qingxin_pill", "清心丸", "以薄荷、沉香调成，可缓解迷香和内息紊乱"],
  ["life_pill", "续命丹", "药性猛烈，江湖人常留作保命底牌"],
  ["iron_sword", "青锋剑", "普通铁剑，锋口干净，适合初入江湖者"],
  ["steel_saber", "雁翎刀", "刀身略弯，劈斩有力"],
  ["long_spear", "梨花枪", "枪头寒光细长，适合在战棋格上保持距离"],
  ["halberd", "画戟", "沉重长兵，非臂力过人者难以运使"],
  ["silver_piece", "碎银", "小块碎银，可在店铺中折算"]
];

const prompt = `Create one pixel-art item icon atlas for a Tian Long Ba Bu inspired Dali wuxia RPG.

Asset type: browser RPG inventory item atlas
Canvas: 512x512
Grid: 4 columns x 3 rows
Cell size: 128x128
Background: perfectly flat solid #ff00ff chroma-key background
Style: crisp top-down/three-quarter pixel RPG inventory icons, readable at 48x48 runtime, no text, no watermark, no shadows outside each icon, generous padding inside each cell.
Consistency: all icons share the same lighting angle, outline weight, pixel density, and camera angle.
Avoid: UI frames, labels, gradients in the background, cropped icons, duplicate items, realistic photo style.

Place these icons in row-major order:
${atlasItems.map(([id, name, description], index) => `${index + 1}. ${name} (${id}) - ${description}`).join("\n")}

The output must be a single atlas image only. Keep every item centered in its own 128x128 cell and separated from neighboring cells.`;

const output = path.join(outDir, "item-atlas-prompt.txt");
await fs.writeFile(output, prompt, "utf8");

console.log(JSON.stringify({ output, count: atlasItems.length, cellSize: 128, grid: "4x3" }, null, 2));
