import { BattleUnit } from "./BattleUnit.js";
import { distance, key } from "./TacticsMap.js";

export class BattleState {
  constructor({ map, battle }) {
    this.map = map;
    this.battle = battle;
    this.units = [
      ...battle.players.map((unit, index) => new BattleUnit({ ...unit, cell: toCell(map.config.playerSpawns[index]) })),
      ...battle.enemies.map((unit, index) => new BattleUnit({ ...unit, cell: toCell(map.config.enemySpawns[index]) }))
    ];
    this.side = "player";
    this.phase = "select";
    this.selectedId = null;
    this.highlightedMoves = [];
    this.highlightedTargets = [];
    this.selectedSkillId = null;
    this.log = [`${battle.title}：${map.config.objectives[0]}`];
    this.finished = false;
    this.result = null;
  }

  get selected() {
    return this.units.find((unit) => unit.id === this.selectedId && unit.alive);
  }

  living(side) {
    return this.units.filter((unit) => unit.side === side && unit.alive);
  }

  unitAt(cell) {
    return this.units.find((unit) => unit.alive && unit.cell.x === cell.x && unit.cell.y === cell.y);
  }

  selectUnit(unitId) {
    const unit = this.units.find((item) => item.id === unitId && item.side === this.side && item.alive);
    if (!unit || unit.acted) return false;
    this.selectedId = unit.id;
    this.phase = unit.moved ? "act" : "move";
    this.highlightedMoves = unit.moved ? [] : this.legalMoves(unit);
    this.highlightedTargets = [];
    this.selectedSkillId = null;
    this.logEvent(`${unit.name} 等待指令。`);
    return true;
  }

  selectCell(cell) {
    const unit = this.unitAt(cell);
    if (this.selected && this.phase === "target") {
      if (unit?.side !== this.side && containsCell(this.highlightedTargets, cell)) {
        return this.attackSelected(unit.id, this.selectedSkillId);
      }
      this.logEvent("请选择红色格子内的目标。");
      return false;
    }
    if (unit?.side === this.side) return this.selectUnit(unit.id);
    if (this.selected && this.phase === "move" && containsCell(this.highlightedMoves, cell)) {
      return this.moveSelected(cell);
    }
    if (this.selected && unit && unit.side !== this.side) {
      return this.attackSelected(unit.id);
    }
    return false;
  }

  legalMoves(unit) {
    const occupied = new Set(this.units.filter((item) => item.alive && item.id !== unit.id).map((item) => key(item.cell.x, item.cell.y)));
    return this.map.cellsInRange(unit.cell, unit.moveRange, occupied);
  }

  moveSelected(cell) {
    const unit = this.selected;
    if (!unit || unit.moved) return false;
    unit.direction = directionTo(unit.cell, cell);
    unit.cell = { ...cell };
    unit.moved = true;
    unit.animation = { type: "move", time: 0.18 };
    this.phase = "act";
    this.highlightedMoves = [];
    this.logEvent(`${unit.name} 移动到 ${cell.x + 1},${cell.y + 1}。`);
    return true;
  }

  attackSelected(targetId, skillId = "basic") {
    const attacker = this.selected;
    const target = this.units.find((unit) => unit.id === targetId && unit.alive);
    if (!attacker || !target || attacker.acted || attacker.side === target.side) return false;

    const skill = skillId === "basic" ? basicSkill(attacker) : attacker.skills.find((item) => item.id === skillId);
    if (!skill || attacker.qi < skill.cost || distance(attacker.cell, target.cell) > skill.range) return false;

    attacker.direction = directionTo(attacker.cell, target.cell);
    target.direction = directionTo(target.cell, attacker.cell);
    attacker.qi -= skill.cost;
    attacker.acted = true;
    attacker.moved = true;
    target.takeDamage(skill.damage);
    attacker.animation = { type: "attack", target: { ...target.cell }, time: 0.28, duration: 0.28, effectId: skill.effectId || "sword_slash" };
    target.animation = { type: "hit", time: 0.34, duration: 0.34 };
    this.logEvent(`${attacker.name} 使用${skill.name}，${target.name} 受到 ${skill.damage} 点伤害。`);
    if (!target.alive) this.logEvent(`${target.name} 倒下了。`);
    this.checkResult();
    this.phase = "select";
    this.highlightedMoves = [];
    this.highlightedTargets = [];
    this.selectedSkillId = null;
    this.selectedId = null;
    this.autoAdvancePlayerTurn();
    return true;
  }

  skillOptions() {
    const unit = this.selected;
    if (!unit || unit.acted) return [];
    return [basicSkill(unit), ...unit.skills].map((skill) => ({
      ...skill,
      enabled: unit.qi >= skill.cost && !unit.acted && this.targetableEnemies(unit, skill).length > 0
    }));
  }

  beginTargeting(skillId) {
    const unit = this.selected;
    if (!unit || unit.acted) return false;
    const skill = skillId === "basic" ? basicSkill(unit) : unit.skills.find((item) => item.id === skillId);
    if (!skill || unit.qi < skill.cost) return false;
    const targets = this.targetableEnemies(unit, skill);
    if (targets.length === 0) {
      this.logEvent(`${skill.name} 范围内没有目标。`);
      return false;
    }
    this.phase = "target";
    this.highlightedMoves = [];
    this.highlightedTargets = targets.map((target) => ({ ...target.cell }));
    this.selectedSkillId = skill.id;
    this.logEvent(`选择${skill.name}的目标。`);
    return true;
  }

  targetableEnemies(unit, skill) {
    return this.living(enemySide(unit.side)).filter((enemy) => distance(unit.cell, enemy.cell) <= skill.range);
  }

  endPlayerTurn() {
    if (this.side !== "player" || this.finished) return;
    this.startSide("enemy");
  }

  startSide(side) {
    this.side = side;
    this.phase = side === "player" ? "select" : "enemy";
    this.selectedId = null;
    this.highlightedMoves = [];
    this.highlightedTargets = [];
    this.selectedSkillId = null;
    for (const unit of this.living(side)) unit.beginTurn();
    this.logEvent(side === "player" ? "我方回合。" : "敌方回合。");
  }

  autoAdvancePlayerTurn() {
    if (this.side === "player" && this.living("player").every((unit) => unit.acted)) {
      this.endPlayerTurn();
    }
  }

  checkResult() {
    if (this.living("enemy").length === 0) {
      this.finished = true;
      this.result = "victory";
      this.logEvent("战斗胜利。");
    }
    if (this.living("player").length === 0) {
      this.finished = true;
      this.result = "defeat";
      this.logEvent("我方败退。");
    }
  }

  logEvent(text) {
    this.log.push(text);
    if (this.log.length > 8) this.log.shift();
  }
}

export function enemySide(side) {
  return side === "player" ? "enemy" : "player";
}

function toCell(pair) {
  return { x: pair[0], y: pair[1] };
}

function containsCell(cells, cell) {
  return cells.some((item) => item.x === cell.x && item.y === cell.y);
}

function directionTo(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

function basicSkill(unit) {
  return {
    id: "basic",
    name: unit.side === "player" ? "平攻" : "短兵",
    cost: 0,
    damage: 22,
    range: unit.attackRange
  };
}
