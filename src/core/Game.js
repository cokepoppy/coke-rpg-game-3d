import { VIEWPORT } from "../config/constants.js";
import { GameLoop } from "./GameLoop.js";
import { InputController } from "./InputController.js";
import { Camera } from "./Camera.js";
import { WorldScene } from "../scenes/WorldScene.js";
import { DialogBox } from "../ui/DialogBox.js";
import { MenuSystem } from "../ui/MenuSystem.js";
import { AudioManager } from "../audio/AudioManager.js";
import { assets } from "../assets/assetManifest.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.canvas.width = VIEWPORT.width;
    this.canvas.height = VIEWPORT.height;
    this.input = new InputController();
    this.camera = new Camera(VIEWPORT.width, VIEWPORT.height);
    const dialogRoot = document.querySelector("#dialog");
    this.scene = new WorldScene(this.context, this.input, this.camera, new DialogBox(dialogRoot));
    this.audio = new AudioManager(assets.audio.bgm);
    this.menu = new MenuSystem(document.querySelector("#menu-ui"), { scene: this.scene, audio: this.audio });
    this.loop = new GameLoop((dt) => this.update(dt), () => this.scene.render());
  }

  async start() {
    await this.scene.load();
    this.menu.openMain();
    this.loop.start();
  }

  update(dt) {
    if (this.menu.opened) {
      if (!this.scene.started) return;
      if (this.input.consume("escape") || this.input.consume("m")) this.menu.close();
      return;
    }
    if (this.scene.started && !this.scene.hasOverlayOpen() && (this.input.consume("escape") || this.input.consume("m"))) {
      this.menu.openPause();
      return;
    }
    this.scene.update(dt);
  }
}
