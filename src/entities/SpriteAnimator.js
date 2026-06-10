export class SpriteAnimator {
  constructor(config) {
    this.config = config;
    this.elapsed = 0;
    this.frame = config.idleFrame ?? 0;
    this.sequenceIndex = 0;
    this.walkSequence = config.walkSequence || [0, 1, 0, 3];
    this.frameDuration = config.frameDuration || 0.11;
  }

  update(dt, moving) {
    if (!moving) {
      this.frame = this.config.idleFrame ?? 0;
      this.elapsed = 0;
      this.sequenceIndex = 0;
      return;
    }
    this.elapsed += dt;
    if (this.elapsed > this.frameDuration) {
      this.elapsed %= this.frameDuration;
      this.sequenceIndex = (this.sequenceIndex + 1) % this.walkSequence.length;
      this.frame = this.walkSequence[this.sequenceIndex] % this.config.framesPerDirection;
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
