import { PLAYER_COLLISION_HEIGHT, PLAYER_COLLISION_WIDTH, PLAYER_SPEED } from "../config/constants.js";
import { SpriteAnimator } from "./SpriteAnimator.js";

export class Player {
  constructor(spriteConfig, sheet) {
    this.x = 640;
    this.y = 640;
    this.width = PLAYER_COLLISION_WIDTH;
    this.height = PLAYER_COLLISION_HEIGHT;
    this.direction = "down";
    this.sheet = sheet;
    this.animator = new SpriteAnimator(spriteConfig);
  }

  get bounds() {
    return {
      x: this.x - PLAYER_COLLISION_WIDTH / 2,
      y: this.y - PLAYER_COLLISION_HEIGHT,
      width: PLAYER_COLLISION_WIDTH,
      height: PLAYER_COLLISION_HEIGHT
    };
  }

  boundsAt(x, y) {
    return {
      x: x - PLAYER_COLLISION_WIDTH / 2,
      y: y - PLAYER_COLLISION_HEIGHT,
      width: PLAYER_COLLISION_WIDTH,
      height: PLAYER_COLLISION_HEIGHT
    };
  }

  update(dt, input, collision) {
    const axis = input.axis();
    const moving = axis.x !== 0 || axis.y !== 0;
    if (axis.x < 0) this.direction = "left";
    if (axis.x > 0) this.direction = "right";
    if (axis.y < 0) this.direction = "up";
    if (axis.y > 0) this.direction = "down";

    const length = Math.hypot(axis.x, axis.y) || 1;
    const nextX = this.x + (axis.x / length) * PLAYER_SPEED * dt;
    const nextY = this.y + (axis.y / length) * PLAYER_SPEED * dt;
    if (!collision || collision.canMove(this.boundsAt(nextX, nextY))) {
      this.x = nextX;
      this.y = nextY;
    }
    this.animator.update(dt, moving);
  }

  stepToward(target, dt, speed = 520, collision = null) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);
    const step = speed * dt;
    if (distance <= Math.max(8, step)) {
      this.x = target.x;
      this.y = target.y;
      this.animator.update(dt, false);
      return true;
    }
    const axis = {
      x: dx / distance,
      y: dy / distance
    };
    if (Math.abs(axis.x) > Math.abs(axis.y)) this.direction = axis.x < 0 ? "left" : "right";
    else this.direction = axis.y < 0 ? "up" : "down";
    const nextX = this.x + axis.x * step;
    const nextY = this.y + axis.y * step;
    if (!collision || collision.canMove(this.boundsAt(nextX, nextY))) {
      this.x = nextX;
      this.y = nextY;
    }
    this.animator.update(dt, true);
    return false;
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
