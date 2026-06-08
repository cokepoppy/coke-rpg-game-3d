export class TacticsMap {
  constructor(config, image) {
    this.config = config;
    this.image = image;
    this.id = config.id;
    this.name = config.name;
    this.tileSize = config.tileSize;
    this.width = config.width;
    this.height = config.height;
    this.pixelWidth = this.width * this.tileSize;
    this.pixelHeight = this.height * this.tileSize;
    this.blocked = new Set(config.blocked.map(([x, y]) => key(x, y)));
  }

  static async load(url) {
    const config = await loadJson(url);
    const image = await loadImage(config.image);
    return new TacticsMap(config, image);
  }

  inBounds(cell) {
    return cell.x >= 0 && cell.y >= 0 && cell.x < this.width && cell.y < this.height;
  }

  isBlocked(cell) {
    return this.blocked.has(key(cell.x, cell.y));
  }

  cellCenter(cell) {
    return {
      x: cell.x * this.tileSize + this.tileSize / 2,
      y: cell.y * this.tileSize + this.tileSize / 2
    };
  }

  cellsInRange(origin, range, occupiedKeys = new Set()) {
    const frontier = [{ cell: origin, distance: 0 }];
    const reached = new Map([[key(origin.x, origin.y), { cell: origin, distance: 0 }]]);
    for (let i = 0; i < frontier.length; i += 1) {
      const current = frontier[i];
      if (current.distance >= range) continue;
      for (const next of neighbors(current.cell)) {
        const nextKey = key(next.x, next.y);
        if (reached.has(nextKey) || !this.inBounds(next) || this.isBlocked(next) || occupiedKeys.has(nextKey)) continue;
        const item = { cell: next, distance: current.distance + 1 };
        reached.set(nextKey, item);
        frontier.push(item);
      }
    }
    reached.delete(key(origin.x, origin.y));
    return [...reached.values()].map((item) => item.cell);
  }
}

export function key(x, y) {
  return `${x},${y}`;
}

export function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function neighbors(cell) {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 }
  ];
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load tactics map: ${url}`);
  return response.json();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}
