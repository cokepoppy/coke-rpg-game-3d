import { itemIconHtml, rarityLabel, typeLabel, escapeHtml } from "./ItemIcon.js";

export class InventoryPanel {
  constructor(root, inventoryManager) {
    this.root = root;
    this.inventory = inventoryManager;
    this.opened = false;
    this.root.classList.add("inventory-ui");
    this.root.hidden = true;
  }

  toggle() {
    if (this.opened) this.close();
    else this.open();
  }

  open() {
    this.opened = true;
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.opened = false;
    this.root.hidden = true;
    this.root.innerHTML = "";
  }

  render() {
    const entries = this.inventory.items();
    this.root.innerHTML = `
      <div class="inventory-backdrop" data-close="true"></div>
      <section class="inventory-panel" role="dialog" aria-label="背包">
        <header class="inventory-header">
          <div>
            <strong>背包</strong>
            <span>钱 ${this.inventory.state.money} 文</span>
          </div>
          <button type="button" class="inventory-close" data-close="true">关闭</button>
        </header>
        <div class="inventory-list">
          ${
            entries.length
              ? entries.map(({ item, amount }) => itemRow(item, amount)).join("")
              : `<div class="inventory-empty">背包里还没有物品。</div>`
          }
        </div>
        <footer class="inventory-footer">B / I 打开背包，Esc 关闭。</footer>
      </section>
    `;
    for (const closer of this.root.querySelectorAll("[data-close]")) {
      closer.addEventListener("click", () => this.close());
    }
  }
}

function itemRow(item, amount) {
  return `
    <article class="inventory-item">
      ${itemIconHtml(item)}
      <div class="inventory-item-main">
        <div class="inventory-item-title">
          <strong>${escapeHtml(item.name)}</strong>
          <span>x${amount}</span>
        </div>
        <div class="inventory-item-meta">${typeLabel(item.type)} · ${rarityLabel(item.rarity)} · ${escapeHtml(item.effect)}</div>
        <p>${escapeHtml(item.description)}</p>
      </div>
    </article>
  `;
}
