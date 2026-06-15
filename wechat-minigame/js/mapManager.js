const { MAPS } = require("./config");

class MapManager {
  constructor(images, viewport) {
    this.images = images;
    this.viewport = viewport;
    this.enter("world");
  }

  enter(id) {
    this.map = MAPS[id];
    this.id = id;
    return this.map.spawn;
  }

  canMove(bounds) {
    if (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > this.map.width || bounds.y + bounds.height > this.map.height) return false;
    return !this.map.collisions.some((wall) => intersects(bounds, wall));
  }

  nearby(bounds, margin = 72) {
    const expanded = { x: bounds.x - margin, y: bounds.y - margin, width: bounds.width + margin * 2, height: bounds.height + margin * 2 };
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    return this.map.triggers
      .filter((trigger) => intersects(expanded, trigger))
      .map((trigger) => ({
        trigger,
        distance: Math.hypot(center.x - (trigger.x + trigger.width / 2), center.y - (trigger.y + trigger.height / 2))
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.trigger || null;
  }

  cameraFor(player, playRect) {
    return {
      x: clamp(player.x - playRect.width / 2, 0, Math.max(0, this.map.width - playRect.width)),
      y: clamp(player.y - playRect.height / 2, 0, Math.max(0, this.map.height - playRect.height))
    };
  }

  draw(context, camera, playRect) {
    const image = this.images[this.map.image];
    context.save();
    context.beginPath();
    context.rect(playRect.x, playRect.y, playRect.width, playRect.height);
    context.clip();
    context.translate(playRect.x, playRect.y);
    context.drawImage(image, -Math.round(camera.x), -Math.round(camera.y));
    context.restore();
  }
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

module.exports = { MapManager };
