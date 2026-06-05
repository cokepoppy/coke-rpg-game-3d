const starters = [
  {
    id: "xiaoyao",
    name: "凌波琴客",
    school: "逍遥一脉",
    trait: "轻功与内力见长",
    color: "#58b99b",
    accent: "#d8a540",
    maxHp: 88,
    maxQi: 72,
    atk: 16,
    def: 8,
    speed: 18,
    skill: { name: "北冥引", cost: 18, power: 27, text: "吸纳敌劲，回复少量气血" },
    bio: "身法飘忽，擅长以柔化刚。适合稳扎稳打，战斗中续航能力强。"
  },
  {
    id: "gaibang",
    name: "竹杖豪侠",
    school: "丐帮",
    trait: "外功爆发见长",
    color: "#c44737",
    accent: "#f0dfbd",
    maxHp: 112,
    maxQi: 46,
    atk: 22,
    def: 10,
    speed: 12,
    skill: { name: "降龙掌", cost: 16, power: 34, text: "刚猛掌劲，造成高额伤害" },
    bio: "掌法雄浑，越战越勇。适合快速击破强敌，承伤能力也更可靠。"
  },
  {
    id: "dali",
    name: "素袍剑使",
    school: "大理段氏",
    trait: "点穴与均衡见长",
    color: "#6fa8dc",
    accent: "#ffffff",
    maxHp: 96,
    maxQi: 62,
    atk: 18,
    def: 12,
    speed: 15,
    skill: { name: "一阳指", cost: 15, power: 26, text: "精准点穴，削弱敌人攻势" },
    bio: "指剑双修，攻守平衡。适合稳定推进地图，应对多种江湖事件。"
  }
];

const recruits = [
  {
    id: "shaolin",
    name: "伏虎僧",
    school: "少林",
    trait: "护体金钟",
    color: "#d8a540",
    accent: "#8b5135",
    maxHp: 124,
    maxQi: 38,
    atk: 17,
    def: 16,
    speed: 9,
    skill: { name: "金刚伏魔", cost: 12, power: 23, text: "稳重一击，提升队伍士气" },
    bio: "守御坚实的同伴。"
  },
  {
    id: "miao",
    name: "灵鹫医女",
    school: "灵鹫宫",
    trait: "医术与暗器",
    color: "#b875d5",
    accent: "#55b88d",
    maxHp: 82,
    maxQi: 78,
    atk: 15,
    def: 8,
    speed: 17,
    skill: { name: "生死符", cost: 18, power: 24, text: "暗器入脉，附带恢复一枚丹药" },
    bio: "能让队伍在长线探索中保持状态。"
  }
];

const locations = [
  { id: "inn", name: "无量客栈", icon: "茶", x: 50, y: 88, w: 16, h: 12, event: "rest", label: "山门石阶" },
  { id: "lake", name: "无量玉璧", icon: "壁", x: 46, y: 55, w: 13, h: 12, event: "scroll", label: "石井玉璧" },
  { id: "market", name: "大理市集", icon: "市", x: 72, y: 61, w: 20, h: 14, event: "supply", label: "竹棚市集" },
  { id: "cliff", name: "苍山断崖", icon: "崖", x: 18, y: 47, w: 24, h: 28, event: "battle", label: "草深处" },
  { id: "forest", name: "松林古道", icon: "林", x: 30, y: 71, w: 19, h: 16, event: "recruit", label: "松林古道" },
  { id: "temple", name: "天龙古寺", icon: "寺", x: 50, y: 30, w: 20, h: 16, event: "rest", label: "古寺正殿" },
  { id: "pass", name: "雁门关外", icon: "关", x: 80, y: 42, w: 20, h: 24, event: "battle", label: "演武场" },
  { id: "palace", name: "西夏王帐", icon: "帐", x: 88, y: 70, w: 13, h: 16, event: "boss", label: "王帐入口" }
];

const enemies = {
  cliff: {
    id: "rider",
    name: "吐蕃武士",
    school: "密宗刀客",
    color: "#9f3028",
    accent: "#d8a540",
    maxHp: 92,
    maxQi: 42,
    atk: 18,
    def: 8,
    speed: 10,
    skill: { name: "火焰刀", cost: 14, power: 24 }
  },
  pass: {
    id: "eagle",
    name: "契丹鹰卫",
    school: "关外劲旅",
    color: "#5c6f82",
    accent: "#c44737",
    maxHp: 116,
    maxQi: 36,
    atk: 21,
    def: 10,
    speed: 13,
    skill: { name: "裂风斩", cost: 12, power: 26 }
  },
  palace: {
    id: "boss",
    name: "西夏一品堂主",
    school: "毒掌宗师",
    color: "#6d4aa1",
    accent: "#55b88d",
    maxHp: 158,
    maxQi: 66,
    atk: 24,
    def: 13,
    speed: 14,
    skill: { name: "悲酥清风", cost: 18, power: 31 }
  }
};

const eventCopy = {
  intro: ["江湖初行", "同伴已在身边，山门外草木微动，远处演武场也传来兵刃声。"],
  rest: ["歇脚调息", "店家送来热茶，众人气血回满。"],
  supply: ["补给入囊", "市集上买到金疮药，丹药 +2。"],
  scroll: ["参悟玉璧", "玉璧月影如剑，队伍攻击与内力上限提升。"],
  recruit: ["林中结伴", "一位江湖同道愿同行，从此队伍多一份照应。"],
  battle: ["狭路相逢", "前方刀光骤起，需要先击退敌人。"],
  boss: ["王帐决战", "一品堂高手拦住去路，这是此行最险一战。"]
};

const state = {
  phase: "starter",
  party: [],
  current: "inn",
  unlocked: new Set(["inn", "lake", "market"]),
  cleared: new Set(["inn"]),
  inventory: { 药: 3, 秘笈: 0 },
  reputation: 0,
  log: ["江湖风起，先选一位同行侠客。"],
  event: null,
  battle: null,
  turnLocked: false,
  world: {
    x: 50,
    y: 80,
    facing: "down",
    frame: 0,
    step: 0,
    lastZone: null
  }
};

const keys = new Set();
let worldLoopId = 0;
let worldLoopToken = 0;
let controlsReady = false;

function cloneUnit(unit) {
  return {
    ...unit,
    hp: unit.maxHp,
    qi: unit.maxQi,
    weakened: 0
  };
}

function render() {
  const app = document.querySelector("#app");
  if (state.phase === "starter") {
    app.className = "game-shell starter-screen";
    app.innerHTML = renderStarter();
    bindStarter();
    stopWorldLoop();
    return;
  }

  app.className = "game-shell play-screen";
  app.innerHTML = `
    <section class="main-stage game-stage">
      ${state.phase === "battle" ? renderBattle() : renderMap()}
    </section>
  `;
  bindGame();
  if (state.phase === "map") startWorldLoop();
  else stopWorldLoop();
}

function renderStarter() {
  return `
    <section class="starter-hero">
      <div class="brand">
        <div class="seal">侠</div>
        <div>
          <h1>天龙群侠录</h1>
          <span>Sengoku Era 风格的 JavaScript 武侠 RPG 原型</span>
        </div>
      </div>
      <p>选择一位初始侠客，穿行大理、苍山、雁门与西夏王帐。每个地点会触发补给、招募、秘籍或战斗事件，最终击败一品堂主。</p>
    </section>
    <section class="starter-grid">
      ${starters
        .map(
          (hero) => `
          <button class="starter-card panel" data-starter="${hero.id}">
            <div class="sprite-frame">${sprite(hero)}</div>
            <div>
              <h2>${hero.name}</h2>
              <div class="unit-school">${hero.school} · ${hero.trait}</div>
              <p>${hero.bio}</p>
              <div class="starter-stats">
                ${stat("气血", hero.maxHp, 124)}
                ${stat("内力", hero.maxQi, 78)}
                ${stat("攻击", hero.atk, 24)}
                ${stat("身法", hero.speed, 18)}
              </div>
              <span class="primary-btn">以此人开局</span>
            </div>
          </button>`
        )
        .join("")}
    </section>
  `;
}

function renderTopbar() {
  const loc = getLocation(state.current);
  return `
    <header class="topbar">
      <div class="brand">
        <div class="seal">侠</div>
        <div>
          <h1>天龙群侠录</h1>
          <span data-top-place>当前：${loc.name}</span>
        </div>
      </div>
      <div class="status-strip">
        <span class="pill">名望 ${state.reputation}</span>
        <span class="pill">丹药 ${state.inventory.药}</span>
        <span class="pill">秘笈 ${state.inventory.秘笈}</span>
        <button class="ghost-btn" data-action="restart">重开</button>
      </div>
    </header>
  `;
}

function renderPartyPanel() {
  return `
    <section class="panel">
      <div class="panel-header"><h2>队伍</h2><span>${state.party.length}/3</span></div>
      <div class="party-list">
        ${state.party.map(renderUnitCard).join("")}
      </div>
    </section>
  `;
}

function renderInventoryPanel() {
  return `
    <section class="panel">
      <div class="panel-header"><h2>行囊</h2></div>
      <div class="inventory-grid">
        <div class="item"><b>金疮药</b><span>战斗中回复 34 气血 · ${state.inventory.药}</span></div>
        <div class="item"><b>武学秘笈</b><span>地图事件强化属性 · ${state.inventory.秘笈}</span></div>
      </div>
    </section>
  `;
}

function renderQuestPanel() {
  const palaceCleared = state.cleared.has("palace");
  return `
    <section class="panel">
      <div class="panel-header"><h2>目标</h2></div>
      <div class="quest-list">
        <b>${palaceCleared ? "江湖暂定" : "赶赴西夏王帐"}</b><br />
        ${palaceCleared ? "一品堂主已败。可以重开尝试不同 starter。" : "沿地图推进，招募同伴并击败沿途强敌。"}
      </div>
    </section>
  `;
}

function renderEnemyPanel() {
  if (state.phase !== "battle" || !state.battle) {
    return `
      <section class="panel">
        <div class="panel-header"><h2>对手</h2></div>
        <div class="enemy-list">
          <div class="log-entry">未入战斗。</div>
        </div>
      </section>
    `;
  }
  return `
    <section class="panel">
      <div class="panel-header"><h2>对手</h2></div>
      <div class="enemy-list">${renderUnitCard(state.battle.enemy, true)}</div>
    </section>
  `;
}

function renderLogPanel() {
  return `
    <section class="panel">
      <div class="panel-header"><h2>江湖记</h2></div>
      <div class="log-list">
        ${state.log.slice(0, 9).map((entry) => `<div class="log-entry">${entry}</div>`).join("")}
      </div>
    </section>
  `;
}

function renderUnitCard(unit, enemy = false) {
  return `
    <article class="${enemy ? "enemy-card" : "hero-card"}">
      <div class="sprite-frame">${sprite(unit)}</div>
      <div>
        <div class="unit-name"><span>${unit.name}</span><span>Lv.${unit.level || 1}</span></div>
        <div class="unit-school">${unit.school} · ${unit.trait || "江湖高手"}</div>
        <div class="bars">
          ${bar(unit.hp, unit.maxHp, "hp")}
          ${bar(unit.qi, unit.maxQi, "qi")}
        </div>
      </div>
    </article>
  `;
}

function renderMap() {
  return `
    <div class="overworld-wrap">
      <div class="world-hud" data-potions="${state.inventory.药}">
        <strong data-world-place>${getLocation(state.current).name}</strong>
        <span>${state.party[0].school} · ${state.party[0].name} Lv.${state.party[0].level || 1}</span>
        <button class="ghost-btn" data-action="rest">调息</button>
      </div>
      <div class="world-scene" tabindex="0" aria-label="天龙江湖场景">
        <div class="terrain grass-left"></div>
        <div class="terrain grass-right"></div>
        <div class="terrain red-maple"></div>
        <div class="terrain rocks-bottom"></div>
        <div class="path main-path"></div>
        <div class="path side-path"></div>
        <div class="torii">
          <i></i><i></i><b></b><b></b><span></span>
        </div>
        <div class="well"></div>
        <div class="lantern lantern-left"></div>
        <div class="lantern lantern-right"></div>
        <div class="bamboo bamboo-left"></div>
        <div class="bamboo bamboo-right"></div>
        <div class="market-stall"></div>
        ${locations.map(renderWorldZone).join("")}
        <div class="world-player facing-${state.world.facing}" style="${playerStyle()}"></div>
      </div>
      ${state.event ? renderEventBanner() : ""}
    </div>
  `;
}

function renderWorldZone(loc) {
  const cleared = state.cleared.has(loc.id);
  const current = state.current === loc.id;
  return `
    <div
      class="world-zone ${current ? "current" : ""} ${cleared ? "cleared" : ""}"
      style="left:${loc.x}%;top:${loc.y}%;width:${loc.w}%;height:${loc.h}%"
      data-zone="${loc.id}"
    >
      <span>${loc.label}</span>
    </div>
  `;
}

function renderEventBanner() {
  const [title, text] = eventCopy[state.event.type];
  return `
    <div class="event-banner">
      <div>
        <strong>${title}</strong>
        <p>${state.event.message || text}</p>
      </div>
      <button class="primary-btn" data-action="event">${state.event.button || "继续"}</button>
    </div>
  `;
}

function renderBattle() {
  const { hero, enemy } = state.battle;
  return `
    <div class="battle-view">
      <div class="battle-header">
        <div>
          <strong>${getLocation(state.current).name}</strong>
          <div class="unit-school">${hero.name} 对阵 ${enemy.name}</div>
        </div>
        <button class="ghost-btn" data-action="flee">撤回客栈</button>
      </div>
      <div class="battle-field">
        <article class="combatant hero">
          <div class="sprite-frame">${sprite(hero)}</div>
          <div class="combat-hud">
            <div class="unit-name"><span>${hero.name}</span><span>Lv.${hero.level || 1}</span></div>
            <div class="bars">${bar(hero.hp, hero.maxHp, "hp")}${bar(hero.qi, hero.maxQi, "qi")}</div>
            <span>HP ${hero.hp}/${hero.maxHp} · 内力 ${hero.qi}/${hero.maxQi}</span>
          </div>
        </article>
        <article class="combatant enemy">
          <div class="sprite-frame">${sprite(enemy)}</div>
          <div class="combat-hud">
            <div class="unit-name"><span>${enemy.name}</span><span>Lv.${enemy.level || 1}</span></div>
            <div class="bars">${bar(enemy.hp, enemy.maxHp, "hp")}${bar(enemy.qi, enemy.maxQi, "qi")}</div>
            <span>HP ${enemy.hp}/${enemy.maxHp} · 内力 ${enemy.qi}/${enemy.maxQi}</span>
          </div>
        </article>
      </div>
      <div class="battle-bottom">
        <div class="battle-dialogue">${state.log[0] || "对手拦住了去路。"}</div>
        <div class="battle-controls">
          <button class="action-btn" data-action="attack" ${state.turnLocked ? "disabled" : ""}><b>普攻</b><span>稳定伤害</span></button>
          <button class="action-btn" data-action="skill" ${hero.qi < hero.skill.cost || state.turnLocked ? "disabled" : ""}><b>${hero.skill.name}</b><span>耗 ${hero.skill.cost} 内力</span></button>
          <button class="action-btn" data-action="meditate" ${state.turnLocked ? "disabled" : ""}><b>调息</b><span>回内力</span></button>
          <button class="action-btn" data-action="potion" ${state.inventory.药 <= 0 || state.turnLocked ? "disabled" : ""}><b>金疮药</b><span>剩 ${state.inventory.药}</span></button>
        </div>
      </div>
    </div>
  `;
}

function bindStarter() {
  document.querySelectorAll("[data-starter]").forEach((button) => {
    button.addEventListener("click", () => {
      const hero = starters.find((unit) => unit.id === button.dataset.starter);
      state.party = [cloneUnit(hero)];
      state.phase = "map";
      state.current = "inn";
      state.world = { x: 50, y: 80, facing: "down", frame: 0, step: 0, lastZone: null };
      state.event = { type: "intro", button: "继续" };
      pushLog(`${hero.name}加入队伍，江湖路从无量客栈开始。`);
      render();
    });
  });
}

function bindGame() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

function moveTo(id) {
  state.current = id;
  const loc = getLocation(id);
  pushLog(`抵达${loc.name}。`);

  if (!state.cleared.has(id)) {
    triggerEvent(loc);
  } else {
    state.event = { type: "rest", message: `${loc.name}已探明，可以继续赶路。`, button: "知道了" };
  }
  render();
}

function triggerEvent(loc) {
  state.current = loc.id;
  if (loc.event === "battle" || loc.event === "boss") {
    state.event = { type: loc.event, button: "迎战" };
    return;
  }
  if (loc.event === "recruit" && state.party.length >= 3) {
    state.event = { type: "recruit", message: "林中同道见队伍已满，留下一瓶金疮药后离去。", button: "收下" };
    return;
  }
  state.event = { type: loc.event, button: "处理" };
}

function handleAction(action) {
  if (action === "restart") {
    restart();
    return;
  }
  if (action === "rest") {
    healParty();
    pushLog("全队原地调息，气血与内力恢复。");
    render();
    return;
  }
  if (action === "event") {
    resolveEvent();
    return;
  }
  if (action === "flee") {
    state.phase = "map";
    state.current = "inn";
    state.battle = null;
    healParty(0.5);
    pushLog("暂避锋芒，撤回无量客栈。");
    render();
    return;
  }
  if (state.phase === "battle") {
    playerAction(action);
  }
}

function resolveEvent() {
  const type = state.event?.type;
  const loc = getLocation(state.current);
  state.event = null;

  if (type === "intro") {
    pushLog("山道已开，可以在场景中行走探索。");
    render();
    return;
  }
  if (type === "rest") {
    healParty();
    state.cleared.add(loc.id);
    pushLog(`${loc.name}调息完毕，队伍状态恢复。`);
  }
  if (type === "supply") {
    state.inventory.药 += 2;
    state.reputation += 1;
    state.cleared.add(loc.id);
    pushLog("大理市集补给充足，金疮药 +2。");
  }
  if (type === "scroll") {
    state.inventory.秘笈 += 1;
    state.party.forEach((hero) => {
      hero.maxQi += 8;
      hero.qi = hero.maxQi;
      hero.atk += 2;
    });
    state.reputation += 1;
    state.cleared.add(loc.id);
    pushLog("参悟无量玉璧，队伍攻击 +2，内力上限 +8。");
  }
  if (type === "recruit") {
    if (state.party.length < 3) {
      const recruit = recruits.find((unit) => !state.party.some((hero) => hero.id === unit.id));
      if (recruit) {
        state.party.push(cloneUnit(recruit));
        pushLog(`${recruit.name}加入队伍。`);
      }
    } else {
      state.inventory.药 += 1;
      pushLog("队伍已满，收下同道赠药。");
    }
    state.reputation += 1;
    state.cleared.add(loc.id);
  }
  if (type === "battle" || type === "boss") {
    startBattle(loc.id);
    return;
  }
  unlockNeighbors(loc.id);
  render();
}

function startBattle(locationId) {
  const enemy = cloneUnit(enemies[locationId]);
  const hero = chooseLead();
  state.phase = "battle";
  state.battle = { locationId, hero, enemy };
  pushLog(`${enemy.name}现身，${hero.name}上前迎战。`);
  render();
}

function chooseLead() {
  const alive = state.party.find((hero) => hero.hp > 0);
  return alive || state.party[0];
}

function playerAction(action) {
  if (!state.battle || state.turnLocked) return;
  const { hero, enemy } = state.battle;
  if (hero.hp <= 0) return;

  if (action === "attack") {
    const damage = rollDamage(hero.atk, enemy.def, 0.95, 1.2);
    enemy.hp = clamp(enemy.hp - damage, 0, enemy.maxHp);
    hero.qi = clamp(hero.qi + 6, 0, hero.maxQi);
    pushLog(`${hero.name}出手试探，造成 ${damage} 点伤害。`);
  }

  if (action === "skill") {
    if (hero.qi < hero.skill.cost) return;
    hero.qi -= hero.skill.cost;
    const damage = rollDamage(hero.skill.power + hero.atk, enemy.def, 0.75, 1.05);
    enemy.hp = clamp(enemy.hp - damage, 0, enemy.maxHp);
    if (hero.id === "xiaoyao") hero.hp = clamp(hero.hp + 12, 0, hero.maxHp);
    if (hero.id === "dali") enemy.weakened = 2;
    if (hero.id === "miao") state.inventory.药 += 1;
    pushLog(`${hero.name}施展${hero.skill.name}，造成 ${damage} 点伤害。`);
  }

  if (action === "meditate") {
    hero.qi = clamp(hero.qi + 20, 0, hero.maxQi);
    hero.hp = clamp(hero.hp + 8, 0, hero.maxHp);
    pushLog(`${hero.name}凝神调息，内力回转。`);
  }

  if (action === "potion") {
    if (state.inventory.药 <= 0) return;
    state.inventory.药 -= 1;
    hero.hp = clamp(hero.hp + 34, 0, hero.maxHp);
    pushLog(`${hero.name}服下金疮药，气血恢复。`);
  }

  if (enemy.hp <= 0) {
    winBattle();
    return;
  }

  state.turnLocked = true;
  render();
  setTimeout(enemyTurn, 520);
}

function enemyTurn() {
  if (!state.battle) return;
  const { hero, enemy } = state.battle;
  const useSkill = enemy.qi >= enemy.skill.cost && Math.random() > 0.45;
  const base = useSkill ? enemy.skill.power + enemy.atk : enemy.atk;
  if (useSkill) enemy.qi -= enemy.skill.cost;
  const weakened = enemy.weakened > 0 ? 0.72 : 1;
  enemy.weakened = Math.max(0, enemy.weakened - 1);
  const damage = rollDamage(base * weakened, hero.def, 0.75, 1.1);
  hero.hp = clamp(hero.hp - damage, 0, hero.maxHp);
  enemy.qi = clamp(enemy.qi + 5, 0, enemy.maxQi);
  pushLog(`${enemy.name}${useSkill ? `使出${enemy.skill.name}` : "挥刃进逼"}，造成 ${damage} 点伤害。`);

  if (hero.hp <= 0) {
    const next = state.party.find((unit) => unit.hp > 0 && unit.id !== hero.id);
    if (next) {
      state.battle.hero = next;
      pushLog(`${hero.name}退下，${next.name}接战。`);
    } else {
      loseBattle();
      return;
    }
  }
  state.turnLocked = false;
  render();
}

function winBattle() {
  const loc = getLocation(state.battle.locationId);
  state.cleared.add(loc.id);
  state.reputation += loc.event === "boss" ? 5 : 2;
  state.inventory.药 += loc.event === "boss" ? 0 : 1;
  state.party.forEach((hero) => {
    hero.level = (hero.level || 1) + 1;
    hero.maxHp += 6;
    hero.atk += 1;
    hero.hp = clamp(hero.hp + 26, 0, hero.maxHp);
    hero.qi = clamp(hero.qi + 18, 0, hero.maxQi);
  });
  pushLog(`击败${state.battle.enemy.name}，${loc.name}路线已清。`);
  if (loc.event === "boss") {
    pushLog("西夏王帐一战成名，天龙群侠录暂告一段落。");
  }
  unlockNeighbors(loc.id);
  state.phase = "map";
  state.battle = null;
  state.turnLocked = false;
  render();
}

function loseBattle() {
  pushLog("队伍力竭，被路人救回无量客栈。");
  state.phase = "map";
  state.current = "inn";
  state.world = { x: 50, y: 80, facing: "down", frame: 0, step: 0, lastZone: null };
  state.battle = null;
  state.turnLocked = false;
  state.inventory.药 = Math.max(1, state.inventory.药);
  healParty(0.45);
  render();
}

function healParty(ratio = 1) {
  state.party.forEach((hero) => {
    hero.hp = Math.max(1, Math.round(hero.maxHp * ratio));
    hero.qi = Math.max(0, Math.round(hero.maxQi * ratio));
  });
}

function unlockNeighbors(id) {
  const loc = getLocation(id);
  if (!loc.links) return;
  loc.links.forEach((link) => state.unlocked.add(link));
}

function pushLog(message) {
  state.log.unshift(message);
}

function getLocation(id) {
  return locations.find((loc) => loc.id === id);
}

function restart() {
  state.phase = "starter";
  state.party = [];
  state.current = "inn";
  state.unlocked = new Set(["inn", "lake", "market"]);
  state.cleared = new Set(["inn"]);
  state.inventory = { 药: 3, 秘笈: 0 };
  state.reputation = 0;
  state.log = ["江湖风起，先选一位同行侠客。"];
  state.event = null;
  state.battle = null;
  state.turnLocked = false;
  state.world = { x: 50, y: 80, facing: "down", frame: 0, step: 0, lastZone: null };
  keys.clear();
  render();
}

function initControls() {
  if (controlsReady) return;
  controlsReady = true;
  document.addEventListener("keydown", (event) => {
    const key = normalizeKey(event.key);
    if ((event.key === "Enter" || event.key === " ") && state.event) {
      event.preventDefault();
      handleAction("event");
      return;
    }
    if (key && state.phase === "map" && !state.event) {
      keys.add(key);
      updateWorldMovement();
      event.preventDefault();
    }
  });
  document.addEventListener("keyup", (event) => {
    const key = normalizeKey(event.key);
    if (key) keys.delete(key);
  });
}

function normalizeKey(key) {
  const map = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right"
  };
  return map[key] || null;
}

function startWorldLoop() {
  stopWorldLoop();
  const token = ++worldLoopToken;
  const tick = () => {
    if (token !== worldLoopToken) return;
    updateWorldMovement();
    if (token === worldLoopToken) worldLoopId = requestAnimationFrame(tick);
  };
  worldLoopId = requestAnimationFrame(tick);
}

function stopWorldLoop() {
  worldLoopToken += 1;
  if (worldLoopId) cancelAnimationFrame(worldLoopId);
  worldLoopId = 0;
}

function updateWorldMovement() {
  if (state.phase !== "map" || state.event) return;
  let dx = 0;
  let dy = 0;
  if (keys.has("left")) dx -= 1;
  if (keys.has("right")) dx += 1;
  if (keys.has("up")) dy -= 1;
  if (keys.has("down")) dy += 1;
  if (!dx && !dy) return;

  const length = Math.hypot(dx, dy) || 1;
  const speed = 0.24;
  state.world.x = clamp(state.world.x + (dx / length) * speed, 8, 92);
  state.world.y = clamp(state.world.y + (dy / length) * speed, 15, 88);
  if (Math.abs(dx) > Math.abs(dy)) state.world.facing = dx > 0 ? "right" : "left";
  else state.world.facing = dy > 0 ? "down" : "up";
  state.world.step += 1;
  state.world.frame = Math.floor(state.world.step / 7) % 4;

  const player = document.querySelector(".world-player");
  if (player) {
    player.style.left = `${state.world.x}%`;
    player.style.top = `${state.world.y}%`;
    player.className = `world-player facing-${state.world.facing}`;
    const pos = getPlayerSpritePosition();
    player.style.setProperty("--sprite-x", pos.x);
    player.style.setProperty("--sprite-y", pos.y);
  }
  checkWorldZones();
}

function checkWorldZones() {
  const zone = locations.find((loc) => pointInZone(state.world.x, state.world.y, loc));
  if (!zone) {
    state.world.lastZone = null;
    return;
  }
  if (zone.id !== state.current) {
    state.current = zone.id;
    const place = document.querySelector("[data-world-place]");
    if (place) place.textContent = zone.name;
    const topPlace = document.querySelector("[data-top-place]");
    if (topPlace) topPlace.textContent = `当前：${zone.name}`;
  }
  if (state.cleared.has(zone.id) || state.world.lastZone === zone.id) return;
  state.world.lastZone = zone.id;
  triggerEvent(zone);
  pushLog(`抵达${zone.name}。`);
  render();
}

function pointInZone(x, y, zone) {
  return (
    x >= zone.x - zone.w / 2 &&
    x <= zone.x + zone.w / 2 &&
    y >= zone.y - zone.h / 2 &&
    y <= zone.y + zone.h / 2
  );
}

function playerStyle() {
  const pos = getPlayerSpritePosition();
  return `left:${state.world.x}%;top:${state.world.y}%;--sprite-x:${pos.x};--sprite-y:${pos.y}`;
}

function getPlayerSpritePosition() {
  const rows = { down: 0, left: 1, right: 2, up: 3 };
  const x = `${state.world.frame * 33.333333}%`;
  const y = `${(rows[state.world.facing] || 0) * 33.333333}%`;
  return { x, y };
}

function bar(value, max, type) {
  const pct = Math.max(0, Math.round((value / max) * 100));
  return `<div class="bar ${type}" title="${value}/${max}"><i style="--value:${pct}%"></i></div>`;
}

function stat(label, value, max) {
  return `
    <div class="stat-row">
      <span>${label}</span>
      <span class="stat-track"><i style="--value:${Math.round((value / max) * 100)}%"></i></span>
    </div>
  `;
}

function rollDamage(power, defense, min, max) {
  const roll = min + Math.random() * (max - min);
  return Math.max(4, Math.round((power - defense * 0.45) * roll));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sprite(unit) {
  const robe = unit.color || "#55b88d";
  const trim = unit.accent || "#d8a540";
  return `
    <svg viewBox="0 0 128 128" role="img" aria-label="${unit.name}">
      <defs>
        <linearGradient id="robe-${unit.id}" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${robe}" />
          <stop offset="1" stop-color="#1a2027" />
        </linearGradient>
      </defs>
      <ellipse cx="64" cy="111" rx="32" ry="8" fill="rgba(0,0,0,.28)" />
      <path d="M52 51h24l13 52H39L52 51Z" fill="url(#robe-${unit.id})" stroke="#201813" stroke-width="3" />
      <path d="M52 55 40 77l-12-7 15-24 9 9Zm24 0 12 22 12-7-15-24-9 9Z" fill="${robe}" stroke="#201813" stroke-width="3" />
      <path d="M50 77h28M45 93h38" stroke="${trim}" stroke-width="5" stroke-linecap="round" opacity=".9" />
      <circle cx="64" cy="35" r="18" fill="#f2c391" stroke="#201813" stroke-width="3" />
      <path d="M47 35c3-15 26-23 39-6-7-4-20-4-39 6Z" fill="#20222a" stroke="#201813" stroke-width="3" />
      <path d="M55 37h.1M73 37h.1" stroke="#201813" stroke-width="5" stroke-linecap="round" />
      <path d="M57 47c5 3 10 3 15 0" stroke="#7a3428" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M28 72 17 106" stroke="${trim}" stroke-width="5" stroke-linecap="round" />
      <path d="M101 68 113 102" stroke="${trim}" stroke-width="4" stroke-linecap="round" />
      <path d="M58 52 64 63l7-11" fill="none" stroke="${trim}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;
}

initControls();
render();
