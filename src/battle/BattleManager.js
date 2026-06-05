export class BattleManager {
  requestBattle(trigger) {
    return {
      kind: "battle-requested",
      trigger,
      enemyId: trigger.enemyId || property(trigger, "enemyId") || trigger.name
    };
  }
}

function property(object, name) {
  return object.properties?.find((item) => item.name === name)?.value;
}
