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
}
