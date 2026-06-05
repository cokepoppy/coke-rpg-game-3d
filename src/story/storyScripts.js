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
  }
};
