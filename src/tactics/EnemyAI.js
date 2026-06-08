import { distance } from "./TacticsMap.js";

export class EnemyAI {
  constructor(state) {
    this.state = state;
  }

  async runTurn() {
    for (const enemy of this.state.living("enemy")) {
      if (this.state.finished) return;
      await wait(320);
      this.state.selectedId = enemy.id;
      const target = nearest(enemy, this.state.living("player"));
      if (!target) continue;
      if (distance(enemy.cell, target.cell) > enemy.attackRange) {
        const move = this.bestMoveToward(enemy, target);
        if (move) this.state.moveSelected(move);
      }
      if (distance(enemy.cell, target.cell) <= enemy.attackRange) {
        this.state.attackSelected(target.id);
      } else {
        enemy.acted = true;
        this.state.logEvent(`${enemy.name} 寻路逼近。`);
      }
    }
    if (!this.state.finished) this.state.startSide("player");
  }

  bestMoveToward(enemy, target) {
    const moves = this.state.legalMoves(enemy);
    moves.sort((a, b) => distance(a, target.cell) - distance(b, target.cell));
    return moves[0] || null;
  }
}

function nearest(unit, targets) {
  return targets.slice().sort((a, b) => distance(unit.cell, a.cell) - distance(unit.cell, b.cell))[0] || null;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
