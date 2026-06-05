import { VIEWPORT } from "../config/constants.js";
import { GameLoop } from "./GameLoop.js";
import { InputController } from "./InputController.js";
import { Camera } from "./Camera.js";
import { WorldScene } from "../scenes/WorldScene.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.canvas.width = VIEWPORT.width;
    this.canvas.height = VIEWPORT.height;
    this.input = new InputController();
    this.camera = new Camera(VIEWPORT.width, VIEWPORT.height);
    this.scene = new WorldScene(this.context, this.input, this.camera);
    this.loop = new GameLoop((dt) => this.scene.update(dt), () => this.scene.render());
  }

  async start() {
    await this.scene.load();
    this.loop.start();
  }
}
