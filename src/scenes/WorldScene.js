import { assets } from "../assets/assetManifest.js";
import { MapManager } from "../maps/MapManager.js";
import { MapRenderer } from "../maps/MapRenderer.js";
import { CollisionSystem } from "../maps/CollisionSystem.js";
import { Player } from "../entities/Player.js";
import { BattleManager } from "../battle/BattleManager.js";
import { GameState } from "../story/GameState.js";
import { ScriptRunner } from "../story/ScriptRunner.js";
import { storyScripts } from "../story/storyScripts.js";

export class WorldScene {
  constructor(context, input, camera, dialogBox) {
    this.context = context;
    this.input = input;
    this.camera = camera;
    this.dialogBox = dialogBox;
    this.state = new GameState();
    this.battleManager = new BattleManager();
  }

  async load() {
    this.map = await new MapManager(assets.maps.world).load();
    this.renderer = new MapRenderer(this.context, this.map, this.camera);
    this.collision = new CollisionSystem(this.map);
    const heroSheet = await loadImage(assets.sprites.hero.sheet);
    this.player = new Player(assets.sprites.hero, heroSheet);
    this.scriptRunner = new ScriptRunner({
      scripts: storyScripts,
      dialogBox: this.dialogBox,
      gameState: this.state,
      battleManager: this.battleManager
    });
    queueMicrotask(() => this.scriptRunner.run("opening"));
  }

  update(dt) {
    if (this.scriptRunner?.running) return;
    this.player.update(dt, this.input, this.collision);
    this.camera.follow(this.player, this.map);
    this.activeTrigger = this.map.triggerAt(this.player);
    if (this.activeTrigger && (this.input.consume("enter") || this.input.consume(" "))) {
      this.scriptRunner.run(this.activeTrigger.name);
    }
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
