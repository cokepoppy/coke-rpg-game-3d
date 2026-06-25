const { GameApp } = require("./js/gameApp");
const { SIMULATOR_SCENARIO } = require("./js/simulatorScenario");

const game = new GameApp();
globalThis.__cangshanGame = game;
game.start()
  .then(() => {
    if (SIMULATOR_SCENARIO.cutscene) game.playCutscene(SIMULATOR_SCENARIO.cutscene);
  })
  .catch((error) => {
    console.error("Failed to start Cangshan RPG", error);
    globalThis.__cangshanLoading?.error?.("游戏启动失败", error?.message || String(error));
  });
