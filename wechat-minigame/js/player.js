const { GAME } = require("./config");

class Player {
  constructor(image, spawn) {
    this.image = image;
    this.x = spawn.x;
    this.y = spawn.y;
    this.direction = "down";
    this.frame = 0;
    this.elapsed = 0;
    this.sequenceIndex = 0;
  }

  boundsAt(x, y) {
    const size = GAME.playerCollision;
    return { x: x - size.width / 2, y: y - size.height, width: size.width, height: size.height };
  }

  update(dt, axis, canMove) {
    const moving = axis.x !== 0 || axis.y !== 0;
    if (axis.x < 0) this.direction = "left";
    if (axis.x > 0) this.direction = "right";
    if (axis.y < 0) this.direction = "up";
    if (axis.y > 0) this.direction = "down";
    if (moving) {
      const length = Math.hypot(axis.x, axis.y) || 1;
      const dx = axis.x / length * GAME.playerSpeed * dt;
      const dy = axis.y / length * GAME.playerSpeed * dt;
      if (canMove(this.boundsAt(this.x + dx, this.y))) this.x += dx;
      if (canMove(this.boundsAt(this.x, this.y + dy))) this.y += dy;
      this.elapsed += dt;
      if (this.elapsed >= GAME.sprite.frameDuration) {
        this.elapsed %= GAME.sprite.frameDuration;
        this.sequenceIndex = (this.sequenceIndex + 1) % GAME.sprite.walkSequence.length;
        this.frame = GAME.sprite.walkSequence[this.sequenceIndex];
      }
    } else {
      this.frame = 0;
      this.elapsed = 0;
      this.sequenceIndex = 0;
    }
  }

  draw(context, camera) {
    drawSprite(context, this.image, this.x - camera.x, this.y - camera.y, this.direction, this.frame, GAME.sprite.drawWidth, GAME.sprite.drawHeight);
  }
}

function drawSprite(context, image, x, y, direction = "down", frame = 0, width = 82, height = 82) {
  const sprite = GAME.sprite;
  const row = Math.max(0, sprite.directions.indexOf(direction));
  context.drawImage(image, frame * sprite.frameWidth, row * sprite.frameHeight, sprite.frameWidth, sprite.frameHeight,
    Math.round(x - width / 2), Math.round(y - height * 0.86), width, height);
}

module.exports = { Player, drawSprite };
