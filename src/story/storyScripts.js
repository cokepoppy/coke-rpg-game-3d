import { shopScripts } from "./scripts/shopScripts.js";

export const storyScripts = {
  opening: {
    id: "opening",
    start: "wake",
    nodes: {
      wake: {
        speaker: "阿萝",
        text: "你醒啦。这里是苍山旧道，再往上就是天龙古寺。昨夜山门钟声断了三次，像是有人闯进了禁地。",
        next: "mentor"
      },
      mentor: {
        speaker: "主角",
        text: "我只记得一阵笛声，醒来时佩剑已经不见了。",
        next: "quest"
      },
      quest: {
        speaker: "阿萝",
        text: "先去石阶旁的灯亭查一查。若看到刻着“无量”的铜匣，不要急着打开，里面可能藏着机关。",
        actions: [
          { type: "setFlag", flag: "intro_seen" },
          {
            type: "addQuest",
            quest: {
              id: "find_bronze_box",
              title: "寻找无量铜匣",
              description: "沿旧道搜寻灯亭和石阶附近，找到被藏起来的铜匣。"
            }
          }
        ]
      }
    }
  },
  encounter_grass: {
    id: "encounter_grass",
    start: "rustle",
    repeatFlag: "grass_encounter_cleared",
    nodes: {
      rustle: {
        speaker: "草丛",
        text: "高草深处传来细碎脚步声，像是有人屏住呼吸贴着山石移动。",
        choices: [
          { label: "拨草查看", next: "battle" },
          { label: "暂时离开", next: "leave" }
        ]
      },
      battle: {
        speaker: "黑衣人",
        text: "既然发现了，就把你也留下。",
        actions: [
          { type: "setFlag", flag: "grass_encounter_cleared" },
          { type: "startBattle", enemyId: "masked_scout" }
        ]
      },
      leave: {
        speaker: "主角",
        text: "现在还不是节外生枝的时候。"
      }
    }
  },
  enemy_scout_npc: {
    id: "enemy_scout_npc",
    start: "challenge",
    repeatFlag: "masked_scout_defeated",
    nodes: {
      challenge: {
        speaker: "一品堂暗哨",
        text: "少侠止步。寺前这条路，今夜不许外人上山。你若再近一步，刀剑无眼。",
        choices: [
          { label: "拔剑迎战", next: "battle" },
          { label: "暂避锋芒", next: "leave" }
        ]
      },
      battle: {
        speaker: "主角",
        text: "既是冲我来的，那就不用再藏。",
        actions: [{ type: "startBattle", enemyId: "masked_scout" }]
      },
      leave: {
        speaker: "主角",
        text: "先避开暗哨，另寻时机。"
      }
    }
  },
  bronze_box: {
    id: "bronze_box",
    start: "inspect",
    repeatFlag: "bronze_box_opened",
    nodes: {
      inspect: {
        speaker: "灯亭",
        text: "石阶旁的灯火照出一只旧铜匣。匣底刻着“无量”二字，锁扣旁有三道细痕。",
        choices: [
          { label: "按刻痕开锁", next: "open" },
          { label: "先收起来", next: "leave" }
        ]
      },
      open: {
        speaker: "铜匣",
        text: "锁舌轻响，匣中露出一枚古旧玉佩和半张泛黄地图。你似乎找到了通往寺后密道的线索。",
        actions: [
          { type: "setFlag", flag: "bronze_box_opened" },
          { type: "completeQuest", questId: "find_bronze_box" },
          { type: "addItem", itemId: "old_jade", amount: 1 },
          { type: "addItem", itemId: "secret_map_half", amount: 1 },
          {
            type: "addQuest",
            quest: {
              id: "temple_secret_path",
              title: "寺后密道",
              description: "带着铜匣中的半张地图，去天龙古寺询问守寺僧。"
            }
          }
        ]
      },
      leave: {
        speaker: "主角",
        text: "机关未明，还是先别妄动。"
      }
    }
  },
  medicine_market: {
    id: "medicine_market",
    start: "vendor",
    nodes: {
      vendor: {
        speaker: "药摊老人",
        text: "少侠面色发白，是中了迷香。拿这两枚清心丸，别在山风口久站。",
        actions: [
          { type: "addItem", itemId: "qingxin_pill", amount: 2 },
          { type: "remember", text: "药摊老人赠予两枚清心丸。" }
        ]
      }
    }
  },
  inn_room_door: {
    id: "inn_room_door",
    start: "door",
    nodes: {
      door: {
        speaker: "客栈内室",
        text: "木门虚掩，里面传来淡淡药香。阿萝说铜匣线索可能和这间客房有关。",
        choices: [
          { label: "进入房间", next: "enter" },
          { label: "先不进去", next: "leave" }
        ]
      },
      enter: {
        speaker: "主角",
        text: "进去看看。",
        actions: [{ type: "enterMap", mapId: "daliInnRoom", spawn: "entrance" }]
      },
      leave: {
        speaker: "主角",
        text: "先在外面再查一圈。"
      }
    }
  },
  room_exit: {
    id: "room_exit",
    start: "exit",
    nodes: {
      exit: {
        speaker: "门口",
        text: "屋外山风卷过廊下，回到客栈外的小路吗？",
        choices: [
          { label: "离开房间", next: "leave" },
          { label: "继续搜索", next: "stay" }
        ]
      },
      leave: {
        speaker: "主角",
        text: "房里该看的地方差不多了。",
        actions: [{ type: "enterMap", mapId: "world", spawn: "innReturn" }]
      },
      stay: {
        speaker: "主角",
        text: "再检查一下柜子和书桌。"
      }
    }
  },
  room_wardrobe: {
    id: "room_wardrobe",
    start: "closed",
    repeatFlag: "room_wardrobe_opened",
    nodes: {
      closed: {
        speaker: "木柜",
        text: "高柜门缝里卡着一截蓝布，像是有人匆忙藏过东西。",
        choices: [
          { label: "打开木柜", next: "open" },
          { label: "暂时不动", next: "leave" }
        ]
      },
      open: {
        speaker: "木柜",
        text: "柜门吱呀一声打开，里面落下一只旧布囊。布囊里有一枚碎银和一封未署名的信。",
        actions: [
          { type: "setFlag", flag: "room_wardrobe_opened" },
          { type: "addItem", itemId: "silver_piece", amount: 1 },
          { type: "addMoney", amount: 25 },
          { type: "addItem", itemId: "unsigned_letter", amount: 1 },
          { type: "remember", text: "在客房木柜里找到碎银和未署名的信。" }
        ]
      },
      leave: {
        speaker: "主角",
        text: "柜门太旧，硬拉可能惊动别人。"
      }
    }
  },
  room_medicine_cabinet: {
    id: "room_medicine_cabinet",
    start: "cabinet",
    repeatFlag: "room_medicine_taken",
    nodes: {
      cabinet: {
        speaker: "药柜",
        text: "药柜上层摆着止血散，下层有一格暗抽屉，抽屉边缘沾着朱砂粉。",
        choices: [
          { label: "搜暗抽屉", next: "take" },
          { label: "只拿止血散", next: "simple" }
        ]
      },
      take: {
        speaker: "药柜",
        text: "暗抽屉里藏着一瓶续命丹和半截铜钥匙。钥匙断口和铜匣里的刻痕正好相合。",
        actions: [
          { type: "setFlag", flag: "room_medicine_taken" },
          { type: "addItem", itemId: "life_pill", amount: 1 },
          { type: "addItem", itemId: "broken_copper_key", amount: 1 }
        ]
      },
      simple: {
        speaker: "药柜",
        text: "你拿到一包止血散。",
        actions: [
          { type: "setFlag", flag: "room_medicine_taken" },
          { type: "addItem", itemId: "hemostatic_powder", amount: 1 }
        ]
      }
    }
  },
  room_chest: {
    id: "room_chest",
    start: "chest",
    repeatFlag: "room_chest_opened",
    nodes: {
      chest: {
        speaker: "红漆箱",
        text: "箱锁很新，和屋里陈旧的摆设不太相称。箱盖上压着一只茶盏，似乎有人故意留下记号。",
        choices: [
          { label: "用铜钥匙试锁", next: "open" },
          { label: "以后再开", next: "leave" }
        ]
      },
      open: {
        speaker: "红漆箱",
        text: "箱中没有金银，只有一张折好的山道图。图上圈出了天龙古寺后的密道入口。",
        actions: [
          { type: "setFlag", flag: "room_chest_opened" },
          { type: "addItem", itemId: "secret_path_map", amount: 1 },
          { type: "completeQuest", questId: "temple_secret_path" },
          {
            type: "addQuest",
            quest: {
              id: "enter_secret_path",
              title: "进入密道",
              description: "带着山道图前往天龙古寺，寻找寺后的密道入口。"
            }
          }
        ]
      },
      leave: {
        speaker: "主角",
        text: "先别动箱子。"
      }
    }
  },
  room_scroll_desk: {
    id: "room_scroll_desk",
    start: "desk",
    nodes: {
      desk: {
        speaker: "书桌",
        text: "桌上摊着一卷账册，夹页里反复出现“灯亭、铜匣、寺后”三个词。",
        choices: [
          { label: "抄下线索", next: "copy" },
          { label: "合上账册", next: "leave" }
        ]
      },
      copy: {
        speaker: "主角",
        text: "线索已经连起来了：灯亭铜匣只是引子，真正的入口在寺后。",
        actions: [{ type: "remember", text: "书桌账册提到灯亭、铜匣和寺后密道。" }]
      },
      leave: {
        speaker: "主角",
        text: "这本账册不像客栈自己的东西。"
      }
    }
  },
  training_yard: {
    id: "training_yard",
    start: "dummy",
    nodes: {
      dummy: {
        speaker: "演武木人",
        text: "木人胸口嵌着一块旧铜片，上面刻着三道剑痕。你要试着按剑痕顺序推动机关吗？",
        choices: [
          { label: "按上中下", next: "puzzle_fail" },
          { label: "按中下上", next: "puzzle_solve" }
        ]
      },
      puzzle_fail: {
        speaker: "机关",
        text: "木人轻轻一震，没有任何变化。"
      },
      puzzle_solve: {
        speaker: "机关",
        text: "木人背后弹出一只暗格，里面放着半页残卷。",
        actions: [
          { type: "setFlag", flag: "training_puzzle_solved" },
          { type: "addItem", itemId: "manual_fragment", amount: 1 },
          {
            type: "addQuest",
            quest: {
              id: "decode_manual",
              title: "残卷之谜",
              description: "找到另一半残卷，或许能拼出失传的步法。"
            }
          }
        ]
      }
    }
  },
  main_temple: {
    id: "main_temple",
    start: "abbot",
    nodes: {
      abbot: {
        speaker: "守寺僧",
        text: "施主若为钟声而来，需先证明不是一品堂探子。山下草丛有暗哨，演武场有机关，二者皆可作证。",
        choices: [
          { label: "询问铜匣", next: "box" },
          { label: "告辞", next: "bye" }
        ]
      },
      box: {
        speaker: "守寺僧",
        text: "铜匣原是段氏旧物。若你找到了，切记先看匣底刻痕，再动锁扣。"
      },
      bye: {
        speaker: "主角",
        text: "我会再来。"
      }
    }
  },
  boss_gate: {
    id: "boss_gate",
    start: "gate",
    nodes: {
      gate: {
        speaker: "红幡",
        text: "山风卷起红幡，幡下有新鲜马蹄印。再往前，就是一品堂设下的伏击。",
        actions: [{ type: "startBattle", enemyId: "yipintang_leader" }]
      }
    }
  },
  ...shopScripts
};
