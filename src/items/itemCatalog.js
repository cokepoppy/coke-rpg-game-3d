export const itemCatalog = {
  hemostatic_powder: {
    id: "hemostatic_powder",
    name: "止血散",
    type: "consumable",
    rarity: "common",
    price: 18,
    effect: "恢复少量气血",
    description: "大理药铺常备的外伤药，适合战后应急。",
    icon: { glyph: "散", tone: "red" }
  },
  qingxin_pill: {
    id: "qingxin_pill",
    name: "清心丸",
    type: "consumable",
    rarity: "common",
    price: 22,
    effect: "恢复少量真气",
    description: "以薄荷、沉香调成，可缓解迷香和内息紊乱。",
    icon: { glyph: "气", tone: "teal" }
  },
  life_pill: {
    id: "life_pill",
    name: "续命丹",
    type: "consumable",
    rarity: "rare",
    price: 80,
    effect: "恢复大量气血",
    description: "药性猛烈，江湖人常留作保命底牌。",
    icon: { glyph: "丹", tone: "gold" }
  },
  iron_sword: {
    id: "iron_sword",
    name: "青锋剑",
    type: "weapon",
    rarity: "common",
    price: 120,
    effect: "攻击 +6",
    description: "普通铁剑，锋口干净，适合初入江湖者。",
    icon: { glyph: "剑", tone: "steel" }
  },
  steel_saber: {
    id: "steel_saber",
    name: "雁翎刀",
    type: "weapon",
    rarity: "uncommon",
    price: 160,
    effect: "攻击 +9",
    description: "刀身略弯，劈斩有力，是护院和镖师常用兵器。",
    icon: { glyph: "刀", tone: "copper" }
  },
  long_spear: {
    id: "long_spear",
    name: "梨花枪",
    type: "weapon",
    rarity: "uncommon",
    price: 180,
    effect: "攻击 +8，射程 +1",
    description: "枪头寒光细长，适合在战棋格上保持距离。",
    icon: { glyph: "枪", tone: "blue" }
  },
  halberd: {
    id: "halberd",
    name: "画戟",
    type: "weapon",
    rarity: "rare",
    price: 260,
    effect: "攻击 +12",
    description: "沉重长兵，非臂力过人者难以运使。",
    icon: { glyph: "戟", tone: "violet" }
  },
  yipintang_token: {
    id: "yipintang_token",
    name: "一品堂令牌",
    type: "quest",
    rarity: "uncommon",
    price: 0,
    effect: "剧情物品",
    description: "暗哨身上搜出的令牌，可证明一品堂潜入大理。",
    icon: { glyph: "令", tone: "black" }
  },
  old_jade: {
    id: "old_jade",
    name: "旧玉佩",
    type: "quest",
    rarity: "rare",
    price: 0,
    effect: "剧情物品",
    description: "铜匣中取出的旧玉佩，边缘刻着段氏纹样。",
    icon: { glyph: "玉", tone: "jade" }
  },
  secret_map_half: {
    id: "secret_map_half",
    name: "半张旧地图",
    type: "quest",
    rarity: "rare",
    price: 0,
    effect: "剧情物品",
    description: "泛黄地图只剩半张，指向天龙古寺后山。",
    icon: { glyph: "图", tone: "paper" }
  },
  silver_piece: {
    id: "silver_piece",
    name: "碎银",
    type: "treasure",
    rarity: "common",
    price: 25,
    effect: "可折算为钱",
    description: "客房里找到的小块碎银，可在店铺中折算。",
    icon: { glyph: "银", tone: "silver" }
  },
  unsigned_letter: {
    id: "unsigned_letter",
    name: "无名信",
    type: "quest",
    rarity: "common",
    price: 0,
    effect: "剧情物品",
    description: "没有署名的短笺，提到了灯亭和铜匣。",
    icon: { glyph: "信", tone: "paper" }
  },
  broken_copper_key: {
    id: "broken_copper_key",
    name: "半截铜钥匙",
    type: "quest",
    rarity: "uncommon",
    price: 0,
    effect: "剧情物品",
    description: "断口与铜匣刻痕相合，似乎还能开启某个旧锁。",
    icon: { glyph: "钥", tone: "copper" }
  },
  secret_path_map: {
    id: "secret_path_map",
    name: "山道图",
    type: "quest",
    rarity: "rare",
    price: 0,
    effect: "剧情物品",
    description: "标出天龙古寺后山密道入口的山道图。",
    icon: { glyph: "路", tone: "paper" }
  },
  manual_fragment: {
    id: "manual_fragment",
    name: "残卷",
    type: "quest",
    rarity: "rare",
    price: 0,
    effect: "剧情物品",
    description: "演武木人暗格里的半页残卷，写着失传步法。",
    icon: { glyph: "卷", tone: "paper" }
  }
};

export function itemById(itemId) {
  return itemCatalog[itemId] || {
    id: itemId,
    name: itemId,
    type: "unknown",
    rarity: "common",
    price: 0,
    effect: "未知物品",
    description: "这个物品还没有配置说明。",
    icon: { glyph: "?", tone: "paper" }
  };
}
