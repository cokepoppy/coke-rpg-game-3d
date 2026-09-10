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
    context.save();
    context.beginPath();
    context.rect(playRect.x, playRect.y, playRect.width, playRect.height);
    context.clip();
    context.translate(playRect.x, playRect.y);
    if (this.map.images) {
      for (const layer of this.map.images) {
        context.drawImage(this.images[layer.id], Math.round(layer.x - camera.x), Math.round(layer.y - camera.y));
      }
    } else {
      context.drawImage(this.images[this.map.image], -Math.round(camera.x), -Math.round(camera.y));
    }
    context.restore();
  }

  drawOcclusions(context, camera, playRect) {
    if (!this.map.occlusions?.length) return;
    context.save();
    context.beginPath();
    context.rect(playRect.x, playRect.y, playRect.width, playRect.height);
    context.clip();
    context.translate(playRect.x, playRect.y);
    for (const rect of this.map.occlusions) this.drawMapRect(context, camera, rect);
    context.restore();
  }

  drawMapRect(context, camera, rect) {
    if (this.map.images) {
      for (const layer of this.map.images) {
        const image = this.images[layer.id];
        if (!image) continue;
        const left = Math.max(rect.x, layer.x);
        const top = Math.max(rect.y, layer.y);
        const right = Math.min(rect.x + rect.width, layer.x + image.width);
        const bottom = Math.min(rect.y + rect.height, layer.y + image.height);
        if (right <= left || bottom <= top) continue;
        context.drawImage(
          image,
          left - layer.x,
          top - layer.y,
          right - left,
          bottom - top,
          left - camera.x,
          top - camera.y,
          right - left,
          bottom - top
        );
      }
      return;
    }
    const image = this.images[this.map.image];
    if (!image) return;
    const left = Math.max(rect.x, 0);
    const top = Math.max(rect.y, 0);
    const right = Math.min(rect.x + rect.width, image.width);
    const bottom = Math.min(rect.y + rect.height, image.height);
    if (right <= left || bottom <= top) return;
    context.drawImage(image, left, top, right - left, bottom - top, left - camera.x, top - camera.y, right - left, bottom - top);
  }

  drawDebug(context, camera, playRect) {
    const tile = 64;
    context.save();
    context.beginPath();
    context.rect(playRect.x, playRect.y, playRect.width, playRect.height);
    context.clip();
    context.translate(playRect.x - camera.x, playRect.y - camera.y);
    context.lineWidth = 1;
    context.strokeStyle = "rgba(245, 234, 208, 0.28)";
    const startX = Math.floor(camera.x / tile) * tile;
    const endX = camera.x + playRect.width;
    const startY = Math.floor(camera.y / tile) * tile;
    const endY = camera.y + playRect.height;
    for (let x = startX; x <= endX; x += tile) {
      context.beginPath();
      context.moveTo(x + 0.5, camera.y);
      context.lineTo(x + 0.5, endY);
      context.stroke();
    }
    for (let y = startY; y <= endY; y += tile) {
      context.beginPath();
      context.moveTo(camera.x, y + 0.5);
      context.lineTo(endX, y + 0.5);
      context.stroke();
    }
    for (const wall of this.map.collisions || []) {
      context.fillStyle = "rgba(220, 54, 42, 0.30)";
      context.strokeStyle = "rgba(255, 78, 64, 0.92)";
      context.fillRect(wall.x, wall.y, wall.width, wall.height);
      context.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.width, wall.height);
    }
    for (const mask of this.map.occlusions || []) {
      context.fillStyle = "rgba(255, 220, 80, 0.18)";
      context.strokeStyle = "rgba(255, 220, 80, 0.92)";
      context.fillRect(mask.x, mask.y, mask.width, mask.height);
      context.strokeRect(mask.x + 0.5, mask.y + 0.5, mask.width, mask.height);
    }
    for (const trigger of this.map.triggers || []) {
      context.fillStyle = "rgba(72, 164, 255, 0.24)";
      context.strokeStyle = "rgba(104, 190, 255, 0.92)";
      context.fillRect(trigger.x, trigger.y, trigger.width, trigger.height);
      context.strokeRect(trigger.x + 0.5, trigger.y + 0.5, trigger.width, trigger.height);
    }
    context.restore();
  }
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

module.exports = { MapManager };
