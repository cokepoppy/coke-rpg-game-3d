import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const copies = [
  ['assets/generated/threejs-wuxia/world/cangshan-world.glb', 'dist-threejs/assets/generated/threejs-wuxia/world/cangshan-world.glb'],
  ['assets/generated/threejs-wuxia/world/cangshan-inn-interior.glb', 'dist-threejs/assets/generated/threejs-wuxia/world/cangshan-inn-interior.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/su-luo-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/su-luo-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/yunlai-inn-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/yunlai-inn-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/autumn-maple-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/autumn-maple-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/cangshan-paifang-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/cangshan-paifang-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/hundred-herbs-pharmacy-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/hundred-herbs-pharmacy-game-ready.glb'],
  ['assets/generated/threejs-wuxia/source/cangshan-opening-3dgs.ply', 'dist-threejs/assets/generated/threejs-wuxia/source/cangshan-opening-3dgs.ply']
];

let copied = 0;
for (const [source, destination] of copies) {
  try {
    await stat(resolve(root, source));
    await mkdir(dirname(resolve(root, destination)), { recursive: true });
    await copyFile(resolve(root, source), resolve(root, destination));
    console.log(`Copied ${source} -> ${destination}`);
    copied++;
  } catch {
    console.log(`Skipped missing generated asset: ${source}`);
  }
}
console.log(`Included ${copied} local generated Three.js assets in dist-threejs.`);
