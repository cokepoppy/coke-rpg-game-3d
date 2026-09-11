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
          text: "你把剑抱这么紧，是怕旧案，还是怕我看见你手在抖？"
        },
        {
          speaker: heroName,
          text: "我怕的不是旧案。我怕查到最后，身边的人都一个个走了，只留下一封没署名的信。"
        },
        {
          speaker: "苏萝",
          text: "那就把信给我看看。你要去危险的地方，至少先告诉我一声，别总想着一个人扛。",
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
          text: "月华谷的月亮很亮。我有点怕，真找到我娘留下的信，里面写的却不是我想听的话。"
        },
        {
          speaker: heroName,
          text: "那我们一起看。就算是离别，也不用你一个人面对。"
        },
        {
          speaker: "苏萝",
          text: "你说得倒轻松。可我要是查完就想离开这里呢？你会留下来陪我，还是只把我当成查案的同伴？",
          choices: [
            choose("答应陪她查母亲的旧信", "promise"),
            choose("先查旧案，叫她不要独自涉险", "protect")
          ]
        }
      ];
    }
    return [{
      speaker: "苏萝",
      text: "你要是还想走，就走吧。我会给你留盏灯。不过这次别让我等太久。",
      choices: [choose("听她把话说完", "listen")]
    }];
  }

  if (trackId === "qin_wanyao") {
    if (stage === "first") {
      return [
        {
          speaker: "秦晚瑶",
          text: "这封请帖可以让你进王府，但王府里的旧账，不会因为有请帖就消失。"
        },
        {
          speaker: heroName,
          text: "你把请帖交给我，不怕我把王府的秘密带到江湖上？"
        },
        {
          speaker: "秦晚瑶",
          text: "当然怕。所以我没有把所有事情都告诉你。剩下的，你想问就问；不想问，也没人逼你。",
          choices: [
            choose("问她为什么亲自送请帖", "ask_heart"),
            choose("只收请帖，不问王府私事", "keep_distance")
          ]
        }
      ];
    }
    if (stage === "turning") {
      return [
        {
          speaker: "秦晚瑶",
          text: "礼法教我该怎么做，却没教我该怎么面对一个我想见、又不敢见的人。"
        },
        {
          speaker: heroName,
          text: "如果你不想再替王府传话，就别替他们说。你可以先做回秦晚瑶，再考虑自己是谁家的女儿。"
        },
        {
          speaker: "秦晚瑶",
          text: "你知道吗？这句话比请帖还重。你让我自己做决定，就等于让我承担决定的后果。",
          choices: [
            choose("让她为自己选择", "free"),
            choose("劝她先守住王府的礼法", "distance")
          ]
        }
      ];
    }
    return [{
      speaker: "秦晚瑶",
      text: "你来的时候，我总把琴弦调得太紧。你走之后我才明白，我不是怕失礼，只是怕一放松，就留不住你。",
      choices: [choose("帮她把琴弦放松", "listen")]
    }];
  }

  if (trackId === "mu_zhiyan") {
    if (stage === "first") {
      return [
        {
          speaker: "穆芷烟",
          text: "你看苏萝，眼神总是很软；看秦晚瑶，又多了几分敬意。到了我这里，你只防着我的毒。也好，至少你还知道怕。"
        },
        {
          speaker: heroName,
          text: "毒不会骗人？我看未必。很多人先伤别人，只是因为怕自己先受伤。"
        },
        {
          speaker: "穆芷烟",
          text: "那你还敢靠近我吗？别急着救我，也别急着教我改。你要线索，我给你；你想知道我在想什么，就先别怕被我刺伤。",
          choices: [
            choose("告诉她，你不怕她", "accept_hurt"),
            choose("只问调包孩子的线索", "ask_clue")
          ]
        }
      ];
    }
    if (stage === "turning") {
      return [
        {
          speaker: "穆芷烟",
          text: "你护着苏萝的时候，眼神都变了；你面对秦晚瑶，又客气得像在面对贵客。只有对我，你会说‘别闹’。"
        },
        {
          speaker: heroName,
          text: "因为你每次靠近我，都像是先把刀架到我脖子上。"
        },
        {
          speaker: "穆芷烟",
          text: "那你就站稳了。你要是只喜欢我好说话的时候，就别说你真的了解我。",
          choices: [
            choose("告诉她不怕她的恨", "face_anger"),
            choose("说她不该用毒试人心", "set_boundary")
          ]
        }
      ];
    }
    return [{
      speaker: "穆芷烟",
      text: "别拿我和她们比。我真要走，连一句告别都不会留给你。可你要我留下，就别只在想起我的时候叫我。",
      choices: [choose("不许她独自离开", "listen")]
    }];
  }

  throw new Error(`Unknown romance track: ${trackId}`);
}

module.exports = { ROMANCE_TRACKS, ROMANCE_SCORE_DEFAULTS, romanceStage, romanceDialogue };
