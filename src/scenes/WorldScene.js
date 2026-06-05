import { assets } from "../assets/assetManifest.js";
import { MapManager } from "../maps/MapManager.js";
import { MapRenderer } from "../maps/MapRenderer.js";
import { CollisionSystem } from "../maps/CollisionSystem.js";
import { Player } from "../entities/Player.js";

export class WorldScene {
  constructor(context, input, camera) {
    this.context = context;
    this.input = input;
    this.camera = camera;
  }

  async load() {
    this.map = await new MapManager(assets.maps.world).load();
    this.renderer = new MapRenderer(this.context, this.map, this.camera);
    this.collision = new CollisionSystem(this.map);
    const heroSheet = await loadImage(assets.sprites.hero.sheet);
    this.player = new Player(assets.sprites.hero, heroSheet);
  }

  update(dt) {
    this.player.update(dt, this.input, this.collision);
    this.camera.follow(this.player, this.map);
    this.activeTrigger = this.map.triggerAt(this.player);
  }

  render() {
    this.context.clearRect(0, 0, this.camera.width, this.camera.height);
    this.renderer.drawBase();
    this.player.draw(this.context, this.camera);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}
