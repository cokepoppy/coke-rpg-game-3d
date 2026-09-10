export class BattleUnit {
  constructor(config) {
    Object.assign(this, config);
    this.maxHp = config.maxHp ?? config.hp;
    this.hp = config.hp ?? this.maxHp;
    this.visualHp = this.hp;
    this.maxQi = config.maxQi ?? config.qi ?? 100;
    this.qi = config.qi ?? this.maxQi;
    this.moveRange = config.moveRange ?? 3;
    this.attackRange = config.attackRange ?? 1;
    this.skills = config.skills || [];
    this.moved = false;
    this.acted = false;
    this.alive = true;
    this.animation = null;
    this.direction = config.direction || (this.side === "player" ? "right" : "left");
    this.frame = 0;
    this.frameClock = 0;
  }

  update(dt) {
    this.visualHp += (this.hp - this.visualHp) * Math.min(1, dt * 12);
    this.frameClock += dt;
    if (this.frameClock >= 0.18) {
      this.frameClock = 0;
      this.frame = (this.frame + 1) % 4;
    }
  }

  beginTurn() {
    this.moved = false;
    this.acted = false;
    this.qi = Math.min(this.maxQi, this.qi + 8);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.alive = this.hp > 0;
  }
}
