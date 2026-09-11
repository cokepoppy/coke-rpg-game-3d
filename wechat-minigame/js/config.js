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
    drawWidth: 96,
    drawHeight: 96
  }
};

const ASSETS = {
  worldWest: "world-west-pack/world-west.png",
  worldEast: "world-east-pack/world-east.png",
  moonValley: "moon-valley-pack/moon-valley.png",
  room: "room-pack/inn-room.png",
  apothecaryRoom: "room-pack/apothecary-room.png",
  teahouseRoom: "room-pack/teahouse-room.png",
  moonMedicineHall: "room-pack/moon-valley-medicine-hall.png",
  moonStudy: "room-pack/moon-valley-study.png",
  worldMap: "world-map-pack/world-map.png",
  hero: "character-pack/hero.png",
  heroAttack: "character-pack/hero-attack.png",
  companion: "character-pack/companion.png",
  companionAttack: "character-pack/companion-attack.png",
  scout: "character-pack/scout.png",
  scoutAttack: "character-pack/scout-attack.png",
  scoutArcher: "character-pack/scout-archer.png",
  monkGuard: "character-pack/monk-guard.png",
  yipintangLeader: "character-pack/yipintang-leader.png",
  vendor: "character-pack/vendor.png",
  keeper: "character-pack/keeper.png",
  daoistMaster: "character-pack/daoist-master.png",
  qinWanyao: "character-pack/qin-wanyao.png",
  muZhiyan: "character-pack/mu-zhiyan.png",
  moonValleyDisciple: "character-pack/moon-valley-disciple.png",
  moonValleyTraitor: "character-pack/moon-valley-traitor.png",
  lanternWraith: "character-pack/lantern-wraith.png",
  boneMirrorHag: "character-pack/bone-mirror-hag.png",
  xiaoBeichen: "character-pack/xiao-beichen.png",
  xuYunsheng: "character-pack/xu-yunsheng.png",
  lianZhao: "character-pack/lian-zhao.png",
  rongQingxuan: "character-pack/rong-qingxuan.png",
  xiaoCangming: "character-pack/xiao-cangming.png",
  rongJinghuai: "character-pack/rong-jinghuai.png",
  wuChenseng: "character-pack/wu-chenseng.png",
  shenYuanhe: "character-pack/shen-yuanhe.png",
  battleTemple: "battle-pack/battle-temple.png",
  battleFerry: "battle-pack/battle-ferry.png",
  battleBamboo: "battle-pack/battle-bamboo.png",
  swordImpact: "battle-pack/sword-impact.png",
  daoistCutscenePoster: "video-pack/fuyao-poster.png",
  bgm: "audio-pack/cangshan-road.m4a",
  battleBgm: "audio-pack/iron-fan-valley.mp3",
  hitSfx: "audio-pack/hit.wav",
  stunSfx: "audio-pack/stun.wav",
  healSfx: "audio-pack/heal.wav",
  sweepSfx: "audio-pack/sweep.wav",
  uiSfx: "audio-pack/ui.wav",
  promptSfx: "audio-pack/prompt.wav",
  buySfx: "audio-pack/buy.wav",
  waitSfx: "audio-pack/wait.wav"
};

const BATTLE = {
  title: "西岭密探",
  cols: 7,
  rows: 9,
  blocked: [[3, 2], [3, 3], [3, 4], [3, 5], [4, 4]],
  objective: "击退伏兵",
  players: [
    { id: "hero", name: GAME.heroName, sprite: "hero", attackSprite: "heroAttack", side: "player", x: 2, y: 7, hp: 88, qi: 110, move: 3, range: 2, damage: 32, skillIds: ["guiyuan_sword", "daze", "whirlwind"] },
    { id: "companion", name: GAME.companionName, sprite: "companion", attackSprite: "companionAttack", side: "player", x: 1, y: 7, hp: 72, qi: 90, move: 3, range: 1, damage: 24, skillIds: ["quick_slash", "heal", "guard_break"] }
  ],
  enemies: [
    { id: "scoutA", name: "暗哨甲", sprite: "scout", attackSprite: "scoutAttack", side: "enemy", x: 4, y: 7, hp: 38, qi: 40, move: 2, range: 1, damage: 18, skillIds: ["quick_slash"] },
    { id: "scoutB", name: "竹林弩手", sprite: "scoutArcher", side: "enemy", x: 5, y: 5, hp: 46, qi: 40, move: 2, range: 2, damage: 16, skillIds: ["arrow_shot"] }
  ],
  skills: {
    basic_attack: { id: "basic_attack", name: "普通攻击", cost: 0, range: 1, kind: "basic", effect: "相邻格物理攻击" },
    quick_slash: { id: "quick_slash", name: "疾斩", cost: 0, range: 1, damage: 24, kind: "single", effect: "近身攻击" },
    guiyuan_sword: { id: "guiyuan_sword", name: "归元剑气", cost: 35, range: 2, damage: 38, kind: "single", effect: "远距剑气" },
    daze: { id: "daze", name: "点穴", cost: 45, range: 3, damage: 18, kind: "single", status: "stunned", statusTurns: 1, effect: "伤害并晕眩一回合" },
    whirlwind: { id: "whirlwind", name: "回风扫叶", cost: 55, range: 1, damage: 24, kind: "aoe", radius: 1, effect: "命中目标周围敌人" },
    heal: { id: "heal", name: "回春散", cost: 30, range: 0, heal: 24, kind: "ally_all", effect: "我方全体回血" },
    guard_break: { id: "guard_break", name: "破甲刺", cost: 35, range: 1, damage: 22, kind: "single", status: "exposed", statusTurns: 2, effect: "破防两回合" },
    arrow_shot: { id: "arrow_shot", name: "袖弩", cost: 0, range: 2, damage: 16, kind: "single", effect: "远程射击" },
    rally: { id: "rally", name: "振奋", cost: 25, range: 0, qiRestore: 18, kind: "ally_all", effect: "我方回复真气" },
    fuyou_step: { id: "fuyou_step", name: "扶摇诀", cost: 50, range: 3, damage: 30, kind: "aoe", radius: 1, status: "stunned", statusTurns: 1, effect: "御风群攻并使敌人晕眩" },
    lantern_ring: { id: "lantern_ring", name: "灯影回环", cost: 28, range: 3, damage: 27, kind: "aoe", radius: 1, status: "exposed", statusTurns: 2, effect: "灯火回环并使目标破防" },
    mirror_needle: { id: "mirror_needle", name: "照骨针", cost: 22, range: 3, damage: 25, kind: "single", status: "stunned", statusTurns: 1, effect: "远距毒针并短暂封穴" },
    mirror_shatter: { id: "mirror_shatter", name: "裂镜回生", cost: 34, range: 3, damage: 30, kind: "aoe", radius: 1, status: "exposed", statusTurns: 2, effect: "裂镜震荡并使目标破防" }
  },
  rewards: {
    money: { min: 18, max: 35 },
    drops: [
      { itemId: "hemostatic_powder", name: "止血散", chance: 1, min: 1, max: 1 },
      { itemId: "qingxin_pill", name: "清心丸", chance: 0.42, min: 1, max: 1 },
      { itemId: "scout_token", name: "密探令牌", chance: 0.35, min: 1, max: 1 },
      { itemId: "steel_saber", name: "雁翎刀", chance: 0.12, min: 1, max: 1 }
    ]
  }
};

const BOSS_BATTLES = {
  boss_lantern_wraith: {
    title: "灯亭 · 引灯魇客",
    cols: BATTLE.cols,
    rows: BATTLE.rows,
    blocked: [[2, 2], [2, 3], [2, 4], [4, 1], [4, 2]],
    objective: "击破引灯魇客并熄灭残灯",
    players: BATTLE.players.map((unit) => ({ ...unit })),
    enemies: [
      { id: "lanternWraith", name: "引灯魇客", sprite: "lanternWraith", side: "enemy", x: 5, y: 4, hp: 168, qi: 110, move: 2, range: 3, damage: 30, defense: 5, skillIds: ["lantern_ring"], enrageAt: 0.5, enrageSkillId: "lantern_ring", drawWidth: 118, drawHeight: 138 },
      { id: "lanternShadeA", name: "残灯影卫", sprite: "scout", attackSprite: "scoutAttack", side: "enemy", x: 4, y: 6, hp: 58, qi: 35, move: 2, range: 1, damage: 20, skillIds: ["quick_slash"] },
      { id: "lanternShadeB", name: "残灯影卫", sprite: "scout", attackSprite: "scoutAttack", side: "enemy", x: 6, y: 2, hp: 58, qi: 35, move: 2, range: 1, damage: 20, skillIds: ["quick_slash"] }
    ],
    skills: BATTLE.skills,
    rewards: {
      money: { min: 48, max: 68 },
      drops: [{ itemId: "broken_sword_guard", name: "断剑护手", chance: 1, min: 1, max: 1 }]
    }
  },
  boss_bone_mirror_hag: {
    title: "月华药庐 · 照骨婆",
    cols: BATTLE.cols,
    rows: BATTLE.rows,
    blocked: [[2, 2], [2, 3], [2, 4], [4, 1], [4, 2]],
    objective: "击破照骨婆并夺回药账残页",
    players: BATTLE.players.map((unit) => ({ ...unit })),
    enemies: [
      { id: "boneMirrorHag", name: "照骨婆", sprite: "boneMirrorHag", side: "enemy", x: 5, y: 4, hp: 188, qi: 120, move: 2, range: 3, damage: 32, defense: 6, skillIds: ["mirror_needle"], enrageAt: 0.5, enrageSkillId: "mirror_shatter", drawWidth: 122, drawHeight: 140 },
      { id: "mirrorServant", name: "镜中侍", sprite: "moonValleyTraitor", side: "enemy", x: 4, y: 6, hp: 68, qi: 42, move: 2, range: 2, damage: 22, skillIds: ["arrow_shot"] },
      { id: "poisonLantern", name: "毒灯影", sprite: "moonValleyTraitor", side: "enemy", x: 6, y: 2, hp: 62, qi: 42, move: 2, range: 2, damage: 20, skillIds: ["arrow_shot"] }
    ],
    skills: BATTLE.skills,
    rewards: {
      money: { min: 62, max: 86 },
      drops: [{ itemId: "moon_record_fragment", name: "月华药账残页", chance: 1, min: 1, max: 1 }]
    }
  }
};

const SCOUT_IDS = ["scout", "scout_bridge", "scout_archer", "scout_road", "scout_monk", "scout_gate"];
const BOSS_IDS = Object.keys(BOSS_BATTLES);

const WORLD_NODES = [
  { id: "cangshan", name: "苍山旧道", x: 168, y: 610, status: "current" },
  { id: "yuehua", name: "月华谷", x: 242, y: 486, status: "locked" },
  { id: "erhai", name: "洱海渡口", x: 292, y: 430, status: "locked" },
  { id: "jianhu", name: "剑湖宫道", x: 122, y: 176, status: "locked" }
];

const WORLD_OCCLUSIONS = [
  { x: 2140, y: 520, width: 860, height: 350 },
  { x: 2650, y: 1960, width: 690, height: 285 },
  { x: 3008, y: 2368, width: 256, height: 82 },
  { x: 3072, y: 2460, width: 192, height: 64 }
];

// Measured against the current 1280x768 inn-room.png. These are only the
// front edges of furniture; broad desktop-era rectangles hide nearby actors.
const ROOM_OCCLUSIONS = [
  { name: "bed_front_edge", x: 92, y: 302, width: 270, height: 38 },
  { name: "table_front_edge", x: 548, y: 430, width: 196, height: 30 },
  { name: "table_front_chair_seat", x: 612, y: 422, width: 68, height: 32 },
  { name: "table_front_chair_legs", x: 612, y: 454, width: 68, height: 40 },
  { name: "storage_bottom_edge", x: 730, y: 194, width: 392, height: 30 },
  { name: "screen_front_edge", x: 82, y: 654, width: 284, height: 34 }
];

const ROOM_COLLISIONS = [
  { x: 0, y: 0, width: 1280, height: 80 },
  { x: 110, y: 145, width: 300, height: 175 },
  { x: 520, y: 350, width: 250, height: 118 },
  { x: 948, y: 100, width: 230, height: 350 },
  { x: 220, y: 455, width: 220, height: 120 },
  { x: 0, y: 0, width: 40, height: 768 },
  { x: 1240, y: 0, width: 40, height: 768 }
];

const ROOM_TRIGGERS = [
  { id: "roomExit", x: 520, y: 650, width: 240, height: 118, label: "离开房间" },
  { id: "su_luo", x: 430, y: 155, width: 220, height: 190, label: "与苏萝说话" },
  { id: "wardrobe", x: 930, y: 240, width: 260, height: 250, label: "搜索木柜" },
  { id: "desk", x: 650, y: 100, width: 285, height: 190, label: "查看账册" }
];

const APOTHECARY_COLLISIONS = [
  { x: 0, y: 0, width: 1280, height: 78 },
  { x: 0, y: 0, width: 40, height: 768 },
  { x: 1240, y: 0, width: 40, height: 768 },
  { x: 0, y: 704, width: 520, height: 64 },
  { x: 760, y: 704, width: 520, height: 64 },
  { x: 68, y: 104, width: 240, height: 360 },
  { x: 382, y: 104, width: 500, height: 105 },
  { x: 375, y: 282, width: 485, height: 72 },
  { x: 1010, y: 104, width: 160, height: 330 },
  { x: 850, y: 455, width: 190, height: 120 },
  { x: 446, y: 672, width: 58, height: 48 },
  { x: 782, y: 672, width: 58, height: 48 }
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
  { x: 76, y: 104, width: 280, height: 190 },
  { x: 445, y: 130, width: 480, height: 120 },
  { x: 1062, y: 104, width: 120, height: 350 },
  { x: 275, y: 340, width: 135, height: 82 },
  { x: 560, y: 320, width: 130, height: 80 },
  { x: 845, y: 340, width: 135, height: 82 },
  { x: 362, y: 522, width: 132, height: 88 },
  { x: 718, y: 522, width: 132, height: 88 },
  { x: 948, y: 620, width: 198, height: 84 }
];

const TEAHOUSE_TRIGGERS = [
  { id: "roomExit", x: 520, y: 650, width: 240, height: 118, label: "离开茶肆" },
  { id: "wardrobe", x: 100, y: 255, width: 180, height: 120, label: "搜索茶箱" },
  { id: "desk", x: 850, y: 100, width: 220, height: 170, label: "查看告示" }
];

const MOON_ROOM_COLLISIONS = [
  { x: 0, y: 0, width: 1280, height: 72 },
  { x: 0, y: 0, width: 36, height: 768 },
  { x: 1244, y: 0, width: 36, height: 768 },
  { x: 0, y: 708, width: 520, height: 60 },
  { x: 760, y: 708, width: 520, height: 60 }
];

const MOON_MEDICINE_COLLISIONS = [
  ...MOON_ROOM_COLLISIONS,
  { x: 70, y: 84, width: 250, height: 390 },
  { x: 340, y: 72, width: 570, height: 168 },
  { x: 948, y: 92, width: 254, height: 262 },
  { x: 515, y: 360, width: 335, height: 135 },
  { x: 72, y: 602, width: 218, height: 96 },
  { x: 930, y: 542, width: 260, height: 125 }
];

const MOON_STUDY_COLLISIONS = [
  ...MOON_ROOM_COLLISIONS,
  { x: 60, y: 60, width: 205, height: 206 },
  { x: 305, y: 50, width: 360, height: 198 },
  { x: 705, y: 210, width: 345, height: 118 },
  { x: 150, y: 448, width: 238, height: 96 },
  { x: 1015, y: 478, width: 174, height: 120 },
  { x: 1116, y: 285, width: 118, height: 185 },
  { x: 235, y: 278, width: 230, height: 142 }
];

const MOON_ROOM_TRIGGERS = [
  { id: "roomExit", x: 520, y: 650, width: 240, height: 118, label: "离开月华谷房间" },
  { id: "wardrobe", x: 940, y: 125, width: 230, height: 220, label: "搜索柜架" },
  { id: "desk", x: 690, y: 160, width: 330, height: 180, label: "查看案卷" }
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
    occlusions: WORLD_OCCLUSIONS,
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
      { id: "inn", x: 2680, y: 2260, width: 360, height: 260, label: "进入云来客栈" },
      { id: "apothecaryDoor", x: 3290, y: 2320, width: 340, height: 260, label: "进入百草铺" },
      { id: "teahouseDoor", x: 2160, y: 1060, width: 360, height: 260, label: "进入松风茶肆" },
      { id: "moonValleyGate", x: 3000, y: 1320, width: 360, height: 300, label: "前往月华谷" },
      { id: "vendor", x: 3260, y: 2500, width: 220, height: 220, label: "询问药摊老人" },
      { id: "daoist_master", x: 2580, y: 2740, width: 360, height: 300, label: "拜会逍遥道人" },
      { id: "scout", x: 2520, y: 2500, width: 260, height: 230, label: "挑战西岭密探" },
      { id: "scout_bridge", x: 2240, y: 2220, width: 260, height: 230, label: "挑战桥头暗哨" },
      { id: "scout_archer", x: 2040, y: 1840, width: 260, height: 230, label: "挑战竹林弩手" },
      { id: "scout_road", x: 2380, y: 1500, width: 260, height: 230, label: "挑战拦路密探" },
      { id: "scout_monk", x: 2700, y: 1320, width: 280, height: 230, label: "挑战寺前护卫" },
      { id: "scout_gate", x: 3100, y: 1640, width: 280, height: 230, label: "挑战山门密探" },
      { id: "boss_lantern_wraith", x: 1580, y: 940, width: 360, height: 300, label: "调查残灯禁地" }
    ],
    npcs: [
      { id: "keeper", name: "客栈掌柜", sprite: "keeper", x: 2735, y: 2525, direction: "right" },
      { id: "vendor", name: "药摊老人", sprite: "vendor", x: 3370, y: 2600, direction: "down" },
      { id: "daoist_master", name: "逍遥道人", sprite: "daoistMaster", x: 2780, y: 2890, direction: "down" },
      { id: "scout", name: "西岭密探", sprite: "scout", x: 2648, y: 2590, direction: "down" },
      { id: "scout_bridge", name: "桥头暗哨", sprite: "scout", x: 2368, y: 2310, direction: "down" },
      { id: "scout_archer", name: "竹林弩手", sprite: "scoutArcher", x: 2168, y: 1930, direction: "down" },
      { id: "scout_road", name: "拦路密探", sprite: "scout", x: 2508, y: 1590, direction: "down" },
      { id: "scout_monk", name: "寺前护卫", sprite: "monkGuard", x: 2840, y: 1410, direction: "down" },
      { id: "scout_gate", name: "山门首领", sprite: "yipintangLeader", x: 3240, y: 1730, direction: "down" },
      { id: "boss_lantern_wraith", name: "引灯魇客", sprite: "lanternWraith", x: 1760, y: 1080, direction: "down" }
    ]
  },
  moonValley: {
    id: "moonValley",
    image: "moonValley",
    width: 780,
    height: 1688,
    spawn: { x: 390, y: 1575 },
    exitTo: { mapId: "world", spawn: { x: 3180, y: 1480 }, label: "返回苍山旧道" },
    collisions: [
      { x: 0, y: 0, width: 780, height: 24 },
      { x: 0, y: 1664, width: 780, height: 24 },
      { x: 0, y: 0, width: 28, height: 1688 },
      { x: 752, y: 0, width: 28, height: 1688 },
      { x: 0, y: 0, width: 145, height: 395 },
      { x: 600, y: 0, width: 180, height: 500 },
      { x: 228, y: 36, width: 332, height: 178 },
      { x: 5, y: 360, width: 230, height: 330 },
      { x: 470, y: 285, width: 280, height: 345 },
      { x: 45, y: 760, width: 235, height: 205 },
      { x: 512, y: 782, width: 232, height: 182 },
      { x: 560, y: 1040, width: 185, height: 205 },
      { x: 18, y: 1110, width: 230, height: 270 },
      { x: 560, y: 1285, width: 185, height: 220 },
      { x: 0, y: 1450, width: 220, height: 220 },
      { x: 565, y: 1500, width: 190, height: 180 }
    ],
    triggers: [
      { id: "moonValleyExit", x: 290, y: 1560, width: 200, height: 120, label: "返回苍山旧道" },
      { id: "moonStudyDoor", x: 320, y: 205, width: 140, height: 120, label: "进入月华书房" },
      { id: "moonMedicineDoor", x: 570, y: 860, width: 150, height: 135, label: "进入月华药庐" },
      { id: "qin_wanyao", x: 315, y: 630, width: 160, height: 170, label: "拜会秦晚瑶" },
      { id: "mu_zhiyan", x: 480, y: 1080, width: 160, height: 170, label: "询问穆芷烟" },
      { id: "moon_disciple", x: 300, y: 1360, width: 170, height: 180, label: "询问月华弟子" },
      { id: "scout_moon", x: 340, y: 500, width: 170, height: 170, label: "挑战谷中叛徒" },
      { id: "boss_bone_mirror_hag", x: 80, y: 860, width: 190, height: 220, label: "调查裂镜药圃" }
    ],
    npcs: [
      { id: "qin_wanyao", name: "秦晚瑶", sprite: "qinWanyao", x: 392, y: 700, direction: "down" },
      { id: "mu_zhiyan", name: "穆芷烟", sprite: "muZhiyan", x: 555, y: 1160, direction: "left" },
      { id: "moon_disciple", name: "月华弟子", sprite: "moonValleyDisciple", x: 385, y: 1450, direction: "up" },
      { id: "scout_moon", name: "谷中叛徒", sprite: "moonValleyTraitor", x: 425, y: 575, direction: "down" },
      { id: "boss_bone_mirror_hag", name: "照骨婆", sprite: "boneMirrorHag", x: 175, y: 970, direction: "right" }
    ]
  },
  moonMedicineHall: {
    id: "moonMedicineHall",
    image: "moonMedicineHall",
    width: 1280,
    height: 768,
    spawn: { x: 610, y: 650 },
    exitTo: { mapId: "moonValley", spawn: { x: 638, y: 1010 }, label: "离开月华药庐" },
    collisions: MOON_MEDICINE_COLLISIONS,
    triggers: MOON_ROOM_TRIGGERS,
    npcs: [{ id: "qin_wanyao", name: "秦晚瑶", sprite: "qinWanyao", x: 610, y: 305, direction: "down" }]
  },
  moonStudy: {
    id: "moonStudy",
    image: "moonStudy",
    width: 1280,
    height: 768,
    spawn: { x: 610, y: 650 },
    exitTo: { mapId: "moonValley", spawn: { x: 390, y: 345 }, label: "离开月华书房" },
    collisions: MOON_STUDY_COLLISIONS,
    triggers: MOON_ROOM_TRIGGERS,
    npcs: [{ id: "mu_zhiyan", name: "穆芷烟", sprite: "muZhiyan", x: 880, y: 385, direction: "left" }]
  },
  room: {
    id: "room",
    image: "room",
    width: 1280,
    height: 768,
    spawn: { x: 610, y: 650 },
    exitTo: { mapId: "world", spawn: { x: 2700, y: 2520 }, label: "离开客房" },
    occlusions: ROOM_OCCLUSIONS,
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

module.exports = { GAME, ASSETS, MAPS, BATTLE, BOSS_BATTLES, BOSS_IDS, SCOUT_IDS, WORLD_NODES };
