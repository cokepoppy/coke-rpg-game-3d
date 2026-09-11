import vm from "node:vm";
import { readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const output = "screenshots/story-campaign";
await mkdir(output, { recursive: true });

const { GameState } = loadModule(await readFile("src/story/GameState.js", "utf8"), ["GameState"]);
const { ScriptRunner } = loadModule(await readFile("src/story/ScriptRunner.js", "utf8"), ["ScriptRunner"]);
const { wuxiaCampaignScripts } = loadModule(await readFile("src/story/wuxiaCampaignScripts.js", "utf8"), ["wuxiaCampaignScripts"]);
const { wuxiaStoryBible } = loadModule(await readFile("src/story/wuxiaStoryBible.js", "utf8"), ["wuxiaStoryBible"]);

const gameState = new GameState();
const battles = [];
const dialogTrace = [];
const runner = new ScriptRunner({
  scripts: wuxiaCampaignScripts,
  gameState,
  battleManager: {
    requestBattle(action) {
      battles.push(action);
      return { kind: "battle-requested", ...action };
    }
  },
  dialogBox: {
    async show(page) {
      dialogTrace.push({
        speaker: page.speaker,
        text: page.text,
        choices: (page.choices || []).map((choice) => choice.label)
      });
      return (page.choices || [])[0] || null;
    },
    hide() {}
  }
});

const scriptOrder = [
  "daoist_master_teach",
  "moon_valley_arrival",
  "su_luo_route_opening",
  "qin_letter",
  "qin_wanyao_route_opening",
  "mu_poison_choice",
  "mu_zhiyan_route_opening",
  "xiao_beichen_join",
  "border_massacre_reveal",
  "red_lotus_debate",
  "fu_state_collapse",
  "wuchen_three_questions",
  "final_truth_choice",
  "carefree_epilogue"
];

const results = [];
for (const id of scriptOrder) {
  results.push({ id, result: await runner.run(id) });
}

const snapshot = gameState.snapshot();
const assetDirs = {
  shen_linchuan: "hero",
  su_luo: "a_luo"
};
const assetReports = {
  hero: "assets/characters/hero/hero-walk-anchored-v3-gaitfix.json"
};
const bibleCharacters = wuxiaStoryBible.characters.map((character) => ({
  id: character.id,
  name: character.name,
  playable: character.playable,
  faction: character.faction,
  combatRole: character.combatRole,
  asset: assetStatus(assetDirs[character.id] || character.id)
}));
const missingRuntimeAssets = bibleCharacters
  .filter((character) => !character.asset.exists)
  .map((character) => ({ ...character, reason: "long-form story character has no dedicated runtime sprite yet" }));
const staticOnlyRuntimeAssets = bibleCharacters
  .filter((character) => character.asset.exists && !character.asset.pass)
  .map((character) => ({
    ...character,
    reason: "sprite exists but gait/anchor contract does not pass; use as static NPC only",
    failures: character.asset.failures
  }));

const audit = {
  scriptOrder,
  results,
  flags: snapshot.flags,
  inventory: snapshot.inventory,
  quests: snapshot.quests,
  party: snapshot.party,
  learnedSkills: snapshot.learnedSkills,
  unlockedWorldNodes: snapshot.unlockedWorldNodes,
  battles,
  dialogTrace,
  bibleCharacters,
  missingRuntimeAssets,
  staticOnlyRuntimeAssets
};

assert(snapshot.flags.includes("learned_fuyou_step"), "daoist skill flag missing");
assert(snapshot.flags.includes("moon_valley_reached"), "moon valley arrival flag missing");
assert(snapshot.inventory.some(([id]) => id === "palace_invitation"), "palace invitation missing");
assert(snapshot.unlockedWorldNodes.includes("southern_palace"), "southern palace did not unlock");
assert(snapshot.party.includes("xiao_beichen"), "Xiao Beichen did not join party");
assert(snapshot.unlockedWorldNodes.includes("red_lotus_temple"), "red lotus temple did not unlock");
assert(snapshot.unlockedWorldNodes.includes("hidden_library"), "hidden library did not unlock");
assert(snapshot.flags.includes("romance_su_luo_promised"), "Su Luo romance route did not progress");
assert(snapshot.flags.includes("romance_qin_wanyao_freed"), "Qin Wanyao romance route did not progress");
assert(snapshot.flags.includes("romance_mu_zhiyan_hurt_shared"), "Mu Zhiyan romance route did not progress");
assert(battles.some((battle) => battle.battleId === "poison_needles"), "poison needle battle request missing");
assert(battles.some((battle) => battle.battleId === "two_fathers_boss"), "final boss battle request missing");

await writeFile(`${output}/audit.json`, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({
  scripts: results.length,
  flags: snapshot.flags.length,
  quests: snapshot.quests.map(([id, quest]) => `${id}:${quest.status}`),
  unlockedWorldNodes: snapshot.unlockedWorldNodes,
  battles: battles.map((battle) => battle.battleId || battle.enemyId),
  missingRuntimeAssets: missingRuntimeAssets.map((character) => character.name),
  staticOnlyRuntimeAssets: staticOnlyRuntimeAssets.map((character) => character.name)
}, null, 2));

function loadModule(source, names) {
  const transformed = `${source.replace(/^import .*$/gm, "").replace(/\bexport\s+/g, "")}\nmodule.exports = { ${names.join(", ")} };`;
  const sandbox = { module: { exports: {} }, exports: {}, console };
  vm.runInNewContext(transformed, sandbox, { filename: "story-module.js" });
  return sandbox.module.exports;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assetStatus(dir) {
  const file = assetReports[dir] || `assets/characters/${dir}/${dir}-walk-anchored.json`;
  try {
    const report = JSON.parse(requireRead(file));
    return {
      exists: true,
      pass: Boolean(report.pass),
      regenerate: Boolean(report.regenerate),
      failures: report.contract?.failures || []
    };
  } catch {
    return { exists: false, pass: false, regenerate: false, failures: [] };
  }
}

function requireRead(file) {
  return readFileSync(file, "utf8");
}
