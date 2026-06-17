const { GAME, ASSETS, BATTLE, SCOUT_IDS, WORLD_NODES } = require("./config");
const { createSurface, loadImage, createAudio, createSfx, loadAssetPacks, readSave, writeSave } = require("./platform");
const { Player, drawSprite } = require("./player");
const { MapManager } = require("./mapManager");
const { DialogSystem } = require("./dialogSystem");
const { UiRenderer } = require("./uiRenderer");
const { BattleScene } = require("./battleScene");
const { CutscenePlayer } = require("./cutscenePlayer");
const { CUTSCENES } = require("./cutsceneCatalog");
const { daoistMasterDialogue } = require("./story/daoistMasterStory");
const { inventoryEntries, itemById, shopById, shopEntries, equipmentModifiers } = require("./itemCatalog");

const SAVE_KEY = "cangshan-rpg-save-v1";

class GameApp {
  constructor() {
    const surface = createSurface();
    this.canvas = surface.canvas;
    this.context = surface.context;
    this.viewport = surface.viewport;
    this.ui = new UiRenderer(this.viewport);
    this.dialog = new DialogSystem();
    this.images = {};
    this.mode = "menu";
    this.musicEnabled = true;
    this.money = 120;
    this.items = {};
    this.defeatedScouts = new Set();
    this.learnedSkills = new Set();
    this.seenCutscenes = new Set();
    this.cutsceneFallback = null;
    this.currentBattleTriggerId = null;
    this.worldMapUnlocked = false;
    this.activeShopId = null;
    this.shopMessage = "";
    this.shopNotice = null;
    this.lastShopAudit = null;
    this.axis = { x: 0, y: 0 };
    this.lastTime = Date.now();
    this.touchBindings = new Map();
    this.requestFrame = typeof requestAnimationFrame === "function"
      ? (callback) => requestAnimationFrame(callback)
      : (callback) => setTimeout(callback, 16);
  }

  async start() {
    await loadAssetPacks();
    await this.loadAssets();
    this.mapManager = new MapManager(this.images, this.viewport);
    this.player = new Player(this.images.hero, this.mapManager.map.spawn);
    this.audio = createAudio(ASSETS.bgm);
    this.battleAudio = createAudio(ASSETS.battleBgm);
    this.hitSfx = createSfx(ASSETS.hitSfx);
    this.skillSfx = {
      stunned: createSfx(ASSETS.stunSfx),
      heal: createSfx(ASSETS.healSfx),
      aoe: createSfx(ASSETS.sweepSfx)
    };
    this.bindTouch();
    this.frame();
  }

  async loadAssets() {
    const entries = Object.entries(ASSETS).filter(([key]) => !key.endsWith("Sfx") && !key.endsWith("Bgm") && key !== "bgm");
    await Promise.all(entries.map(async ([key, source]) => { this.images[key] = await loadImage(this.canvas, source); }));
  }

  frame() {
    const now = Date.now();
    const dt = Math.min(0.034, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.requestFrame(() => this.frame());
  }

  update(dt) {
    if (this.mode === "battle") {
      this.battle.update(dt);
      return;
    }
    if (this.shopNotice) {
      this.shopNotice.time -= dt;
      if (this.shopNotice.time <= 0) this.shopNotice = null;
    }
    if (this.mode !== "game" || this.dialog.active) return;
    this.player.update(dt, this.axis, (bounds) => this.mapManager.canMove(bounds));
    this.activeTrigger = this.resolveActiveTrigger();
  }

  render() {
    const ctx = this.context;
    ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
    if (this.mode === "game") {
      const camera = this.mapManager.cameraFor(this.player, this.ui.playRect);
      this.mapManager.draw(ctx, camera, this.ui.playRect);
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.ui.playRect.x, this.ui.playRect.y, this.ui.playRect.width, this.ui.playRect.height);
      ctx.clip();
      ctx.translate(this.ui.playRect.x, this.ui.playRect.y);
      for (const npc of this.visibleNpcs()) {
        drawSprite(ctx, this.images[npc.sprite], npc.x - camera.x, npc.y - camera.y, npc.direction, 0, 82, 82);
        ctx.textAlign = "center";
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(22,16,10,.86)";
        ctx.fillText(npc.name, npc.x - camera.x, npc.y - camera.y + 14);
      }
      this.player.draw(ctx, camera);
      ctx.restore();
      if (this.debugMap) this.mapManager.drawDebug(ctx, camera, this.ui.playRect);
    }
    if (this.mode === "worldmap") return this.ui.renderWorldMap(ctx, {
      images: this.images,
      nodes: this.worldNodes(),
      cleared: this.defeatedScouts.size,
      total: SCOUT_IDS.length
    });
    if (this.mode === "inventory") return this.ui.renderInventory(ctx, {
      money: this.money,
      entries: inventoryEntries(this.items)
    });
    if (this.mode === "shop") return this.ui.renderShop(ctx, {
      money: this.money,
      shop: shopById(this.activeShopId),
      entries: shopEntries(this.activeShopId, this.items),
      message: this.shopMessage,
      notice: this.shopNotice
    });
    if (this.mode === "battle") return this.battle.render(ctx, this.ui);
    if (this.mode === "cutscene") return this.ui.renderCutscene(ctx, {
      title: this.activeCutscene?.title,
      fallback: this.cutsceneFallback,
      images: this.images
    });
    this.ui.render(ctx, {
      mode: this.mode,
      dialog: this.dialog,
      activeTrigger: this.activeTrigger,
      images: this.images,
      musicEnabled: this.musicEnabled,
      money: this.money,
      worldMapUnlocked: this.worldMapUnlocked || this.defeatedScouts.size > 0,
      defeatedScouts: this.defeatedScouts.size,
      totalScouts: SCOUT_IDS.length,
      hasSave: Boolean(readSave(SAVE_KEY))
    });
  }

  bindTouch() {
    wx.onTouchStart((event) => this.handleTouches(event.changedTouches, true));
    wx.onTouchMove((event) => this.handleTouches(event.changedTouches, true));
    wx.onTouchEnd((event) => this.handleTouches(event.changedTouches, false));
    if (wx.onTouchCancel) wx.onTouchCancel((event) => this.handleTouches(event.changedTouches, false));
  }

  handleTouches(touches, pressed) {
    for (const touch of touches || []) {
      const id = touch.identifier ?? 0;
      if (!pressed) {
        this.touchBindings.delete(id);
        continue;
      }
      const button = this.ui.hit(touch.clientX ?? touch.x, touch.clientY ?? touch.y);
      if (this.mode === "battle" && pressed && !button) this.battle.handleTap(touch.clientX ?? touch.x, touch.clientY ?? touch.y);
      const previous = this.touchBindings.get(id);
      this.touchBindings.set(id, button);
      if (button && button !== previous) this.activate(button);
    }
    const directions = [...this.touchBindings.values()];
    this.axis.x = (directions.includes("right") ? 1 : 0) - (directions.includes("left") ? 1 : 0);
    this.axis.y = (directions.includes("down") ? 1 : 0) - (directions.includes("up") ? 1 : 0);
  }

  activate(button) {
    if (button === "new") return this.newGame();
    if (button === "continue") return this.loadGame();
    if (button === "music") return this.toggleMusic();
    if (button === "menu") return this.openMenu();
    if (button === "inventory") return this.openInventory();
    if (button === "closeInventory") return this.closeInventory();
    if (button === "closeShop") return this.closeShop();
    if (button.startsWith("shop:buy:")) return this.buyItem(button.split(":")[2]);
    if (button === "worldmap") return this.openWorldMap();
    if (button === "closeWorldMap") return this.closeWorldMap();
    if (button === "interact") return this.interact();
    if (button.startsWith("battle:")) return this.battle?.activate(button);
    if (button === "cutscene:skip") return this.cutscene?.skip();
    if (button.startsWith("choice:")) return this.dialog.advance(Number(button.split(":")[1]));
  }

  newGame() {
    this.mode = "game";
    this.money = 120;
    this.items = { hemostatic_powder: 2, qingxin_pill: 1 };
    this.defeatedScouts = new Set();
    this.learnedSkills = new Set();
    this.seenCutscenes = new Set();
    this.currentBattleTriggerId = null;
    this.worldMapUnlocked = false;
    this.activeShopId = null;
    this.shopMessage = "";
    this.shopNotice = null;
    this.lastShopAudit = null;
    this.enterMap("world");
    this.playMusic();
    this.dialog.show([
      { speaker: GAME.companionName, text: "你终于醒了。昨夜苍山钟声忽断，客栈外又多了几名陌生人。" },
      { speaker: GAME.heroName, text: "我的佩剑不见了，只记得昏迷前听见一阵短笛。" },
      { speaker: GAME.companionName, text: "先去客栈内室查找账册。靠近木门后，点右下角的“交互”。" }
    ]);
  }

  openMenu() {
    this.saveGame();
    this.mode = "menu";
    this.axis = { x: 0, y: 0 };
  }

  interact() {
    const trigger = this.activeTrigger;
    if (!trigger) return;
    if (trigger.id === "inn") {
      this.dialog.show({ speaker: "云来客栈", text: "木门虚掩，屋里传来淡淡药香。", choices: [
        { label: "进入客房", action: () => this.enterRoom("room") },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "apothecaryDoor") {
      this.dialog.show({ speaker: "百草铺", text: "柜台后草药成排，药香盖过了门外山风。", choices: [
        { label: "进入百草铺", action: () => this.enterRoom("apothecaryRoom") },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "teahouseDoor") {
      this.dialog.show({ speaker: "松风茶肆", text: "竹帘半卷，里面有人低声谈起西岭密探的去向。", choices: [
        { label: "进入茶肆", action: () => this.enterRoom("teahouseRoom") },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "roomExit") {
      const exit = this.mapManager.map.exitTo || { mapId: "world", spawn: { x: 2700, y: 2520 }, label: "离开房间" };
      this.dialog.show({ speaker: "门口", text: "要回到苍山旧道吗？", choices: [
        { label: exit.label, action: () => this.enterMap(exit.mapId, exit.spawn) },
        { label: "继续搜索" }
      ] });
    } else if (trigger.id === "wardrobe") {
      this.addItem("silver_piece", 1);
      this.addItem("unsigned_letter", 1);
      this.money += 12;
      this.dialog.show({ speaker: "木柜", text: "柜门吱呀打开。旧布囊里有碎银和一封未署名的信。已放入背包。", choices: [{ label: "收下线索" }] });
    } else if (trigger.id === "desk") {
      this.dialog.show({ speaker: "账册", text: "夹页反复写着“灯亭、铜匣、寺后”，三处似乎指向同一条密道。" });
    } else if (trigger.id === "vendor") {
      this.dialog.show({ speaker: "药摊老人", text: "少侠气息不稳。若要补药或兵刃，我这摊上还有几样可用。", choices: [
        { label: "查看货物", action: () => this.openShop("apothecary") },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "daoist_master") {
      this.dialog.show(daoistMasterDialogue({
        heroName: GAME.heroName,
        learned: this.learnedSkills.has("fuyou_step"),
        onTeach: () => this.playCutscene("daoistTeaching")
      }));
    } else if (trigger.id.startsWith("scout")) {
      this.dialog.show({ speaker: "西岭密探", text: "前路封了。若再向前一步，刀剑无眼。", choices: [
        { label: "拔剑迎战", action: () => this.startBattle(trigger.id) },
        { label: "暂避锋芒" }
      ] });
    }
  }

  startBattle(triggerId) {
    this.axis = { x: 0, y: 0 };
    this.touchBindings.clear();
    this.currentBattleTriggerId = triggerId;
    this.battle = new BattleScene({
      images: this.images,
      viewport: this.viewport,
      hitSfx: this.hitSfx,
      skillSfx: this.skillSfx,
      mapKey: this.battleMapFor(triggerId),
      playerModifiers: equipmentModifiers(this.items),
      unlockedSkillIds: [...this.learnedSkills],
      onFinish: (result, audit) => {
        const rewards = result === "victory" ? this.grantBattleRewards() : { money: 0, items: [] };
        if (result === "victory" && this.currentBattleTriggerId) this.defeatedScouts.add(this.currentBattleTriggerId);
        this.worldMapUnlocked = this.defeatedScouts.size >= SCOUT_IDS.length;
        this.lastBattleAudit = { ...audit, rewards };
        this.mode = "game";
        this.playMusic();
        this.activeTrigger = this.resolveActiveTrigger();
        const clearText = this.worldMapUnlocked ? "沿路密探已清剿，舆图上出现了新的路线。" : `还剩 ${SCOUT_IDS.length - this.defeatedScouts.size} 处密探据点。`;
        this.dialog.show({
          speaker: "战斗",
          text: result === "victory" ? `伏兵败退。你获得 ${rewards.money} 两银子${rewards.items.length ? `，${rewards.items.map((item) => `${item.name}×${item.amount}`).join("、")}` : ""}。${clearText}` : "我方败退，江湖路止于此处。",
          choices: [{ label: result === "victory" ? "回到大地图" : "游戏结束" }]
        });
      }
    });
    this.battle.start();
    this.mode = "battle";
    this.playBattleMusic();
  }

  grantBattleRewards() {
    const reward = BATTLE.rewards || {};
    const money = randomInt(reward.money?.min || 0, reward.money?.max || 0);
    this.money += money;
    const items = [];
    for (const drop of reward.drops || []) {
      if (Math.random() > drop.chance) continue;
      const amount = randomInt(drop.min || 1, drop.max || 1);
      this.items[drop.itemId] = (this.items[drop.itemId] || 0) + amount;
      items.push({ itemId: drop.itemId, name: drop.name, amount });
    }
    return { money, items };
  }

  playCutscene(id) {
    const cutscene = CUTSCENES[id];
    if (!cutscene || this.mode === "cutscene") return;
    this.axis = { x: 0, y: 0 };
    this.touchBindings.clear();
    this.audio?.pause();
    this.activeCutscene = cutscene;
    this.cutsceneFallback = null;
    this.mode = "cutscene";
    this.cutscene = new CutscenePlayer({
      viewport: this.viewport,
      source: cutscene.source,
      remoteSource: cutscene.remoteSource,
      fallbackDurationMs: cutscene.fallbackDurationMs,
      onFallback: (reason, audit) => {
        this.cutsceneFallback = {
          reason,
          audit,
          poster: cutscene.poster,
          startedAt: Date.now(),
          durationMs: cutscene.fallbackDurationMs || 4200
        };
      },
      onFinish: (result, audit) => this.finishCutscene(cutscene, result, audit)
    });
    this.cutscene.play();
  }

  finishCutscene(cutscene, result, audit) {
    this.lastCutsceneAudit = audit;
    this.seenCutscenes.add(cutscene.id);
    this.learnedSkills.add(cutscene.rewardSkillId);
    this.cutscene = null;
    this.activeCutscene = null;
    this.cutsceneFallback = null;
    this.mode = "game";
    this.playMusic();
    this.dialog.show({
      speaker: result === "fallback" ? "旁白" : "逍遥道人",
      text: result === "fallback"
        ? `动画播放受限，已切换为分镜传功。你领悟了“${cutscene.rewardSkillName}”。`
        : `清风归于经脉。你领悟了“${cutscene.rewardSkillName}”，战斗时可御风群攻并点住敌人。`,
      choices: [{ label: "记下心法" }]
    });
  }

  enterRoom(id) {
    this.enterMap(id);
  }

  enterMap(id, spawn) {
    const point = this.mapManager.enter(id);
    this.player.x = (spawn || point).x;
    this.player.y = (spawn || point).y;
    this.player.direction = "down";
    this.activeTrigger = null;
  }

  saveGame() {
    if (!this.player || !this.mapManager) return;
    writeSave(SAVE_KEY, {
      mapId: this.mapManager.id,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      money: this.money,
      items: this.items,
      defeatedScouts: [...this.defeatedScouts],
      worldMapUnlocked: this.worldMapUnlocked,
      learnedSkills: [...this.learnedSkills],
      seenCutscenes: [...this.seenCutscenes]
    });
  }

  loadGame() {
    const save = readSave(SAVE_KEY);
    if (!save) return;
    this.mode = "game";
    this.money = save.money ?? 120;
    this.items = save.items || {};
    this.defeatedScouts = new Set(save.defeatedScouts || []);
    this.worldMapUnlocked = Boolean(save.worldMapUnlocked) || this.defeatedScouts.size >= SCOUT_IDS.length;
    this.learnedSkills = new Set(save.learnedSkills || []);
    this.seenCutscenes = new Set(save.seenCutscenes || []);
    this.enterMap(save.mapId || "world", { x: save.x, y: save.y });
    this.playMusic();
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) this.playMusic(); else this.audio.pause();
  }

  playMusic() {
    this.battleAudio?.pause();
    if (this.musicEnabled) this.audio.play();
  }

  playBattleMusic() {
    this.audio?.pause();
    if (this.musicEnabled) this.battleAudio.play();
  }

  openWorldMap() {
    if (!(this.worldMapUnlocked || this.defeatedScouts.size > 0)) return;
    this.axis = { x: 0, y: 0 };
    this.mode = "worldmap";
  }

  closeWorldMap() {
    this.mode = "game";
  }

  openInventory() {
    this.axis = { x: 0, y: 0 };
    this.mode = "inventory";
  }

  closeInventory() {
    this.mode = "game";
  }

  openShop(shopId) {
    this.axis = { x: 0, y: 0 };
    this.activeShopId = shopId;
    this.shopMessage = "选择要购买的物品";
    this.shopNotice = null;
    this.mode = "shop";
  }

  closeShop() {
    this.mode = "game";
    this.activeShopId = null;
    this.shopMessage = "";
    this.shopNotice = null;
  }

  buyItem(itemId) {
    const shop = shopById(this.activeShopId);
    const entry = shop?.stock.find((item) => item.itemId === itemId);
    const item = itemById(itemId);
    if (!shop || !entry) {
      this.shopMessage = "店里没有这个物品";
      return;
    }
    const owned = this.items[itemId] || 0;
    if (entry.limit && owned >= entry.limit) {
      this.shopMessage = `${item.name}已经买过了`;
      this.shopNotice = { text: `${item.name}已经买过了`, time: 1.4, kind: "warn" };
      this.lastShopAudit = { ok: false, reason: "limit", itemId, money: this.money, owned };
      return;
    }
    const price = entry.price ?? item.price ?? 0;
    if (this.money < price) {
      this.shopMessage = "银两不够";
      this.shopNotice = { text: "银两不够，无法购买", time: 1.4, kind: "warn" };
      this.lastShopAudit = { ok: false, reason: "money", itemId, price, money: this.money, owned };
      return;
    }
    this.money -= price;
    this.addItem(itemId, 1);
    this.shopMessage = `买到${item.name}，花费 ${price} 两`;
    this.shopNotice = { text: `购买成功：${item.name}`, time: 1.8, kind: "success" };
    this.lastShopAudit = { ok: true, itemId, price, money: this.money, owned: this.items[itemId] };
  }

  addItem(itemId, amount = 1) {
    this.items[itemId] = (this.items[itemId] || 0) + amount;
  }

  battleMapFor(triggerId) {
    if (triggerId === "scout_archer" || triggerId === "scout_bridge") return "battleBamboo";
    if (triggerId === "scout_gate") return "battleFerry";
    return "battleTemple";
  }

  resolveActiveTrigger() {
    const trigger = this.mapManager.nearby(this.player.boundsAt(this.player.x, this.player.y));
    if (!trigger) return null;
    if (this.defeatedScouts.has(trigger.id)) return null;
    return trigger;
  }

  visibleNpcs() {
    return (this.mapManager.map.npcs || []).filter((npc) => !this.defeatedScouts.has(npc.id));
  }

  worldNodes() {
    return WORLD_NODES.map((node) => {
      if (node.id === "cangshan") return { ...node, status: this.worldMapUnlocked ? "cleared" : "current" };
      if (this.worldMapUnlocked && node.id === "erhai") return { ...node, status: "unlocked" };
      return node;
    });
  }
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

module.exports = { GameApp };
