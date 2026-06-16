const GAME = {
  title: "苍山侠影",
  subtitle: "风起云岭 · 旧案新踪",
  heroName: "沈临川",
  companionName: "苏萝",
  tileSize: 64,
  playerSpeed: 220,
  playerCollision: { width: 34, height: 28 },
  sprite: {
    frameWidth: 313,
    frameHeight: 313,
    framesPerDirection: 4,
    directions: ["down", "left", "right", "up"],
    walkSequence: [0, 1, 0, 3],
    frameDuration: 0.105,
    drawWidth: 112,
    drawHeight: 112
  }
};

const ASSETS = {
  worldWest: "world-west-pack/world-west.png",
  worldEast: "world-east-pack/world-east.png",
  room: "room-pack/inn-room.png",
  hero: "character-pack/hero.png",
  companion: "character-pack/companion.png",
  scout: "character-pack/scout.png",
  vendor: "character-pack/vendor.png",
  keeper: "character-pack/keeper.png",
  battleMap: "battle-pack/battle-courtyard.png",
  bgm: "audio-pack/cangshan-road.m4a",
  hitSfx: "audio-pack/hit.wav"
};

const BATTLE = {
  title: "西岭密探",
  cols: 7,
  rows: 9,
  objective: "击退伏兵",
  players: [
    { id: "hero", name: GAME.heroName, sprite: "hero", side: "player", x: 2, y: 7, hp: 88, qi: 100, move: 3, range: 2, damage: 38, skill: "归元剑气" },
    { id: "companion", name: GAME.companionName, sprite: "companion", side: "player", x: 1, y: 7, hp: 72, qi: 70, move: 3, range: 1, damage: 24, skill: "短剑" }
  ],
  enemies: [
    { id: "scoutA", name: "暗哨甲", sprite: "scout", side: "enemy", x: 4, y: 7, hp: 38, qi: 40, move: 2, range: 1, damage: 18, skill: "短刀" },
    { id: "scoutB", name: "暗哨乙", sprite: "scout", side: "enemy", x: 5, y: 5, hp: 46, qi: 40, move: 2, range: 1, damage: 18, skill: "短刀" }
  ]
};

const MAPS = {
  world: {
    id: "world",
    images: [
      { id: "worldWest", x: 0, y: 0 },
      { id: "worldEast", x: 2240, y: 0 }
    ],
    width: 4480,
    height: 3584,
    spawn: { x: 2700, y: 2520 },
    collisions: [
      { x: 0, y: 0, width: 4480, height: 72 },
      { x: 0, y: 3512, width: 4480, height: 72 },
      { x: 0, y: 0, width: 72, height: 3584 },
      { x: 4408, y: 0, width: 72, height: 3584 },
      { x: 2140, y: 520, width: 860, height: 540 },
      { x: 2650, y: 1960, width: 690, height: 285 },
      { x: 3008, y: 2368, width: 256, height: 156 }
    ],
    triggers: [
      { id: "inn", x: 2750, y: 2248, width: 230, height: 250, label: "进入云来客栈" },
      { id: "vendor", x: 2820, y: 2410, width: 220, height: 220, label: "询问药摊老人" },
      { id: "scout", x: 790, y: 660, width: 210, height: 190, label: "查看西岭密探" }
    ],
    npcs: [
      { id: "keeper", name: "客栈掌柜", sprite: "keeper", x: 2735, y: 2525, direction: "right" },
      { id: "vendor", name: "药摊老人", sprite: "vendor", x: 2940, y: 2520, direction: "down" },
      { id: "scout", name: "西岭密探", sprite: "scout", x: 895, y: 745, direction: "down" }
    ]
  },
  room: {
    id: "room",
    image: "room",
    width: 1280,
    height: 768,
    spawn: { x: 610, y: 650 },
    collisions: [
      { x: 0, y: 0, width: 1280, height: 80 },
      { x: 100, y: 120, width: 338, height: 230 },
      { x: 488, y: 330, width: 313, height: 160 },
      { x: 900, y: 80, width: 300, height: 430 },
      { x: 200, y: 430, width: 263, height: 180 },
      { x: 0, y: 0, width: 40, height: 768 },
      { x: 1240, y: 0, width: 40, height: 768 }
    ],
    triggers: [
      { id: "roomExit", x: 520, y: 650, width: 240, height: 118, label: "离开客房" },
      { id: "wardrobe", x: 930, y: 240, width: 260, height: 250, label: "搜索木柜" },
      { id: "desk", x: 650, y: 100, width: 285, height: 190, label: "查看账册" }
    ],
    npcs: [{ id: "companion", name: "苏萝", sprite: "companion", x: 540, y: 260, direction: "down" }]
  }
};

module.exports = { GAME, ASSETS, MAPS, BATTLE };
