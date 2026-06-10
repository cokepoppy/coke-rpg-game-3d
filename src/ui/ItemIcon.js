export function itemIconHtml(item) {
  const glyph = escapeHtml(item.icon?.glyph || item.name.slice(0, 1));
  const tone = escapeHtml(item.icon?.tone || "paper");
  return `<span class="item-icon item-icon-${tone}" aria-hidden="true">${glyph}</span>`;
}

export function rarityLabel(rarity) {
  return {
    common: "普通",
    uncommon: "精良",
    rare: "珍贵"
  }[rarity] || "普通";
}

export function typeLabel(type) {
  return {
    consumable: "药品",
    weapon: "武器",
    quest: "剧情",
    treasure: "财物"
  }[type] || "物品";
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
