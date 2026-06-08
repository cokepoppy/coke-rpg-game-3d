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
      npcs: [
        {
          id: "enemy_scout_npc",
          name: "一品堂暗哨",
          x: 1130,
          y: 800,
          faction: "enemy",
          spriteId: "masked_scout",
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
      sheet: "./assets/hero-walk-sheet-audited.png",
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
