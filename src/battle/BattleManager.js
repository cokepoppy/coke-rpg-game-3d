import { battleConfigs } from "./battleConfigs.js";

export class BattleManager {
  requestBattle(trigger) {
    const enemyId = trigger.enemyId || property(trigger, "enemyId") || trigger.name;
    return {
      kind: "battle-requested",
      trigger,
      enemyId,
      battle: battleConfigs[enemyId] || battleConfigs.masked_scout
    };
  }
}

function property(object, name) {
  return object.properties?.find((item) => item.name === name)?.value;
}
