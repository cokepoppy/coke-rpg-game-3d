function daoistMasterDialogue({ heroName, learned, onTeach }) {
  if (learned) {
    return {
      speaker: "逍遥道人",
      text: "扶摇之意不在招式，在乘天地之正、御六气之辩。去风里再走一遭吧。"
    };
  }

  return [
    {
      speaker: "逍遥道人",
      text: "北冥有鱼，化而为鹏。少侠脚下拘于形，心中却还有一线清风。"
    },
    {
      speaker: heroName,
      text: "前辈知道我为何而来？还请指点这条苍山旧道。"
    },
    {
      speaker: "逍遥道人",
      text: "先不问来处。看清这一式扶摇，再决定你的江湖要往何方。",
      choices: [
        { label: "请前辈传授扶摇诀", action: onTeach },
        { label: "改日再来" }
      ]
    }
  ];
}

module.exports = { daoistMasterDialogue };
