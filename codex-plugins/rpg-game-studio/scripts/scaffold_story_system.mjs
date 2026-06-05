#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const project = path.resolve(String(args.project || args.cwd || process.cwd()));
const language = String(args.language || "js").toLowerCase() === "ts" ? "ts" : "js";
const ext = language;
const force = Boolean(args.force);

const files = new Map([
  [`src/story/GameState.${ext}`, gameStateTemplate()],
  [`src/story/QuestLog.${ext}`, questLogTemplate()],
  [`src/story/ScriptRunner.${ext}`, scriptRunnerTemplate()],
  [`src/story/storyScripts.${ext}`, storyScriptsTemplate()],
  [`src/ui/DialogBox.${ext}`, dialogBoxTemplate()]
]);

const written = [];
const skipped = [];
for (const [relativePath, content] of files) {
  const output = path.join(project, relativePath);
  await fs.mkdir(path.dirname(output), { recursive: true });
  if (!force && (await exists(output))) {
    skipped.push(output);
    continue;
  }
  await fs.writeFile(output, content);
  written.push(output);
}

console.log(
  JSON.stringify(
    {
      project,
      language,
      written,
      skipped,
      integration: [
        "Add a #dialog element beside the game canvas.",
        "Construct DialogBox, GameState, BattleManager, and ScriptRunner in the world scene or scene coordinator.",
        "Run opening scripts after scene load; run trigger scripts from map object names."
      ]
    },
    null,
    2
  )
);

function gameStateTemplate() {
  return `export class GameState {
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
    this.quests.set(quest.id, { ...quest, status: existing?.status || "active" });
  }

  completeQuest(id) {
    const quest = this.quests.get(id);
    if (quest) this.quests.set(id, { ...quest, status: "complete" });
  }

  remember(text) {
    this.log.unshift({ text, at: new Date().toISOString() });
    this.log = this.log.slice(0, 20);
  }
}
`;
}

function questLogTemplate() {
  return `export class QuestLog {
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
`;
}

function scriptRunnerTemplate() {
  return `export class ScriptRunner {
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
        if (!node) throw new Error(\`Missing story node: \${scriptId}.\${nodeId}\`);
        const choice = await this.dialogBox.show({
          speaker: node.speaker,
          text: node.text,
          choices: node.choices || [{ label: "Continue", next: node.next }]
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
`;
}

function storyScriptsTemplate() {
  return `export const storyScripts = {
  opening: {
    id: "opening",
    start: "start",
    nodes: {
      start: {
        speaker: "NPC",
        text: "The journey begins here.",
        actions: [
          { type: "setFlag", flag: "opening_seen" },
          { type: "addQuest", quest: { id: "first_task", title: "First Task", description: "Talk to the nearby NPC." } }
        ]
      }
    }
  }
};
`;
}

function dialogBoxTemplate() {
  return `export class DialogBox {
  constructor(root) {
    this.root = root;
    this.root.classList.add("dialog-box");
    this.root.hidden = true;
  }

  show({ speaker, text, choices }) {
    this.root.hidden = false;
    this.root.innerHTML = \`
      <div class="dialog-speaker">\${escapeHtml(speaker || "")}</div>
      <div class="dialog-text">\${escapeHtml(text || "")}</div>
      <div class="dialog-actions">
        \${choices.map((choice, index) => \`<button type="button" data-choice="\${index}">\${escapeHtml(choice.label)}</button>\`).join("")}
      </div>
    \`;
    return new Promise((resolve) => {
      const buttons = [...this.root.querySelectorAll("button[data-choice]")];
      buttons[0]?.focus();
      for (const button of buttons) {
        button.addEventListener("click", () => resolve(choices[Number(button.dataset.choice)]), { once: true });
      }
    });
  }

  hide() {
    this.root.hidden = true;
    this.root.innerHTML = "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
`;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
