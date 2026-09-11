const ROMANCE_TRACKS = Object.freeze({
  su_luo: {
    id: "su_luo",
    name: "苏萝",
    temperament: "灵动、温暖、嘴硬心软",
    conflict: "她想找回失踪的母亲，却害怕主角只是把她当作查案的同伴。"
  },
  qin_wanyao: {
    id: "qin_wanyao",
    name: "秦晚瑶",
    temperament: "清冷、克制、把真心藏在礼法之后",
    conflict: "她知道王府旧案的裂缝，却担心一旦动情，便会同时辜负家族与主角。"
  },
  mu_zhiyan: {
    id: "mu_zhiyan",
    name: "穆芷烟",
    temperament: "偏执、锋利、爱恨都不肯留余地",
    conflict: "她用毒和试探保护自己，最怕主角看见她恨意下面的孤独。"
  }
});

const ROMANCE_SCORE_DEFAULTS = Object.freeze({
  su_luo: 0,
  qin_wanyao: 0,
  mu_zhiyan: 0
});

function romanceStage(flags, trackId) {
  if (!flags.has(`romance_${trackId}_opened`)) return "first";
  if (!flags.has(`romance_${trackId}_turning`)) return "turning";
  return "steady";
}

function choice(label, onChoice, value) {
  return { label, action: () => onChoice(value) };
}

function romanceDialogue({ trackId, stage, heroName, onChoice }) {
  const choose = (label, value) => choice(label, onChoice, value);
  if (trackId === "su_luo") {
    if (stage === "first") {
      return [
        {
          speaker: "苏萝",
          text: "你把佩剑抱得这样紧，是怕旧案咬人，还是怕我看见你手在抖？苍山的风会替人藏话，却藏不住心跳。"
        },
        {
          speaker: heroName,
          text: "我怕的不是风，也不是旧案。我怕走到最后，身边的人都只剩一封没有署名的信。"
        },
        {
          speaker: "苏萝",
          text: "那便把信分我一半。春水不问归舟，我也不问你从哪里来；可你若要往险处去，至少让我知道该在何处等你。",
          choices: [
            choose("把无名信交给她", "trust"),
            choose("笑说自己只怕她的药", "tease")
          ]
        }
      ];
    }
    if (stage === "turning") {
      return [
        {
          speaker: "苏萝",
          text: "月华谷的月亮很近，近得像能照见人的旧梦。若我找到了母亲留下的信，却发现她并不想让我找到呢？"
        },
        {
          speaker: heroName,
          text: "那就由我陪你读完。信里若有离别，也不必一个人把它咽下去。"
        },
        {
          speaker: "苏萝",
          text: "你说得这样轻巧，倒像把一生都当作山路。可山路会有尽头，人心却会在尽头处问一句：你留下，究竟是因为我，还是因为案子？",
          choices: [
            choose("答应陪她查母亲的旧信", "promise"),
            choose("先查旧案，叫她不要独自涉险", "protect")
          ]
        }
      ];
    }
    return [{
      speaker: "苏萝",
      text: "风从苍山来，吹乱了我的药草，也吹乱了你的心。你若还要走，我便把灯留着；只是这一次，别让我等到天明。",
      choices: [choose("听她把话说完", "listen")]
    }];
  }

  if (trackId === "qin_wanyao") {
    if (stage === "first") {
      return [
        {
          speaker: "秦晚瑶",
          text: "南岭的月色照在请帖上，像一层薄霜。请帖能替你打开王府的门，却不能替你挡住门后的旧债。"
        },
        {
          speaker: heroName,
          text: "你把门钥匙交给一个刚认识的人，不怕我把王府的秘密带进江湖？"
        },
        {
          speaker: "秦晚瑶",
          text: "怕。所以我只给你一半真话。另一半若由我说出口，便会变成王府的命令；若由你问出来，才算你的选择。",
          choices: [
            choose("问她为何把心意藏在请帖里", "ask_heart"),
            choose("只收请帖，不问王府私事", "keep_distance")
          ]
        }
      ];
    }
    if (stage === "turning") {
      return [
        {
          speaker: "秦晚瑶",
          text: "礼法教人知进退，却没有教过人如何在想见一个人的时候，仍然装作只是路过。"
        },
        {
          speaker: heroName,
          text: "若你不愿再替王府传话，便不必传。你可以只做秦晚瑶，不做谁家的女儿。"
        },
        {
          speaker: "秦晚瑶",
          text: "你可知这句话比请帖更重？收下它的人，便不能再把心事推给家门。",
          choices: [
            choose("让她为自己选择", "free"),
            choose("劝她先守住王府的礼法", "distance")
          ]
        }
      ];
    }
    return [{
      speaker: "秦晚瑶",
      text: "你来时，我把琴弦调得太紧；你走后，我才知道有些弦不是为守礼而绷着，是怕一松手，便再也留不住春风。",
      choices: [choose("替她把琴弦放松", "listen")]
    }];
  }

  if (trackId === "mu_zhiyan") {
    if (stage === "first") {
      return [
        {
          speaker: "穆芷烟",
          text: "你看苏萝的时候，眼里有光；看秦晚瑶的时候，眼里有敬意。轮到我，你只看见毒。很好，至少毒不会骗人。"
        },
        {
          speaker: heroName,
          text: "毒也会骗人。它说只要先伤人，自己便不会再被伤。"
        },
        {
          speaker: "穆芷烟",
          text: "那你敢不敢接住我的恨？别急着救我，也别急着教我做个好人。你若只想要线索，我给你线索；你若想要我的心，便先受得住它的刺。",
          choices: [
            choose("接住她的恨", "accept_hurt"),
            choose("只问调包孩子的线索", "ask_clue")
          ]
        }
      ];
    }
    if (stage === "turning") {
      return [
        {
          speaker: "穆芷烟",
          text: "你护苏萝时，像护一盏灯；你对秦晚瑶时，像对一座不能碰的雪山。只有我，配得上你一句‘不要胡闹’。"
        },
        {
          speaker: heroName,
          text: "因为你每一次靠近，都像要先把我推下悬崖。"
        },
        {
          speaker: "穆芷烟",
          text: "那你便站稳。若你连我的坏都不肯看，凭什么说你看见过我？",
          choices: [
            choose("告诉她不怕她的恨", "face_anger"),
            choose("说她不该用毒试人心", "set_boundary")
          ]
        }
      ];
    }
    return [{
      speaker: "穆芷烟",
      text: "别把我和她们放在同一盏灯下。我若真要走，连影子都不会留给你；可你若叫我留下，便别只在夜里叫。",
      choices: [choose("不许她独自离开", "listen")]
    }];
  }

  throw new Error(`Unknown romance track: ${trackId}`);
}

module.exports = { ROMANCE_TRACKS, ROMANCE_SCORE_DEFAULTS, romanceStage, romanceDialogue };
