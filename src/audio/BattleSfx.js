export class BattleSfx {
  constructor() {
    this.played = [];
    this.context = null;
  }

  play(type, event = {}) {
    this.played.push({
      type,
      skillId: event.skillId,
      attackerId: event.attackerId,
      targetId: event.targetId,
      damage: event.damage,
      at: Math.round(performance.now())
    });
    if (type === "attack") this.playAttackTone(event);
  }

  playAttackTone(event) {
    const context = this.audioContext();
    if (!context) return;
    const now = context.currentTime;
    const gain = context.createGain();
    const low = context.createOscillator();
    const high = context.createOscillator();
    const filter = context.createBiquadFilter();

    low.type = "sawtooth";
    low.frequency.setValueAtTime(event.skillId === "six_meridians" ? 220 : 150, now);
    low.frequency.exponentialRampToValueAtTime(76, now + 0.16);

    high.type = "square";
    high.frequency.setValueAtTime(event.skillId === "six_meridians" ? 880 : 520, now);
    high.frequency.exponentialRampToValueAtTime(180, now + 0.08);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(540, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    low.connect(filter);
    high.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    low.start(now);
    high.start(now + 0.018);
    low.stop(now + 0.22);
    high.stop(now + 0.16);
  }

  audioContext() {
    if (this.context) return this.context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      this.context = new AudioContextClass();
      if (this.context.state === "suspended") this.context.resume().catch(() => {});
      return this.context;
    } catch {
      return null;
    }
  }
}
