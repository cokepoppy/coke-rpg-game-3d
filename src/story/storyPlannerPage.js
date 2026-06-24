import { wuxiaStoryBible } from "./wuxiaStoryBible.js";
import { wuxiaCampaignScripts } from "./wuxiaCampaignScripts.js";

const root = document.querySelector("#story-planner");
const tabs = [
  { id: "overview", label: "总览" },
  { id: "characters", label: "人物群像" },
  { id: "chapters", label: "章节推进" },
  { id: "scripts", label: "剧情脚本" },
  { id: "world", label: "世界地图" },
  { id: "system", label: "脚本系统" }
];

let activeTab = "overview";
render();

function render() {
  root.innerHTML = `
    <section class="planner-hero">
      <h1>${escapeHtml(wuxiaStoryBible.meta.title)}</h1>
      <p>${escapeHtml(wuxiaStoryBible.meta.subtitle)}。${escapeHtml(wuxiaStoryBible.meta.designGoal)}</p>
    </section>
    <nav class="tabs" aria-label="剧情规划分类">
      ${tabs.map((tab) => `<button type="button" data-tab="${tab.id}" aria-selected="${tab.id === activeTab}">${tab.label}</button>`).join("")}
    </nav>
    <section class="grid">${renderTab(activeTab)}</section>
  `;
  for (const button of root.querySelectorAll("[data-tab]")) {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      render();
    });
  }
}

function renderTab(tab) {
  if (tab === "characters") return renderCharacters();
  if (tab === "chapters") return renderChapters();
  if (tab === "scripts") return renderScripts();
  if (tab === "world") return renderWorld();
  if (tab === "system") return renderSystem();
  return renderOverview();
}

function renderOverview() {
  return `
    ${panel("版权安全边界", `<p>${escapeHtml(wuxiaStoryBible.meta.copyrightRule)}</p>`)}
    ${panel("核心主题", `<div class="card-grid">${wuxiaStoryBible.themes.map(renderTheme).join("")}</div>`)}
    ${panel("势力结构", `<div class="card-grid">${wuxiaStoryBible.factions.map(renderFaction).join("")}</div>`)}
  `;
}

function renderCharacters() {
  return panel("原创人物表", `
    <div class="card-grid">
      ${wuxiaStoryBible.characters.map((character) => `
        <article class="card">
          <h3>${escapeHtml(character.name)}</h3>
          <p>${escapeHtml(character.archetype)}</p>
          <div class="meta">
            <span class="tag">${character.playable ? "可入队" : "剧情 NPC"}</span>
            <span class="tag">${escapeHtml(character.combatRole)}</span>
            <span class="tag">${escapeHtml(factionName(character.faction))}</span>
          </div>
          <ul class="list">
            <li><strong>执念：</strong>${escapeHtml(character.desire)}</li>
            <li><strong>秘密：</strong>${escapeHtml(character.secret)}</li>
            <li><strong>弧光：</strong>${escapeHtml(character.arc)}</li>
          </ul>
        </article>
      `).join("")}
    </div>
  `);
}

function renderChapters() {
  return panel("五章主线", `
    <div class="timeline">
      ${wuxiaStoryBible.chapters.map((chapter, index) => `
        <article class="chapter">
          <div class="chapter-index">${index + 1}</div>
          <div>
            <h3>${escapeHtml(chapter.title)}</h3>
            <p>${escapeHtml(chapter.synopsis)}</p>
            <div class="meta">
              <span class="tag">地图：${escapeHtml(mapName(chapter.mapId))}</span>
              <span class="tag">战斗：${chapter.battles.length}</span>
              <span class="tag">脚本：${chapter.keyScripts.length}</span>
            </div>
            <ul class="list">
              ${chapter.objectives.map((objective) => `<li>${escapeHtml(objective)}</li>`).join("")}
            </ul>
          </div>
        </article>
      `).join("")}
    </div>
  `);
}

function renderWorld() {
  return panel("世界地图节点", `
    <div class="matrix">
      ${wuxiaStoryBible.worldMap.map((node) => `
        <div class="matrix-row">
          <strong>${escapeHtml(node.name)}</strong>
          <span>${escapeHtml(node.purpose)}</span>
          <span>解锁：${escapeHtml(node.unlock)}</span>
        </div>
      `).join("")}
    </div>
  `);
}

function renderScripts() {
  const scripts = Object.values(wuxiaCampaignScripts);
  return panel("可执行剧情脚本", `
    <div class="matrix">
      ${scripts.map((script) => {
        const nodes = Object.entries(script.nodes);
        const actions = nodes.flatMap(([, node]) => node.actions || []);
        return `
          <div class="matrix-row">
            <strong>${escapeHtml(script.id)}</strong>
            <span>
              ${escapeHtml(chapterTitle(script.chapterId))}<br>
              起点：${escapeHtml(script.start)} · 节点：${nodes.length}<br>
              ${nodes.map(([nodeId, node]) => `${nodeId}: ${node.speaker || "旁白"}`).join(" / ")}
            </span>
            <span>${actions.length ? actions.map((action) => action.type).join(", ") : "dialog only"}</span>
          </div>
        `;
      }).join("")}
    </div>
  `);
}

function renderSystem() {
  return `
    ${panel("剧情脚本动作契约", `
      <div class="contract">
        ${wuxiaStoryBible.scriptActionSchema.map((action) => `
          <div class="contract-item">
            <strong>${escapeHtml(action.type)}</strong>
            <code>${escapeHtml(action.fields.join(", "))}</code>
          </div>
        `).join("")}
      </div>
    `)}
    ${panel("制作规则", `
      <ul class="list">
        ${wuxiaStoryBible.productionRules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}
      </ul>
    `)}
  `;
}

function renderTheme(theme) {
  return `
    <article class="card">
      <h3>${escapeHtml(theme.name)}</h3>
      <p>${escapeHtml(theme.description)}</p>
    </article>
  `;
}

function renderFaction(faction) {
  return `
    <article class="card">
      <h3>${escapeHtml(faction.name)}</h3>
      <p>${escapeHtml(faction.role)}</p>
      <div class="meta"><span class="tag">${escapeHtml(faction.agenda)}</span></div>
    </article>
  `;
}

function panel(title, body) {
  return `
    <article class="panel">
      <header class="panel-header"><h2>${escapeHtml(title)}</h2></header>
      <div class="panel-body">${body}</div>
    </article>
  `;
}

function factionName(id) {
  return wuxiaStoryBible.factions.find((faction) => faction.id === id)?.name || id;
}

function mapName(id) {
  return wuxiaStoryBible.worldMap.find((node) => node.id === id)?.name || id;
}

function chapterTitle(id) {
  return wuxiaStoryBible.chapters.find((chapter) => chapter.id === id)?.title || id;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
