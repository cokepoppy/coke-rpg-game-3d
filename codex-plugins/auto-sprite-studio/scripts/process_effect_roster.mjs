#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = process.cwd();
const rosterPath = path.join(root, "assets/effects/effect-roster.json");
const manifestPath = path.join(root, "src/assets/effectManifest.js");
const roster = JSON.parse(await fs.readFile(rosterPath, "utf8"));
const manifest = {};

for (const effect of roster.effects) {
  const dir = path.join(root, "assets/effects", effect.id);
  const raw = path.join(dir, `${effect.id}-raw.png`);
  const out = path.join(dir, `${effect.id}-clean.png`);
  await fs.access(raw);
  const source = await sharp(raw).ensureAlpha();
  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
  const keyed = Buffer.from(data);
  const keyColor = sampleKeyColor(keyed, info.width, info.height);
  for (let index = 0; index < keyed.length; index += 4) {
    const dr = keyed[index] - keyColor[0];
    const dg = keyed[index + 1] - keyColor[1];
    const db = keyed[index + 2] - keyColor[2];
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    if (dist < 48) keyed[index + 3] = 0;
  }
  await fs.mkdir(dir, { recursive: true });
  await sharp(keyed, { raw: info })
    .resize({
      width: roster.contract.frameWidth * roster.contract.cols,
      height: roster.contract.frameHeight * roster.contract.rows,
      fit: "fill",
      kernel: sharp.kernel.nearest
    })
    .png()
    .toFile(out);
  manifest[effect.id] = {
    id: effect.id,
    name: effect.name,
    sheet: `./assets/effects/${effect.id}/${effect.id}-clean.png`,
    frameWidth: roster.contract.frameWidth,
    frameHeight: roster.contract.frameHeight,
    frames: roster.contract.cols
  };
}

await fs.writeFile(manifestPath, `export const effects = ${JSON.stringify(manifest, null, 2)};\n`, "utf8");
console.log(JSON.stringify({ manifest: path.relative(root, manifestPath), count: Object.keys(manifest).length }, null, 2));

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
  return samples.reduce((acc, rgb) => acc.map((value, index) => value + rgb[index]), [0, 0, 0]).map((value) => Math.round(value / samples.length));
}
