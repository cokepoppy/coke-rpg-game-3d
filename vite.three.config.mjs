import { resolve } from 'node:path';

export default {
  base: './',
  build: {
    outDir: 'dist-threejs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        game: resolve(process.cwd(), 'threejs-rpg.html'),
        worldPreview: resolve(process.cwd(), 'threejs-world.html')
      }
    }
  }
};
