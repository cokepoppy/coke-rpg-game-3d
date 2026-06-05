export class DialogBox {
  constructor(root) {
    this.root = root;
    this.root.classList.add("dialog-box");
    this.root.hidden = true;
  }

  show({ speaker, text, choices }) {
    this.root.hidden = false;
    this.root.innerHTML = `
      <div class="dialog-speaker">${escapeHtml(speaker || "")}</div>
      <div class="dialog-text">${escapeHtml(text || "")}</div>
      <div class="dialog-actions">
        ${choices.map((choice, index) => `<button type="button" data-choice="${index}">${escapeHtml(choice.label)}</button>`).join("")}
      </div>
    `;

    return new Promise((resolve) => {
      const buttons = [...this.root.querySelectorAll("button[data-choice]")];
      buttons[0]?.focus();
      for (const button of buttons) {
        button.addEventListener(
          "click",
          () => {
            const index = Number(button.dataset.choice);
            resolve(choices[index]);
          },
          { once: true }
        );
      }
    });
  }

  hide() {
    this.root.hidden = true;
    this.root.innerHTML = "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
