const ITEM_CATALOG = {
  hemostatic_powder: {
    id: "hemostatic_powder",
    name: "止血散",
    type: "药品",
    rarity: "常见",
    effect: "恢复少量气血",
    description: "江湖常备外伤药，战后止血最稳妥。"
  },
  qingxin_pill: {
    id: "qingxin_pill",
    name: "清心丸",
    type: "药品",
    rarity: "常见",
    effect: "恢复少量真气",
    description: "薄荷与沉香调成，可缓解迷香和内息紊乱。"
  },
  iron_sword: {
    id: "iron_sword",
    name: "青锋剑",
    type: "武器",
    rarity: "常见",
    effect: "攻击 +6",
    description: "锋口干净的铁剑，适合初入江湖者。"
  },
  steel_saber: {
    id: "steel_saber",
    name: "雁翎刀",
    type: "武器",
    rarity: "精良",
    effect: "攻击 +9",
    description: "刀身略弯，劈斩有力。"
  },
  scout_token: {
    id: "scout_token",
    name: "密探令牌",
    type: "剧情",
    rarity: "精良",
    effect: "剧情线索",
    description: "暗哨身上搜出的令牌，可证明西岭门潜入大理。"
  },
  silver_piece: {
    id: "silver_piece",
    name: "碎银",
    type: "财物",
    rarity: "常见",
    effect: "可折算银两",
    description: "柜中找到的小块碎银。"
  },
  unsigned_letter: {
    id: "unsigned_letter",
    name: "无名信",
    type: "剧情",
    rarity: "常见",
    effect: "剧情线索",
    description: "没有署名的短笺，提到了灯亭和铜匣。"
  }
};

function itemById(id) {
  return ITEM_CATALOG[id] || {
    id,
    name: id,
    type: "未知",
    rarity: "常见",
    effect: "未配置",
    description: "这个物品还没有配置说明。"
  };
}

function inventoryEntries(items) {
  return Object.entries(items || {})
    .filter(([, amount]) => amount > 0)
    .map(([itemId, amount]) => ({ item: itemById(itemId), amount }));
}

module.exports = { ITEM_CATALOG, itemById, inventoryEntries };
