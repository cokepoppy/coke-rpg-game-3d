export class ScriptRunner {
  constructor({ scripts, dialogBox, gameState, battleManager }) {
    this.scripts = scripts;
    this.dialogBox = dialogBox;
    this.gameState = gameState;
    this.battleManager = battleManager;
    this.running = false;
  }

  async run(scriptId) {
    const script = this.scripts[scriptId];
    if (!script || this.running) return null;
    if (script.repeatFlag && this.gameState.hasFlag(script.repeatFlag)) return null;

    this.running = true;
    try {
      let nodeId = script.start;
      let result = null;
      while (nodeId) {
        const node = script.nodes[nodeId];
        if (!node) throw new Error(`Missing story node: ${scriptId}.${nodeId}`);
        const choice = await this.dialogBox.show({
          speaker: node.speaker,
          text: node.text,
          choices: node.choices || [{ label: "继续", next: node.next }]
        });
        result = await this.applyActions(node.actions || []);
        nodeId = choice?.next || null;
      }
      return result;
    } finally {
      this.running = false;
      this.dialogBox.hide();
    }
  }

  async applyActions(actions) {
    let result = null;
    for (const action of actions) {
      if (action.type === "setFlag") this.gameState.setFlag(action.flag);
      if (action.type === "addItem") this.gameState.addItem(action.itemId, action.amount);
      if (action.type === "addQuest") this.gameState.addQuest(action.quest);
      if (action.type === "completeQuest") this.gameState.completeQuest(action.questId);
      if (action.type === "remember") this.gameState.remember(action.text);
      if (action.type === "startBattle") result = this.battleManager.requestBattle(action);
    }
    return result;
  }
}
