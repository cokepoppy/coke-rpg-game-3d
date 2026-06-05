export class CollisionSystem {
  constructor(map) {
    this.map = map;
  }

  canMove(rect) {
    return !this.map.collision.some((wall) => intersects(rect, wall));
  }
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
