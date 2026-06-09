export class BattleHud {
  constructor(root) {
    this.root = root;
    this.onEndTurn = null;
    this.onUseSkill = null;
  }

  mount({ onEndTurn, onUseSkill }) {
    this.onEndTurn = onEndTurn;
    this.onUseSkill = onUseSkill;
    this.root.hidden = false;
  }

  unmount() {
    this.root.hidden = true;
    this.root.innerHTML = "";
    this.lastSignature = null;
  }

  render(state) {
    if (this.root.hidden) return;
    const selected = state.selected;
    const skills = state.skillOptions();
    const signature = JSON.stringify({
      side: state.side,
      phase: state.phase,
      selectedSkillId: state.selectedSkillId,
      selected: selected ? { id: selected.id, hp: selected.hp, qi: selected.qi, moved: selected.moved, acted: selected.acted } : null,
      units: state.units.map((unit) => [unit.id, unit.hp, unit.qi, unit.alive, unit.moved, unit.acted]),
      log: state.log
    });
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.root.innerHTML = `
      <div class="battle-topbar">
        <div>
          <strong>${state.battle.title}</strong>
          <span>${state.side === "player" ? "我方回合" : "敌方回合"}</span>
        </div>
        <button class="battle-end-turn" ${state.side !== "player" ? "disabled" : ""}>结束回合</button>
      </div>
      <div class="battle-panel">
        <div class="battle-unit">
          ${selected ? `<strong>${selected.name}</strong><span>HP ${selected.hp}/${selected.maxHp}</span><span>真气 ${selected.qi}/${selected.maxQi}</span><span>${state.phase === "target" ? "选择红色目标格" : "移动或选择技能"}</span>` : "<strong>选择我方角色</strong><span>蓝色格子为可移动范围</span>"}
        </div>
        <div class="battle-skills">
          ${skills.map((skill) => `<button data-skill="${skill.id}" class="${state.selectedSkillId === skill.id ? "is-selected" : ""}" ${skill.enabled ? "" : "disabled"}>${skill.name} ${skill.cost ? `-${skill.cost}` : ""}</button>`).join("")}
        </div>
        <ol class="battle-log">
          ${state.log.map((item) => `<li>${item}</li>`).join("")}
        </ol>
      </div>
    `;
    this.root.querySelector(".battle-end-turn")?.addEventListener("click", () => this.onEndTurn?.());
    for (const button of this.root.querySelectorAll("[data-skill]")) {
      button.addEventListener("click", () => this.onUseSkill?.(button.dataset.skill));
    }
  }
}
