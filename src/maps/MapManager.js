import { TILE_SIZE } from "../config/constants.js";

export class MapManager {
  constructor(asset) {
    this.asset = asset;
    this.data = null;
    this.image = null;
    this.tileSize = TILE_SIZE;
    this.triggers = [];
    this.collision = [];
    this.occlusion = [];
    this.spawns = asset.spawns || {};
  }

  async load() {
    const [data, image] = await Promise.all([loadJson(this.asset.json), loadImage(this.asset.image)]);
    this.data = data;
    this.image = image;
    this.width = data.width * this.tileSize;
    this.height = data.height * this.tileSize;
    this.triggers = [...objectsByType(data, "trigger"), ...normalizeObjects(this.asset.triggers || [])];
    this.collision = [
      ...objectsByType(data, "collision"),
      ...objectsByTypes(data, this.asset.collisionTypes || []),
      ...normalizeObjects(this.asset.collision || [])
    ];
    this.occlusion = [...objectsByType(data, "occlusion"), ...normalizeObjects(this.asset.occlusion || [])];
    return this;
  }

  objectLayer(name) {
    return this.data.layers.find((layer) => layer.type === "objectgroup" && layer.name === name);
  }

  triggerByName(name) {
    return this.triggers.find((trigger) => trigger.name === name);
  }

  triggerAt(rect) {
    return nearestTrigger(rect, this.triggers.filter((trigger) => intersects(rect, trigger)));
  }

  triggerNear(rect, margin = 64) {
    const expanded = {
      x: rect.x - margin,
      y: rect.y - margin,
      width: rect.width + margin * 2,
      height: rect.height + margin * 2
    };
    return nearestTrigger(rect, this.triggers.filter((trigger) => intersects(expanded, trigger)));
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

function objectsByTypes(data, types) {
  const wanted = new Set(types);
  if (!wanted.size) return [];
  return data.layers
    .filter((layer) => layer.type === "objectgroup")
    .flatMap((layer) => layer.objects || [])
    .filter((object) => wanted.has(object.type));
}

function normalizeObjects(objects) {
  return objects.map((object) => ({
    ...object,
    width: object.width ?? object.w,
    height: object.height ?? object.h
  }));
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function nearestTrigger(rect, triggers) {
  if (!triggers.length) return null;
  const center = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2
  };
  return triggers
    .map((trigger) => ({
      trigger,
      distance: Math.hypot(center.x - (trigger.x + trigger.width / 2), center.y - (trigger.y + trigger.height / 2))
    }))
    .sort((a, b) => a.distance - b.distance)[0].trigger;
}
