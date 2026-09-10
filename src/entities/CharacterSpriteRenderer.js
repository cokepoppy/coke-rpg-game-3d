const DIRECTIONS = ["down", "left", "right", "up"];

export class CharacterSpriteRenderer {
  constructor(sprites = new Map()) {
    this.sprites = sprites;
  }

  setSprites(sprites) {
    this.sprites = sprites;
  }

  draw(context, spriteId, { x, y, direction = "down", frame = 0, alpha = 1, acted = false, sheet = "walk" }) {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return false;
    const { config, image } = sprite;
    const sourceImage = sheet === "attack" ? sprite.attackImage || image : image;
    const frameWidth = sheet === "attack" ? config.attackFrameWidth || config.frameWidth : config.frameWidth;
    const frameHeight = sheet === "attack" ? config.attackFrameHeight || config.frameHeight : config.frameHeight;
    const row = Math.max(0, DIRECTIONS.indexOf(direction));
    const col = frame % (sheet === "attack" ? config.attackFramesPerDirection || config.framesPerDirection : config.framesPerDirection);
    const drawWidth = sheet === "attack" ? config.attackDrawWidth || config.drawWidth || 88 : config.drawWidth || 88;
    const drawHeight = sheet === "attack" ? config.attackDrawHeight || config.drawHeight || 88 : config.drawHeight || 88;
    context.save();
    context.globalAlpha = alpha;
    context.imageSmoothingEnabled = false;
    context.drawImage(
      sourceImage,
      col * frameWidth,
      row * frameHeight,
      frameWidth,
      frameHeight,
      Math.round(x - drawWidth / 2),
      Math.round(y - drawHeight * 0.82),
      drawWidth,
      drawHeight
    );
    if (acted) {
      context.fillStyle = "rgba(0, 0, 0, 0.34)";
      context.beginPath();
      context.arc(x, y - drawHeight * 0.32, Math.max(24, drawWidth * 0.34), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    return true;
  }
}
