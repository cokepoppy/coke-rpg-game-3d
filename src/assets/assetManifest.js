export const assets = {
  audio: {
    bgm: "./assets/audio/temple-road-echoes.mp3"
  },
  maps: {
    world: {
      json: "./maps/dali-temple-route-design-first/dali-temple-route-design-first.tiled.json",
      image: "./maps/dali-temple-route-design-first/dali-temple-route-design-first-rendered-crisp.png",
      spawns: {
        start: { x: 640, y: 640 },
        innReturn: { x: 2860, y: 2465 }
      },
      triggers: [
        {
          id: 9001,
          name: "bronze_box",
          type: "trigger",
          x: 560,
          y: 560,
          width: 240,
          height: 220,
          visible: true,
          properties: [{ name: "event", type: "string", value: "treasure" }]
        },
        {
          id: 9002,
          name: "inn_room_door",
          type: "trigger",
          x: 2750,
          y: 2248,
          width: 230,
          height: 250,
          visible: true,
          properties: [{ name: "event", type: "string", value: "map_transition" }]
        },
        {
          id: 9003,
          name: "enemy_scout_npc",
          type: "trigger",
          x: 790,
          y: 660,
          width: 210,
          height: 190,
          visible: true,
          properties: [{ name: "event", type: "string", value: "battle" }]
        }
      ],
      collisionTypes: ["supply", "battle", "boss"],
      collision: [
        { name: "temple_roof_mask", type: "collision", x: 2140, y: 520, width: 860, height: 350 },
        { name: "temple_side_mask", type: "collision", x: 2140, y: 870, width: 220, height: 190 },
        { name: "temple_side_mask_right", type: "collision", x: 2780, y: 870, width: 220, height: 190 },
        { name: "inn_roof_mask", type: "collision", x: 2650, y: 1960, width: 690, height: 285 },
        { name: "north_rock_wall", type: "collision", x: 0, y: 0, width: 5120, height: 80 },
        { name: "west_rock_wall", type: "collision", x: 0, y: 0, width: 80, height: 3072 },
        { name: "south_rock_wall", type: "collision", x: 0, y: 2992, width: 5120, height: 80 },
        { name: "east_rock_wall", type: "collision", x: 5040, y: 0, width: 80, height: 3072 }
      ],
      occlusion: [
        { name: "temple_roof_overlay", type: "occlusion", x: 2140, y: 520, width: 860, height: 350 },
        { name: "inn_roof_overlay", type: "occlusion", x: 2650, y: 1960, width: 690, height: 285 },
        { name: "medicine_stall_roof_overlay", type: "occlusion", x: 3008, y: 2368, width: 256, height: 82 },
        { name: "medicine_stall_counter_overlay", type: "occlusion", x: 3072, y: 2460, width: 192, height: 64 }
      ],
      npcs: [
        {
          id: "enemy_scout_npc",
          name: "一品堂暗哨",
          x: 895,
          y: 745,
          faction: "enemy",
          spriteId: "masked_scout",
          direction: "down"
        },
        {
          id: "training_yard",
          name: "守寺武僧",
          x: 3410,
          y: 1660,
          faction: "ally",
          spriteId: "monk_guard",
          direction: "down"
        },
        {
          id: "medicine_market",
          name: "药摊老人",
          x: 2940,
          y: 2520,
          faction: "ally",
          spriteId: "medicine_vendor",
          direction: "down"
        },
        {
          id: "main_temple",
          name: "守寺僧",
          x: 2560,
          y: 1010,
          faction: "ally",
          spriteId: "temple_monk",
          direction: "down"
        },
        {
          id: "inn_room_door",
          name: "客栈掌柜",
          x: 2845,
          y: 2365,
          faction: "ally",
          spriteId: "inn_keeper",
          direction: "down"
        }
      ]
    },
    daliInnRoom: {
      json: "./maps/dali-inn-room/dali-inn-room.tiled.json",
      image: "./maps/dali-inn-room/dali-inn-room-rendered.png",
      spawns: {
        entrance: { x: 512, y: 662 }
      },
      occlusion: [
        { name: "room_bed_front_overlay", type: "occlusion", x: 100, y: 250, width: 338, height: 100 },
        { name: "room_table_front_overlay", type: "occlusion", x: 488, y: 420, width: 313, height: 70 },
        { name: "room_storage_front_overlay", type: "occlusion", x: 900, y: 300, width: 300, height: 210 },
        { name: "room_screen_overlay", type: "occlusion", x: 200, y: 430, width: 263, height: 180 }
      ]
    }
  },
  sprites: {
    hero: {
      sheet: "./assets/characters/hero/hero-walk-anchored-v4-motionfix.png",
      frameWidth: 313,
      frameHeight: 313,
      drawWidth: 128,
      drawHeight: 128,
      directions: ["down", "left", "right", "up"],
      framesPerDirection: 4,
      idleFrame: 0,
      walkSequence: [0, 1, 0, 3],
      frameDuration: 0.105
    }
  },
  battles: {
    maskedScout: {
      id: "masked_scout",
      map: "./maps/dali-battle-courtyard/dali-battle-courtyard.tactics.json"
    }
  }
};
