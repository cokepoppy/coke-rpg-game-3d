export const shopCatalog = {
  dali_general_goods: {
    id: "dali_general_goods",
    name: "大理杂货铺",
    keeper: "药摊老人",
    description: "只卖几样常用物件，少侠带够钱再挑。",
    stock: [
      { itemId: "hemostatic_powder", price: 18 },
      { itemId: "qingxin_pill", price: 22 },
      { itemId: "life_pill", price: 80 },
      { itemId: "iron_sword", price: 120, limit: 1 },
      { itemId: "steel_saber", price: 160, limit: 1 },
      { itemId: "long_spear", price: 180, limit: 1 },
      { itemId: "halberd", price: 260, limit: 1 }
    ]
  }
};

export function shopById(shopId) {
  return shopCatalog[shopId];
}
