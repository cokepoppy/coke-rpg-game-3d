export const wuxiaCampaignScripts = {
  daoist_master_teach: {
    id: "daoist_master_teach",
    start: "meeting",
    repeatFlag: "learned_fuyou_step",
    chapterId: "act1_cangshan",
    mapId: "cangshan_road",
    nodes: {
      meeting: {
        speaker: "逍遥道人",
        text: "北冥有鱼，化而为鹏。你脚下拘于旧道，心里却还有一线清风。",
        next: "choice"
      },
      choice: {
        speaker: "沈临川",
        text: "前辈说的清风，是能解这苍山旧案的武功，还是能解我心里的疑团？",
        choices: [
          { label: "请前辈传授扶游步", next: "teach" },
          { label: "先问旧案", next: "truth" }
        ]
      },
      teach: {
        speaker: "逍遥道人",
        text: "步法只是形。记住：乘天地之正，御六气之辩，不为名牵，不为仇缚。",
        actions: [
          { type: "setFlag", flag: "learned_fuyou_step" },
          { type: "learnSkill", characterId: "shen_linchuan", skillId: "fuyou_step" },
          { type: "playCutscene", cutsceneId: "xiaoyao_daoist_fuyou" },
          { type: "remember", text: "逍遥道人传授扶游步，并提醒沈临川不要被旧案牵着走。" }
        ]
      },
      truth: {
        speaker: "逍遥道人",
        text: "旧案不在石阶上，在人心里。你若只找凶手，最后会被凶手安排好的路带走。",
        actions: [{ type: "remember", text: "逍遥道人暗示苍山旧案背后另有推手。" }]
      }
    }
  },
  moon_valley_arrival: {
    id: "moon_valley_arrival",
    start: "gate",
    chapterId: "act2_love_and_palace",
    mapId: "moon_valley",
    nodes: {
      gate: {
        speaker: "苏萝",
        text: "前面就是月华谷。这里的人不爱见外客，尤其不爱见带着王府玉佩的人。",
        next: "valley"
      },
      valley: {
        speaker: "月华谷弟子",
        text: "谷主失踪后，外人不得入药庐。你们若要查旧信，先证明不是南岭王府派来的。",
        actions: [
          { type: "setFlag", flag: "moon_valley_reached" },
          {
            type: "addQuest",
            quest: {
              id: "moon_valley_letter",
              title: "月华旧信",
              description: "在月华谷查找苏萝母亲留下的旧信，弄清王府玉佩为何会被谷中人忌惮。"
            }
          }
        ]
      }
    }
  },
  qin_letter: {
    id: "qin_letter",
    start: "letter",
    chapterId: "act2_love_and_palace",
    mapId: "moon_valley",
    nodes: {
      letter: {
        speaker: "秦晚瑶",
        text: "这封请帖能让你进南岭王府。但进去以后，听到什么都不要立刻相信。",
        choices: [
          { label: "收下请帖", next: "accept" },
          { label: "追问她为何帮忙", next: "ask" }
        ]
      },
      accept: {
        speaker: "沈临川",
        text: "多谢。若王府真和我身世有关，我会亲自问清。",
        actions: [
          { type: "addItem", itemId: "palace_invitation", amount: 1 },
          { type: "unlockWorldNode", nodeId: "southern_palace" },
          { type: "remember", text: "秦晚瑶送来南岭王府请帖。" }
        ]
      },
      ask: {
        speaker: "秦晚瑶",
        text: "因为上一代人的错，不该一直压在你们身上。至于我的心意，等你活着回来再问。",
        actions: [{ type: "remember", text: "秦晚瑶似乎知道王府密卷中的真相。" }]
      }
    }
  },
  mu_poison_choice: {
    id: "mu_poison_choice",
    start: "needle",
    chapterId: "act2_love_and_palace",
    mapId: "moon_valley",
    nodes: {
      needle: {
        speaker: "穆芷烟",
        text: "你若真想查旧案，就先尝尝被旧案丢下的人是什么滋味。",
        choices: [
          { label: "挡下毒针", next: "shield" },
          { label: "劝她说出线索", next: "talk" }
        ]
      },
      shield: {
        speaker: "苏萝",
        text: "你疯了吗？这针上是月华谷禁毒。",
        actions: [
          { type: "setFlag", flag: "protected_su_luo" },
          { type: "startBattle", enemyId: "masked_scout", battleId: "poison_needles" }
        ]
      },
      talk: {
        speaker: "穆芷烟",
        text: "被调包的孩子不止一个。你以为自己是谁，王府也未必知道。",
        actions: [
          { type: "setFlag", flag: "heard_swapped_children_clue" },
          { type: "remember", text: "穆芷烟透露旧案中存在多个被调包的孩子。" }
        ]
      }
    }
  },
  xiao_beichen_join: {
    id: "xiao_beichen_join",
    start: "snow",
    chapterId: "act3_yanyun_truth",
    mapId: "yanyun_pass",
    nodes: {
      snow: {
        speaker: "萧北辰",
        text: "我不管你是王府的人，还是复衡旧部的人。今夜先救难民，旧账明日再算。",
        next: "join"
      },
      join: {
        speaker: "沈临川",
        text: "若真相在燕云关，我们同路。",
        actions: [
          { type: "joinParty", characterId: "xiao_beichen" },
          { type: "setFlag", flag: "xiao_beichen_joined" },
          { type: "remember", text: "萧北辰暂时入队，共查边城血案。" }
        ]
      }
    }
  },
  border_massacre_reveal: {
    id: "border_massacre_reveal",
    start: "ashes",
    chapterId: "act3_yanyun_truth",
    mapId: "yanyun_pass",
    nodes: {
      ashes: {
        speaker: "旧城遗址",
        text: "残墙里的箭簇分属两派：一枚刻着燕云暗纹，另一枚却是复衡旧部的军制。",
        next: "deduce"
      },
      deduce: {
        speaker: "萧北辰",
        text: "有人故意把两边都拖进血案。若我父亲还活着，他也许早就知道。",
        actions: [
          { type: "setFlag", flag: "border_truth_fragment_found" },
          { type: "addItem", itemId: "truth_fragment_yanyun", amount: 1 },
          { type: "unlockWorldNode", nodeId: "red_lotus_temple" }
        ]
      }
    }
  },
  red_lotus_debate: {
    id: "red_lotus_debate",
    start: "hall",
    chapterId: "act4_obsession",
    mapId: "red_lotus_temple",
    nodes: {
      hall: {
        speaker: "莲照法师",
        text: "我求天下武学，不为杀人。只是心魔日日逼问：万法若不能归一，修行又有何用？",
        choices: [
          { label: "以齐物心诀相劝", next: "mercy" },
          { label: "以武试心魔", next: "trial" }
        ]
      },
      mercy: {
        speaker: "沈临川",
        text: "万法归一，也许不是归到胜负，而是归到不必胜负。",
        actions: [
          { type: "setFlag", flag: "lianzhao_spared" },
          { type: "addItem", itemId: "truth_fragment_lotus", amount: 1 }
        ]
      },
      trial: {
        speaker: "莲照法师",
        text: "好。此战只问心，不问生死。",
        actions: [{ type: "startBattle", enemyId: "yipintang_leader", battleId: "lianzhao_mind_trial" }]
      }
    }
  },
  fu_state_collapse: {
    id: "fu_state_collapse",
    start: "banner",
    chapterId: "act4_obsession",
    mapId: "fu_state_camp",
    nodes: {
      banner: {
        speaker: "容青玄",
        text: "你们说我疯了？旧国若不能复，我这一生温良恭俭，又算什么？",
        next: "break"
      },
      break: {
        speaker: "沈临川",
        text: "若所有人都只是你复国的柴薪，那你想复的也不是国，是你自己的执念。",
        actions: [
          { type: "setFlag", flag: "rong_qingxuan_broken" },
          { type: "unlockWorldNode", nodeId: "hidden_library" },
          { type: "remember", text: "容青玄的复国梦开始崩塌，容靖怀真正浮出水面。" }
        ]
      }
    }
  },
  wuchen_three_questions: {
    id: "wuchen_three_questions",
    start: "question_one",
    chapterId: "act5_carefree",
    mapId: "hidden_library",
    nodes: {
      question_one: {
        speaker: "无尘僧",
        text: "第一问：若真相会伤无辜，你还要公开吗？",
        choices: [
          { label: "公开，但承担余波", next: "question_two" },
          { label: "封存真相", next: "sealed" }
        ]
      },
      question_two: {
        speaker: "无尘僧",
        text: "第二问：若父辈皆有罪，你愿不愿放过能悔改的人？",
        choices: [
          { label: "愿意，但不抹去罪责", next: "question_three" },
          { label: "血债只能血偿", next: "vengeance" }
        ]
      },
      question_three: {
        speaker: "无尘僧",
        text: "第三问：你要做谁的儿子，谁的情人，谁的仇人，还是先做你自己？",
        actions: [
          { type: "setFlag", flag: "carefree_path_chosen" },
          { type: "remember", text: "沈临川在无尘经楼选择不被血缘、爱情和仇恨定义。" }
        ]
      },
      sealed: {
        speaker: "沈临川",
        text: "我不能让更多人因旧案死去。真相可以封存，但罪责不能逃走。",
        actions: [{ type: "setFlag", flag: "truth_sealed_path" }]
      },
      vengeance: {
        speaker: "无尘僧",
        text: "那你仍在旧案之中。等你能放下刀上那口气，再进经楼。",
        actions: [{ type: "setFlag", flag: "vengeance_path_warned" }]
      }
    }
  },
  final_truth_choice: {
    id: "final_truth_choice",
    start: "fathers",
    chapterId: "act5_carefree",
    mapId: "hidden_library",
    nodes: {
      fathers: {
        speaker: "萧沧溟",
        text: "他们毁我满城，我便毁他们半个江湖。你凭什么说我错？",
        next: "other"
      },
      other: {
        speaker: "容靖怀",
        text: "旧国要活，江湖本就该流血。你们的慈悲，不过是不敢赢。",
        actions: [{ type: "startBattle", enemyId: "yipintang_leader", battleId: "two_fathers_boss" }]
      }
    }
  },
  carefree_epilogue: {
    id: "carefree_epilogue",
    start: "wind",
    chapterId: "act5_carefree",
    mapId: "hidden_library",
    nodes: {
      wind: {
        speaker: "沈临川",
        text: "江湖从来不缺答案，缺的是不被答案困住的人。",
        next: "companions"
      },
      companions: {
        speaker: "苏萝",
        text: "那接下来去哪？月华谷、燕云关，还是找个没有旧案的地方喝茶？",
        next: "end"
      },
      end: {
        speaker: "沈临川",
        text: "风往哪里去，我们就往哪里去。",
        actions: [
          { type: "setFlag", flag: "carefree_ending_seen" },
          { type: "completeQuest", questId: "old_case_truth" }
        ]
      }
    }
  },
  su_luo_route_opening: {
    id: "su_luo_route_opening",
    start: "share",
    chapterId: "act2_love_and_palace",
    mapId: "moon_valley",
    romanceRoute: "su_luo_route",
    nodes: {
      share: {
        speaker: "苏萝",
        text: "你把无名信分我一半，我便把月华谷的月色分你一半。只是信里若写着离别，你还肯陪我读到最后吗？",
        choices: [
          { label: "陪她读完", next: "promise" },
          { label: "先查旧案", next: "protect" }
        ]
      },
      promise: {
        speaker: "沈临川",
        text: "若信中有离别，便由我们一起看见。春水不问归舟，我也不问你最后要往哪里去。",
        actions: [
          { type: "setFlag", flag: "romance_su_luo_promised" },
          { type: "remember", text: "沈临川答应陪苏萝读完母亲留下的旧信。" }
        ]
      },
      protect: {
        speaker: "苏萝",
        text: "你总叫我留在身后。可我若只做被保护的人，便永远走不到母亲离开的地方。",
        actions: [
          { type: "setFlag", flag: "romance_su_luo_protected" },
          { type: "remember", text: "苏萝不愿只做被保护的人，感情线留下了未解的隔阂。" }
        ]
      }
    }
  },
  qin_wanyao_route_opening: {
    id: "qin_wanyao_route_opening",
    start: "invitation",
    chapterId: "act2_love_and_palace",
    mapId: "southern_palace",
    romanceRoute: "qin_wanyao_route",
    nodes: {
      invitation: {
        speaker: "秦晚瑶",
        text: "请帖能替你开王府的门，却不能替我回答：若我不再替家门说话，你还愿不愿意叫我的名字？",
        choices: [
          { label: "让她只做秦晚瑶", next: "free" },
          { label: "先守住王府礼法", next: "bound" }
        ]
      },
      free: {
        speaker: "沈临川",
        text: "你可以只做秦晚瑶。王府的门若因此关上，我便从门外问你，不叫你一个人承担。",
        actions: [
          { type: "setFlag", flag: "romance_qin_wanyao_freed" },
          { type: "remember", text: "沈临川让秦晚瑶先为自己选择，不再只替王府传话。" }
        ]
      },
      bound: {
        speaker: "秦晚瑶",
        text: "你说得对。只是礼法若真能护住人，王府就不会留下这么多无名的墓。",
        actions: [
          { type: "setFlag", flag: "romance_qin_wanyao_bound" },
          { type: "remember", text: "秦晚瑶暂时退回王府礼法之后，心意因此更难言明。" }
        ]
      }
    }
  },
  mu_zhiyan_route_opening: {
    id: "mu_zhiyan_route_opening",
    start: "needle",
    chapterId: "act2_love_and_palace",
    mapId: "moon_valley",
    romanceRoute: "mu_zhiyan_route",
    nodes: {
      needle: {
        speaker: "穆芷烟",
        text: "你若只问线索，我便给你线索；你若想看见我，便先别躲我的毒针。人心比毒难解，你敢不敢试？",
        choices: [
          { label: "接住她的恨", next: "face" },
          { label: "只问调包线索", next: "clue" }
        ]
      },
      face: {
        speaker: "沈临川",
        text: "我不替你辩白，也不替你遮丑。你若要恨，便让我看见你为何而恨。",
        actions: [
          { type: "setFlag", flag: "romance_mu_zhiyan_hurt_shared" },
          { type: "remember", text: "沈临川没有躲开穆芷烟的恨，两人之间留下危险却真实的靠近。" }
        ]
      },
      clue: {
        speaker: "穆芷烟",
        text: "你果然只要答案。也罢，被调包的孩子不止一个；可你若只盯着答案，迟早会把人也看成证据。",
        actions: [
          { type: "setFlag", flag: "heard_swapped_children_clue" },
          { type: "remember", text: "穆芷烟给出调包孩子线索，却警告沈临川不要把活人只当证据。" }
        ]
      }
    }
  }
};
