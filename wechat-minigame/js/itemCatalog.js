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
    description: "锋口干净的铁剑，适合初入江湖者。",
    equip: { attack: 6 }
  },
  steel_saber: {
    id: "steel_saber",
    name: "雁翎刀",
    type: "武器",
    rarity: "精良",
    effect: "攻击 +9",
    description: "刀身略弯，劈斩有力。",
    equip: { attack: 9 }
  },
  swift_boots: {
    id: "swift_boots",
    name: "踏云履",
    type: "装备",
    rarity: "精良",
    effect: "移动 +1",
    description: "轻便软底靴，走山道时更省力。",
    equip: { move: 1 }
  },
  leather_armor: {
    id: "leather_armor",
    name: "软鳞甲",
    type: "装备",
    rarity: "精良",
    effect: "防御 +5",
    description: "薄甲贴身，能卸去一部分刀剑力道。",
    equip: { defense: 5 }
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
  },
  copper_lantern_shard: {
    id: "copper_lantern_shard",
    name: "铜灯残片",
    type: "剧情",
    rarity: "精良",
    effect: "拼合灯亭暗号",
    description: "从客房旧布囊夹层里找到的铜片，边缘刻着半个灯纹。"
  },
  lantern_order_clue: {
    id: "lantern_order_clue",
    name: "灯亭暗号",
    type: "剧情",
    rarity: "精良",
    effect: "解读茶肆告示",
    description: "账册页脚的四个落款，按钟声顺序排列后才有意义。"
  },
  tea_house_cipher: {
    id: "tea_house_cipher",
    name: "茶肆密语",
    type: "剧情",
    rarity: "精良",
    effect: "开启残灯禁地",
    description: "告示上被删掉的三行字，指向苍山北坡的残灯禁地。"
  },
  broken_sword_guard: {
    id: "broken_sword_guard",
    name: "断剑护手",
    type: "剧情",
    rarity: "稀有",
    effect: "证明佩剑被人为取走",
    description: "引灯魇客身上找到的旧护手，刻着与沈临川佩剑相同的云纹。"
  },
  moon_record_fragment: {
    id: "moon_record_fragment",
    name: "月华药账残页",
    type: "剧情",
    rarity: "稀有",
    effect: "推进王府旧案",
    description: "药账残页记录了不止一个被调包的孩子，以及一笔没有收货人的药材。"
  }
};

const SHOP_CATALOG = {
  apothecary: {
    id: "apothecary",
    name: "百草铺",
    keeper: "药摊老人",
    stock: [
      { itemId: "hemostatic_powder", price: 18 },
      { itemId: "qingxin_pill", price: 22 },
      { itemId: "iron_sword", price: 120, limit: 1 },
      { itemId: "steel_saber", price: 160, limit: 1 },
      { itemId: "swift_boots", price: 140, limit: 1 },
      { itemId: "leather_armor", price: 150, limit: 1 }
    ]
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

function shopById(id) {
  return SHOP_CATALOG[id] || null;
}

function inventoryEntries(items) {
  return Object.entries(items || {})
    .filter(([, amount]) => amount > 0)
    .map(([itemId, amount]) => ({ item: itemById(itemId), amount }));
}

function shopEntries(shopId, items) {
  const shop = shopById(shopId);
  return (shop?.stock || []).map((entry) => {
    const item = itemById(entry.itemId);
    return {
      ...entry,
      item,
      owned: (items || {})[entry.itemId] || 0
    };
  });
}

function equipmentModifiers(items) {
  const modifiers = { attack: 0, move: 0, defense: 0 };
  for (const [itemId, amount] of Object.entries(items || {})) {
    if (amount <= 0) continue;
    const equip = itemById(itemId).equip;
    if (!equip) continue;
    modifiers.attack += equip.attack || 0;
    modifiers.move += equip.move || 0;
    modifiers.defense += equip.defense || 0;
  }
  return modifiers;
}

module.exports = { ITEM_CATALOG, SHOP_CATALOG, itemById, shopById, inventoryEntries, shopEntries, equipmentModifiers };
