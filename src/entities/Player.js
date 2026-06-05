import { PLAYER_SPEED } from "../config/constants.js";
import { SpriteAnimator } from "./SpriteAnimator.js";

export class Player {
  constructor(spriteConfig, sheet) {
    this.x = 640;
    this.y = 640;
    this.width = 48;
    this.height = 56;
    this.direction = "down";
    this.sheet = sheet;
    this.animator = new SpriteAnimator(spriteConfig);
  }

  update(dt, input, collision) {
    const axis = input.axis();
    const moving = axis.x !== 0 || axis.y !== 0;
    if (axis.x < 0) this.direction = "left";
    if (axis.x > 0) this.direction = "right";
    if (axis.y < 0) this.direction = "up";
    if (axis.y > 0) this.direction = "down";

    const length = Math.hypot(axis.x, axis.y) || 1;
    const next = {
      x: this.x + (axis.x / length) * PLAYER_SPEED * dt,
      y: this.y + (axis.y / length) * PLAYER_SPEED * dt,
      width: this.width,
      height: this.height
    };
    if (!collision || collision.canMove(next)) {
      this.x = next.x;
      this.y = next.y;
    }
    this.animator.update(dt, moving);
  }

  draw(context, camera) {
    const source = this.animator.sourceRect(this.direction);
    const drawWidth = this.animator.config.drawWidth || 64;
    const drawHeight = this.animator.config.drawHeight || 64;
    context.drawImage(
      this.sheet,
      source.x,
      source.y,
      source.width,
      source.height,
      Math.round(this.x - camera.x - drawWidth / 2),
      Math.round(this.y - camera.y - drawHeight * 0.86),
      drawWidth,
      drawHeight
    );
  }
}
