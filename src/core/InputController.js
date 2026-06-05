export class InputController {
  constructor(target = window) {
    this.keys = new Set();
    this.once = new Set();
    target.addEventListener("keydown", (event) => this.keys.add(event.key.toLowerCase()));
    target.addEventListener("keydown", (event) => this.once.add(event.key.toLowerCase()));
    target.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
  }

  axis() {
    const left = this.keys.has("arrowleft") || this.keys.has("a");
    const right = this.keys.has("arrowright") || this.keys.has("d");
    const up = this.keys.has("arrowup") || this.keys.has("w");
    const down = this.keys.has("arrowdown") || this.keys.has("s");
    return {
      x: Number(right) - Number(left),
      y: Number(down) - Number(up)
    };
  }

  pressed(key) {
    return this.keys.has(key.toLowerCase());
  }

  consume(key) {
    const normalized = key.toLowerCase();
    const active = this.once.has(normalized);
    this.once.delete(normalized);
    return active;
  }
}
