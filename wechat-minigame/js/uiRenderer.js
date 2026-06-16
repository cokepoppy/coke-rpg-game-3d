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
    this.lastState = state;
    if (state.mode === "menu") return this.renderMenu(context, state);
    this.renderHud(context, state);
    if (state.dialog.active) this.renderDialog(context, state.dialog.page);
    else this.renderControls(context, state.activeTrigger);
  }

  renderMenu(context, state) {
    const { width, height } = this.viewport;
    context.fillStyle = "#171510";
    context.fillRect(0, 0, width, height);
    if (state.images.worldEast) {
      context.globalAlpha = 0.48;
      context.drawImage(state.images.worldEast, 210, 1850, 930, 1560, 0, 0, width, height);
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
    context.fillText(`苍山旧道  ·  HP 88/88  ·  银 ${state.money ?? 120}`, 18, 53);
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
    this.button(context, "inventory", this.viewport.width - 166, baseY - 88, 68, 34, "背包", "normal");
    if (this.lastState?.worldMapUnlocked) this.button(context, "worldmap", this.viewport.width - 92, baseY - 88, 68, 34, "舆图", "normal");
    if (trigger) {
      context.textAlign = "right";
      context.font = "13px sans-serif";
      context.fillStyle = "#ead5a3";
      context.fillText(trigger.label, this.viewport.width - 104, h - 76);
    }
  }

  renderWorldMap(context, state) {
    this.buttons = [];
    const { width, height } = this.viewport;
    context.fillStyle = "#171510";
    context.fillRect(0, 0, width, height);
    if (state.images.worldMap) {
      drawImageCover(context, state.images.worldMap, 0, 0, width, height);
      context.fillStyle = "rgba(12, 10, 7, 0.28)";
      context.fillRect(0, 0, width, height);
    }
    context.textAlign = "left";
    context.fillStyle = "#f4e6c6";
    context.font = "700 22px serif";
    context.fillText("江湖舆图", 20, this.headerHeight - 46);
    context.font = "12px sans-serif";
    context.fillStyle = "#dbc287";
    context.fillText(`苍山据点 ${state.cleared}/${state.total}`, 20, this.headerHeight - 22);
    for (const node of state.nodes) this.worldNode(context, node);
    this.button(context, "closeWorldMap", width - 86, this.headerHeight - 58, 66, 38, "返回", "normal");
  }

  renderInventory(context, state) {
    this.buttons = [];
    const { width, height } = this.viewport;
    context.fillStyle = "#171510";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(34, 28, 20, 0.98)";
    roundedRect(context, 12, this.headerHeight - 66, width - 24, height - this.headerHeight + 52, 6);
    context.fill();
    context.strokeStyle = "rgba(224, 192, 126, 0.58)";
    context.stroke();
    context.textAlign = "left";
    context.fillStyle = "#f4e6c6";
    context.font = "700 22px serif";
    context.fillText("背包", 28, this.headerHeight - 28);
    context.font = "12px sans-serif";
    context.fillStyle = "#dbc287";
    context.fillText(`银两 ${state.money}`, 28, this.headerHeight - 8);
    this.button(context, "closeInventory", width - 86, this.headerHeight - 58, 66, 38, "返回", "normal");

    const listY = this.headerHeight + 24;
    const entries = state.entries || [];
    if (!entries.length) {
      context.textAlign = "center";
      context.fillStyle = "rgba(245, 234, 210, 0.66)";
      context.font = "14px sans-serif";
      context.fillText("背包里还没有物品", width / 2, listY + 82);
      return;
    }
    entries.slice(0, 8).forEach(({ item, amount }, index) => {
      const y = listY + index * 68;
      context.fillStyle = "rgba(18, 15, 10, 0.74)";
      roundedRect(context, 24, y, width - 48, 56, 5);
      context.fill();
      context.strokeStyle = "rgba(224, 192, 126, 0.22)";
      context.stroke();
      context.fillStyle = itemColor(item.rarity);
      roundedRect(context, 36, y + 10, 36, 36, 5);
      context.fill();
      context.textAlign = "center";
      context.fillStyle = "#19140e";
      context.font = "700 17px serif";
      context.fillText(item.name.slice(0, 1), 54, y + 34);
      context.textAlign = "left";
      context.fillStyle = "#f6ead2";
      context.font = "700 14px sans-serif";
      context.fillText(`${item.name} x${amount}`, 84, y + 22);
      context.fillStyle = "#cdb57d";
      context.font = "11px sans-serif";
      context.fillText(`${item.type} · ${item.rarity} · ${item.effect}`, 84, y + 40);
    });
  }

  renderShop(context, state) {
    this.buttons = [];
    const { width, height } = this.viewport;
    const shop = state.shop || { name: "店铺", keeper: "掌柜" };
    context.fillStyle = "#171510";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(34, 28, 20, 0.98)";
    roundedRect(context, 12, this.headerHeight - 66, width - 24, height - this.headerHeight + 52, 6);
    context.fill();
    context.strokeStyle = "rgba(224, 192, 126, 0.58)";
    context.stroke();
    context.textAlign = "left";
    context.fillStyle = "#f4e6c6";
    context.font = "700 22px serif";
    context.fillText(shop.name, 28, this.headerHeight - 30);
    context.font = "12px sans-serif";
    context.fillStyle = "#dbc287";
    context.fillText(`${shop.keeper} · 银两 ${state.money}`, 28, this.headerHeight - 8);
    this.button(context, "closeShop", width - 86, this.headerHeight - 58, 66, 38, "返回", "normal");

    const entries = state.entries || [];
    const listY = this.headerHeight + 20;
    entries.slice(0, 6).forEach((entry, index) => {
      const { item, owned, price, limit } = entry;
      const y = listY + index * 76;
      const disabled = state.money < price || (limit && owned >= limit);
      context.fillStyle = disabled ? "rgba(18, 15, 10, 0.48)" : "rgba(18, 15, 10, 0.78)";
      roundedRect(context, 24, y, width - 48, 64, 5);
      context.fill();
      context.strokeStyle = "rgba(224, 192, 126, 0.22)";
      context.stroke();
      context.fillStyle = itemColor(item.rarity);
      roundedRect(context, 36, y + 14, 36, 36, 5);
      context.fill();
      context.textAlign = "center";
      context.fillStyle = "#19140e";
      context.font = "700 17px serif";
      context.fillText(item.name.slice(0, 1), 54, y + 38);
      context.textAlign = "left";
      context.fillStyle = disabled ? "rgba(246, 234, 210, 0.48)" : "#f6ead2";
      context.font = "700 14px sans-serif";
      context.fillText(`${item.name} · ${price} 两`, 84, y + 22);
      context.fillStyle = disabled ? "rgba(205, 181, 125, 0.46)" : "#cdb57d";
      context.font = "11px sans-serif";
      context.fillText(`${item.type} · ${item.effect}${limit ? ` · 已有 ${owned}/${limit}` : ` · 已有 ${owned}`}`, 84, y + 40);
      this.button(context, `shop:buy:${item.id}`, width - 82, y + 18, 48, 30, disabled ? "不可" : "购买", disabled ? "disabled" : "primary");
    });

    context.textAlign = "left";
    context.fillStyle = "#d9c28f";
    context.font = "12px sans-serif";
    drawWrappedText(context, state.message || "", 28, height - 58, width - 56, 20, 2);
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

  worldNode(context, node) {
    const statusColor = {
      current: "#e4bc58",
      cleared: "#75cf86",
      unlocked: "#79b8ff",
      locked: "#71695c"
    }[node.status] || "#71695c";
    context.save();
    context.beginPath();
    context.arc(node.x, node.y, node.status === "locked" ? 7 : 10, 0, Math.PI * 2);
    context.fillStyle = statusColor;
    context.fill();
    context.strokeStyle = "rgba(15, 12, 8, 0.8)";
    context.lineWidth = 3;
    context.stroke();
    context.textAlign = "center";
    context.font = "700 12px sans-serif";
    context.fillStyle = node.status === "locked" ? "rgba(224, 212, 188, 0.58)" : "#f8ebce";
    context.fillText(node.name, node.x, node.y - 18);
    context.restore();
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

function drawImageCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function itemColor(rarity) {
  if (rarity === "精良") return "#83b9d7";
  if (rarity === "稀有") return "#d5b45f";
  return "#b9c28c";
}

module.exports = { UiRenderer };
