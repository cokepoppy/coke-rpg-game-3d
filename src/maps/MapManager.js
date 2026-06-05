import { TILE_SIZE } from "../config/constants.js";

export class MapManager {
  constructor(asset) {
    this.asset = asset;
    this.data = null;
    this.image = null;
    this.tileSize = TILE_SIZE;
    this.triggers = [];
    this.collision = [];
  }

  async load() {
    const [data, image] = await Promise.all([loadJson(this.asset.json), loadImage(this.asset.image)]);
    this.data = data;
    this.image = image;
    this.width = data.width * this.tileSize;
    this.height = data.height * this.tileSize;
    this.triggers = objectsByType(data, "trigger");
    this.collision = objectsByType(data, "collision");
    return this;
  }

  objectLayer(name) {
    return this.data.layers.find((layer) => layer.type === "objectgroup" && layer.name === name);
  }

  triggerAt(rect) {
    return this.triggers.find((trigger) => intersects(rect, trigger));
  }
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load map JSON: ${url}`);
  return response.json();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function objectsByType(data, type) {
  return data.layers
    .filter((layer) => layer.type === "objectgroup")
    .flatMap((layer) => layer.objects || [])
    .filter((object) => object.type === type);
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
