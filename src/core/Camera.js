export class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
  }

  follow(target, world) {
    this.x = clamp(target.x - this.width / 2, 0, Math.max(0, world.width - this.width));
    this.y = clamp(target.y - this.height / 2, 0, Math.max(0, world.height - this.height));
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
