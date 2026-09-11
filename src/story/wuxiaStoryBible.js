export const wuxiaStoryBible = {
  meta: {
    title: "苍山逍遥录",
    subtitle: "风起云岭 · 父辈旧案 · 逍遥之心",
    designGoal:
      "以经典武侠群像的结构为参考，使用原创姓名、关系和事件，把爱情、父辈旧案、痴武、复国执念、边地义士、隐世奇遇和终极高人收束到庄子《逍遥游》的精神主题。",
    copyrightRule:
      "不使用既有小说专有姓名、门派名、武功名、国家名和标志性桥段；只借鉴人物功能、戏剧张力和主题结构，并在剧情节点中做原创化改写。"
  },
  themes: [
    {
      id: "carefree_mind",
      name: "逍遥之心",
      description: "主角从追查身世和旧案，走向不被血缘、名利、仇恨和门派束缚的精神状态。"
    },
    {
      id: "fathers_sins",
      name: "父辈旧案",
      description: "二十年前的一场边城血案被多方利用，真正的凶手和受害者都藏在旧身份后。"
    },
    {
      id: "desire_mirror",
      name: "执念镜像",
      description: "每个主要角色都有一种执念：爱情、武学、家国、复仇、清白、长生。主角逐步看见执念如何伤人。"
    },
    {
      id: "truth_and_mercy",
      name: "真相与慈悲",
      description: "终局不是简单杀掉反派，而是在真相、宽恕和必须承担的代价之间做选择。"
    }
  ],
  romanceArcs: [
    {
      id: "su_luo_route",
      characterId: "su_luo",
      temperament: "灵动、温暖、嘴硬心软",
      premise: "苏萝寻找失踪的母亲，沈临川在共同查信的过程中发现，陪伴本身也可能成为一种承诺。",
      stages: ["把秘密分给彼此", "在月华谷面对母亲旧信", "在离别前决定是否留下灯"],
      conflict: "她害怕自己只是主角追查旧案时顺手带上的同伴。"
    },
    {
      id: "qin_wanyao_route",
      characterId: "qin_wanyao",
      temperament: "清冷、克制、把真心藏在礼法之后",
      premise: "秦晚瑶以王府请帖引主角入局，却在礼法与真心之间逐渐失去可以躲藏的身份。",
      stages: ["请帖里的半句真话", "让她为自己选择", "王府门外的琴声与告别"],
      conflict: "她若承认爱情，便必须面对家族旧案和王府名声的反噬。"
    },
    {
      id: "mu_zhiyan_route",
      characterId: "mu_zhiyan",
      temperament: "偏执、锋利、爱恨都不肯留余地",
      premise: "穆芷烟以毒针和妒意试探主角，主角必须在接住她的恨与划清边界之间作出选择。",
      stages: ["接住她的毒针", "直面她的嫉恨", "在她离开前说出不能再迟疑的话"],
      conflict: "她最想被看见，却总用伤人的方式确认自己不会再次被抛下。"
    }
  ],
  romanceDesignRules: [
    "三条感情线使用原创人物、原创冲突和原创对白，只借鉴先秦文字的意象、节奏与留白。",
    "好感不是简单奖励；每次选择都可能带来靠近、克制、误解或离别，并写入可保存的剧情状态。",
    "三位女主都必须拥有自己的目标与拒绝主角的权利，爱情不能替代她们的个人主线。"
  ],
  factions: [
    {
      id: "cangshan_house",
      name: "苍山沈氏",
      role: "主角名义上的家族，掌握旧案的一半证据。",
      agenda: "保住家族名声，找回失落的云纹玉牒。"
    },
    {
      id: "nanling_court",
      name: "南岭王府",
      role: "风流王爷与王府旧臣的权力核心。",
      agenda: "平衡江湖和朝堂，但王府旧情债不断反噬。"
    },
    {
      id: "yuehua_valley",
      name: "月华谷",
      role: "主角爱情线与医毒线的主要场景。",
      agenda: "保护谷中女子和药典，不让旧案牵连无辜。"
    },
    {
      id: "yanyun_brotherhood",
      name: "燕云义社",
      role: "边地义士与身份误会线。",
      agenda: "查清边城血案，洗脱被嫁祸的族名。"
    },
    {
      id: "fu_state_remnant",
      name: "复衡旧部",
      role: "复国执念线。",
      agenda: "借江湖动乱重建旧国，哪怕牺牲所有朋友。"
    },
    {
      id: "red_lotus_temple",
      name: "赤莲法寺",
      role: "痴武高僧线。",
      agenda: "收集天下武学，寻找能让心魔止息的终极法门。"
    },
    {
      id: "hidden_library",
      name: "无尘经楼",
      role: "终局真相与扫地僧式高人所在地。",
      agenda: "不问江湖胜负，只守住旧案原卷和众生的退路。"
    }
  ],
  characters: [
    {
      id: "shen_linchuan",
      name: "沈临川",
      archetype: "风流王族后人与逍遥主角的复合改写",
      playable: true,
      faction: "cangshan_house",
      combatRole: "机动剑客",
      desire: "找回失去的记忆，弄清自己与南岭王府的关系。",
      secret: "他的身世被两代人故意改写，真正的血缘并不等于真正的归处。",
      arc: "从被爱情和身世推着走，到主动放下身份标签，选择逍遥而有承担的江湖路。",
      visualPrompt: "young wuxia swordsman in blue robe, compact chibi pixel RPG sprite, calm eyes, jade pendant, tied black hair"
    },
    {
      id: "su_luo",
      name: "苏萝",
      archetype: "灵动少女与医毒奇遇线",
      playable: true,
      faction: "yuehua_valley",
      combatRole: "药术支援",
      desire: "找到失踪的母亲，并证明月华谷没有参与旧案。",
      secret: "她随身铃铛里藏着开启无尘经楼侧门的铜芯。",
      arc: "从只相信小聪明，到愿意承担保护他人的责任。",
      romanceRoute: "su_luo_route"
    },
    {
      id: "qin_wanyao",
      name: "秦晚瑶",
      archetype: "清冷知己与理想爱情线",
      playable: false,
      faction: "nanling_court",
      combatRole: "琴阵控制",
      desire: "保护王府名声，同时不让沈临川卷入上一代情债。",
      secret: "她读过王府密卷，知道沈临川并非王府唯一遗孤。",
      arc: "从礼法和责任中压抑真心，到承认选择本身也需要勇气。",
      romanceRoute: "qin_wanyao_route"
    },
    {
      id: "mu_zhiyan",
      name: "穆芷烟",
      archetype: "偏执妹妹式爱情与毒线",
      playable: false,
      faction: "yuehua_valley",
      combatRole: "毒针刺客",
      desire: "让所有辜负她的人付出代价。",
      secret: "她知道父辈旧案中一个被调包的婴儿线索。",
      arc: "从以伤害换关注，到看清自己的痛苦不该继续传给别人。",
      romanceRoute: "mu_zhiyan_route"
    },
    {
      id: "xiao_beichen",
      name: "萧北辰",
      archetype: "边地英雄与身份误会线",
      playable: true,
      faction: "yanyun_brotherhood",
      combatRole: "重刀坦克",
      desire: "洗清燕云义社的叛名，找出真正挑起边城血案的人。",
      secret: "他的父亲当年没有死，而是一直躲在暗处推动复仇。",
      arc: "从以义气压住痛苦，到承认仇恨不能替死者说话。"
    },
    {
      id: "xu_yunsheng",
      name: "许云生",
      archetype: "隐世奇遇与无心入局线",
      playable: true,
      faction: "hidden_library",
      combatRole: "内功奇术",
      desire: "只想离开山洞和棋局，过普通人的日子。",
      secret: "他继承的残卷正是旧案双方都在抢的《齐物心诀》。",
      arc: "从被奇遇砸中，到学会用善意承担不属于自己的力量。"
    },
    {
      id: "lian_zhao",
      name: "莲照法师",
      archetype: "痴武高僧，但不嗜杀",
      playable: false,
      faction: "red_lotus_temple",
      combatRole: "远程法印",
      desire: "看遍天下武学，证明万法可归一。",
      secret: "他越练越接近走火入魔，因此执着寻找能化去心魔的心诀。",
      arc: "从以武学求圆满，到承认不杀也是一种更难的胜利。"
    },
    {
      id: "rong_qingxuan",
      name: "容青玄",
      archetype: "复国执念者",
      playable: false,
      faction: "fu_state_remnant",
      combatRole: "谋士剑客",
      desire: "复兴消亡的衡国，把所有人都当成棋子。",
      secret: "他的父亲并未忠于旧国，只是借复国名义掩盖旧案罪证。",
      arc: "从礼貌温润到彻底崩塌，最后困在自己编出的王座幻觉里。"
    },
    {
      id: "shen_yuanhe",
      name: "沈远鹤",
      archetype: "风流王爷与父辈情债",
      playable: false,
      faction: "nanling_court",
      combatRole: "王府剑法",
      desire: "用玩世不恭掩盖失败的父亲和情人身份。",
      secret: "他当年救下过旧案中的关键婴儿，也因此造成后续误会。",
      arc: "从逃避情债，到愿意把真相公开并承受骂名。"
    },
    {
      id: "xiao_cangming",
      name: "萧沧溟",
      archetype: "被害者父辈化作幕后推手",
      playable: false,
      faction: "yanyun_brotherhood",
      combatRole: "终局重刀",
      desire: "让南岭王府和复衡旧部都为边城血案陪葬。",
      secret: "他故意放大谣言，让江湖各派互相残杀。",
      arc: "他不是纯粹恶人，而是被仇恨夺走了余生。"
    },
    {
      id: "rong_jinghuai",
      name: "容靖怀",
      archetype: "复国父辈终极阴影",
      playable: false,
      faction: "fu_state_remnant",
      combatRole: "终局机关阵",
      desire: "以旧国之名操纵江湖，夺回藏在经楼的王印与密卷。",
      secret: "他和萧沧溟共同制造了很多血案，却彼此都想利用对方。",
      arc: "把家国大义说到极致，最终暴露的只是私欲。"
    },
    {
      id: "wu_chenseng",
      name: "无尘僧",
      archetype: "藏经阁级隐世高人",
      playable: false,
      faction: "hidden_library",
      combatRole: "不可战胜的劝止者",
      desire: "守住真相，不让下一代继续被父辈仇恨吞没。",
      secret: "他见过二十年前边城血案的最后一夜。",
      arc: "不作为不是冷漠，而是在等有人愿意用不杀的方式结束旧案。"
    }
  ],
  worldMap: [
    {
      id: "cangshan_road",
      name: "苍山旧道",
      act: 1,
      purpose: "教学、客栈、铜匣、第一批密探战。",
      unlock: "new_game",
      next: ["moon_valley", "erhai_ferry"]
    },
    {
      id: "moon_valley",
      name: "月华谷",
      act: 2,
      purpose: "爱情线、医毒谜题、苏萝与穆芷烟冲突。",
      unlock: "quest:moon_valley_letter",
      next: ["southern_palace", "yanyun_pass"]
    },
    {
      id: "southern_palace",
      name: "南岭王府",
      act: 2,
      purpose: "父辈情债、王府密卷、秦晚瑶选择。",
      unlock: "item:palace_invitation",
      next: ["hidden_library"]
    },
    {
      id: "yanyun_pass",
      name: "燕云关",
      act: 3,
      purpose: "萧北辰线、边城血案重演、身份误会解除。",
      unlock: "defeat:road_scouts",
      next: ["red_lotus_temple", "fu_state_camp"]
    },
    {
      id: "red_lotus_temple",
      name: "赤莲法寺",
      act: 3,
      purpose: "莲照法师痴武线，非杀戮战斗，破心魔。",
      unlock: "quest:borrow_scripture",
      next: ["hidden_library"]
    },
    {
      id: "fu_state_camp",
      name: "复衡旧营",
      act: 4,
      purpose: "容青玄复国线崩塌，父辈反派浮出。",
      unlock: "flag:old_king_seal_seen",
      next: ["hidden_library"]
    },
    {
      id: "hidden_library",
      name: "无尘经楼",
      act: 5,
      purpose: "终局真相、双父辈 Boss、逍遥主题收束。",
      unlock: "all:three_truth_fragments",
      next: []
    }
  ],
  chapters: [
    {
      id: "act1_cangshan",
      title: "第一章：钟断苍山",
      mapId: "cangshan_road",
      synopsis: "沈临川醒在苍山旧道，佩剑失踪。苏萝陪他查客栈、铜匣和寺后密道，第一次发现西岭密探不是普通山贼。",
      objectives: ["完成客栈搜查", "打开云纹铜匣", "击败三名主路密探", "拜会逍遥道人并习得扶摇诀"],
      battles: ["road_scout", "bridge_ambush", "temple_gate_guard"],
      keyScripts: ["opening", "inn_room_door", "bronze_box", "daoist_master_teach"]
    },
    {
      id: "act2_love_and_palace",
      title: "第二章：月华旧信",
      mapId: "moon_valley",
      synopsis: "三条感情线同时推进：苏萝寻找母亲，秦晚瑶送来王府密信，穆芷烟以毒试探沈临川。每一次靠近都可能变成承诺、误解或离别，玩家逐步知道上一代情债与身世迷雾有关。",
      objectives: ["解开月华谷药庐谜题", "选择先救谁", "取得王府请帖", "发现被调包的婴儿线索", "完成至少一条感情线的转折对话"],
      battles: ["poison_needles", "valley_trial", "palace_agents"],
      keyScripts: ["moon_valley_arrival", "qin_letter", "mu_poison_choice", "su_luo_route_opening", "qin_wanyao_route_opening", "mu_zhiyan_route_opening"]
    },
    {
      id: "act3_yanyun_truth",
      title: "第三章：燕云雪夜",
      mapId: "yanyun_pass",
      synopsis: "萧北辰加入。边地血案被重演，证据指向两个父辈：一个为复仇，一个为复国。主角开始意识到真相不是单一仇人。",
      objectives: ["护送难民", "破解边城旧阵", "击败假扮义士的复衡旧部", "取得第一份经楼原卷"],
      battles: ["snow_pass_rescue", "old_city_flashback", "fu_remnant_duel"],
      keyScripts: ["xiao_beichen_join", "border_massacre_reveal"]
    },
    {
      id: "act4_obsession",
      title: "第四章：赤莲与旧国",
      mapId: "red_lotus_temple",
      synopsis: "莲照法师想看《齐物心诀》以化心魔，容青玄则想用心诀和王印复国。两种执念互为镜像。",
      objectives: ["不杀莲照完成心魔战", "潜入复衡旧营", "见证容青玄崩溃", "集齐三份真相碎片"],
      battles: ["lianzhao_mind_trial", "fu_camp_break", "rong_qingxuan_duel"],
      keyScripts: ["red_lotus_debate", "fu_state_collapse"]
    },
    {
      id: "act5_carefree",
      title: "第五章：无尘经楼",
      mapId: "hidden_library",
      synopsis: "萧沧溟与容靖怀共同浮出水面，二人都认为自己代表正义。无尘僧给主角最后选择：杀尽旧怨，或公开真相并承担余波。",
      objectives: ["通过经楼三问", "击败双父辈 Boss", "决定公开真相或封存部分真相", "完成逍遥结局"],
      battles: ["library_three_questions", "two_fathers_boss", "carefree_final_trial"],
      keyScripts: ["wuchen_three_questions", "final_truth_choice", "carefree_epilogue"]
    }
  ],
  scriptActionSchema: [
    { type: "dialog", fields: ["speaker", "text", "choices"] },
    { type: "setFlag", fields: ["flag"] },
    { type: "addQuest", fields: ["quest"] },
    { type: "completeQuest", fields: ["questId"] },
    { type: "addItem", fields: ["itemId", "amount"] },
    { type: "addMoney", fields: ["amount"] },
    { type: "learnSkill", fields: ["characterId", "skillId"] },
    { type: "joinParty", fields: ["characterId"] },
    { type: "leaveParty", fields: ["characterId"] },
    { type: "enterMap", fields: ["mapId", "spawn"] },
    { type: "startBattle", fields: ["battleId", "enemyGroupId", "mapKey", "onVictory"] },
    { type: "playCutscene", fields: ["cutsceneId"] },
    { type: "openShop", fields: ["shopId"] },
    { type: "unlockWorldNode", fields: ["nodeId"] }
  ],
  productionRules: [
    "每个章节必须绑定 worldMap 节点、场景地图、关键 NPC、至少一个战斗节点和一个非战斗探索节点。",
    "剧情脚本只表达状态变化和事件请求，不直接扣血、不直接移动 Canvas、不直接写 UI。",
    "NPC 名字、门派、武功全部来自 story bible；禁止在具体场景脚本里临时发明高频核心名词。",
    "每个战斗节点需要胜利结果、失败结果、奖励池和剧情 flag。",
    "每条感情线必须影响主角理解真相的角度，但不能把最终选择绑定到单一女主。"
  ]
};

export function characterById(id) {
  return wuxiaStoryBible.characters.find((character) => character.id === id);
}

export function chapterById(id) {
  return wuxiaStoryBible.chapters.find((chapter) => chapter.id === id);
}
