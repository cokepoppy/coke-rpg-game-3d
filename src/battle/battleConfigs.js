const commonPlayerSkills = [
  { id: "six_meridians", name: "六脉剑气", cost: 35, damage: 38, range: 2, effectId: "qi_projectile" },
  { id: "lingbo_step", name: "凌波突刺", cost: 25, damage: 30, range: 1, effectId: "sword_slash" }
];

export const battleConfigs = {
  masked_scout: {
    id: "masked_scout",
    title: "一品堂暗哨",
    map: "./maps/dali-battle-courtyard/dali-battle-courtyard.tactics.json",
    introScript: "enemy_scout_npc",
    players: [
      {
        id: "duan_yu",
        name: "段誉",
        spriteId: "duan_yu",
        side: "player",
        hp: 120,
        qi: 100,
        moveRange: 3,
        attackRange: 1,
        skills: commonPlayerSkills
      },
      {
        id: "a_luo",
        name: "阿萝",
        spriteId: "a_luo",
        side: "player",
        hp: 92,
        qi: 80,
        moveRange: 4,
        attackRange: 1,
        skills: [{ id: "golden_needle", name: "金针点穴", cost: 30, damage: 34, range: 2, effectId: "hit_spark" }]
      }
    ],
    enemies: [
      { id: "scout_1", name: "暗哨甲", spriteId: "masked_scout", side: "enemy", hp: 72, qi: 60, moveRange: 3, attackRange: 1 },
      { id: "scout_2", name: "暗哨乙", spriteId: "masked_scout", side: "enemy", hp: 68, qi: 60, moveRange: 3, attackRange: 1 },
      { id: "scout_archer", name: "弩手", spriteId: "scout_archer", side: "enemy", hp: 58, qi: 70, moveRange: 2, attackRange: 1 }
    ],
    rewards: {
      flags: ["masked_scout_defeated"],
      items: [
        { itemId: "yipintang_token", amount: 1 },
        { itemId: "hemostatic_powder", amount: 1 }
      ],
      money: 35,
      memory: "击退一品堂暗哨，缴获一枚令牌、止血散和一些钱。"
    }
  },
  yipintang_leader: {
    id: "yipintang_leader",
    title: "一品堂小头目",
    map: "./maps/dali-battle-courtyard/dali-battle-courtyard.tactics.json",
    players: [
      {
        id: "duan_yu",
        name: "段誉",
        spriteId: "duan_yu",
        side: "player",
        hp: 120,
        qi: 100,
        moveRange: 3,
        attackRange: 1,
        skills: commonPlayerSkills
      }
    ],
    enemies: [
      { id: "leader", name: "小头目", spriteId: "yipintang_leader", side: "enemy", hp: 110, qi: 90, moveRange: 3, attackRange: 1 },
      { id: "guard", name: "护卫", spriteId: "masked_scout", side: "enemy", hp: 82, qi: 70, moveRange: 3, attackRange: 1 }
    ],
    rewards: {
      flags: ["boss_gate_cleared"],
      items: [{ itemId: "steel_saber", amount: 1 }],
      money: 80,
      memory: "山门伏击被击退。"
    }
  }
};
