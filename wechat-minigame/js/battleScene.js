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
    this.impactEffects = [];
    this.screenShake = 0;
    this.hitStop = 0;
    this.audit = { attacks: [], moves: [], enemyActions: [], animations: [], renderedAttackFrames: [], result: null };
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
    this.turnNotice = { text: "我方回合", time: 1.2 };
    this.impactEffects = [];
    this.screenShake = 0;
    this.hitStop = 0;
    this.active = true;
  }

  get selected() {
    return this.units.find((unit) => unit.id === this.selectedId && unit.alive);
  }

  update(dt) {
    if (!this.active) return;
    const frozen = this.hitStop > 0;
    if (this.hitStop > 0) this.hitStop = Math.max(0, this.hitStop - dt);
    const animationDt = frozen ? dt * 0.18 : dt;
    for (const unit of this.units) {
      unit.frameTime += animationDt;
      if (unit.frameTime > 0.16) {
        unit.frameTime = 0;
        unit.frame = (unit.frame + 1) % 4;
      }
      if (unit.animation) {
        unit.animation.time -= animationDt;
        if (unit.animation.time <= 0) unit.animation = null;
      }
      unit.displayHp += (unit.hp - unit.displayHp) * Math.min(1, dt * 6.2);
    }
    this.impactEffects = this.impactEffects
      .map((effect) => ({ ...effect, time: effect.time - dt }))
      .filter((effect) => effect.time > 0);
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt);
    if (this.turnNotice) {
      this.turnNotice.time -= dt;
      if (this.turnNotice.time <= 0) this.turnNotice = null;
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
    if (button === "battle:undo") return this.undoMove();
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

  undoMove() {
    const unit = this.selected;
    if (!unit || !unit.moved || unit.acted || !unit.previousCell) return;
    unit.x = unit.previousCell.x;
    unit.y = unit.previousCell.y;
    unit.direction = unit.previousCell.direction || unit.direction;
    unit.previousCell = null;
    unit.moved = false;
    unit.animation = { type: "move", time: 0.12 };
    this.audit.moves.push({ id: unit.id, undo: true, x: unit.x, y: unit.y });
    this.phase = "move";
    this.highlights = this.movesFor(unit);
    this.message = `${unit.name} 已取消移动`;
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
      selected.previousCell = { x: selected.x, y: selected.y, direction: selected.direction };
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
    attacker.animation = { type: "attack", targetX: target.x, targetY: target.y, time: 0.42, duration: 0.42, skill };
    this.audit.animations.push({ id: attacker.id, type: "attack", sprite: attacker.attackSprite || attacker.sprite, direction: attacker.direction, frames: [0, 1, 2, 3], duration: 0.42 });
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
    const duration = skill.kind === "basic" ? 0.62 : 0.68;
    target.animation = { type: "hit", damage, time: duration, duration, skill, fromHp: target.displayHp, toHp: target.hp };
    this.impactEffects.push({ x: target.x, y: target.y, time: 0.42, duration: 0.42, skill, damage, side: target.side, sprite: "swordImpact" });
    this.screenShake = Math.max(this.screenShake, skill.kind === "aoe" ? 0.22 : 0.16);
    this.hitStop = Math.max(this.hitStop, skill.kind === "basic" ? 0.07 : 0.085);
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
    this.turnNotice = { text: "敌方回合", time: 1.35 };
    this.message = "敌方回合";
  }

  runEnemyTurn() {
    if (!this.active || this.finished) return;
    const enemies = this.living("enemy").filter((unit) => unit.alive);
    for (const enemy of enemies) {
      const target = nearest(enemy, this.living("player").filter((unit) => unit.alive));
      if (!target) break;
      if (enemy.status?.stunned) {
        enemy.status.stunned -= 1;
        this.message = `${enemy.name} 被点穴，无法行动`;
        this.audit.enemyActions.push({ id: enemy.id, action: "stunned" });
        continue;
      }
      const skill = this.skillsFor(enemy)[0] || this.skillById("basic_attack");
      if (distance(enemy, target) > skill.range) this.moveEnemyToward(enemy, target, skill.range);
      if (distance(enemy, target) <= skill.range) this.enemyCastSkill(enemy, target, skill);
      else {
        this.message = `${enemy.name} 正在逼近`;
        this.audit.enemyActions.push({ id: enemy.id, action: "advance", x: enemy.x, y: enemy.y });
      }
      if (this.finished) return;
    }
    for (const unit of this.units) this.tickStatus(unit);
    for (const unit of this.living("player")) {
      unit.moved = false;
      unit.acted = false;
      unit.previousCell = null;
    }
    this.side = "player";
    this.phase = "move";
    this.selectedId = this.living("player")[0]?.id || null;
    this.highlights = this.selected ? this.movesFor(this.selected) : [];
    this.turnNotice = { text: "我方回合", time: 1.35 };
    this.message = this.selected ? `${this.selected.name} 行动` : "我方回合";
    this.enemyThinking = false;
  }

  moveEnemyToward(enemy, target, preferredRange = 1) {
    const occupied = new Set(this.units.filter((unit) => unit.alive && unit.id !== enemy.id).map((unit) => `${unit.x},${unit.y}`));
    let best = { x: enemy.x, y: enemy.y, metric: distance(enemy, target) * 10 };
    for (let y = 0; y < BATTLE.rows; y += 1) {
      for (let x = 0; x < BATTLE.cols; x += 1) {
        const steps = distance(enemy, { x, y });
        if (steps < 1 || steps > enemy.move || occupied.has(`${x},${y}`)) continue;
        const rangeDistance = Math.abs(distance({ x, y }, target) - preferredRange);
        const metric = rangeDistance * 10 + distance({ x, y }, target);
        if (metric < best.metric) best = { x, y, metric };
      }
    }
    if (best.x === enemy.x && best.y === enemy.y) return;
    enemy.direction = directionTo(enemy, best);
    enemy.x = best.x;
    enemy.y = best.y;
    enemy.moved = true;
    enemy.animation = { type: "move", time: 0.16 };
    this.audit.enemyActions.push({ id: enemy.id, action: "move", x: enemy.x, y: enemy.y });
  }

  enemyCastSkill(enemy, target, skill) {
    if (!skill || enemy.qi < skill.cost) skill = this.skillById("basic_attack");
    enemy.qi = Math.max(0, enemy.qi - (skill.cost || 0));
    enemy.direction = directionTo(enemy, target);
    this.applyDamage(enemy, target, skill);
    enemy.moved = true;
    enemy.acted = true;
    enemy.animation = { type: "attack", targetX: target.x, targetY: target.y, time: 0.42, duration: 0.42, skill };
    this.audit.animations.push({ id: enemy.id, type: "attack", sprite: enemy.attackSprite || enemy.sprite, direction: enemy.direction, frames: [0, 1, 2, 3], duration: 0.42 });
    this.playSkillSfx(skill);
    this.message = `${enemy.name} 攻击 ${target.name}`;
    this.audit.enemyActions.push({ id: enemy.id, action: "attack", targetId: target.id, skillId: skill.id });
    this.checkResult();
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
    const shake = this.shakeOffset();
    context.translate(shake.x, shake.y);
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
    this.drawImpactEffects(context);
    this.drawTurnNotice(context, field);
    context.restore();
  }

  drawUnits(context) {
    const units = this.units.filter((unit) => unit.alive || unit.animation).sort((a, b) => a.y - b.y);
    for (const unit of units) {
      const center = this.cellCenter(unit);
      const hit = unit.animation?.type === "hit" ? hitReactionOffset(unit) : { x: 0, y: 0 };
      const attacking = unit.animation?.type === "attack";
      const lunge = attacking ? attackLunge(unit) : { x: 0, y: 0 };
      const alpha = unit.animation?.type === "hit" && Math.floor(unit.animation.time * 42) % 2 === 0 ? 0.45 : 1;
      const spriteKey = attacking && unit.attackSprite && this.images[unit.attackSprite] ? unit.attackSprite : unit.sprite;
      const frame = attacking ? attackAnimationFrame(unit.animation) : unit.frame;
      if (attacking && !this.audit.renderedAttackFrames.some((event) => event.id === unit.id && event.frame === frame)) {
        this.audit.renderedAttackFrames.push({ id: unit.id, sprite: spriteKey, direction: unit.direction, frame });
      }
      context.globalAlpha = alpha;
      drawSprite(context, this.images[spriteKey], center.x + hit.x + lunge.x, center.y + 22 + hit.y + lunge.y, unit.direction, frame, 70, 70);
      context.globalAlpha = 1;
      if (unit.animation?.type === "hit") {
        const flashProgress = 1 - Math.max(0, unit.animation.time) / (unit.animation.duration || 0.56);
        context.fillStyle = `rgba(255, 246, 210, ${0.48 * (1 - flashProgress)})`;
        context.beginPath();
        context.arc(center.x + hit.x * 0.35, center.y + 2 + hit.y * 0.35, 34 + flashProgress * 16, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#f5ead2";
      context.font = "12px sans-serif";
      context.textAlign = "center";
      context.fillText(unit.name, center.x, center.y - 32);
      context.fillStyle = "rgba(20, 14, 10, 0.86)";
      context.fillRect(center.x - 24, center.y + 29, 48, 5);
      context.fillStyle = unit.side === "player" ? "#65d28c" : "#e65d50";
      const hpWidth = 48 * Math.max(0, unit.hp / unit.maxHp);
      context.fillRect(center.x - 24, center.y + 29, hpWidth, 5);
      if (unit.displayHp > unit.hp) {
        const fromWidth = 48 * Math.max(0, unit.displayHp / unit.maxHp);
        const toWidth = hpWidth;
        context.fillStyle = "#ffd36b";
        context.fillRect(center.x - 24 + toWidth, center.y + 29, Math.max(0, fromWidth - toWidth), 5);
      }
      if (unit.status?.stunned || unit.status?.exposed) {
        context.fillStyle = unit.status.stunned ? "#ffd36b" : "#9bd1ff";
        context.font = "700 11px sans-serif";
        context.fillText(unit.status.stunned ? "晕" : "破", center.x + 28, center.y - 22);
      }
      if (unit.animation?.type === "hit" && unit.animation.damage) {
        const progress = 1 - Math.max(0, unit.animation.time) / (unit.animation.duration || 0.56);
        const textY = center.y - 46 - Math.sin(Math.min(1, progress) * Math.PI) * 18;
        context.fillStyle = "#ffd36b";
        context.strokeStyle = "rgba(22, 10, 8, 0.9)";
        context.lineWidth = 3;
        context.font = "800 19px sans-serif";
        context.strokeText(`-${unit.animation.damage}`, center.x, textY);
        context.fillText(`-${unit.animation.damage}`, center.x, textY);
      }
      if (unit.animation?.type === "heal") {
        context.fillStyle = "#9dffad";
        context.font = "700 16px sans-serif";
        context.fillText(`+${unit.animation.amount}`, center.x, center.y - 48);
      }
      if (attacking && (unit.animation.skill?.kind !== "basic" || !unit.attackSprite)) this.drawAttackLine(context, unit);
    }
  }

  drawImpactEffects(context) {
    for (const effect of this.impactEffects) {
      const center = this.cellCenter(effect);
      const progress = 1 - Math.max(0, effect.time) / (effect.duration || 0.34);
      const alpha = Math.max(0, 1 - progress);
      const radius = 12 + progress * 30;
      const isAoe = effect.skill?.kind === "aoe";
      const isStun = effect.skill?.status === "stunned";
      context.save();
      context.translate(center.x, center.y + 4);
      context.globalAlpha = alpha;
      if (this.images[effect.sprite]) {
        const image = this.images[effect.sprite];
        const frame = Math.min(15, Math.floor(progress * 16));
        const sourceWidth = image.width / 4;
        const sourceHeight = image.height / 4;
        const sx = (frame % 4) * sourceWidth;
        const sy = Math.floor(frame / 4) * sourceHeight;
        const size = isAoe ? 112 : 94;
        context.drawImage(image, sx, sy, sourceWidth, sourceHeight, -size / 2, -size / 2, size, size);
      }
      context.strokeStyle = isStun ? "#ffe57a" : isAoe ? "#ff9050" : "#fff0bd";
      context.fillStyle = isStun ? "rgba(255, 229, 122, 0.28)" : isAoe ? "rgba(255, 118, 66, 0.24)" : "rgba(255, 244, 205, 0.26)";
      context.lineWidth = isAoe ? 6 : 5;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(-30 - progress * 12, -22 + progress * 8);
      context.lineTo(26 + progress * 18, 19 - progress * 6);
      context.moveTo(-18, 24 + progress * 4);
      context.lineTo(28 + progress * 12, -26 - progress * 8);
      context.stroke();
      context.lineWidth = 2;
      for (let i = 0; i < 7; i += 1) {
        const angle = -0.9 + i * 0.3;
        const inner = 9 + progress * 10;
        const outer = 24 + progress * 26;
        context.beginPath();
        context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        context.stroke();
      }
      context.restore();
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

  drawTurnNotice(context, field) {
    if (!this.turnNotice) return;
    const alpha = Math.min(1, this.turnNotice.time / 0.28);
    const width = Math.min(220, this.viewport.width - 56);
    const x = (this.viewport.width - width) / 2;
    const y = field.y + 14;
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = "rgba(21, 16, 11, 0.92)";
    roundedRect(context, x, y, width, 42, 7);
    context.fill();
    context.strokeStyle = "rgba(224, 192, 126, 0.74)";
    context.stroke();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#f5ead2";
    context.font = "700 17px serif";
    context.fillText(this.turnNotice.text, this.viewport.width / 2, y + 21);
    context.textBaseline = "alphabetic";
    context.restore();
  }

  shakeOffset() {
    if (!this.screenShake) return { x: 0, y: 0 };
    const strength = Math.min(7, 2 + this.screenShake * 28);
    return {
      x: Math.sin(this.screenShake * 173) * strength,
      y: Math.cos(this.screenShake * 211) * strength * 0.62
    };
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
    if (selected?.moved && !selected.acted && selected.previousCell) {
      ui.button(context, "battle:undo", panel.width - 104, panel.y + 28, 80, 30, "取消移动", "normal");
    }
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

function nearest(from, units) {
  return units.slice().sort((a, b) => distance(from, a) - distance(from, b))[0] || null;
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function directionTo(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

function attackLunge(unit) {
  const progress = 1 - Math.max(0, unit.animation.time) / (unit.animation.duration || 0.26);
  const distance = Math.sin(Math.min(1, progress) * Math.PI) * 15;
  if (unit.direction === "left") return { x: -distance, y: 0 };
  if (unit.direction === "right") return { x: distance, y: 0 };
  if (unit.direction === "up") return { x: 0, y: -distance };
  return { x: 0, y: distance };
}

function hitReactionOffset(unit) {
  const progress = 1 - Math.max(0, unit.animation.time) / (unit.animation.duration || 0.56);
  const recoil = Math.sin(Math.min(1, progress) * Math.PI) * 12;
  const jitter = Math.sin(unit.animation.time * 118) * 3.5 * (1 - progress);
  if (unit.direction === "left") return { x: recoil + jitter, y: 0 };
  if (unit.direction === "right") return { x: -recoil + jitter, y: 0 };
  if (unit.direction === "up") return { x: jitter, y: recoil };
  return { x: jitter, y: -recoil };
}

function attackAnimationFrame(animation) {
  const duration = animation.duration || 0.36;
  const progress = 1 - Math.max(0, animation.time) / duration;
  return Math.min(3, Math.floor(Math.max(0, progress) * 4));
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
