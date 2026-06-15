class DialogSystem {
  constructor() {
    this.pages = [];
    this.index = 0;
    this.onFinish = null;
  }

  get active() { return this.pages.length > 0; }
  get page() { return this.pages[this.index] || null; }

  show(pages, onFinish) {
    this.pages = Array.isArray(pages) ? pages : [pages];
    this.index = 0;
    this.onFinish = onFinish || null;
  }

  advance(choiceIndex = 0) {
    const current = this.page;
    if (!current) return;
    if (current.choices && current.choices[choiceIndex]?.action) current.choices[choiceIndex].action();
    if (this.index < this.pages.length - 1) {
      this.index += 1;
      return;
    }
    const done = this.onFinish;
    this.pages = [];
    this.index = 0;
    this.onFinish = null;
    if (done) done();
  }
}

module.exports = { DialogSystem };
