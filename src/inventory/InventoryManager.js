import { itemById } from "../items/itemCatalog.js";
import { shopById } from "../items/shopCatalog.js";

export class InventoryManager {
  constructor(gameState) {
    this.state = gameState;
  }

  items() {
    return this.state.inventoryEntries().map(({ itemId, amount }) => ({
      item: itemById(itemId),
      amount
    }));
  }

  addItem(itemId, amount = 1) {
    this.state.addItem(itemId, amount);
  }

  addMoney(amount) {
    this.state.addMoney(amount);
  }

  buy(shopId, itemId) {
    const shop = shopById(shopId);
    const stock = shop?.stock.find((entry) => entry.itemId === itemId);
    if (!shop || !stock) return { ok: false, message: "店里没有这个物品。" };

    const owned = this.state.itemCount(itemId);
    if (stock.limit && owned >= stock.limit) {
      return { ok: false, message: "这个物品已经买过了。" };
    }

    const price = stock.price ?? itemById(itemId).price;
    if (!this.state.spendMoney(price)) {
      return { ok: false, message: "钱不够。" };
    }

    this.state.addItem(itemId, 1);
    const item = itemById(itemId);
    this.state.remember(`购买${item.name}，花费 ${price} 文。`);
    return { ok: true, message: `买到${item.name}。` };
  }
}
