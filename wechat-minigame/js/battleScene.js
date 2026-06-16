const { BATTLE, GAME } = require("./config");
const { drawSprite } = require("./player");

class BattleScene {
  constructor({ images, viewport, hitSfx, onFinish }) {
    this.images = images;
    this.viewport = viewport;
    this.hitSfx = hitSfx;
    this.onFinish = onFinish;
    this.config = BATTLE;
    this.active = false;
    this.audit = { attacks: [], moves: [], result: null };
  }

  start() {
    this.units = [...BATTLE.players, ...BATTLE.enemies].map((unit) => ({
      ...unit,
      maxHp: unit.hp,
      moved: false,
      acted: false,
      alive: true,
      direction: unit.side === "player" ? "right" : "left",
      animation: null,
      frame: 0,
      frameTime: 0
    }));
    this.side = "player";
    this.phase = "move";
    this.selectedId = "hero";
    this.message = `${this.selected.name} 待命`;
    this.highlights = this.movesFor(this.selected);
    this.active = true;
  }

  get selected() {
    return this.units.find((unit) => unit.id === this.selectedId && unit.alive);
  }

  update(dt) {
    if (!this.active) return;
    for (const unit of this.units) {
      unit.frameTime += dt;
      if (unit.frameTime > 0.16) {
        unit.frameTime = 0;
        unit.frame = (unit.frame + 1) % 4;
      }
      if (unit.animation) {
        unit.animation.time -= dt;
        if (unit.animation.time <= 0) unit.animation = null;
      }
    }
    if (this.side === "enemy" && !this.enemyThinking) {
      this.enemyThinking = true;
      setTimeout(() => this.runEnemyTurn(), 360);
    }
  }

  render(context, ui) {
    ui.buttons = [];
    context.clearRect(0, 0, this.viewport.width, this.viewport.height);
    this.drawHeader(context, ui);
    this.drawField(context);
    this.drawPanel(context, ui);
  }

  activate(button) {
    if (this.finished) return;
    if (button === "battle:skill") {
      if (!this.selected || this.selected.acted) return;
      const targets = this.targetable(this.selected);
      if (!targets.length) {
        this.message = "目标不在范围内";
        return;
      }
      this.phase = "target";
      this.highlights = targets.map((unit) => ({ x: unit.x, y: unit.y, kind: "target" }));
      this.message = `选择${this.selected.skill}目标`;
    }
    if (button === "battle:end") this.endPlayerTurn();
  }

  handleTap(x, y) {
    if (this.side !== "player" || !this.active || this.finished) return;
    const cell = this.cellFromPoint(x, y);
    if (!cell) return;
    const unit = this.unitAt(cell.x, cell.y);
    if (unit?.side === "player" && !unit.acted) {
      this.selectedId = unit.id;
      this.phase = unit.moved ? "act" : "move";
      this.highlights = unit.moved ? [] : this.movesFor(unit);
      this.message = `${unit.name} 待命`;
      return;
    }
    if (this.phase === "move" && this.selected && this.isHighlighted(cell.x, cell.y, "move")) {
      const selected = this.selected;
      selected.direction = directionTo(selected, cell);
      selected.x = cell.x;
      selected.y = cell.y;
      selected.moved = true;
      selected.animation = { type: "move", time: 0.16 };
      this.audit.moves.push({ id: selected.id, x: cell.x, y: cell.y });
      this.phase = "act";
      this.highlights = [];
      this.message = "移动完成，选择技能";
      return;
    }
    if (this.phase === "target" && this.selected && unit?.side === "enemy" && this.isHighlighted(cell.x, cell.y, "target")) {
      this.attack(this.selected, unit);
    }
  }

  attack(attacker, target) {
    attacker.direction = directionTo(attacker, target);
    target.direction = directionTo(target, attacker);
    target.hp = Math.max(0, target.hp - attacker.damage);
    target.alive = target.hp > 0;
    attacker.moved = true;
    attacker.acted = true;
    attacker.qi = Math.max(0, attacker.qi - 35);
    attacker.animation = { type: "attack", targetX: target.x, targetY: target.y, time: 0.26, duration: 0.26 };
    target.animation = { type: "hit", damage: attacker.damage, time: 0.38, duration: 0.38 };
    this.hitSfx?.play();
    this.audit.attacks.push({ attackerId: attacker.id, targetId: target.id, damage: attacker.damage, targetHp: target.hp });
    this.message = `${attacker.name} 使用${attacker.skill}，${target.name} 受到 ${attacker.damage} 点伤害`;
    this.phase = "select";
    this.highlights = [];
    this.selectedId = null;
    this.checkResult();
    if (!this.finished && this.living("player").every((unit) => unit.acted)) this.endPlayerTurn();
  }

  endPlayerTurn() {
    if (this.finished) return;
    this.side = "enemy";
    this.phase = "enemy";
    this.selectedId = null;
    this.highlights = [];
    this.message = "敌方回合";
  }

  runEnemyTurn() {
    if (!this.active || this.finished) return;
    const enemy = this.living("enemy")[0];
    const target = this.living("player")[0];
    if (enemy && target && distance(enemy, target) <= enemy.range) this.attack(enemy, target);
    for (const unit of this.living("player")) {
      unit.moved = false;
      unit.acted = false;
    }
    this.side = "player";
    this.phase = "select";
    this.selectedId = this.living("player")[0]?.id || null;
    this.highlights = this.selected ? this.movesFor(this.selected) : [];
    this.message = "我方回合";
    this.enemyThinking = false;
  }

  checkResult() {
    if (!this.living("enemy").filter((unit) => unit.alive).length) this.scheduleFinish("victory");
    if (!this.living("player").filter((unit) => unit.alive).length) this.scheduleFinish("defeat");
  }

  scheduleFinish(result) {
    if (this.finished) return;
    this.finished = true;
    this.audit.result = result;
    this.phase = "result";
    this.highlights = [];
    this.message = result === "victory" ? "战斗胜利" : "我方败退";
    setTimeout(() => this.finish(result), 700);
  }

  finish(result) {
    this.active = false;
    this.onFinish?.(result, this.audit);
  }

  living(side) {
    return this.units.filter((unit) => unit.side === side && (unit.alive || unit.animation));
  }

  unitAt(x, y) {
    return this.units.find((unit) => (unit.alive || unit.animation) && unit.x === x && unit.y === y);
  }

  targetable(unit) {
    return this.living("enemy").filter((enemy) => enemy.alive && distance(unit, enemy) <= unit.range);
  }

  movesFor(unit) {
    if (!unit || unit.moved) return [];
    const occupied = new Set(this.units.filter((item) => item.alive && item.id !== unit.id).map((item) => `${item.x},${item.y}`));
    const moves = [];
    for (let y = 0; y < BATTLE.rows; y += 1) {
      for (let x = 0; x < BATTLE.cols; x += 1) {
        if (!occupied.has(`${x},${y}`) && distance(unit, { x, y }) <= unit.move) moves.push({ x, y, kind: "move" });
      }
    }
    return moves;
  }

  isHighlighted(x, y, kind) {
    return this.highlights.some((cell) => cell.x === x && cell.y === y && cell.kind === kind);
  }

  layout() {
    const top = 88;
    const panelHeight = 210;
    const field = { x: 0, y: top, width: this.viewport.width, height: this.viewport.height - top - panelHeight };
    const tile = Math.floor(Math.min(field.width / BATTLE.cols, field.height / BATTLE.rows));
    const gridWidth = tile * BATTLE.cols;
    const gridHeight = tile * BATTLE.rows;
    return {
      field,
      tile,
      grid: {
        x: Math.round((this.viewport.width - gridWidth) / 2),
        y: Math.round(field.y + (field.height - gridHeight) / 2),
        width: gridWidth,
        height: gridHeight
      },
      panel: { x: 0, y: this.viewport.height - panelHeight, width: this.viewport.width, height: panelHeight }
    };
  }

  cellFromPoint(x, y) {
    const { grid, tile } = this.layout();
    if (x < grid.x || y < grid.y || x >= grid.x + grid.width || y >= grid.y + grid.height) return null;
    return { x: Math.floor((x - grid.x) / tile), y: Math.floor((y - grid.y) / tile) };
  }

  cellCenter(cell) {
    const { grid, tile } = this.layout();
    return { x: grid.x + cell.x * tile + tile / 2, y: grid.y + cell.y * tile + tile / 2 };
  }

  drawHeader(context, ui) {
    context.fillStyle = "rgba(25, 20, 14, 0.96)";
    context.fillRect(0, 0, this.viewport.width, 88);
    context.textAlign = "left";
    context.fillStyle = "#f2e5c8";
    context.font = "700 18px serif";
    context.fillText(BATTLE.title, 18, 31);
    context.font = "12px sans-serif";
    context.fillStyle = "#d8bd82";
    context.fillText(`${this.side === "player" ? "我方回合" : "敌方回合"}  ·  ${BATTLE.objective}`, 18, 53);
    ui.button(context, "battle:end", this.viewport.width - 92, 24, 74, 38, "结束回合", this.side === "player" ? "normal" : "disabled");
  }

  drawField(context) {
    const { field, grid, tile } = this.layout();
    context.save();
    context.beginPath();
    context.rect(field.x, field.y, field.width, field.height);
    context.clip();
    context.fillStyle = "#121511";
    context.fillRect(field.x, field.y, field.width, field.height);
    if (this.images.battleMap) context.drawImage(this.images.battleMap, 0, 0, this.images.battleMap.width, this.images.battleMap.height, field.x, field.y, field.width, field.height);
    context.fillStyle = "rgba(8, 10, 8, 0.26)";
    context.fillRect(field.x, field.y, field.width, field.height);
    for (const cell of this.highlights) {
      context.fillStyle = cell.kind === "target" ? "rgba(209, 48, 38, 0.38)" : "rgba(80, 155, 255, 0.30)";
      context.fillRect(grid.x + cell.x * tile, grid.y + cell.y * tile, tile, tile);
    }
    context.strokeStyle = "rgba(245, 234, 208, 0.20)";
    context.lineWidth = 1;
    for (let x = 0; x <= BATTLE.cols; x += 1) {
      context.beginPath();
      context.moveTo(grid.x + x * tile + 0.5, grid.y);
      context.lineTo(grid.x + x * tile + 0.5, grid.y + grid.height);
      context.stroke();
    }
    for (let y = 0; y <= BATTLE.rows; y += 1) {
      context.beginPath();
      context.moveTo(grid.x, grid.y + y * tile + 0.5);
      context.lineTo(grid.x + grid.width, grid.y + y * tile + 0.5);
      context.stroke();
    }
    this.drawUnits(context);
    context.restore();
  }

  drawUnits(context) {
    const units = this.units.filter((unit) => unit.alive || unit.animation).sort((a, b) => a.y - b.y);
    for (const unit of units) {
      const center = this.cellCenter(unit);
      const hit = unit.animation?.type === "hit" ? Math.sin(unit.animation.time * 70) * 4 : 0;
      const alpha = unit.animation?.type === "hit" && Math.floor(unit.animation.time * 30) % 2 === 0 ? 0.45 : 1;
      context.globalAlpha = alpha;
      drawSprite(context, this.images[unit.sprite], center.x, center.y + 22 + hit, unit.direction, unit.animation?.type === "attack" ? 2 : unit.frame, 70, 70);
      context.globalAlpha = 1;
      context.fillStyle = "#f5ead2";
      context.font = "12px sans-serif";
      context.textAlign = "center";
      context.fillText(unit.name, center.x, center.y - 32);
      context.fillStyle = "rgba(20, 14, 10, 0.86)";
      context.fillRect(center.x - 24, center.y + 29, 48, 5);
      context.fillStyle = unit.side === "player" ? "#65d28c" : "#e65d50";
      context.fillRect(center.x - 24, center.y + 29, 48 * Math.max(0, unit.hp / unit.maxHp), 5);
      if (unit.animation?.type === "hit" && unit.animation.damage) {
        context.fillStyle = "#ffd36b";
        context.strokeStyle = "rgba(22, 10, 8, 0.9)";
        context.lineWidth = 3;
        context.font = "700 16px sans-serif";
        context.strokeText(`-${unit.animation.damage}`, center.x, center.y - 48);
        context.fillText(`-${unit.animation.damage}`, center.x, center.y - 48);
      }
      if (unit.animation?.type === "attack") this.drawAttackLine(context, unit);
    }
  }

  drawAttackLine(context, unit) {
    const from = this.cellCenter(unit);
    const to = this.cellCenter({ x: unit.animation.targetX, y: unit.animation.targetY });
    context.strokeStyle = "#bd63ff";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(from.x, from.y - 6);
    context.lineTo(to.x, to.y - 6);
    context.stroke();
  }

  drawPanel(context, ui) {
    const { panel } = this.layout();
    context.fillStyle = "rgba(21, 16, 11, 0.98)";
    context.fillRect(panel.x, panel.y, panel.width, panel.height);
    context.strokeStyle = "rgba(220, 186, 116, 0.42)";
    context.strokeRect(panel.x + 10, panel.y + 10, panel.width - 20, panel.height - 20);
    const selected = this.selected;
    context.textAlign = "left";
    context.fillStyle = "#e3c98f";
    context.font = "700 15px serif";
    context.fillText(this.message, 24, panel.y + 35);
    context.fillStyle = "#f5ead2";
    context.font = "13px sans-serif";
    const stats = selected ? `${selected.name}  HP ${selected.hp}/${selected.maxHp}  气 ${selected.qi}` : "点击我方角色选择行动";
    context.fillText(stats, 24, panel.y + 62);
    ui.button(context, "battle:skill", 24, panel.y + 86, panel.width - 48, 44, selected ? `${selected.skill}  -35` : "选择角色", selected && !selected.acted ? "primary" : "disabled");
    context.textAlign = "left";
    context.fillStyle = "rgba(246, 234, 209, 0.68)";
    context.font = "12px sans-serif";
    context.fillText("蓝格移动，点技能后选择红格目标。", 24, panel.y + 158);
  }
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function directionTo(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

module.exports = { BattleScene };
