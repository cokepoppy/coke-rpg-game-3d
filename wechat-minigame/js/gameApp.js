const { GAME, ASSETS, BATTLE, BOSS_BATTLES, SCOUT_IDS, WORLD_NODES } = require("./config");
const { createSurface, loadImage, createAudio, createSfx, loadAssetPacks, readSave, writeSave } = require("./platform");
const { Player, drawSprite } = require("./player");
const { MapManager } = require("./mapManager");
const { DialogSystem } = require("./dialogSystem");
const { UiRenderer } = require("./uiRenderer");
const { BattleScene } = require("./battleScene");
const { CutscenePlayer } = require("./cutscenePlayer");
const { recordCutsceneDiagnostic } = require("./cutsceneDiagnostics");
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
    this.defeatedBosses = new Set();
    this.learnedSkills = new Set();
    this.seenCutscenes = new Set();
    this.storyFlags = new Set();
    this.storyLog = [];
    this.cutsceneFallback = null;
    this.cutsceneDebug = null;
    this.currentBattleTriggerId = null;
    this.worldMapUnlocked = false;
    this.activeShopId = null;
    this.shopMessage = "";
    this.shopNotice = null;
    this.menuCanResume = false;
    this.menuNotice = "";
    this.lastPromptTriggerId = null;
    this.lastShopAudit = null;
    this.axis = { x: 0, y: 0 };
    this.lastTime = Date.now();
    this.touchBindings = new Map();
    this.requestFrame = typeof requestAnimationFrame === "function"
      ? (callback) => requestAnimationFrame(callback)
      : (callback) => setTimeout(callback, 16);
  }

  async start() {
    this.loadingSet("加载资源分包", "准备地图、角色、音频和剧情动画。", 0.1);
    await loadAssetPacks();
    this.loadingSet("加载图片资源", "开始读取地图和角色图像。", 0.25);
    await this.loadAssets();
    this.loadingSet("初始化游戏世界", "创建地图、角色、剧情和音频系统。", 0.9);
    this.mapManager = new MapManager(this.images, this.viewport);
    this.player = new Player(this.images.hero, this.mapManager.map.spawn);
    this.audio = createAudio(ASSETS.bgm);
    this.battleAudio = createAudio(ASSETS.battleBgm);
    this.hitSfx = createSfx(ASSETS.hitSfx);
    this.skillSfx = {
      stunned: createSfx(ASSETS.stunSfx),
      heal: createSfx(ASSETS.healSfx),
      aoe: createSfx(ASSETS.sweepSfx),
      wait: createSfx(ASSETS.waitSfx)
    };
    this.uiSfx = createSfx(ASSETS.uiSfx);
    this.promptSfx = createSfx(ASSETS.promptSfx);
    this.buySfx = createSfx(ASSETS.buySfx);
    this.bindTouch();
    this.loadingSet("准备进入江湖", "正在绘制第一帧。", 0.96);
    this.frame();
    globalThis.__cangshanLoading?.done?.();
  }

  async loadAssets() {
    const entries = Object.entries(ASSETS).filter(([key]) => !key.endsWith("Sfx") && !key.endsWith("Bgm") && key !== "bgm");
    let loaded = 0;
    this.loadingSet("加载图片资源", `0/${entries.length} 并行下载地图与角色资源。`, 0.25);
    await Promise.all(entries.map(async ([key, source]) => {
      this.images[key] = await loadImage(this.canvas, source);
      loaded += 1;
      this.loadingSet("加载图片资源", `${loaded}/${entries.length} ${source}`, 0.25 + (loaded / entries.length) * 0.62);
    }));
  }

  loadingSet(stage, detail, progress) {
    globalThis.__cangshanLoading?.set?.(stage, detail, progress);
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
    const previousTriggerId = this.activeTrigger?.id || null;
    this.activeTrigger = this.resolveActiveTrigger();
    this.maybePlayPromptSfx(previousTriggerId, this.activeTrigger?.id || null);
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
      const npcs = this.visibleNpcs().slice().sort((a, b) => a.y - b.y);
      for (const npc of npcs) {
        drawSprite(ctx, this.images[npc.sprite], npc.x - camera.x, npc.y - camera.y, npc.direction, 0, 96, 96);
        ctx.textAlign = "center";
        ctx.font = "700 12px sans-serif";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "rgba(20, 14, 8, 0.86)";
        ctx.strokeText(npc.name, npc.x - camera.x, npc.y - camera.y + 14);
        ctx.fillStyle = "#fff6dd";
        ctx.fillText(npc.name, npc.x - camera.x, npc.y - camera.y + 14);
      }
      // The hero is the controlled focal character: keep it above NPC sprites.
      // Furniture depth is handled separately by the narrow foreground masks.
      this.player.draw(ctx, camera);
      ctx.restore();
      this.mapManager.drawOcclusions(ctx, camera, this.ui.playRect);
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
      debug: this.cutsceneDebug,
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
      hasSave: Boolean(readSave(SAVE_KEY)),
      canResume: this.menuCanResume,
      menuNotice: this.menuNotice
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
    if (this.shouldClickSfx(button)) this.uiSfx?.play();
    if (button === "new") return this.newGame();
    if (button === "continue") return this.loadGame();
    if (button === "resume") return this.closeMenu();
    if (button === "save") return this.saveGame();
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
    this.menuCanResume = false;
    this.menuNotice = "";
    this.mode = "game";
    this.money = 120;
    this.items = { hemostatic_powder: 2, qingxin_pill: 1 };
    this.defeatedScouts = new Set();
    this.defeatedBosses = new Set();
    this.learnedSkills = new Set();
    this.seenCutscenes = new Set();
    this.storyFlags = new Set();
    this.storyLog = [];
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
      { speaker: GAME.companionName, text: "先去客栈内室查找账册。靠近木门后，点右下角的“交互”。如果钟声真的在第七响前断了，那就不是普通失窃。" }
    ]);
  }

  openMenu() {
    this.menuCanResume = this.mode === "game";
    this.menuNotice = "";
    this.mode = "menu";
    this.axis = { x: 0, y: 0 };
  }

  closeMenu() {
    if (!this.menuCanResume) return;
    this.mode = "game";
    this.menuNotice = "";
    this.playMusic();
  }

  interact() {
    const trigger = this.activeTrigger;
    if (!trigger) return;
    if (trigger.id.startsWith("boss_")) {
      this.interactWithBoss(trigger.id);
    } else if (trigger.id === "inn") {
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
    } else if (trigger.id === "moonValleyGate") {
      this.dialog.show({ speaker: "月华谷山口", text: "雾气从竹林深处涌出，石阶尽头隐约有灯火。", choices: [
        { label: "进入月华谷", action: () => this.enterMap("moonValley") },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "moonValleyExit") {
      this.dialog.show({ speaker: "月华谷山门", text: "山风从谷口吹回旧道。要离开月华谷吗？", choices: [
        { label: "返回苍山旧道", action: () => this.enterMap("world", this.mapManager.map.exitTo?.spawn) },
        { label: "继续探索" }
      ] });
    } else if (trigger.id === "moonMedicineDoor") {
      this.dialog.show({ speaker: "月华药庐", text: "药香透过门缝散出，里面有人正在研磨草药。", choices: [
        { label: "进入药庐", action: () => this.enterRoom("moonMedicineHall") },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "moonStudyDoor") {
      this.dialog.show({ speaker: "月华书房", text: "窗内灯影未灭，案上似乎摊着一卷残图。", choices: [
        { label: "进入书房", action: () => this.enterRoom("moonStudy") },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "roomExit") {
      const exit = this.mapManager.map.exitTo || { mapId: "world", spawn: { x: 2700, y: 2520 }, label: "离开房间" };
      this.dialog.show({ speaker: "门口", text: "要回到苍山旧道吗？", choices: [
        { label: exit.label, action: () => this.enterMap(exit.mapId, exit.spawn) },
        { label: "继续搜索" }
      ] });
    } else if (trigger.id === "wardrobe" || trigger.id === "desk") {
      this.inspectClueSpot(trigger.id);
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
    } else if (trigger.id === "qin_wanyao") {
      const invited = this.items.palace_invitation > 0;
      this.dialog.show({ speaker: "秦晚瑶", text: invited
        ? "请帖已经交给你。进王府以后，听到什么都不要立刻相信，尤其是关于上一代人的清白。"
        : "谷中药账被人改过，少侠若要追查旧案，先从书房残图看起。这封王府请帖，也许能让你问到更深的真相。",
      choices: invited ? [
        { label: "记下提醒" },
        { label: "请她配些伤药", action: () => this.openShop("apothecary") }
      ] : [
        { label: "收下王府请帖", action: () => this.acceptPalaceInvitation() },
        { label: "请她配些伤药", action: () => this.openShop("apothecary") }
      ] });
    } else if (trigger.id === "mu_zhiyan") {
      const heard = this.storyFlags.has("heard_swapped_children_clue");
      this.dialog.show({ speaker: "穆芷烟", text: heard
        ? "我说过了，被调包的孩子不止一个。你若只盯着自己的身世，就会漏掉真正下棋的人。"
        : "昨夜有人从桥后翻入药圃，只留下半枚青铜扣。那人应还藏在谷中。被调包的孩子，也许不止你以为的那一个。",
      choices: [
        { label: "记下调包线索", action: () => this.rememberMoonClue() },
        { label: "暂时离开" }
      ] });
    } else if (trigger.id === "moon_disciple") {
      if (!this.storyFlags.has("moon_disciple_gift_taken")) {
        this.storyFlags.add("moon_disciple_gift_taken");
        this.addItem("qingxin_pill", 1);
        this.rememberStory("月华弟子赠予清心丸，并提醒谷中叛徒藏在桥后。");
        this.dialog.show({ speaker: "月华弟子", text: "师姐吩咐我在此等你。这枚清心丸可稳住真气，桥后的叛徒也许正等着你。", choices: [{ label: "收下" }] });
      } else {
        this.dialog.show({ speaker: "月华弟子", text: "桥后那人不是谷里弟子。他来得很急，像是怕你找到书房里的残图。", choices: [{ label: "记下" }] });
      }
    } else if (trigger.id.startsWith("scout")) {
      const speaker = trigger.id === "scout_moon" ? "谷中叛徒" : "西岭密探";
      const text = trigger.id === "scout_moon" ? "你不该来月华谷。残图和药账，都得留在这里。" : "前路封了。若再向前一步，刀剑无眼。";
      this.dialog.show({ speaker, text, choices: [
        { label: "拔剑迎战", action: () => this.startBattle(trigger.id) },
        { label: "暂避锋芒" }
      ] });
    }
  }

  inspectClueSpot(kind) {
    const mapId = this.mapManager.id;
    if (mapId === "room") {
      if (kind === "wardrobe") {
        if (this.storyFlags.has("inn_letter_found")) {
          this.dialog.show({ speaker: "木柜", text: "旧布囊已经空了，只剩下铜灯残片压出的浅痕。", choices: [{ label: "回想线索" }] });
          return;
        }
        this.addItem("silver_piece", 1);
        this.addItem("unsigned_letter", 1);
        this.addItem("copper_lantern_shard", 1);
        this.money += 12;
        this.storyFlags.add("inn_letter_found");
        this.rememberStory("客房木柜找到无名信和铜灯残片，信上写着灯亭、铜匣、寺后。");
        this.dialog.show({ speaker: "木柜", text: "柜门吱呀打开。旧布囊里有碎银、一封无名信，还有一枚刻着半个灯纹的铜片。信上写着：灯亭、铜匣、寺后。", choices: [{ label: "收下线索" }] });
        return;
      }
      if (!this.storyFlags.has("inn_letter_found")) {
        this.dialog.show({ speaker: "账册", text: "夹页被人用蜡封住了。也许客房里还有东西能对上这道封记。", choices: [{ label: "先搜索木柜" }] });
        return;
      }
      if (!this.storyFlags.has("lantern_order_clue")) {
        this.addItem("lantern_order_clue", 1);
        this.storyFlags.add("lantern_order_clue");
        this.rememberStory("客房账册用无名信和铜灯残片解出四个钟声落款，得到灯亭暗号。");
        this.dialog.show({ speaker: "账册", text: "铜片嵌入账册缺口。四个落款按钟声顺序读成一句话：先灭北灯，再问无名。茶肆的告示也许是下一把锁。", choices: [{ label: "记下暗号" }] });
      } else {
        this.dialog.show({ speaker: "账册", text: "暗号已经记下：先灭北灯，再问无名。", choices: [{ label: "继续追查" }] });
      }
      return;
    }

    if (mapId === "teahouseRoom") {
      if (kind === "desk" && !this.storyFlags.has("tea_house_cipher")) {
        if (!this.storyFlags.has("lantern_order_clue")) {
          this.dialog.show({ speaker: "告示", text: "告示被茶渍盖住了三行字。没有正确的钟声顺序，读出来只是一堆断句。", choices: [{ label: "先回客房" }] });
          return;
        }
        this.addItem("tea_house_cipher", 1);
        this.storyFlags.add("tea_house_cipher");
        this.rememberStory("松风茶肆告示补全三行密语，指向苍山北坡的残灯禁地。");
        this.dialog.show({ speaker: "告示", text: "按灯亭暗号重新排列后，三行被刮去的字显出来：北坡残灯、三步一停、勿看灯芯。", choices: [{ label: "记下密语" }] });
      } else if (kind === "desk") {
        this.dialog.show({ speaker: "告示", text: "北坡残灯，三步一停，勿看灯芯。那处禁地已经被人提前清过。", choices: [{ label: "继续追查" }] });
      } else {
        this.dialog.show({ speaker: "茶箱", text: "茶箱底部有被撬过的痕迹，箱盖内侧刻着一个向北的灯形缺口。", choices: [{ label: "记下方向" }] });
      }
      return;
    }

    if (mapId === "moonStudy" && kind === "desk") {
      if (!this.storyFlags.has("tea_house_cipher")) {
        this.dialog.show({ speaker: "月华案卷", text: "药账的页码被人为打乱了。茶肆密语或许能告诉你该从哪一页读起。", choices: [{ label: "先找密语" }] });
        return;
      }
      if (!this.storyFlags.has("moon_cipher_ready")) {
        this.storyFlags.add("moon_cipher_ready");
        this.rememberStory("月华书房按茶肆密语复原药账页码，裂镜药圃的入口显现。");
        this.dialog.show({ speaker: "月华案卷", text: "药账按密语重排后，收货人一栏只剩一个字：照。页脚画着裂镜，入口就在药庐北侧。", choices: [{ label: "记下入口" }] });
      } else {
        this.dialog.show({ speaker: "月华案卷", text: "裂镜药圃的入口在药庐北侧。先确认苍山那盏残灯已经熄灭。", choices: [{ label: "继续探索" }] });
      }
      return;
    }

    this.dialog.show({ speaker: kind === "desk" ? "案卷" : "药柜", text: "这里留下了有人匆忙翻找过的痕迹，但暂时没有新的线索。", choices: [{ label: "离开" }] });
  }

  interactWithBoss(triggerId) {
    if (this.defeatedBosses.has(triggerId)) {
      this.dialog.show({ speaker: "遗迹", text: "残灯已经熄灭，裂镜也不再映出人影。这里的证据已经被你收好。", choices: [{ label: "继续前进" }] });
      return;
    }
    const ready = triggerId === "boss_lantern_wraith"
      ? this.storyFlags.has("lantern_order_clue") && this.storyFlags.has("tea_house_cipher")
      : this.defeatedBosses.has("boss_lantern_wraith") && this.storyFlags.has("moon_cipher_ready");
    if (!ready) {
      const text = triggerId === "boss_lantern_wraith"
        ? "残灯禁地的石门没有回应。无名信、账册和茶肆告示还没有拼成完整暗号。"
        : "裂镜药圃被一层毒雾封住。先熄灭苍山残灯，再按月华案卷复原入口。";
      this.dialog.show({ speaker: "封锁的入口", text, choices: [{ label: "先寻找线索" }] });
      return;
    }
    const boss = triggerId === "boss_lantern_wraith" ? "引灯魇客" : "照骨婆";
    this.dialog.show({ speaker: boss, text: triggerId === "boss_lantern_wraith"
      ? "第七响没有落下，你却循着灯火来了。护手留下，旧案就还能继续沉睡。"
      : "你把灯熄了，便以为能看清药账？镜里照出的，未必是你自己的脸。", choices: [
      { label: "进入 Boss 战", action: () => this.startBattle(triggerId) },
      { label: "先补给" }
    ] });
  }

  startBattle(triggerId) {
    this.axis = { x: 0, y: 0 };
    this.touchBindings.clear();
    this.currentBattleTriggerId = triggerId;
    const battleConfig = BOSS_BATTLES[triggerId] || BATTLE;
    const bossBattle = Boolean(BOSS_BATTLES[triggerId]);
    this.battle = new BattleScene({
      images: this.images,
      viewport: this.viewport,
      hitSfx: this.hitSfx,
      skillSfx: this.skillSfx,
      mapKey: this.battleMapFor(triggerId),
      battleConfig,
      playerModifiers: equipmentModifiers(this.items),
      unlockedSkillIds: [...this.learnedSkills],
      onFinish: (result, audit) => {
        const rewards = result === "victory" ? this.grantBattleRewards(battleConfig) : { money: 0, items: [] };
        if (result === "victory" && this.currentBattleTriggerId) {
          if (bossBattle) this.defeatedBosses.add(this.currentBattleTriggerId);
          else this.defeatedScouts.add(this.currentBattleTriggerId);
          this.rememberBossVictory(this.currentBattleTriggerId, rewards);
        }
        this.worldMapUnlocked = this.requiredScoutDefeatCount() >= SCOUT_IDS.length;
        this.lastBattleAudit = { ...audit, rewards };
        this.mode = "game";
        this.playMusic();
        this.activeTrigger = this.resolveActiveTrigger();
        const remaining = Math.max(0, SCOUT_IDS.length - this.requiredScoutDefeatCount());
        const clearText = bossBattle
          ? (result === "victory" ? this.bossVictoryText(triggerId) : "")
          : (this.worldMapUnlocked ? "沿路密探已清剿，舆图上出现了新的路线。" : `还剩 ${remaining} 处密探据点。`);
        this.dialog.show({
          speaker: "战斗",
          text: result === "victory"
            ? `${bossBattle ? "Boss 倒下。" : "伏兵败退。"}你获得 ${rewards.money} 两银子${rewards.items.length ? `，${rewards.items.map((item) => `${item.name}×${item.amount}`).join("、")}` : ""}。${clearText}`
            : "我方败退，线索没有丢失；补给后可以再次挑战。",
          choices: [{ label: result === "victory" ? "回到大地图" : "游戏结束" }]
        });
      }
    });
    this.battle.start();
    this.mode = "battle";
    this.playBattleMusic();
  }

  grantBattleRewards(battleConfig = BATTLE) {
    const reward = battleConfig.rewards || {};
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

  rememberBossVictory(triggerId, rewards) {
    if (triggerId === "boss_lantern_wraith") {
      this.storyFlags.add("lantern_boss_defeated");
      this.rememberStory("引灯魇客倒下，沈临川从残灯骨架中找到与佩剑相同云纹的断剑护手。");
    }
    if (triggerId === "boss_bone_mirror_hag") {
      this.storyFlags.add("moon_boss_defeated");
      this.rememberStory("照骨婆败退，药账残页证明被调包的孩子不止一个，且有人在王府之外收货。");
    }
    if (rewards.items.some((item) => item.itemId === "moon_record_fragment")) this.storyFlags.add("moon_record_found");
  }

  bossVictoryText(triggerId) {
    if (triggerId === "boss_lantern_wraith") return "断剑护手与佩剑云纹一致，月华谷书房或许能解释这件事。";
    return "药账残页记录了第二个孩子的名字，王府线索不再只是传闻。";
  }

  playCutscene(id) {
    const cutscene = CUTSCENES[id];
    if (!cutscene || this.mode === "cutscene") return;
    this.axis = { x: 0, y: 0 };
    this.touchBindings.clear();
    this.audio?.pause();
    this.activeCutscene = cutscene;
    this.cutsceneFallback = null;
    this.cutsceneDebug = { event: "starting", source: cutscene.source, updatedAt: Date.now() };
    recordCutsceneDiagnostic("starting", this.cutsceneDebug);
    this.mode = "cutscene";
    this.cutscene = new CutscenePlayer({
      viewport: this.viewport,
      source: cutscene.source,
      remoteSource: cutscene.remoteSource,
      playbackDurationMs: cutscene.playbackDurationMs,
      fallbackDelayMs: cutscene.fallbackDelayMs,
      fallbackDurationMs: cutscene.fallbackDurationMs,
      onEvent: (event, audit) => {
        this.cutsceneDebug = {
          event,
          source: audit.resolvedSource || cutscene.source,
          playEvent: audit.playEvent,
          timeUpdates: audit.timeUpdates,
          waitingCount: audit.waitingCount || 0,
          videoCapabilities: audit.videoCapabilities,
          simulatorEventBridgeUnobservable: audit.simulatorEventBridgeUnobservable,
          fallback: audit.fallback,
          error: audit.error,
          updatedAt: Date.now()
        };
        recordCutsceneDiagnostic(event, this.cutsceneDebug);
      },
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
    recordCutsceneDiagnostic("finish", { ...audit, result });
    this.seenCutscenes.add(cutscene.id);
    this.learnedSkills.add(cutscene.rewardSkillId);
    this.cutscene = null;
    this.activeCutscene = null;
    this.cutsceneFallback = null;
    this.cutsceneDebug = null;
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
    this.lastPromptTriggerId = null;
    this.runMapEntryStory(id);
  }

  runMapEntryStory(id) {
    if (id !== "moonValley" || this.storyFlags.has("moon_valley_reached")) return;
    this.storyFlags.add("moon_valley_reached");
    this.rememberStory("苏萝带沈临川进入月华谷，月华弟子要求先查清王府玉佩来历。");
    this.dialog.show([
      { speaker: GAME.companionName, text: "前面就是月华谷。这里的人不爱见外客，尤其不爱见带着王府玉佩的人。" },
      { speaker: "月华谷弟子", text: "谷主失踪后，外人不得入药庐。你们若要查旧信，先证明不是南岭王府派来的。" }
    ]);
  }

  acceptPalaceInvitation() {
    this.addItem("palace_invitation", 1);
    this.storyFlags.add("palace_invitation_received");
    this.rememberStory("秦晚瑶交出南岭王府请帖，并警告沈临川不要轻信王府密卷。");
    this.dialog.show({ speaker: "秦晚瑶", text: "上一代人的错，不该一直压在你们身上。请帖给你，至于我的心意，等你活着回来再问。", choices: [{ label: "收好请帖" }] });
  }

  rememberMoonClue() {
    this.storyFlags.add("heard_swapped_children_clue");
    this.rememberStory("穆芷烟透露旧案中存在多个被调包的孩子。");
    this.dialog.show({ speaker: "穆芷烟", text: "被调包的孩子不止一个。你以为自己是谁，王府也未必知道。", choices: [{ label: "记下线索" }] });
  }

  rememberStory(text) {
    this.storyLog.unshift({ text, at: Date.now() });
    this.storyLog = this.storyLog.slice(0, 20);
  }

  saveGame() {
    if (!this.player || !this.mapManager || !this.menuCanResume) {
      this.menuNotice = "当前没有可保存的游戏进度";
      return false;
    }
    writeSave(SAVE_KEY, {
      version: 1,
      savedAt: Date.now(),
      mapId: this.mapManager.id,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      money: this.money,
      items: this.items,
      defeatedScouts: [...this.defeatedScouts],
      defeatedBosses: [...this.defeatedBosses],
      worldMapUnlocked: this.worldMapUnlocked,
      learnedSkills: [...this.learnedSkills],
      seenCutscenes: [...this.seenCutscenes],
      storyFlags: [...this.storyFlags],
      storyLog: this.storyLog
    });
    this.menuNotice = "存档成功";
    this.buySfx?.play();
    return true;
  }

  loadGame() {
    const save = readSave(SAVE_KEY);
    if (!save) {
      this.menuNotice = "还没有可加载的存档";
      return false;
    }
    this.mode = "game";
    this.money = save.money ?? 120;
    this.items = save.items || {};
    this.defeatedScouts = new Set(save.defeatedScouts || []);
    this.defeatedBosses = new Set(save.defeatedBosses || []);
    this.worldMapUnlocked = Boolean(save.worldMapUnlocked) || this.defeatedScouts.size >= SCOUT_IDS.length;
    this.learnedSkills = new Set(save.learnedSkills || []);
    this.seenCutscenes = new Set(save.seenCutscenes || []);
    this.storyFlags = new Set(save.storyFlags || []);
    this.storyLog = Array.isArray(save.storyLog) ? save.storyLog.slice(0, 20) : [];
    this.enterMap(save.mapId || "world", { x: save.x, y: save.y });
    this.menuCanResume = true;
    this.menuNotice = "";
    this.playMusic();
    return true;
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
    this.buySfx?.play();
    this.shopMessage = `买到${item.name}，花费 ${price} 两`;
    this.shopNotice = { text: `购买成功：${item.name}`, time: 1.8, kind: "success" };
    this.lastShopAudit = { ok: true, itemId, price, money: this.money, owned: this.items[itemId] };
  }

  addItem(itemId, amount = 1) {
    this.items[itemId] = (this.items[itemId] || 0) + amount;
  }

  battleMapFor(triggerId) {
    if (triggerId === "boss_bone_mirror_hag" || triggerId === "scout_moon") return "battleBamboo";
    if (triggerId === "boss_lantern_wraith") return "battleTemple";
    if (triggerId === "scout_archer" || triggerId === "scout_bridge") return "battleBamboo";
    if (triggerId === "scout_gate") return "battleFerry";
    return "battleTemple";
  }

  resolveActiveTrigger() {
    const trigger = this.mapManager.nearby(this.player.boundsAt(this.player.x, this.player.y));
    if (!trigger) return null;
    if (this.defeatedScouts.has(trigger.id)) return null;
    if (this.defeatedBosses.has(trigger.id)) return null;
    return trigger;
  }

  maybePlayPromptSfx(previousTriggerId, currentTriggerId) {
    if (!currentTriggerId || currentTriggerId === previousTriggerId || currentTriggerId === this.lastPromptTriggerId) return;
    this.lastPromptTriggerId = currentTriggerId;
    this.promptSfx?.play();
  }

  shouldClickSfx(button) {
    if (!button) return false;
    if (["left", "right", "up", "down"].includes(button)) return false;
    return true;
  }

  visibleNpcs() {
    return (this.mapManager.map.npcs || []).filter((npc) => !this.defeatedScouts.has(npc.id) && !this.defeatedBosses.has(npc.id));
  }

  worldNodes() {
    return WORLD_NODES.map((node) => {
      if (node.id === "cangshan") return { ...node, status: this.worldMapUnlocked ? "cleared" : "current" };
      if (node.id === "yuehua") return { ...node, status: this.worldMapUnlocked ? "current" : "unlocked" };
      if (this.worldMapUnlocked && node.id === "erhai") return { ...node, status: "unlocked" };
      return node;
    });
  }

  requiredScoutDefeatCount() {
    return SCOUT_IDS.filter((id) => this.defeatedScouts.has(id)).length;
  }
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

module.exports = { GameApp };
