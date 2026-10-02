import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const copies = [
  ['assets/generated/threejs-wuxia/world/cangshan-world.glb', 'dist-threejs/assets/generated/threejs-wuxia/world/cangshan-world.glb'],
  ['assets/generated/threejs-wuxia/world/cangshan-inn-interior.glb', 'dist-threejs/assets/generated/threejs-wuxia/world/cangshan-inn-interior.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-pants-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-pants-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-prototype-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-prototype-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-prototype-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-prototype-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v2-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v2-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v3-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v3-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v4-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v4-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v5-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v5-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v6-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v6-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v7-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v7-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v8-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v8-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v9-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v9-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v10-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v10-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v11-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v11-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v12-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v12-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v13-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v13-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v14-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v14-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v15-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v15-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v16-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v16-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v17-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/shen-linchuan-proportion-v2-hunyuan-island-rig-zelda-walk-review-v17-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/su-luo-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/su-luo-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/yunlai-inn-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/yunlai-inn-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/autumn-maple-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/autumn-maple-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/cangshan-paifang-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/cangshan-paifang-game-ready.glb'],
  ['assets/generated/threejs-wuxia/models/hundred-herbs-pharmacy-game-ready.glb', 'dist-threejs/assets/generated/threejs-wuxia/models/hundred-herbs-pharmacy-game-ready.glb'],
  ['assets/generated/threejs-wuxia/source/cangshan-opening-3dgs.ply', 'dist-threejs/assets/generated/threejs-wuxia/source/cangshan-opening-3dgs.ply'],
  ['assets/generated/hunyuan-references/shen-linchuan-pants-reference.png', 'dist-threejs/assets/generated/hunyuan-references/shen-linchuan-pants-reference.png'],
  ['assets/generated/hunyuan-references/shen-linchuan-pants-reference-v2.png', 'dist-threejs/assets/generated/hunyuan-references/shen-linchuan-pants-reference-v2.png']
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
