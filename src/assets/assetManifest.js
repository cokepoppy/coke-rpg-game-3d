export const assets = {
  maps: {
    world: {
      json: "./maps/dali-temple-route-design-first/dali-temple-route-design-first.tiled.json",
      image: "./maps/dali-temple-route-design-first/dali-temple-route-design-first-rendered-crisp.png",
      spawns: {
        start: { x: 640, y: 640 },
        innReturn: { x: 2870, y: 2420 }
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
          x: 2780,
          y: 2290,
          width: 300,
          height: 260,
          visible: true,
          properties: [{ name: "event", type: "string", value: "map_transition" }]
        },
        {
          id: 9003,
          name: "enemy_scout_npc",
          type: "trigger",
          x: 1040,
          y: 720,
          width: 180,
          height: 160,
          visible: true,
          properties: [{ name: "event", type: "string", value: "battle" }]
        }
      ],
      collision: [
        { name: "temple_roof_mask", type: "collision", x: 2140, y: 520, width: 860, height: 350 },
        { name: "temple_side_mask", type: "collision", x: 2140, y: 870, width: 220, height: 190 },
        { name: "temple_side_mask_right", type: "collision", x: 2780, y: 870, width: 220, height: 190 },
        { name: "inn_roof_mask", type: "collision", x: 2650, y: 1960, width: 690, height: 285 },
        { name: "medicine_stall_mask", type: "collision", x: 2920, y: 2290, width: 310, height: 150 },
        { name: "training_dummy_mask", type: "collision", x: 3475, y: 1485, width: 90, height: 105 },
        { name: "north_rock_wall", type: "collision", x: 0, y: 0, width: 5120, height: 80 },
        { name: "west_rock_wall", type: "collision", x: 0, y: 0, width: 80, height: 3072 },
        { name: "south_rock_wall", type: "collision", x: 0, y: 2992, width: 5120, height: 80 },
        { name: "east_rock_wall", type: "collision", x: 5040, y: 0, width: 80, height: 3072 }
      ],
      npcs: [
        {
          id: "enemy_scout_npc",
          name: "一品堂暗哨",
          x: 1130,
          y: 800,
          faction: "enemy",
          spriteId: "masked_scout",
          direction: "down"
        },
        {
          id: "training_yard",
          name: "守寺武僧",
          x: 3510,
          y: 1560,
          faction: "ally",
          spriteId: "monk_guard",
          direction: "down"
        },
        {
          id: "medicine_market",
          name: "药摊老人",
          x: 3050,
          y: 2390,
          faction: "ally",
          spriteId: "medicine_vendor",
          direction: "down"
        },
        {
          id: "main_temple",
          name: "守寺僧",
          x: 2560,
          y: 860,
          faction: "ally",
          spriteId: "temple_monk",
          direction: "down"
        },
        {
          id: "inn_room_door",
          name: "客栈掌柜",
          x: 2930,
          y: 2250,
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
      }
    }
  },
  sprites: {
    hero: {
      sheet: "./assets/hero-walk-sheet-anchored.png",
      frameWidth: 313,
      frameHeight: 313,
      drawWidth: 128,
      drawHeight: 128,
      directions: ["down", "left", "right", "up"],
      framesPerDirection: 4
    }
  },
  battles: {
    maskedScout: {
      id: "masked_scout",
      map: "./maps/dali-battle-courtyard/dali-battle-courtyard.tactics.json"
    }
  }
};
