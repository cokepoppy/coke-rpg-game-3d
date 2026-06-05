import { assets } from "../assets/assetManifest.js";
import { CollisionSystem } from "./CollisionSystem.js";
import { MapManager } from "./MapManager.js";
import { MapRenderer } from "./MapRenderer.js";

export class MapTransitionManager {
  constructor(context, camera) {
    this.context = context;
    this.camera = camera;
  }

  async load(mapId, spawnId = "start") {
    const asset = assets.maps[mapId];
    if (!asset) throw new Error(`Unknown map: ${mapId}`);
    const map = await new MapManager(asset).load();
    return {
      id: mapId,
      map,
      renderer: new MapRenderer(this.context, map, this.camera),
      collision: new CollisionSystem(map),
      spawn: map.spawns[spawnId] || Object.values(map.spawns)[0] || { x: 0, y: 0 }
    };
  }
}
