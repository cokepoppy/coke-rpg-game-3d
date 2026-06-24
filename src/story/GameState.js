export class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.flags = new Set();
    this.inventory = new Map();
    this.quests = new Map();
    this.party = new Set(["shen_linchuan", "su_luo"]);
    this.learnedSkills = new Map();
    this.unlockedWorldNodes = new Set(["cangshan_road"]);
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

  joinParty(characterId) {
    if (characterId) this.party.add(characterId);
  }

  leaveParty(characterId) {
    this.party.delete(characterId);
  }

  learnSkill(characterId, skillId) {
    if (!characterId || !skillId) return;
    const skills = new Set(this.learnedSkills.get(characterId) || []);
    skills.add(skillId);
    this.learnedSkills.set(characterId, skills);
  }

  unlockWorldNode(nodeId) {
    if (nodeId) this.unlockedWorldNodes.add(nodeId);
  }

  remember(entry) {
    this.log.unshift({
      text: entry,
      at: new Date().toISOString()
    });
    this.log = this.log.slice(0, 20);
  }

  snapshot() {
    return {
      flags: [...this.flags],
      inventory: [...this.inventory.entries()],
      quests: [...this.quests.entries()],
      party: [...this.party],
      learnedSkills: [...this.learnedSkills.entries()].map(([characterId, skills]) => [characterId, [...skills]]),
      unlockedWorldNodes: [...this.unlockedWorldNodes],
      log: this.log,
      money: this.money
    };
  }

  restore(snapshot = {}) {
    this.flags = new Set(snapshot.flags || []);
    this.inventory = new Map(snapshot.inventory || []);
    this.quests = new Map(snapshot.quests || []);
    this.party = new Set(snapshot.party || ["shen_linchuan", "su_luo"]);
    this.learnedSkills = new Map((snapshot.learnedSkills || []).map(([characterId, skills]) => [characterId, new Set(skills || [])]));
    this.unlockedWorldNodes = new Set(snapshot.unlockedWorldNodes || ["cangshan_road"]);
    this.log = Array.isArray(snapshot.log) ? snapshot.log.slice(0, 20) : [];
    this.money = Number.isFinite(snapshot.money) ? snapshot.money : 90;
  }
}
