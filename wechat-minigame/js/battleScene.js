const { BATTLE, GAME } = require("./config");
const { drawSprite } = require("./player");

class BattleScene {
  constructor({ images, viewport, hitSfx, skillSfx = {}, mapKey = "battleTemple", playerModifiers = {}, unlockedSkillIds = [], onFinish }) {
    this.images = images;
    this.viewport = viewport;
    this.hitSfx = hitSfx;
    this.skillSfx = skillSfx;
    this.onFinish = onFinish;
    this.config = BATTLE;
    this.mapKey = mapKey;
    this.playerModifiers = playerModifiers;
    this.unlockedSkillIds = unlockedSkillIds;
    this.active = false;
    this.audit = { attacks: [], moves: [], result: null };
  }

  start() {
    this.units = [...BATTLE.players, ...BATTLE.enemies].map((unit) => {
      const equipment = unit.side === "player" ? this.playerModifiers : {};
      const skillIds = unit.id === "hero" && this.unlockedSkillIds.length
        ? [...(unit.skillIds || []).slice(0, 2), ...this.unlockedSkillIds].slice(0, 3)
        : unit.skillIds;
      return {
        ...unit,
        skillIds,
        maxHp: unit.hp,
        move: unit.move + (equipment.move || 0),
        damage: unit.damage + (equipment.attack || 0),
        bonusAttack: equipment.attack || 0,
        defense: equipment.defense || 0,
        displayHp: unit.hp,
        status: {},
        moved: false,
        acted: false,
        alive: true,
        direction: unit.side === "player" ? "right" : "left",
        animation: null,
        frame: 0,
        frameTime: 0
      };
    });
    this.side = "player";
    this.phase = "move";
    this.selectedId = "hero";
    this.selectedSkillId = this.skillsFor(this.selected)[0]?.id || null;
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
      unit.displayHp += (unit.hp - unit.displayHp) * Math.min(1, dt * 7.5);
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
    if (button === "battle:attack") return this.chooseBasicAttack();
    if (button === "battle:wait") return this.waitSelected();
    if (button === "battle:skill" || button.startsWith("battle:skill:")) {
      if (!this.selected || this.selected.acted) return;
      const skillId = button.split(":")[2] || this.skillsFor(this.selected)[0]?.id;
      const skill = this.skillById(skillId);
      if (!skill || this.selected.qi < skill.cost) {
        this.message = "真气不足";
        return;
      }
      this.selectedSkillId = skill.id;
      if (skill.kind === "ally_all") {
        this.castSupport(this.selected, skill);
        return;
      }
      const targets = this.targetable(this.selected, skill);
      if (!targets.length) {
        this.message = "目标不在范围内";
        return;
      }
      this.phase = "target";
      this.highlights = targets.map((unit) => ({ x: unit.x, y: unit.y, kind: "target" }));
      this.message = `选择${skill.name}目标`;
    }
    if (button === "battle:end") this.endPlayerTurn();
  }

  chooseBasicAttack() {
    if (!this.selected || this.selected.acted) return;
    const skill = this.skillById("basic_attack");
    const targets = this.targetable(this.selected, skill);
    if (!targets.length) {
      this.message = "相邻格没有敌人，可移动后待命";
      return;
    }
    this.selectedSkillId = skill.id;
    this.phase = "target";
    this.highlights = targets.map((unit) => ({ x: unit.x, y: unit.y, kind: "target" }));
    this.message = "选择普通攻击目标";
  }

  waitSelected() {
    const unit = this.selected;
    if (!unit || unit.acted) return;
    unit.moved = true;
    unit.acted = true;
    unit.animation = { type: "wait", time: 0.24 };
    this.skillSfx.wait?.play();
    this.audit.moves.push({ id: unit.id, wait: true });
    this.message = `${unit.name} 待命`;
    this.phase = "select";
    this.highlights = [];
    this.selectedId = null;
    this.advanceAfterPlayerAction();
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
      this.message = "移动完成，选择攻击、技能或待命";
      return;
    }
    if (this.phase === "target" && this.selected && unit?.side === "enemy" && this.isHighlighted(cell.x, cell.y, "target")) {
      this.castSkill(this.selected, unit, this.skillById(this.selectedSkillId));
    }
  }

  castSkill(attacker, target, skill = this.skillsFor(attacker)[0]) {
    if (!skill || attacker.qi < skill.cost) return;
    const targets = skill.kind === "aoe"
      ? this.living(target.side).filter((unit) => unit.alive && distance(unit, target) <= (skill.radius || 0))
      : [target];
    attacker.qi = Math.max(0, attacker.qi - skill.cost);
    attacker.direction = directionTo(attacker, target);
    for (const item of targets) this.applyDamage(attacker, item, skill);
    attacker.moved = true;
    attacker.acted = true;
    attacker.animation = { type: "attack", targetX: target.x, targetY: target.y, time: 0.26, duration: 0.26, skill };
    this.playSkillSfx(skill);
    this.message = `${attacker.name} 使用${skill.name}，命中 ${targets.length} 个目标`;
    this.phase = "select";
    this.highlights = [];
    this.selectedId = null;
    this.checkResult();
    if (attacker.side === "player") this.advanceAfterPlayerAction();
  }

  applyDamage(attacker, target, skill) {
    target.direction = directionTo(target, attacker);
    const exposedBonus = target.status?.exposed ? 8 : 0;
    const rawDamage = (skill.damage ?? attacker.damage) + (skill.damage ? attacker.bonusAttack || 0 : 0) + exposedBonus;
    const damage = Math.max(1, rawDamage - (target.defense || 0));
    target.hp = Math.max(0, target.hp - damage);
    target.alive = target.hp > 0;
    if (skill.status) target.status[skill.status] = skill.statusTurns || 1;
    target.animation = { type: "hit", damage, time: 0.56, duration: 0.56, skill, fromHp: target.displayHp, toHp: target.hp };
    this.audit.attacks.push({ attackerId: attacker.id, targetId: target.id, skillId: skill.id, damage, targetHp: target.hp, status: skill.status || null });
  }

  castSupport(attacker, skill) {
    attacker.qi = Math.max(0, attacker.qi - skill.cost);
    const allies = this.living(attacker.side).filter((unit) => unit.alive);
    for (const ally of allies) {
      if (skill.heal) {
        ally.hp = Math.min(ally.maxHp, ally.hp + skill.heal);
        ally.animation = { type: "heal", amount: skill.heal, time: 0.48, duration: 0.48, skill };
      }
      if (skill.qiRestore) ally.qi += skill.qiRestore;
    }
    attacker.moved = true;
    attacker.acted = true;
    this.audit.attacks.push({ attackerId: attacker.id, targetId: "allies", skillId: skill.id, heal: skill.heal || 0, qiRestore: skill.qiRestore || 0 });
    this.playSkillSfx(skill);
    this.message = `${attacker.name} 使用${skill.name}`;
    this.phase = "select";
    this.highlights = [];
    this.selectedId = null;
    if (attacker.side === "player") this.advanceAfterPlayerAction();
  }

  advanceAfterPlayerAction() {
    if (this.finished || this.side !== "player") return;
    const next = this.living("player").find((unit) => !unit.acted);
    if (!next) {
      this.endPlayerTurn();
      return;
    }
    this.selectedId = next.id;
    this.phase = next.moved ? "act" : "move";
    this.highlights = next.moved ? [] : this.movesFor(next);
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
    if (enemy?.status?.stunned) {
      enemy.status.stunned -= 1;
      this.message = `${enemy.name} 被点穴，无法行动`;
    } else if (enemy && target) {
      const skill = this.skillsFor(enemy)[0];
      if (skill && distance(enemy, target) <= skill.range) this.castSkill(enemy, target, skill);
    }
    for (const unit of this.units) this.tickStatus(unit);
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

  targetable(unit, skill = this.skillsFor(unit)[0]) {
    const targetSide = unit.side === "player" ? "enemy" : "player";
    return this.living(targetSide).filter((target) => target.alive && distance(unit, target) <= skill.range);
  }

  movesFor(unit) {
    if (!unit || unit.moved) return [];
    const occupied = new Set(this.units.filter((item) => item.alive && item.id !== unit.id).map((item) => `${item.x},${item.y}`));
    const moves = [];
    for (let y = 0; y < BATTLE.rows; y += 1) {
      for (let x = 0; x < BATTLE.cols; x += 1) {
        const steps = distance(unit, { x, y });
        if (steps > 0 && !occupied.has(`${x},${y}`) && steps <= unit.move) moves.push({ x, y, kind: "move" });
      }
    }
    return moves;
  }

  isHighlighted(x, y, kind) {
    return this.highlights.some((cell) => cell.x === x && cell.y === y && cell.kind === kind);
  }

  skillsFor(unit) {
    if (!unit) return [];
    return (unit.skillIds || ["quick_slash"]).map((id) => this.skillById(id)).filter(Boolean).slice(0, 3);
  }

  skillById(id) {
    return BATTLE.skills[id] || null;
  }

  tickStatus(unit) {
    for (const [key, turns] of Object.entries(unit.status || {})) {
      if (turns <= 1) delete unit.status[key];
      else unit.status[key] = turns - 1;
    }
  }

  playSkillSfx(skill) {
    if (skill.kind === "ally_all") return this.skillSfx.heal?.play();
    if (skill.status === "stunned") return this.skillSfx.stunned?.play();
    if (skill.kind === "aoe") return this.skillSfx.aoe?.play();
    return this.hitSfx?.play();
  }

  layout() {
    const top = Math.max(112, (this.viewport.menuButton?.bottom || 44) + 76);
    const panelHeight = 236;
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
    const top = this.layout().field.y;
    context.fillRect(0, 0, this.viewport.width, top);
    const titleY = Math.max(42, (this.viewport.safeArea?.top || 0) + 42);
    context.textAlign = "left";
    context.fillStyle = "#f2e5c8";
    context.font = "700 20px serif";
    context.fillText(BATTLE.title, 18, titleY);
    context.font = "14px sans-serif";
    context.fillStyle = "#d8bd82";
    context.fillText(`${this.side === "player" ? "我方回合" : "敌方回合"}  ·  ${BATTLE.objective}`, 18, titleY + 30);
    const buttonTop = Math.max(70, top - 54);
    ui.button(context, "battle:end", this.viewport.width - 112, buttonTop, 90, 42, "结束回合", this.side === "player" ? "normal" : "disabled");
  }

  drawField(context) {
    const { field, grid, tile } = this.layout();
    context.save();
    context.beginPath();
    context.rect(field.x, field.y, field.width, field.height);
    context.clip();
    context.fillStyle = "#121511";
    context.fillRect(field.x, field.y, field.width, field.height);
    const background = this.images[this.mapKey] || this.images.battleTemple;
    if (background) drawImageCover(context, background, field.x, field.y, field.width, field.height);
    context.fillStyle = "rgba(8, 10, 8, 0.12)";
    context.fillRect(field.x, field.y, field.width, field.height);
    const selected = this.selected;
    if (selected) {
      context.fillStyle = "rgba(229, 190, 82, 0.26)";
      context.strokeStyle = "rgba(255, 221, 112, 0.92)";
      context.lineWidth = 3;
      context.fillRect(grid.x + selected.x * tile, grid.y + selected.y * tile, tile, tile);
      context.strokeRect(grid.x + selected.x * tile + 2, grid.y + selected.y * tile + 2, tile - 4, tile - 4);
    }
    for (const cell of this.highlights) {
      context.fillStyle = cell.kind === "target" ? "rgba(209, 48, 38, 0.40)" : "rgba(134, 224, 122, 0.34)";
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
      const hit = unit.animation?.type === "hit" ? Math.sin(unit.animation.time * 92) * 7 : 0;
      const lunge = unit.animation?.type === "attack" ? attackLunge(unit) : { x: 0, y: 0 };
      const alpha = unit.animation?.type === "hit" && Math.floor(unit.animation.time * 34) % 2 === 0 ? 0.32 : 1;
      context.globalAlpha = alpha;
      drawSprite(context, this.images[unit.sprite], center.x + hit + lunge.x, center.y + 22 + lunge.y, unit.direction, unit.animation?.type === "attack" ? 2 : unit.frame, 70, 70);
      context.globalAlpha = 1;
      if (unit.animation?.type === "hit") {
        context.fillStyle = "rgba(255, 246, 210, 0.35)";
        context.beginPath();
        context.arc(center.x, center.y + 2, 34, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#f5ead2";
      context.font = "12px sans-serif";
      context.textAlign = "center";
      context.fillText(unit.name, center.x, center.y - 32);
      context.fillStyle = "rgba(20, 14, 10, 0.86)";
      context.fillRect(center.x - 24, center.y + 29, 48, 5);
      context.fillStyle = unit.side === "player" ? "#65d28c" : "#e65d50";
      context.fillRect(center.x - 24, center.y + 29, 48 * Math.max(0, unit.displayHp / unit.maxHp), 5);
      if (unit.animation?.type === "hit" && unit.animation.fromHp > unit.hp) {
        const fromWidth = 48 * Math.max(0, unit.animation.fromHp / unit.maxHp);
        const toWidth = 48 * Math.max(0, unit.hp / unit.maxHp);
        context.fillStyle = "#ffd36b";
        context.fillRect(center.x - 24 + toWidth, center.y + 29, Math.max(0, fromWidth - toWidth), 5);
      }
      if (unit.status?.stunned || unit.status?.exposed) {
        context.fillStyle = unit.status.stunned ? "#ffd36b" : "#9bd1ff";
        context.font = "700 11px sans-serif";
        context.fillText(unit.status.stunned ? "晕" : "破", center.x + 28, center.y - 22);
      }
      if (unit.animation?.type === "hit" && unit.animation.damage) {
        context.fillStyle = "#ffd36b";
        context.strokeStyle = "rgba(22, 10, 8, 0.9)";
        context.lineWidth = 3;
        context.font = "700 16px sans-serif";
        context.strokeText(`-${unit.animation.damage}`, center.x, center.y - 48);
        context.fillText(`-${unit.animation.damage}`, center.x, center.y - 48);
      }
      if (unit.id === this.selectedId && unit.side === this.side) {
        context.strokeStyle = "rgba(255, 226, 116, 0.96)";
        context.lineWidth = 3;
        context.beginPath();
        context.ellipse(center.x, center.y + 34, 30, 10, 0, 0, Math.PI * 2);
        context.stroke();
      }
      if (unit.animation?.type === "heal") {
        context.fillStyle = "#9dffad";
        context.font = "700 16px sans-serif";
        context.fillText(`+${unit.animation.amount}`, center.x, center.y - 48);
      }
      if (unit.animation?.type === "attack") this.drawAttackLine(context, unit);
    }
  }

  drawAttackLine(context, unit) {
    const from = this.cellCenter(unit);
    const to = this.cellCenter({ x: unit.animation.targetX, y: unit.animation.targetY });
    const progress = 1 - Math.max(0, unit.animation.time) / (unit.animation.duration || 0.26);
    const color = unit.animation.skill?.status === "stunned" ? "#ffd36b" : unit.animation.skill?.kind === "aoe" ? "#ff8b4a" : "#f4e6c6";
    context.strokeStyle = color;
    context.lineWidth = unit.animation.skill?.kind === "basic" ? 7 : 5;
    context.lineCap = "round";
    context.beginPath();
    const midX = from.x + (to.x - from.x) * progress;
    const midY = from.y + (to.y - from.y) * progress - 8;
    context.moveTo(from.x, from.y - 8);
    context.lineTo(midX, midY);
    context.stroke();
    context.fillStyle = "rgba(255, 236, 180, 0.28)";
    context.beginPath();
    context.arc(to.x, to.y - 8, 18 + Math.sin(progress * Math.PI) * 18, 0, Math.PI * 2);
    context.fill();
    context.lineCap = "butt";
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
    const actionDisabled = !selected || selected.acted;
    ui.button(context, "battle:attack", 24, panel.y + 78, Math.floor((panel.width - 58) / 2), 34, "普通攻击", actionDisabled ? "disabled" : "primary");
    ui.button(context, "battle:wait", panel.width / 2 + 5, panel.y + 78, Math.floor((panel.width - 58) / 2), 34, "待命", actionDisabled ? "disabled" : "normal");
    const skills = this.skillsFor(selected);
    skills.forEach((skill, index) => {
      const y = panel.y + 120 + index * 32;
      const disabled = !selected || selected.acted || selected.qi < skill.cost;
      ui.button(context, `battle:skill:${skill.id}`, 24, y, panel.width - 48, 28, `${skill.name}  -${skill.cost}`, disabled ? "disabled" : "normal");
    });
    context.textAlign = "left";
    context.fillStyle = "rgba(246, 234, 209, 0.68)";
    context.font = "12px sans-serif";
    context.fillText("普通攻击不耗气；移动后可攻击、放技能或待命。", 24, panel.y + 218);
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

function attackLunge(unit) {
  const progress = 1 - Math.max(0, unit.animation.time) / (unit.animation.duration || 0.26);
  const distance = Math.sin(Math.min(1, progress) * Math.PI) * 8;
  if (unit.direction === "left") return { x: -distance, y: 0 };
  if (unit.direction === "right") return { x: distance, y: 0 };
  if (unit.direction === "up") return { x: 0, y: -distance };
  return { x: 0, y: distance };
}

function drawImageCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

module.exports = { BattleScene };
