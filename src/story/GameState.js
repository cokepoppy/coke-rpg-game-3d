export class GameState {
  constructor() {
    this.flags = new Set();
    this.inventory = new Map();
    this.quests = new Map();
    this.log = [];
    this.money = 90;
  }

  hasFlag(flag) {
    return this.flags.has(flag);
  }

  setFlag(flag) {
    this.flags.add(flag);
  }

  addItem(itemId, amount = 1) {
    if (amount <= 0) return;
    this.inventory.set(itemId, (this.inventory.get(itemId) || 0) + amount);
  }

  removeItem(itemId, amount = 1) {
    const current = this.itemCount(itemId);
    if (current < amount) return false;
    const next = current - amount;
    if (next > 0) this.inventory.set(itemId, next);
    else this.inventory.delete(itemId);
    return true;
  }

  itemCount(itemId) {
    return this.inventory.get(itemId) || 0;
  }

  inventoryEntries() {
    return [...this.inventory.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([itemId, amount]) => ({ itemId, amount }));
  }

  addMoney(amount) {
    this.money = Math.max(0, this.money + amount);
  }

  spendMoney(amount) {
    if (this.money < amount) return false;
    this.money -= amount;
    return true;
  }

  addQuest(quest) {
    const existing = this.quests.get(quest.id);
    this.quests.set(quest.id, {
      ...quest,
      status: existing?.status || "active"
    });
  }

  completeQuest(id) {
    const quest = this.quests.get(id);
    if (!quest) return;
    this.quests.set(id, { ...quest, status: "complete" });
  }

  remember(entry) {
    this.log.unshift({
      text: entry,
      at: new Date().toISOString()
    });
    this.log = this.log.slice(0, 20);
  }
}
