import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const files = [
  ["maps/dali-inn-room/dali-inn-room-rendered.png", "wechat-minigame/room-pack/inn-room.png"],
  ["assets/characters/hero/hero-walk-anchored-v4-motionfix.png", "wechat-minigame/character-pack/hero.png"],
  ["assets/characters/a_luo/a_luo-walk-anchored.png", "wechat-minigame/character-pack/companion.png"],
  ["assets/characters/masked_scout/masked_scout-walk-anchored.png", "wechat-minigame/character-pack/scout.png"],
  ["assets/characters/medicine_vendor/medicine_vendor-walk-anchored.png", "wechat-minigame/character-pack/vendor.png"],
  ["assets/characters/inn_keeper/inn_keeper-walk-anchored.png", "wechat-minigame/character-pack/keeper.png"],
  ["assets/audio/cangshan-road-mobile.m4a", "wechat-minigame/audio-pack/cangshan-road.m4a"]
];

await rm(path.join(root, "wechat-minigame/assets"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/asset-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/map-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-west-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-east-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/room-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/character-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/audio-pack"), { recursive: true, force: true });

for (const [source, destination] of files) {
  const target = path.join(root, destination);
  await mkdir(path.dirname(target), { recursive: true });
  const input = path.join(root, source);
  if (destination.endsWith(".webp")) {
    await sharp(input).webp({ lossless: true, effort: 6 }).toFile(target);
  } else if (source.endsWith(".png")) {
    await sharp(input).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(target);
  } else {
    await cp(input, target);
  }
}

const worldSource = path.join(root, "maps/dali-temple-route-design-first/dali-temple-route-design-first-rendered-crisp.png");
const worldHalves = [
  ["world-west-pack", "world-west.png", 0],
  ["world-east-pack", "world-east.png", 2240]
];
for (const [pack, filename, left] of worldHalves) {
  const target = path.join(root, "wechat-minigame", pack, filename);
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(worldSource)
    .extract({ left, top: 0, width: 2240, height: 3584 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(target);
}

for (const pack of ["world-west-pack", "world-east-pack", "room-pack", "character-pack", "audio-pack"]) {
  await writeFile(path.join(root, "wechat-minigame", pack, "game.js"), "module.exports = {};\n");
}

console.log(`Prepared ${files.length + 2} compressed runtime assets.`);
