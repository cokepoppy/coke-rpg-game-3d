export const shopScripts = {
  medicine_market: {
    id: "medicine_market",
    start: "vendor",
    nodes: {
      vendor: {
        speaker: "药摊老人",
        text: "少侠面色发白，是中了迷香。老朽这里有止血散、清心丸，也收了几件兵器。",
        choices: [
          { label: "看看货架", next: "shop" },
          { label: "讨两枚清心丸", next: "gift" },
          { label: "先告辞", next: "leave" }
        ]
      },
      shop: {
        speaker: "药摊老人",
        text: "药品不多，兵器也只挑常用的。钱够就拿，江湖路上别舍不得。",
        actions: [{ type: "openShop", shopId: "dali_general_goods" }]
      },
      gift: {
        speaker: "药摊老人",
        text: "看你像是初入江湖，先拿两枚清心丸，不收钱。",
        actions: [
          { type: "addItem", itemId: "qingxin_pill", amount: 2 },
          { type: "remember", text: "药摊老人赠予两枚清心丸。" }
        ]
      },
      leave: {
        speaker: "主角",
        text: "多谢老人家，我晚些再来。"
      }
    }
  }
};
