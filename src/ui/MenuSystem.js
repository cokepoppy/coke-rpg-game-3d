const SAVE_KEY = "coke-game-rpg-save-v1";

export class MenuSystem {
  constructor(root, { scene }) {
    this.root = root;
    this.scene = scene;
    this.opened = false;
    this.mode = "main";
    this.root.classList.add("menu-ui");
    this.root.hidden = true;
  }

  openMain() {
    this.mode = "main";
    this.opened = true;
    this.root.hidden = false;
    this.render();
  }

  openPause() {
    this.mode = "pause";
    this.opened = true;
    this.root.hidden = false;
    this.render();
  }

  close() {
    this.opened = false;
    this.root.hidden = true;
    this.root.innerHTML = "";
  }

  render() {
    const hasSave = Boolean(localStorage.getItem(SAVE_KEY));
    const title = this.mode === "settings" ? "设置" : "天龙八部";
    const subtitle = this.mode === "main" ? "大理旧道 · 江湖初起" : "游戏菜单";
    this.root.innerHTML = `
      <div class="menu-backdrop"></div>
      <section class="menu-panel" role="dialog" aria-label="${title}">
        <header class="menu-header">
          <strong>${title}</strong>
          <span>${subtitle}</span>
        </header>
        <div class="menu-body">
          ${this.mode === "settings" ? settingsHtml() : actionsHtml(this.mode, hasSave)}
        </div>
        <footer class="menu-footer">Esc / M 打开菜单，B / I 打开背包。</footer>
      </section>
    `;
    this.bindActions();
  }

  bindActions() {
    this.root.querySelector("[data-action='new']")?.addEventListener("click", async () => {
      this.close();
      await this.scene.startNewGame();
    });
    this.root.querySelector("[data-action='continue']")?.addEventListener("click", () => this.close());
    this.root.querySelector("[data-action='load']")?.addEventListener("click", async () => {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      this.close();
      await this.scene.restoreSnapshot(JSON.parse(raw));
    });
    this.root.querySelector("[data-action='save']")?.addEventListener("click", () => {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.scene.snapshot()));
      this.mode = "pause";
      this.render();
      this.showMessage("已保存。");
    });
    this.root.querySelector("[data-action='settings']")?.addEventListener("click", () => {
      this.mode = "settings";
      this.render();
    });
    this.root.querySelector("[data-action='back']")?.addEventListener("click", () => {
      this.mode = this.scene.started ? "pause" : "main";
      this.render();
    });
  }

  showMessage(text) {
    const footer = this.root.querySelector(".menu-footer");
    if (footer) footer.textContent = text;
  }
}

function actionsHtml(mode, hasSave) {
  const main = mode === "main";
  return `
    <button type="button" data-action="new">新开始游戏</button>
    ${main ? "" : `<button type="button" data-action="continue">继续游戏</button>`}
    <button type="button" data-action="load" ${hasSave ? "" : "disabled"}>加载存档</button>
    ${main ? "" : `<button type="button" data-action="save">保存游戏</button>`}
    <button type="button" data-action="settings">设置</button>
  `;
}

function settingsHtml() {
  return `
    <label class="menu-setting">
      <span>像素渲染</span>
      <input type="checkbox" checked disabled />
    </label>
    <label class="menu-setting">
      <span>音乐</span>
      <input type="checkbox" disabled />
    </label>
    <label class="menu-setting">
      <span>文字速度</span>
      <input type="range" min="1" max="3" value="2" disabled />
    </label>
    <button type="button" data-action="back">返回</button>
  `;
}
