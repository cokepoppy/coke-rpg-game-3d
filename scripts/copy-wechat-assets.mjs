import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const files = [
  ["maps/dali-inn-room/dali-inn-room-rendered.png", "wechat-minigame/room-pack/inn-room.png"],
  ["assets/characters/hero/hero-walk-anchored-v4-motionfix.png", "wechat-minigame/character-pack/hero.png"],
  ["assets/characters/a_luo/a_luo-walk-anchored.png", "wechat-minigame/character-pack/companion.png"],
  ["assets/characters/masked_scout/masked_scout-walk-anchored.png", "wechat-minigame/character-pack/scout.png"],
  ["assets/characters/scout_archer/scout_archer-walk-anchored.png", "wechat-minigame/character-pack/scout-archer.png"],
  ["assets/characters/monk_guard/monk_guard-walk-anchored.png", "wechat-minigame/character-pack/monk-guard.png"],
  ["assets/characters/yipintang_leader/yipintang_leader-walk-anchored.png", "wechat-minigame/character-pack/yipintang-leader.png"],
  ["assets/characters/medicine_vendor/medicine_vendor-walk-anchored.png", "wechat-minigame/character-pack/vendor.png"],
  ["assets/characters/inn_keeper/inn_keeper-walk-anchored.png", "wechat-minigame/character-pack/keeper.png"],
  ["assets/generated/npcs/xiaoyao-daoist-master-spritesheet-alpha.png", "wechat-minigame/character-pack/daoist-master.png"],
  ["assets/audio/cangshan-road-mobile.m4a", "wechat-minigame/audio-pack/cangshan-road.m4a"],
  ["assets/audio/iron-fan-valley.mp3", "wechat-minigame/audio-pack/iron-fan-valley.mp3"],
  ["assets/generated/videos/xiaoyao-daoist-fuyao-mobile.m4v", "wechat-minigame/video-pack/fuyao-teaching.m4v"],
  ["assets/generated/videos/fuyao-frames/fuyao-poster-portrait.png", "wechat-minigame/video-pack/fuyao-poster.png"]
];

await rm(path.join(root, "wechat-minigame/assets"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/asset-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/map-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-west-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-east-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/room-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-map-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/character-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/audio-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/battle-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/video-pack"), { recursive: true, force: true });

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

const worldMapSource = path.join(root, "assets/generated/wechat-world-map/wuxia-world-map-portrait-imagegen.png");
const worldMapTarget = path.join(root, "wechat-minigame/world-map-pack/world-map.png");
await mkdir(path.dirname(worldMapTarget), { recursive: true });
await sharp(worldMapSource)
  .resize({ width: 780, height: 1688, fit: "cover", position: "attention" })
  .modulate({ saturation: 0.96, brightness: 0.86 })
  .png({ palette: true, quality: 88, compressionLevel: 9 })
  .toFile(worldMapTarget);

const roomVariants = [
  ["assets/generated/wechat-rooms/apothecary-room-imagegen.png", "apothecary-room.png"],
  ["assets/generated/wechat-rooms/teahouse-room-imagegen.png", "teahouse-room.png"]
];
for (const [source, filename] of roomVariants) {
  await sharp(path.join(root, source))
    .resize({ width: 1280, height: 768, fit: "cover", position: "attention" })
    .png({ palette: true, quality: 92, compressionLevel: 9 })
    .toFile(path.join(root, "wechat-minigame/room-pack", filename));
}

const battleMaps = [
  ["assets/generated/wechat-battle-maps/temple-courtyard-battle-imagegen.png", "battle-temple.png"],
  ["assets/generated/wechat-battle-maps/ferry-dock-battle-imagegen.png", "battle-ferry.png"],
  ["assets/generated/wechat-battle-maps/bamboo-clearing-battle-imagegen.png", "battle-bamboo.png"]
];
for (const [source, filename] of battleMaps) {
  const target = path.join(root, "wechat-minigame/battle-pack", filename);
  await mkdir(path.dirname(target), { recursive: true });
  await sharp(path.join(root, source))
    .resize({ width: 780, height: 1120, fit: "cover", position: "attention" })
    .modulate({ saturation: 0.82, brightness: 0.82 })
    .png({ palette: true, quality: 90, compressionLevel: 9 })
    .toFile(target);
}

await writeHitSfx(path.join(root, "wechat-minigame/audio-pack/hit.wav"));
await writeToneSfx(path.join(root, "wechat-minigame/audio-pack/stun.wav"), { type: "stun" });
await writeToneSfx(path.join(root, "wechat-minigame/audio-pack/heal.wav"), { type: "heal" });
await writeToneSfx(path.join(root, "wechat-minigame/audio-pack/sweep.wav"), { type: "sweep" });

for (const pack of ["world-west-pack", "world-east-pack", "world-map-pack", "room-pack", "character-pack", "audio-pack", "battle-pack", "video-pack"]) {
  await writeFile(path.join(root, "wechat-minigame", pack, "game.js"), "module.exports = {};\n");
}

console.log(`Prepared ${files.length + 9} compressed runtime assets.`);

async function writeHitSfx(target) {
  await mkdir(path.dirname(target), { recursive: true });
  const sampleRate = 22050;
  const duration = 0.18;
  const samples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index += 1) {
    const t = index / sampleRate;
    const envelope = Math.exp(-t * 18);
    const tone = Math.sin(Math.PI * 2 * (180 - t * 320) * t) * 0.75 + deterministicNoise(index, 11) * 0.25;
    const value = Math.max(-1, Math.min(1, tone * envelope));
    data.writeInt16LE(Math.round(value * 32767), index * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  await writeFile(target, Buffer.concat([header, data]));
}

async function writeToneSfx(target, { type }) {
  await mkdir(path.dirname(target), { recursive: true });
  const sampleRate = 22050;
  const duration = type === "heal" ? 0.42 : 0.28;
  const samples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index += 1) {
    const t = index / sampleRate;
    const envelope = Math.exp(-t * (type === "heal" ? 4.8 : 9.5));
    let value = 0;
    if (type === "stun") {
      value = (Math.sin(Math.PI * 2 * 620 * t) + Math.sin(Math.PI * 2 * 760 * t)) * 0.22 * envelope;
    } else if (type === "heal") {
      value = (Math.sin(Math.PI * 2 * 420 * t) + Math.sin(Math.PI * 2 * 630 * t) * 0.65) * 0.25 * envelope;
    } else {
      value = (Math.sin(Math.PI * 2 * (230 + t * 520) * t) * 0.52 + deterministicNoise(index, 61) * 0.18) * envelope;
    }
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), index * 2);
  }
  await writeFile(target, Buffer.concat([wavHeader(data.length, sampleRate), data]));
}

function wavHeader(dataLength, sampleRate) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

function deterministicNoise(index, salt) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return (value - Math.floor(value)) * 2 - 1;
}
