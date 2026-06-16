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
  apothecaryRoom: "room-pack/apothecary-room.png",
  teahouseRoom: "room-pack/teahouse-room.png",
  worldMap: "world-map-pack/world-map.png",
  hero: "character-pack/hero.png",
  companion: "character-pack/companion.png",
  scout: "character-pack/scout.png",
  vendor: "character-pack/vendor.png",
  keeper: "character-pack/keeper.png",
  battleMap: "battle-pack/battle-courtyard.png",
  bgm: "audio-pack/cangshan-road.m4a",
  battleBgm: "audio-pack/battle-loop.wav",
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
  ],
  rewards: {
    money: { min: 18, max: 35 },
    drops: [
      { itemId: "hemostatic_powder", name: "止血散", chance: 1, min: 1, max: 1 },
      { itemId: "scout_token", name: "密探令牌", chance: 0.35, min: 1, max: 1 }
    ]
  }
};

const SCOUT_IDS = ["scout", "scout_road", "scout_gate"];

const WORLD_NODES = [
  { id: "cangshan", name: "苍山旧道", x: 148, y: 420, status: "current" },
  { id: "erhai", name: "洱海渡口", x: 254, y: 300, status: "locked" },
  { id: "jianhu", name: "剑湖宫道", x: 124, y: 204, status: "locked" }
];

const ROOM_COLLISIONS = [
  { x: 0, y: 0, width: 1280, height: 80 },
  { x: 100, y: 120, width: 338, height: 230 },
  { x: 488, y: 330, width: 313, height: 160 },
  { x: 900, y: 80, width: 300, height: 430 },
  { x: 200, y: 430, width: 263, height: 180 },
  { x: 0, y: 0, width: 40, height: 768 },
  { x: 1240, y: 0, width: 40, height: 768 }
];

const ROOM_TRIGGERS = [
  { id: "roomExit", x: 520, y: 650, width: 240, height: 118, label: "离开房间" },
  { id: "wardrobe", x: 930, y: 240, width: 260, height: 250, label: "搜索木柜" },
  { id: "desk", x: 650, y: 100, width: 285, height: 190, label: "查看账册" }
];

const APOTHECARY_COLLISIONS = [
  { x: 0, y: 0, width: 1280, height: 78 },
  { x: 0, y: 0, width: 40, height: 768 },
  { x: 1240, y: 0, width: 40, height: 768 },
  { x: 0, y: 704, width: 520, height: 64 },
  { x: 760, y: 704, width: 520, height: 64 },
  { x: 48, y: 84, width: 292, height: 460 },
  { x: 350, y: 84, width: 590, height: 150 },
  { x: 340, y: 260, width: 560, height: 104 },
  { x: 980, y: 84, width: 230, height: 420 },
  { x: 820, y: 430, width: 240, height: 176 },
  { x: 430, y: 650, width: 96, height: 80 },
  { x: 760, y: 650, width: 96, height: 80 }
];

const APOTHECARY_TRIGGERS = [
  { id: "roomExit", x: 520, y: 650, width: 240, height: 118, label: "离开百草铺" },
  { id: "wardrobe", x: 970, y: 105, width: 230, height: 260, label: "搜索药柜" },
  { id: "desk", x: 580, y: 210, width: 300, height: 160, label: "查看药方" }
];

const TEAHOUSE_COLLISIONS = [
  { x: 0, y: 0, width: 1280, height: 78 },
  { x: 0, y: 0, width: 40, height: 768 },
  { x: 1240, y: 0, width: 40, height: 768 },
  { x: 0, y: 704, width: 520, height: 64 },
  { x: 760, y: 704, width: 520, height: 64 },
  { x: 60, y: 82, width: 340, height: 250 },
  { x: 415, y: 110, width: 560, height: 168 },
  { x: 1040, y: 84, width: 170, height: 440 },
  { x: 250, y: 320, width: 180, height: 120 },
  { x: 535, y: 300, width: 180, height: 118 },
  { x: 820, y: 320, width: 180, height: 118 },
  { x: 335, y: 500, width: 184, height: 130 },
  { x: 690, y: 500, width: 184, height: 130 },
  { x: 920, y: 595, width: 255, height: 130 }
];

const TEAHOUSE_TRIGGERS = [
  { id: "roomExit", x: 520, y: 650, width: 240, height: 118, label: "离开茶肆" },
  { id: "wardrobe", x: 100, y: 255, width: 180, height: 120, label: "搜索茶箱" },
  { id: "desk", x: 850, y: 100, width: 220, height: 170, label: "查看告示" }
];

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
      { id: "inn", x: 2750, y: 2320, width: 230, height: 178, label: "进入云来客栈" },
      { id: "apothecaryDoor", x: 3350, y: 2380, width: 210, height: 180, label: "进入百草铺" },
      { id: "teahouseDoor", x: 2220, y: 1120, width: 230, height: 180, label: "进入松风茶肆" },
      { id: "vendor", x: 3260, y: 2500, width: 220, height: 220, label: "询问药摊老人" },
      { id: "scout", x: 790, y: 660, width: 210, height: 190, label: "挑战西岭密探" },
      { id: "scout_road", x: 2320, y: 1440, width: 210, height: 190, label: "挑战拦路密探" },
      { id: "scout_gate", x: 3380, y: 1660, width: 210, height: 190, label: "挑战山门密探" }
    ],
    npcs: [
      { id: "keeper", name: "客栈掌柜", sprite: "keeper", x: 2735, y: 2525, direction: "right" },
      { id: "vendor", name: "药摊老人", sprite: "vendor", x: 3370, y: 2600, direction: "down" },
      { id: "scout", name: "西岭密探", sprite: "scout", x: 895, y: 745, direction: "down" },
      { id: "scout_road", name: "拦路密探", sprite: "scout", x: 2425, y: 1525, direction: "down" },
      { id: "scout_gate", name: "山门密探", sprite: "scout", x: 3485, y: 1745, direction: "down" }
    ]
  },
  room: {
    id: "room",
    image: "room",
    width: 1280,
    height: 768,
    spawn: { x: 610, y: 650 },
    exitTo: { mapId: "world", spawn: { x: 2700, y: 2520 }, label: "离开客房" },
    collisions: ROOM_COLLISIONS,
    triggers: ROOM_TRIGGERS,
    npcs: [{ id: "companion", name: "苏萝", sprite: "companion", x: 540, y: 260, direction: "down" }]
  },
  apothecaryRoom: {
    id: "apothecaryRoom",
    image: "apothecaryRoom",
    width: 1280,
    height: 768,
    spawn: { x: 610, y: 650 },
    exitTo: { mapId: "world", spawn: { x: 3370, y: 2580 }, label: "离开百草铺" },
    collisions: APOTHECARY_COLLISIONS,
    triggers: APOTHECARY_TRIGGERS,
    npcs: [{ id: "vendor", name: "药摊老人", sprite: "vendor", x: 540, y: 260, direction: "down" }]
  },
  teahouseRoom: {
    id: "teahouseRoom",
    image: "teahouseRoom",
    width: 1280,
    height: 768,
    spawn: { x: 610, y: 650 },
    exitTo: { mapId: "world", spawn: { x: 2320, y: 1320 }, label: "离开松风茶肆" },
    collisions: TEAHOUSE_COLLISIONS,
    triggers: TEAHOUSE_TRIGGERS,
    npcs: [{ id: "keeper", name: "茶肆掌柜", sprite: "keeper", x: 540, y: 260, direction: "down" }]
  }
};

module.exports = { GAME, ASSETS, MAPS, BATTLE, SCOUT_IDS, WORLD_NODES };
