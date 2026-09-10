import { characters } from "./characterManifest.js";

export async function loadCharacterSprites(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const config = characters[id];
      if (!config) return null;
      try {
        const image = await loadImage(config.sheet);
        const attackImage = config.attackSheet ? await loadImage(config.attackSheet).catch(() => null) : null;
        return [id, { config, image, attackImage }];
      } catch {
        return null;
      }
    })
  );
  return new Map(entries.filter(Boolean));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load character sprite: ${url}`));
    image.src = url;
  });
}
