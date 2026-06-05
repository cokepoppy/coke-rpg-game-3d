export class SpriteAnimator {
  constructor(config) {
    this.config = config;
    this.elapsed = 0;
    this.frame = 1;
  }

  update(dt, moving) {
    if (!moving) {
      this.frame = 1;
      this.elapsed = 0;
      return;
    }
    this.elapsed += dt;
    if (this.elapsed > 0.14) {
      this.elapsed = 0;
      this.frame = (this.frame + 1) % this.config.framesPerDirection;
    }
  }

  sourceRect(direction) {
    const row = Math.max(0, this.config.directions.indexOf(direction));
    return {
      x: this.frame * this.config.frameWidth,
      y: row * this.config.frameHeight,
      width: this.config.frameWidth,
      height: this.config.frameHeight
    };
  }
}
