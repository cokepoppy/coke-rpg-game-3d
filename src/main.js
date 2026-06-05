import { Game } from "./core/Game.js";

const canvas = document.querySelector("#game");
const game = new Game(canvas);
game.start().catch((error) => {
  console.error(error);
  document.querySelector("#status").textContent = error.message;
});
