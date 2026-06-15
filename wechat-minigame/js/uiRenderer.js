const { GAME } = require("./config");

class UiRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.buttons = [];
    this.headerHeight = Math.max(82, (viewport.menuButton?.bottom || 44) + 48);
    this.playRect = { x: 0, y: this.headerHeight, width: viewport.width, height: viewport.height - this.headerHeight - 122 };
  }

  render(context, state) {
    this.buttons = [];
    if (state.mode === "menu") return this.renderMenu(context, state);
    this.renderHud(context, state);
    if (state.dialog.active) this.renderDialog(context, state.dialog.page);
    else this.renderControls(context, state.activeTrigger);
  }

  renderMenu(context, state) {
    const { width, height } = this.viewport;
    context.fillStyle = "#171510";
    context.fillRect(0, 0, width, height);
    if (state.images.world) {
      context.globalAlpha = 0.48;
      context.drawImage(state.images.world, 2450, 1850, 930, 1560, 0, 0, width, height);
      context.globalAlpha = 1;
    }
    context.fillStyle = "rgba(12, 10, 7, 0.46)";
    context.fillRect(0, 0, width, height);
    context.textAlign = "center";
    context.fillStyle = "#f5e6bd";
    context.font = "700 38px serif";
    context.fillText(GAME.title, width / 2, height * 0.25);
    context.fillStyle = "#d8bd82";
    context.font = "15px serif";
    context.fillText(GAME.subtitle, width / 2, height * 0.25 + 34);
    this.button(context, "new", width / 2 - 112, height * 0.52, 224, 52, "新开始游戏", "primary");
    this.button(context, "continue", width / 2 - 112, height * 0.52 + 66, 224, 52, state.hasSave ? "加载存档" : "暂无存档", state.hasSave ? "normal" : "disabled");
    this.button(context, "music", width / 2 - 112, height * 0.52 + 132, 224, 48, state.musicEnabled ? "音乐：开" : "音乐：关", "normal");
    context.fillStyle = "rgba(246, 234, 209, 0.68)";
    context.font = "12px sans-serif";
    context.fillText("竖屏触控版 · 轻触方向键移动", width / 2, height - 38);
  }

  renderHud(context, state) {
    const width = this.viewport.width;
    context.fillStyle = "rgba(25, 20, 14, 0.94)";
    context.fillRect(0, 0, width, this.headerHeight);
    context.textAlign = "left";
    context.fillStyle = "#f2e5c8";
    context.font = "700 18px serif";
    context.fillText(GAME.heroName, 18, 31);
    context.font = "12px sans-serif";
    context.fillStyle = "#d8bd82";
    context.fillText(`苍山旧道  ·  HP 88/88  ·  银 120`, 18, 53);
    this.button(context, "menu", width - 54, this.headerHeight - 45, 38, 34, "≡", "icon");
  }

  renderControls(context, trigger) {
    const h = this.viewport.height;
    context.fillStyle = "#171510";
    context.fillRect(0, this.playRect.y + this.playRect.height, this.viewport.width, h);
    const baseY = h - 66;
    this.button(context, "left", 22, baseY - 31, 52, 52, "◀", "control");
    this.button(context, "up", 78, baseY - 61, 52, 52, "▲", "control");
    this.button(context, "down", 78, baseY - 5, 52, 52, "▼", "control");
    this.button(context, "right", 134, baseY - 31, 52, 52, "▶", "control");
    this.button(context, "interact", this.viewport.width - 92, baseY - 38, 68, 68, trigger ? "交互" : "查看", trigger ? "primaryRound" : "disabledRound");
    if (trigger) {
      context.textAlign = "right";
      context.font = "13px sans-serif";
      context.fillStyle = "#ead5a3";
      context.fillText(trigger.label, this.viewport.width - 104, h - 76);
    }
  }

  renderDialog(context, page) {
    const width = this.viewport.width;
    const choices = page.choices || [{ label: "继续" }];
    const boxHeight = 174 + Math.max(0, choices.length - 1) * 48;
    const y = this.viewport.height - boxHeight - 12;
    context.fillStyle = "rgba(20, 16, 11, 0.96)";
    roundedRect(context, 10, y, width - 20, boxHeight, 6);
    context.fill();
    context.strokeStyle = "rgba(220, 186, 116, 0.55)";
    context.stroke();
    context.textAlign = "left";
    context.fillStyle = "#e3c98f";
    context.font = "700 15px serif";
    context.fillText(page.speaker || "旁白", 26, y + 28);
    context.fillStyle = "#f5ead2";
    context.font = "15px sans-serif";
    drawWrappedText(context, page.text, 26, y + 54, width - 52, 23, 3);
    choices.forEach((choice, index) => this.button(context, `choice:${index}`, 24, y + 116 + index * 48, width - 48, 40, choice.label, index === 0 ? "primary" : "normal"));
  }

  renderPause(context, state) {
    this.renderMenu(context, state);
  }

  button(context, id, x, y, width, height, label, kind) {
    const disabled = kind.startsWith("disabled");
    const round = kind.endsWith("Round");
    context.fillStyle = disabled ? "rgba(88, 82, 70, 0.5)" : kind.startsWith("primary") ? "#8f2e23" : "rgba(50, 43, 32, 0.92)";
    context.strokeStyle = disabled ? "rgba(180,170,150,.2)" : "rgba(224, 192, 126, 0.58)";
    context.beginPath();
    if (round) context.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    else roundedRect(context, x, y, width, height, kind === "icon" ? 5 : 6);
    context.fill();
    context.stroke();
    context.fillStyle = disabled ? "#8f8879" : "#f5ead2";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = kind === "icon" ? "22px sans-serif" : "700 15px sans-serif";
    context.fillText(label, x + width / 2, y + height / 2);
    context.textBaseline = "alphabetic";
    this.buttons.push({ id, x, y, width, height, disabled });
  }

  hit(x, y) {
    return this.buttons.find((button) => !button.disabled && x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height)?.id || null;
  }
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

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  let line = "";
  let lineNumber = 0;
  for (const char of text) {
    const candidate = line + char;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lineNumber * lineHeight);
      line = char;
      lineNumber += 1;
      if (lineNumber >= maxLines) return;
    } else line = candidate;
  }
  if (lineNumber < maxLines) context.fillText(line, x, y + lineNumber * lineHeight);
}

module.exports = { UiRenderer };
