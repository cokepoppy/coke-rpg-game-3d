import { assets } from "../assets/assetManifest.js";
import { MapTransitionManager } from "../maps/MapTransitionManager.js";
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
    this.mapTransitions = new MapTransitionManager(context, camera);
    this.autoWalk = null;
    this.lastScriptResult = null;
  }

  async load() {
    const world = await this.mapTransitions.load("world", "start");
    this.mapId = world.id;
    this.map = world.map;
    this.renderer = world.renderer;
    this.collision = world.collision;
    const heroSheet = await loadImage(assets.sprites.hero.sheet);
    this.player = new Player(assets.sprites.hero, heroSheet);
    this.player.x = world.spawn.x;
    this.player.y = world.spawn.y;
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
    if (result?.kind === "map-transition") {
      await this.enterMap(result.mapId, result.spawn);
    }
    return result;
  }

  async enterMap(mapId, spawnId) {
    const next = await this.mapTransitions.load(mapId, spawnId);
    this.mapId = next.id;
    this.map = next.map;
    this.renderer = next.renderer;
    this.collision = next.collision;
    this.player.x = next.spawn.x;
    this.player.y = next.spawn.y;
    this.autoWalk = null;
    this.camera.follow(this.player, this.map);
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
