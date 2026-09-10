import { CharacterSpriteRenderer } from "../entities/CharacterSpriteRenderer.js";
import { EffectRenderer } from "./EffectRenderer.js";

export class TacticsRenderer {
  constructor(context, map, state, sprites = new Map(), effects = new Map()) {
    this.context = context;
    this.map = map;
    this.state = state;
    this.spriteRenderer = new CharacterSpriteRenderer(sprites);
    this.effectRenderer = new EffectRenderer(effects);
    this.view = {
      x: Math.round((context.canvas.width - map.pixelWidth) / 2),
      y: Math.round((context.canvas.height - map.pixelHeight) / 2),
      width: map.pixelWidth,
      height: map.pixelHeight
    };
    this.impactTimer = 0;
    this.renderedAttackFrames = [];
    this.attackFrameAudit = new WeakMap();
  }

  draw() {
    const ctx = this.context;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#0f1410";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    if (this.impactTimer > 0) {
      const shake = Math.round(Math.sin(this.impactTimer * 145) * 5);
      ctx.translate(shake, 0);
    }
    ctx.drawImage(this.map.image, this.view.x, this.view.y, this.view.width, this.view.height);
    this.drawGrid();
    this.drawHighlights();
    this.drawUnits();
    ctx.restore();
    if (this.impactTimer > 0) {
      ctx.fillStyle = `rgba(255, 237, 180, ${Math.min(0.11, this.impactTimer * 0.45)})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }

  cellFromCanvasPoint(point) {
    const x = point.x - this.view.x;
    const y = point.y - this.view.y;
    if (x < 0 || y < 0 || x >= this.view.width || y >= this.view.height) return null;
    return {
      x: Math.floor(x / this.map.tileSize),
      y: Math.floor(y / this.map.tileSize)
    };
  }

  drawGrid() {
    const ctx = this.context;
    ctx.save();
    ctx.strokeStyle = "rgba(245, 234, 208, 0.13)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.map.width; x += 1) {
      const px = this.view.x + x * this.map.tileSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, this.view.y);
      ctx.lineTo(px, this.view.y + this.view.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.map.height; y += 1) {
      const py = this.view.y + y * this.map.tileSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(this.view.x, py);
      ctx.lineTo(this.view.x + this.view.width, py);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHighlights() {
    const ctx = this.context;
    for (const cell of this.state.highlightedMoves) {
      this.fillCell(cell, "rgba(92, 169, 255, 0.34)");
    }
    for (const cell of this.state.highlightedTargets) {
      this.fillCell(cell, "rgba(225, 68, 56, 0.28)");
      this.strokeCell(cell, "rgba(255, 208, 127, 0.95)", 3);
    }
    const selected = this.state.selected;
    if (selected) this.strokeCell(selected.cell, "rgba(255, 223, 128, 0.9)", 3);
    for (const unit of this.state.living("enemy")) {
      if (selected && this.state.phase !== "target" && distanceCells(selected.cell, unit.cell) <= selected.attackRange + 2) {
        this.strokeCell(unit.cell, "rgba(233, 82, 66, 0.74)", 2);
      }
    }
  }

  drawUnits() {
    const ctx = this.context;
    const units = this.state.units.filter((unit) => unit.alive || unit.animation).sort((a, b) => a.cell.y - b.cell.y);
    for (const unit of units) {
      const center = this.map.cellCenter(unit.cell);
      const px = this.view.x + center.x;
      const py = this.view.y + center.y;
      const attack = unit.animation?.type === "attack" ? unit.animation : null;
      const hitAnimation = unit.animation?.type === "hit" ? unit.animation : null;
      const hitProgress = hitAnimation ? 1 - hitAnimation.time / hitAnimation.duration : 0;
      const hitKick = hitAnimation ? Math.sin(Math.max(0, Math.min(1, hitProgress)) * Math.PI) * 9 : 0;
      const hit = hitAnimation ? 5 : 0;
      const hitFlash = unit.animation?.type === "hit" && Math.floor(unit.animation.time * 28) % 2 === 0;
      const attackProgress = attack ? 1 - attack.time / attack.duration : 0;
      const attackFrame = attack ? Math.min(3, Math.floor(attackProgress * 4)) : unit.frame;
      const attackLunge = attack?.melee ? Math.sin(Math.max(0, Math.min(1, attackProgress)) * Math.PI) * 14 : 0;
      const attackDx = attack?.melee ? Math.sign(attack.target.x - unit.cell.x) * attackLunge : 0;
      const attackDy = attack?.melee ? Math.sign(attack.target.y - unit.cell.y) * attackLunge : 0;
      const drawX = px + attackDx + (hitAnimation?.from ? Math.sign(unit.cell.x - hitAnimation.from.x) * hitKick : 0);
      const drawY = py + hit + attackDy;
      const frame = attack ? attackFrame : unit.frame;
      if (attack) this.auditAttackFrame(unit, attack, attackFrame);
      const drewSprite = this.spriteRenderer.draw(ctx, attack?.attackSprite || unit.spriteId || unit.id, {
        x: drawX,
        y: drawY + 22,
        direction: unit.direction,
        frame,
        alpha: hitFlash ? 0.38 : 1,
        acted: unit.acted,
        sheet: attack ? "attack" : "walk"
      });
      if (drewSprite) {
        this.drawUnitLabels(unit, px, py);
        if (unit.animation?.type === "hit") this.drawDamageText(unit, px, py);
        if (attack) this.drawAttackArc(unit);
        continue;
      }
      const body = unit.side === "player" ? "#2d6fb2" : "#8f2d2d";
      const coat = unit.side === "player" ? "#e8d5a2" : "#1f1614";
      ctx.save();
      ctx.translate(px, py + hit);
      ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
      ctx.beginPath();
      ctx.ellipse(0, 21, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(-16, -18, 32, 40, 8);
      ctx.fill();
      ctx.fillStyle = coat;
      ctx.fillRect(-10, -8, 20, 8);
      ctx.fillStyle = "#14100f";
      ctx.beginPath();
      ctx.arc(0, -23, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5ead0";
      ctx.font = "12px Songti SC, serif";
      ctx.textAlign = "center";
      ctx.fillText(unit.name, 0, -38);
      ctx.fillStyle = "rgba(27, 16, 13, 0.88)";
      ctx.fillRect(-24, 30, 48, 6);
      ctx.fillStyle = unit.side === "player" ? "#6cd48b" : "#f16d62";
      ctx.fillRect(-24, 30, 48 * ((unit.visualHp ?? unit.hp) / unit.maxHp), 6);
      if (unit.acted) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      if (hitAnimation) this.drawDamageText(unit, drawX, drawY);
      if (attack) this.drawAttackArc(unit);
    }
  }

  drawDamageText(unit, px, py) {
    const damage = unit.animation?.damage;
    if (!damage) return;
    const duration = unit.animation.duration || 0.34;
    const progress = Math.max(0, Math.min(1, 1 - unit.animation.time / duration));
    const ctx = this.context;
    ctx.save();
    ctx.globalAlpha = Math.max(0.1, 1 - progress * 0.45);
    ctx.font = "bold 18px Songti SC, serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(28, 12, 8, 0.9)";
    ctx.fillStyle = "#ffd36b";
    const y = py - 46 - progress * 24;
    ctx.strokeText(`-${damage}`, px, y);
    ctx.fillText(`-${damage}`, px, y);
    ctx.restore();
  }

  drawUnitLabels(unit, px, py) {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = "#f5ead0";
    ctx.font = "12px Songti SC, serif";
    ctx.textAlign = "center";
    ctx.fillText(unit.name, px, py - 38);
    ctx.fillStyle = "rgba(27, 16, 13, 0.88)";
    ctx.fillRect(px - 24, py + 30, 48, 6);
    ctx.fillStyle = unit.side === "player" ? "#6cd48b" : "#f16d62";
    ctx.fillRect(px - 24, py + 30, 48 * ((unit.visualHp ?? unit.hp) / unit.maxHp), 6);
    ctx.restore();
  }

  drawAttackArc(unit) {
    const ctx = this.context;
    const from = this.map.cellCenter(unit.cell);
    const to = this.map.cellCenter(unit.animation.target);
    const progress = 1 - unit.animation.time / unit.animation.duration;
    if (
      this.effectRenderer.draw(ctx, unit.animation.effectId || "sword_slash", {
        x: this.view.x + to.x,
        y: this.view.y + to.y - 16,
        time: unit.animation.time,
        duration: unit.animation.duration || 0.42,
        scale: 0.86
      })
    ) {
      if (progress > 0.45) {
        this.effectRenderer.draw(ctx, "hit_spark", {
          x: this.view.x + to.x,
          y: this.view.y + to.y - 16,
          time: Math.max(0, 0.18 - (progress - 0.45) * 0.36),
          duration: 0.18,
          scale: 0.72
        });
      }
      return;
    }
    ctx.save();
    ctx.strokeStyle = "rgba(255, 236, 164, 0.92)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.view.x + from.x, this.view.y + from.y - 16);
    ctx.lineTo(this.view.x + to.x, this.view.y + to.y - 16);
    ctx.stroke();
    ctx.restore();
  }

  auditAttackFrame(unit, animation, frame) {
    let seen = this.attackFrameAudit.get(animation);
    if (!seen) {
      seen = new Set();
      this.attackFrameAudit.set(animation, seen);
    }
    if (seen.has(frame)) return;
    seen.add(frame);
    this.renderedAttackFrames.push({ unitId: unit.id, frame });
  }

  fillCell(cell, color) {
    this.context.fillStyle = color;
    this.context.fillRect(this.view.x + cell.x * this.map.tileSize, this.view.y + cell.y * this.map.tileSize, this.map.tileSize, this.map.tileSize);
  }

  strokeCell(cell, color, width) {
    this.context.strokeStyle = color;
    this.context.lineWidth = width;
    this.context.strokeRect(this.view.x + cell.x * this.map.tileSize + width / 2, this.view.y + cell.y * this.map.tileSize + width / 2, this.map.tileSize - width, this.map.tileSize - width);
  }
}

function distanceCells(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
