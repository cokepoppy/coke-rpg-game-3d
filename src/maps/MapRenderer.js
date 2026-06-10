export class MapRenderer {
  constructor(context, map, camera) {
    this.context = context;
    this.map = map;
    this.camera = camera;
  }

  drawBase() {
    this.context.imageSmoothingEnabled = false;
    this.context.drawImage(
      this.map.image,
      this.camera.x,
      this.camera.y,
      this.camera.width,
      this.camera.height,
      0,
      0,
      this.camera.width,
      this.camera.height
    );
  }

  drawOcclusion() {
    for (const rect of this.map.occlusion || []) {
      this.drawMapRect(rect);
    }
  }

  drawDebugCollision() {
    const ctx = this.context;
    ctx.save();
    ctx.lineWidth = 2;
    for (const rect of this.map.collision || []) {
      this.strokeWorldRect(rect, "rgba(255, 80, 80, 0.8)");
    }
    for (const rect of this.map.triggers || []) {
      this.strokeWorldRect(rect, "rgba(80, 180, 255, 0.8)");
    }
    for (const rect of this.map.occlusion || []) {
      this.strokeWorldRect(rect, "rgba(255, 220, 80, 0.8)");
    }
    ctx.restore();
  }

  drawMapRect(rect) {
    const x = Math.max(rect.x, this.camera.x);
    const y = Math.max(rect.y, this.camera.y);
    const right = Math.min(rect.x + rect.width, this.camera.x + this.camera.width);
    const bottom = Math.min(rect.y + rect.height, this.camera.y + this.camera.height);
    const width = right - x;
    const height = bottom - y;
    if (width <= 0 || height <= 0) return;
    this.context.drawImage(this.map.image, x, y, width, height, x - this.camera.x, y - this.camera.y, width, height);
  }

  strokeWorldRect(rect, color) {
    const x = rect.x - this.camera.x;
    const y = rect.y - this.camera.y;
    if (x + rect.width < 0 || y + rect.height < 0 || x > this.camera.width || y > this.camera.height) return;
    this.context.strokeStyle = color;
    this.context.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, rect.width, rect.height);
  }
}
