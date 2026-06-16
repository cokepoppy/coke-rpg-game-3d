import { BattleState } from "./BattleState.js";
import { EnemyAI } from "./EnemyAI.js";
import { TacticsMap } from "./TacticsMap.js";
import { TacticsRenderer } from "./TacticsRenderer.js";
import { loadCharacterSprites } from "../assets/characterLoader.js";
import { loadEffects } from "../assets/effectLoader.js";
import { BattleHud } from "../ui/BattleHud.js";
import { BattleSfx } from "../audio/BattleSfx.js";

export class BattleScene {
  constructor({ context, config, onFinish }) {
    this.context = context;
    this.config = config;
    this.onFinish = onFinish;
    this.active = false;
    this.enemyThinking = false;
    this.impactTimer = 0;
    this.sfx = new BattleSfx();
    this.pointerHandler = (event) => this.handlePointer(event);
  }

  async load() {
    this.map = await TacticsMap.load(this.config.map);
    this.state = new BattleState({ map: this.map, battle: this.config });
    const spriteIds = this.state.units.map((unit) => unit.spriteId || unit.id);
    const sprites = await loadCharacterSprites(spriteIds);
    const effects = await loadEffects(["sword_slash", "qi_projectile", "hit_spark", "heal_glow", "dust_step"]);
    this.renderer = new TacticsRenderer(this.context, this.map, this.state, sprites, effects);
    this.enemyAI = new EnemyAI(this.state);
    this.hud = new BattleHud(document.querySelector("#battle-ui"));
    this.hud.mount({
      onEndTurn: () => this.state.endPlayerTurn(),
      onUseSkill: (skillId) => this.useSkill(skillId)
    });
    this.context.canvas.addEventListener("click", this.pointerHandler);
    this.active = true;
    window.__battleScene = this;
  }

  update(dt) {
    if (!this.active) return;
    this.impactTimer = Math.max(0, this.impactTimer - dt);
    this.renderer.impactTimer = this.impactTimer;
    this.tickAnimations(dt);
    this.consumeBattleEvents();
    if (this.state.side === "enemy" && !this.enemyThinking && !this.state.finished) {
      this.enemyThinking = true;
      this.enemyAI.runTurn().finally(() => {
        this.enemyThinking = false;
      });
    }
    if (this.state.finished) {
      this.finishTimer = (this.finishTimer || 0) + dt;
      if (this.finishTimer > 1.2) this.finish();
    }
    this.hud.render(this.state);
  }

  render() {
    this.renderer.draw();
  }

  dispose() {
    this.active = false;
    this.context.canvas.removeEventListener("click", this.pointerHandler);
    this.hud?.unmount();
  }

  finish() {
    if (!this.active) return;
    const result = this.state.result;
    this.dispose();
    this.onFinish?.(result);
  }

  handlePointer(event) {
    if (this.state.side !== "player" || this.state.finished) return;
    const rect = this.context.canvas.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * this.context.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.context.canvas.height
    };
    const cell = this.renderer.cellFromCanvasPoint(point);
    if (!cell) return;
    this.state.selectCell(cell);
  }

  useSkill(skillId) {
    this.state.beginTargeting(skillId);
  }

  consumeBattleEvents() {
    for (const event of this.state.consumeEvents()) {
      if (event.type === "attack") {
        this.impactTimer = Math.max(this.impactTimer, 0.18);
        this.renderer.impactTimer = this.impactTimer;
        this.sfx.play("attack", event);
      }
    }
  }

  tickAnimations(dt) {
    for (const unit of this.state.units) {
      unit.update(dt);
      if (!unit.animation) continue;
      unit.animation.time -= dt;
      if (unit.animation.time <= 0) unit.animation = null;
    }
  }
}
