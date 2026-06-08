import { assets } from "../assets/assetManifest.js";
import { MapTransitionManager } from "../maps/MapTransitionManager.js";
import { NpcMarkerRenderer } from "../entities/NpcMarkerRenderer.js";
import { Player } from "../entities/Player.js";
import { BattleManager } from "../battle/BattleManager.js";
import { GameState } from "../story/GameState.js";
import { ScriptRunner } from "../story/ScriptRunner.js";
import { storyScripts } from "../story/storyScripts.js";
import { BattleScene } from "../tactics/BattleScene.js";

export class WorldScene {
  constructor(context, input, camera, dialogBox) {
    this.context = context;
    this.input = input;
    this.camera = camera;
    this.dialogBox = dialogBox;
    this.state = new GameState();
    this.battleManager = new BattleManager();
    this.mapTransitions = new MapTransitionManager(context, camera);
    this.npcRenderer = new NpcMarkerRenderer(context);
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
    if (this.battleScene?.active) {
      this.battleScene.update(dt);
      return;
    }
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
    if (this.battleScene?.active) {
      this.battleScene.render();
      return;
    }
    this.context.clearRect(0, 0, this.camera.width, this.camera.height);
    this.renderer.drawBase();
    this.npcRenderer.draw(assets.maps[this.mapId]?.npcs || [], this.camera);
    this.player.draw(this.context, this.camera);
  }

  async runScript(scriptId) {
    const result = await this.scriptRunner.run(scriptId);
    this.lastScriptResult = result;
    if (result?.kind === "battle-requested") {
      await this.startBattle(result);
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

  async startBattle(result) {
    this.state.remember(`遭遇战：${result.enemyId}`);
    this.battleScene = new BattleScene({
      context: this.context,
      config: result.battle,
      onFinish: (outcome) => {
        if (outcome === "victory") {
          const rewards = result.battle.rewards || {};
          for (const flag of rewards.flags || []) this.state.setFlag(flag);
          for (const item of rewards.items || []) this.state.addItem(item.itemId, item.amount);
          if (rewards.memory) this.state.remember(rewards.memory);
        }
        this.battleScene = null;
        this.camera.follow(this.player, this.map);
      }
    });
    await this.battleScene.load();
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
