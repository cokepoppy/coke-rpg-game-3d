import { itemById } from "../items/itemCatalog.js";
import { shopById } from "../items/shopCatalog.js";
import { itemIconHtml, rarityLabel, typeLabel, escapeHtml } from "./ItemIcon.js";

export class ShopPanel {
  constructor(root, inventoryManager) {
    this.root = root;
    this.inventory = inventoryManager;
    this.opened = false;
    this.resolve = null;
    this.shopId = null;
    this.message = "";
    this.root.classList.add("shop-ui");
    this.root.hidden = true;
  }

  open(shopId) {
    this.shopId = shopId;
    this.opened = true;
    this.message = "";
    this.root.hidden = false;
    this.render();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  close() {
    this.opened = false;
    this.root.hidden = true;
    this.root.innerHTML = "";
    const done = this.resolve;
    this.resolve = null;
    done?.();
  }

  render() {
    const shop = shopById(this.shopId);
    if (!shop) {
      this.root.innerHTML = "";
      this.close();
      return;
    }

    this.root.innerHTML = `
      <div class="shop-backdrop"></div>
      <section class="shop-panel" role="dialog" aria-label="${escapeHtml(shop.name)}">
        <header class="shop-header">
          <div>
            <strong>${escapeHtml(shop.name)}</strong>
            <span>${escapeHtml(shop.description)}</span>
          </div>
          <button type="button" data-close="true">离开</button>
        </header>
        <div class="shop-money">钱 ${this.inventory.state.money} 文</div>
        <div class="shop-list">
          ${shop.stock.map((entry) => shopRow(entry, this.inventory)).join("")}
        </div>
        <footer class="shop-message">${escapeHtml(this.message || `${shop.keeper}：看中哪样，直接点购买。`)}</footer>
      </section>
    `;

    this.root.querySelector("[data-close]")?.addEventListener("click", () => this.close());
    for (const button of this.root.querySelectorAll("[data-buy]")) {
      button.addEventListener("click", () => {
        const result = this.inventory.buy(this.shopId, button.dataset.buy);
        this.message = result.message;
        this.render();
      });
    }
  }
}

function shopRow(entry, inventory) {
  const item = itemById(entry.itemId);
  const price = entry.price ?? item.price;
  const owned = inventory.state.itemCount(item.id);
  const limitReached = entry.limit && owned >= entry.limit;
  const disabled = inventory.state.money < price || limitReached;
  const hint = limitReached ? "已拥有" : `购买 ${price} 文`;
  return `
    <article class="shop-item">
      ${itemIconHtml(item)}
      <div class="shop-item-main">
        <div class="shop-item-title">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${typeLabel(item.type)} · ${rarityLabel(item.rarity)}</span>
        </div>
        <p>${escapeHtml(item.description)}</p>
        <small>${escapeHtml(item.effect)} · 已有 ${owned}</small>
      </div>
      <button type="button" data-buy="${escapeHtml(item.id)}" ${disabled ? "disabled" : ""}>${hint}</button>
    </article>
  `;
}
