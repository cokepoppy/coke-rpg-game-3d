const { GAME, ASSETS } = require("./config");
const { createSurface, loadImage, createAudio, readSave, writeSave } = require("./platform");
const { Player, drawSprite } = require("./player");
const { MapManager } = require("./mapManager");
const { DialogSystem } = require("./dialogSystem");
const { UiRenderer } = require("./uiRenderer");

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
    this.axis = { x: 0, y: 0 };
    this.lastTime = Date.now();
    this.touchBindings = new Map();
  }

  async start() {
    await this.loadAssets();
    this.mapManager = new MapManager(this.images, this.viewport);
    this.player = new Player(this.images.hero, this.mapManager.map.spawn);
    this.audio = createAudio(ASSETS.bgm);
    this.bindTouch();
    this.frame();
  }

  async loadAssets() {
    const entries = Object.entries(ASSETS).filter(([key]) => key !== "bgm");
    await Promise.all(entries.map(async ([key, source]) => { this.images[key] = await loadImage(this.canvas, source); }));
  }

  frame() {
    const now = Date.now();
    const dt = Math.min(0.034, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(() => this.frame());
  }

  update(dt) {
    if (this.mode !== "game" || this.dialog.active) return;
    this.player.update(dt, this.axis, (bounds) => this.mapManager.canMove(bounds));
    this.activeTrigger = this.mapManager.nearby(this.player.boundsAt(this.player.x, this.player.y));
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
      for (const npc of this.mapManager.map.npcs) {
        drawSprite(ctx, this.images[npc.sprite], npc.x - camera.x, npc.y - camera.y, npc.direction, 0, 82, 82);
        ctx.textAlign = "center";
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(22,16,10,.86)";
        ctx.fillText(npc.name, npc.x - camera.x, npc.y - camera.y + 14);
      }
      this.player.draw(ctx, camera);
      ctx.restore();
    }
    this.ui.render(ctx, {
      mode: this.mode,
      dialog: this.dialog,
      activeTrigger: this.activeTrigger,
      images: this.images,
      musicEnabled: this.musicEnabled,
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
    if (button === "interact") return this.interact();
    if (button.startsWith("choice:")) return this.dialog.advance(Number(button.split(":")[1]));
  }

  newGame() {
    this.mode = "game";
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
        { label: "进入客房", action: () => this.enterMap("room") },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "roomExit") {
      this.dialog.show({ speaker: "门口", text: "要回到苍山旧道吗？", choices: [
        { label: "离开客房", action: () => this.enterMap("world", { x: 2700, y: 2520 }) },
        { label: "继续搜索" }
      ] });
    } else if (trigger.id === "wardrobe") {
      this.dialog.show({ speaker: "木柜", text: "柜门吱呀打开。旧布囊里有碎银和一封未署名的信。", choices: [{ label: "收下线索" }] });
    } else if (trigger.id === "desk") {
      this.dialog.show({ speaker: "账册", text: "夹页反复写着“灯亭、铜匣、寺后”，三处似乎指向同一条密道。" });
    } else if (trigger.id === "vendor") {
      this.dialog.show({ speaker: "药摊老人", text: "少侠气息不稳。这两枚清心丸收好，山风口不宜久留。" });
    } else if (trigger.id === "scout") {
      this.dialog.show({ speaker: "西岭密探", text: "前路封了。若再向前一步，刀剑无眼。", choices: [{ label: "拔剑迎战" }, { label: "暂避锋芒" }] });
    }
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
    writeSave(SAVE_KEY, { mapId: this.mapManager.id, x: Math.round(this.player.x), y: Math.round(this.player.y) });
  }

  loadGame() {
    const save = readSave(SAVE_KEY);
    if (!save) return;
    this.mode = "game";
    this.enterMap(save.mapId || "world", { x: save.x, y: save.y });
    this.playMusic();
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) this.playMusic(); else this.audio.pause();
  }

  playMusic() {
    if (this.musicEnabled) this.audio.play();
  }
}

module.exports = { GameApp };
