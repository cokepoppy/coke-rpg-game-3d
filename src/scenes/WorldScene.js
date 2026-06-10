import { assets } from "../assets/assetManifest.js";
import { MapTransitionManager } from "../maps/MapTransitionManager.js";
import { NpcMarkerRenderer } from "../entities/NpcMarkerRenderer.js";
import { Player } from "../entities/Player.js";
import { BattleManager } from "../battle/BattleManager.js";
import { GameState } from "../story/GameState.js";
import { ScriptRunner } from "../story/ScriptRunner.js";
import { storyScripts } from "../story/storyScripts.js";
import { BattleScene } from "../tactics/BattleScene.js";
import { loadCharacterSprites } from "../assets/characterLoader.js";
import { InventoryManager } from "../inventory/InventoryManager.js";
import { InventoryPanel } from "../ui/InventoryPanel.js";
import { ShopPanel } from "../ui/ShopPanel.js";

export class WorldScene {
  constructor(context, input, camera, dialogBox) {
    this.context = context;
    this.input = input;
    this.camera = camera;
    this.dialogBox = dialogBox;
    this.state = new GameState();
    this.inventory = new InventoryManager(this.state);
    this.inventoryPanel = new InventoryPanel(document.querySelector("#inventory-ui"), this.inventory);
    this.shopPanel = new ShopPanel(document.querySelector("#shop-ui"), this.inventory);
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
    await this.loadNpcSprites();
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
    if (this.input.consume("escape")) {
      if (this.inventoryPanel.opened) this.inventoryPanel.close();
      if (this.shopPanel.opened) this.shopPanel.close();
    }
    if (!this.scriptRunner?.running && !this.shopPanel.opened && (this.input.consume("b") || this.input.consume("i"))) {
      this.inventoryPanel.toggle();
    }
    if (this.inventoryPanel.opened || this.shopPanel.opened) return;
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
    this.activeTrigger = this.map.triggerAt(this.player.bounds);
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
    this.drawInteractionHint();
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
    if (result?.kind === "shop-requested") {
      await this.openShop(result.shopId);
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
    await this.loadNpcSprites();
    this.camera.follow(this.player, this.map);
  }

  async loadNpcSprites() {
    const ids = (assets.maps[this.mapId]?.npcs || []).map((npc) => npc.spriteId || npc.id);
    this.npcRenderer.setSprites(await loadCharacterSprites(ids));
  }

  async startBattle(result) {
    this.state.remember(`遭遇战：${result.enemyId}`);
    this.battleScene = new BattleScene({
      context: this.context,
      config: result.battle,
      onFinish: async (outcome) => {
        if (outcome === "victory") {
          const rewards = result.battle.rewards || {};
          for (const flag of rewards.flags || []) this.state.setFlag(flag);
          for (const item of rewards.items || []) this.state.addItem(item.itemId, item.amount);
          if (rewards.money) this.state.addMoney(rewards.money);
          if (rewards.memory) this.state.remember(rewards.memory);
        }
        this.battleScene = null;
        this.camera.follow(this.player, this.map);
        if (outcome === "victory") {
          await this.dialogBox.show({
            speaker: "战斗",
            text: "敌人已经败退。你整理气息，回到大理城外继续探索。",
            choices: [{ label: "回到大地图" }]
          });
          this.dialogBox.hide();
        }
        if (outcome === "defeat") {
          await this.dialogBox.show({
            speaker: "战斗",
            text: "我方全员倒下，江湖路止于此处。",
            choices: [{ label: "游戏结束" }]
          });
        }
      }
    });
    await this.battleScene.load();
  }

  async openShop(shopId) {
    await this.shopPanel.open(shopId);
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

  drawInteractionHint() {
    if (!this.activeTrigger || this.scriptRunner?.running || this.autoWalk) return;
    const text = `Enter / Space：${triggerLabel(this.activeTrigger)}`;
    const ctx = this.context;
    ctx.save();
    ctx.font = "18px Songti SC, Noto Serif SC, serif";
    const width = Math.min(520, ctx.measureText(text).width + 52);
    const x = Math.round((this.camera.width - width) / 2);
    const y = this.camera.height - 86;
    ctx.fillStyle = "rgba(25, 18, 12, 0.82)";
    ctx.strokeStyle = "rgba(238, 205, 139, 0.42)";
    ctx.lineWidth = 1;
    ctx.roundRect(x, y, width, 44, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f6ead1";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + width / 2, y + 22);
    ctx.restore();
  }
}

function triggerLabel(trigger) {
  const labels = {
    bronze_box: "查看青铜箱",
    inn_room_door: "进入客栈房间",
    enemy_scout_npc: "挑战一品堂暗哨",
    encounter_grass: "查看草丛动静",
    training_yard: "进入演武场",
    medicine_market: "询问药摊老人",
    main_temple: "拜访天龙寺",
    boss_gate: "调查石门"
  };
  return labels[trigger.name] || "交互";
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}
