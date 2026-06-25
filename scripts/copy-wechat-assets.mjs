import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const files = [
  ["maps/dali-inn-room/dali-inn-room-rendered.png", "wechat-minigame/room-pack/inn-room.png"],
  ["assets/generated/wechat-moon-valley/moon-valley-medicine-hall-runtime.png", "wechat-minigame/room-pack/moon-valley-medicine-hall.png"],
  ["assets/generated/wechat-moon-valley/moon-valley-study-runtime.png", "wechat-minigame/room-pack/moon-valley-study.png"],
  ["assets/characters/hero/hero-walk-anchored-v4-motionfix.png", "wechat-minigame/character-pack/hero.png"],
  ["assets/characters/hero/hero-attack-runtime-v1.png", "wechat-minigame/character-pack/hero-attack.png"],
  ["assets/characters/a_luo/a_luo-walk-anchored.png", "wechat-minigame/character-pack/companion.png"],
  ["assets/characters/masked_scout/masked_scout-walk-anchored.png", "wechat-minigame/character-pack/scout.png"],
  ["assets/characters/scout_archer/scout_archer-walk-anchored.png", "wechat-minigame/character-pack/scout-archer.png"],
  ["assets/characters/monk_guard/monk_guard-walk-anchored.png", "wechat-minigame/character-pack/monk-guard.png"],
  ["assets/characters/yipintang_leader/yipintang_leader-walk-anchored.png", "wechat-minigame/character-pack/yipintang-leader.png"],
  ["assets/characters/medicine_vendor/medicine_vendor-walk-anchored.png", "wechat-minigame/character-pack/vendor.png"],
  ["assets/characters/inn_keeper/inn_keeper-walk-anchored.png", "wechat-minigame/character-pack/keeper.png"],
  ["assets/generated/npcs/xiaoyao-daoist-master-spritesheet-alpha.png", "wechat-minigame/character-pack/daoist-master.png"],
  ["assets/characters/qin_wanyao/qin_wanyao-walk-anchored.png", "wechat-minigame/character-pack/qin-wanyao.png"],
  ["assets/characters/mu_zhiyan/mu_zhiyan-walk-anchored.png", "wechat-minigame/character-pack/mu-zhiyan.png"],
  ["assets/characters/moon_valley_disciple/moon_valley_disciple-walk-anchored.png", "wechat-minigame/character-pack/moon-valley-disciple.png"],
  ["assets/characters/moon_valley_traitor/moon_valley_traitor-walk-anchored.png", "wechat-minigame/character-pack/moon-valley-traitor.png"],
  ["assets/characters/xiao_beichen/xiao_beichen-walk-anchored.png", "wechat-minigame/character-pack/xiao-beichen.png"],
  ["assets/characters/xu_yunsheng/xu_yunsheng-walk-anchored.png", "wechat-minigame/character-pack/xu-yunsheng.png"],
  ["assets/characters/lian_zhao/lian_zhao-walk-anchored.png", "wechat-minigame/character-pack/lian-zhao.png"],
  ["assets/characters/rong_qingxuan/rong_qingxuan-walk-anchored.png", "wechat-minigame/character-pack/rong-qingxuan.png"],
  ["assets/characters/xiao_cangming/xiao_cangming-walk-anchored.png", "wechat-minigame/character-pack/xiao-cangming.png"],
  ["assets/characters/rong_jinghuai/rong_jinghuai-walk-anchored.png", "wechat-minigame/character-pack/rong-jinghuai.png"],
  ["assets/characters/wu_chenseng/wu_chenseng-walk-anchored.png", "wechat-minigame/character-pack/wu-chenseng.png"],
  ["assets/characters/shen_yuanhe/shen_yuanhe-walk-anchored.png", "wechat-minigame/character-pack/shen-yuanhe.png"],
  ["assets/audio/cangshan-road-mobile.m4a", "wechat-minigame/audio-pack/cangshan-road.m4a"],
  ["assets/audio/iron-fan-valley.mp3", "wechat-minigame/audio-pack/iron-fan-valley.mp3"],
  ["assets/generated/videos/xiaoyao-daoist-fuyao.mp4", "wechat-minigame/video-pack/fuyao-teaching.mp4"],
  ["assets/generated/videos/fuyao-frames/fuyao-poster-portrait.png", "wechat-minigame/video-pack/fuyao-poster.png"],
  ["assets/effects/sword_impact/sword-impact-runtime.png", "wechat-minigame/battle-pack/sword-impact.png"]
];

await rm(path.join(root, "wechat-minigame/assets"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/asset-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/map-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-west-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/world-east-pack"), { recursive: true, force: true });
await rm(path.join(root, "wechat-minigame/moon-valley-pack"), { recursive: true, force: true });
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

const moonValleyTarget = path.join(root, "wechat-minigame/moon-valley-pack/moon-valley.png");
await mkdir(path.dirname(moonValleyTarget), { recursive: true });
await sharp(path.join(root, "assets/generated/wechat-moon-valley/moon-valley-map-runtime.png"))
  .resize({ width: 780, height: 1688, fit: "cover", position: "attention" })
  .modulate({ saturation: 0.94, brightness: 0.88 })
  .png({ palette: true, quality: 90, compressionLevel: 9 })
  .toFile(moonValleyTarget);

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
await writeUiSfx(path.join(root, "wechat-minigame/audio-pack/ui.wav"), { type: "ui" });
await writeUiSfx(path.join(root, "wechat-minigame/audio-pack/prompt.wav"), { type: "prompt" });
await writeUiSfx(path.join(root, "wechat-minigame/audio-pack/buy.wav"), { type: "buy" });
await writeUiSfx(path.join(root, "wechat-minigame/audio-pack/wait.wav"), { type: "wait" });

for (const pack of ["world-west-pack", "world-east-pack", "world-map-pack", "moon-valley-pack", "room-pack", "character-pack", "audio-pack", "battle-pack", "video-pack"]) {
  await writeFile(path.join(root, "wechat-minigame", pack, "game.js"), "module.exports = {};\n");
}

console.log(`Prepared ${files.length + 14} compressed runtime assets.`);

async function writeHitSfx(target) {
  await mkdir(path.dirname(target), { recursive: true });
  const sampleRate = 44100;
  const duration = 0.42;
  const samples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(samples * 2);
  let seed = 1234567;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff * 2 - 1;
  };
  const envelope = (t, attack, decay) => {
    if (t < attack) return t / attack;
    return Math.exp(-(t - attack) / decay);
  };
  for (let index = 0; index < samples; index += 1) {
    const t = index / sampleRate;
    const slashEnv = envelope(t, 0.006, 0.075);
    const hitEnv = t > 0.075 ? envelope(t - 0.075, 0.002, 0.055) : 0;
    const tailEnv = t > 0.11 ? envelope(t - 0.11, 0.004, 0.12) : 0;
    const highNoise = random() * slashEnv * 0.72;
    const blade = Math.sin(Math.PI * 2 * (1850 - t * 1800) * t) * slashEnv * 0.46;
    const crack = (random() * 0.8 + Math.sin(Math.PI * 2 * 720 * t) * 0.55) * hitEnv * 0.92;
    const thump = Math.sin(Math.PI * 2 * 92 * t) * tailEnv * 0.55;
    const click = t > 0.072 && t < 0.09 ? random() * 0.95 : 0;
    const value = Math.max(-1, Math.min(1, highNoise + blade + crack + thump + click));
    data.writeInt16LE(Math.round(value * 32767 * 0.9), index * 2);
  }
  await writeFile(target, Buffer.concat([wavHeader(data.length, sampleRate), data]));
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

async function writeUiSfx(target, { type }) {
  await mkdir(path.dirname(target), { recursive: true });
  const sampleRate = 22050;
  const duration = type === "buy" ? 0.32 : type === "prompt" ? 0.24 : 0.16;
  const samples = Math.floor(sampleRate * duration);
  const data = Buffer.alloc(samples * 2);
  for (let index = 0; index < samples; index += 1) {
    const t = index / sampleRate;
    let value = 0;
    if (type === "ui") {
      const envelope = Math.exp(-t * 22);
      value = (Math.sin(Math.PI * 2 * 640 * t) * 0.4 + Math.sin(Math.PI * 2 * 960 * t) * 0.18) * envelope;
    } else if (type === "prompt") {
      const e1 = Math.exp(-t * 15);
      const e2 = t > 0.075 ? Math.exp(-(t - 0.075) * 18) : 0;
      value = Math.sin(Math.PI * 2 * 720 * t) * 0.24 * e1 + Math.sin(Math.PI * 2 * 1080 * t) * 0.22 * e2;
    } else if (type === "buy") {
      const e1 = Math.exp(-t * 9);
      const e2 = t > 0.09 ? Math.exp(-(t - 0.09) * 10) : 0;
      const e3 = t > 0.18 ? Math.exp(-(t - 0.18) * 12) : 0;
      value = Math.sin(Math.PI * 2 * 660 * t) * 0.24 * e1
        + Math.sin(Math.PI * 2 * 880 * t) * 0.22 * e2
        + Math.sin(Math.PI * 2 * 1320 * t) * 0.18 * e3;
    } else {
      const envelope = Math.exp(-t * 14);
      value = Math.sin(Math.PI * 2 * 260 * t) * 0.28 * envelope + deterministicNoise(index, 91) * 0.05 * envelope;
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
