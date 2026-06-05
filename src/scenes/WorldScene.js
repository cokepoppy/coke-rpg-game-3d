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
    this.autoWalk = null;
    this.lastScriptResult = null;
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
    window.__rpgScene = this;
    queueMicrotask(() => this.runScript("opening"));
  }

  update(dt) {
    if (this.scriptRunner?.running) return;
    if (this.autoWalk) {
      const arrived = this.player.stepToward(this.autoWalk.target, dt, this.autoWalk.speed);
      if (arrived) {
        const done = this.autoWalk.resolve;
        this.autoWalk = null;
        done();
      }
    } else {
      this.player.update(dt, this.input, this.collision);
    }
    this.camera.follow(this.player, this.map);
    this.activeTrigger = this.map.triggerAt(this.player);
    if (this.activeTrigger && (this.input.consume("enter") || this.input.consume(" "))) {
      this.runScript(this.activeTrigger.name);
    }
  }

  render() {
    this.context.clearRect(0, 0, this.camera.width, this.camera.height);
    this.renderer.drawBase();
    this.player.draw(this.context, this.camera);
  }

  async runScript(scriptId) {
    const result = await this.scriptRunner.run(scriptId);
    this.lastScriptResult = result;
    if (result?.kind === "battle-requested") {
      this.state.remember(`遭遇战：${result.enemyId}`);
    }
    return result;
  }

  walkToTrigger(name, speed = 1400) {
    const trigger = this.map.triggerByName(name);
    if (!trigger) throw new Error(`Missing trigger: ${name}`);
    return this.walkTo({
      x: trigger.x + trigger.width / 2,
      y: trigger.y + trigger.height / 2
    }, speed);
  }

  walkTo(target, speed = 1400) {
    return new Promise((resolve) => {
      this.autoWalk = { target, speed, resolve };
    });
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
