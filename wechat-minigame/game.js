const { GameApp } = require("./js/gameApp");

const game = new GameApp();
globalThis.__cangshanGame = game;
game.start().catch((error) => {
  console.error("Failed to start Cangshan RPG", error);
});
