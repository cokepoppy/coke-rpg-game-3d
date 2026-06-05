export class QuestLog {
  constructor(gameState) {
    this.state = gameState;
  }

  active() {
    return [...this.state.quests.values()].filter((quest) => quest.status === "active");
  }

  completed() {
    return [...this.state.quests.values()].filter((quest) => quest.status === "complete");
  }
}
