export class GameState {
  constructor() {
    this.flags = new Set();
    this.inventory = new Map();
    this.quests = new Map();
    this.log = [];
  }

  hasFlag(flag) {
    return this.flags.has(flag);
  }

  setFlag(flag) {
    this.flags.add(flag);
  }

  addItem(itemId, amount = 1) {
    this.inventory.set(itemId, (this.inventory.get(itemId) || 0) + amount);
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
