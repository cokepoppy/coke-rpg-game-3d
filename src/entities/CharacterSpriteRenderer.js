const DIRECTIONS = ["down", "left", "right", "up"];

export class CharacterSpriteRenderer {
  constructor(sprites = new Map()) {
    this.sprites = sprites;
  }

  setSprites(sprites) {
    this.sprites = sprites;
  }

  draw(context, spriteId, { x, y, direction = "down", frame = 0, alpha = 1, acted = false }) {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return false;
    const { config, image } = sprite;
    const row = Math.max(0, DIRECTIONS.indexOf(direction));
    const col = frame % config.framesPerDirection;
    const drawWidth = config.drawWidth || 88;
    const drawHeight = config.drawHeight || 88;
    context.save();
    context.globalAlpha = alpha;
    context.imageSmoothingEnabled = false;
    context.drawImage(
      image,
      col * config.frameWidth,
      row * config.frameHeight,
      config.frameWidth,
      config.frameHeight,
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
