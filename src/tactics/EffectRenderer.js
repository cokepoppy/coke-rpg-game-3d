export class EffectRenderer {
  constructor(effects = new Map()) {
    this.effects = effects;
  }

  draw(context, effectId, { x, y, time = 0, duration = 0.3, scale = 1 }) {
    const effect = this.effects.get(effectId);
    if (!effect) return false;
    const { config, image } = effect;
    const progress = Math.max(0, Math.min(1, 1 - time / duration));
    const frame = Math.min(config.frames - 1, Math.floor(progress * config.frames));
    const width = config.frameWidth * scale;
    const height = config.frameHeight * scale;
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(
      image,
      frame * config.frameWidth,
      0,
      config.frameWidth,
      config.frameHeight,
      Math.round(x - width / 2),
      Math.round(y - height / 2),
      width,
      height
    );
    context.restore();
    return true;
  }
}
