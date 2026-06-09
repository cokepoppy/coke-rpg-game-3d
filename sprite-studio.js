const ROWS = 4;
const COLS = 4;
const DIRECTIONS = ["down", "left", "right", "up"];

const state = {
  image: null,
  sourceName: "",
  frames: [],
  direction: "down",
  frame: 0,
  fps: 8,
  scale: 5,
  showBody: true,
  showAll: true,
  showResidue: true,
  showFoot: true,
  showAnchor: true,
  anchor: null
};

const previewCanvas = document.querySelector("#previewCanvas");
const previewCtx = previewCanvas.getContext("2d");
const frameCanvas = document.querySelector("#frameCanvas");
const frameCtx = frameCanvas.getContext("2d");
const sheetCanvas = document.querySelector("#sheetCanvas");
const sheetCtx = sheetCanvas.getContext("2d");
const logEl = document.querySelector("#pipelineLog");

document.querySelector("#fps").addEventListener("input", (event) => {
  state.fps = Number(event.target.value);
});
document.querySelector("#scale").addEventListener("input", (event) => {
  state.scale = Number(event.target.value);
  renderAll();
});
for (const id of ["showBody", "showAll", "showResidue", "showFoot", "showAnchor"]) {
  document.querySelector(`#${id}`).addEventListener("change", (event) => {
    state[id] = event.target.checked;
    renderAll();
  });
}
document.querySelector("#prevFrame").addEventListener("click", () => {
  state.frame = (state.frame + COLS - 1) % COLS;
  renderAll();
});
document.querySelector("#nextFrame").addEventListener("click", () => {
  state.frame = (state.frame + 1) % COLS;
  renderAll();
});
document.querySelector("#fileInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  loadImage(URL.createObjectURL(file), file.name);
});
document.querySelectorAll("[data-dir]").forEach((button) => {
  button.addEventListener("click", () => {
    state.direction = button.dataset.dir;
    document.querySelectorAll("[data-dir]").forEach((item) => item.classList.toggle("active", item === button));
    renderAll();
  });
});
document.querySelectorAll("[data-src]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-src]").forEach((item) => item.classList.toggle("active", item === button));
    loadImage(button.dataset.src, button.dataset.name);
  });
});

function loadImage(src, name) {
  const image = new Image();
  image.onload = () => {
    state.image = image;
    state.sourceName = name;
    state.frames = extractFrameMeta(image);
    state.anchor = measureAnchor(state.frames);
    updateMetrics(image);
    renderAll();
    log([
      `载入 ${name}。`,
      "按 4x4 行走帧网格切分。",
      "用 alpha 连通域区分人物主体和残留像素。",
      "检查四方向播放、单帧包围盒、脚底锚点和残留块。"
    ]);
  };
  image.src = src;
}

function extractFrameMeta(image) {
  const cellW = Math.floor((image.naturalWidth || image.width) / COLS);
  const cellH = Math.floor((image.naturalHeight || image.height) / ROWS);
  const scratch = document.createElement("canvas");
  scratch.width = cellW;
  scratch.height = cellH;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  const frames = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const sx = col * cellW;
      const sy = row * cellH;
      ctx.clearRect(0, 0, cellW, cellH);
      ctx.drawImage(image, sx, sy, cellW, cellH, 0, 0, cellW, cellH);
      const pixels = ctx.getImageData(0, 0, cellW, cellH);
      const components = findComponents(pixels, cellW, cellH).filter((component) => component.count >= 40);
      components.sort((a, b) => b.count - a.count);
      const body = components[0] || emptyBounds(cellW, cellH);
      const residue = components.slice(1);
      const all = mergeBounds(components, cellW, cellH);
      const anchor = footAnchor(pixels, cellW, cellH, body);
      const centroid = centroidOf(pixels, cellW, cellH, body);
      frames.push({ row, col, sx, sy, cellW, cellH, body, all, anchor, centroid, residue, residuePixels: residue.reduce((sum, item) => sum + item.count, 0) });
    }
  }
  return frames;
}

function findComponents(imageData, width, height) {
  const seen = new Uint8Array(width * height);
  const components = [];
  const data = imageData.data;
  const key = (x, y) => y * width + x;
  const alpha = (x, y) => data[(y * width + x) * 4 + 3];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = key(x, y);
      if (seen[start] || alpha(x, y) < 24) continue;
      const queue = [[x, y]];
      let cursor = 0;
      let left = x;
      let right = x;
      let top = y;
      let bottom = y;
      let count = 0;
      seen[start] = 1;
      while (cursor < queue.length) {
        const [px, py] = queue[cursor];
        cursor += 1;
        count += 1;
        left = Math.min(left, px);
        right = Math.max(right, px);
        top = Math.min(top, py);
        bottom = Math.max(bottom, py);
        for (const [nx, ny] of [
          [px + 1, py],
          [px - 1, py],
          [px, py + 1],
          [px, py - 1]
        ]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = key(nx, ny);
          if (seen[next] || alpha(nx, ny) < 24) continue;
          seen[next] = 1;
          queue.push([nx, ny]);
        }
      }
      components.push({ count, left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, centerX: Math.round((left + right) / 2) });
    }
  }
  return components;
}

function updateMetrics(image) {
  const cellW = Math.floor((image.naturalWidth || image.width) / COLS);
  const cellH = Math.floor((image.naturalHeight || image.height) / ROWS);
  const residue = state.frames.reduce((sum, frame) => sum + frame.residuePixels, 0);
  const drift = measureDrift(state.frames);
  const maxX = Math.max(...drift.map((row) => row.xDrift));
  const maxFoot = Math.max(...drift.map((row) => row.footDrift));
  const anchor = state.anchor;
  document.querySelector("#sourceMetric").textContent = `${image.naturalWidth || image.width}×${image.naturalHeight || image.height}`;
  document.querySelector("#cellMetric").textContent = `${cellW}×${cellH}`;
  document.querySelector("#residueMetric").textContent = `${residue}px`;
  document.querySelector("#driftMetric").textContent = `X ${maxX}px / Foot ${maxFoot}px`;
  document.querySelector("#anchorMetric").textContent = anchor ? `${anchor.pass ? "PASS" : "FAIL"} X ${anchor.global.anchorXDrift}px / Y ${anchor.global.anchorYDrift}px` : "-";
}

function measureDrift(frames) {
  return DIRECTIONS.map((_, row) => {
    const rowFrames = frames.filter((frame) => frame.row === row);
    const xs = rowFrames.map((frame) => frame.body.centerX);
    const ys = rowFrames.map((frame) => frame.body.bottom);
    return {
      row,
      xDrift: Math.max(...xs) - Math.min(...xs),
      footDrift: Math.max(...ys) - Math.min(...ys)
    };
  });
}

function measureAnchor(frames) {
  if (!frames.length) return null;
  const global = {
    anchorXDrift: range(frames.map((frame) => frame.anchor.x)),
    anchorYDrift: range(frames.map((frame) => frame.anchor.y)),
    centroidXDrift: range(frames.map((frame) => frame.centroid.x))
  };
  const target = {
    x: Math.round(frames[0].cellW / 2),
    y: Math.max(...frames.map((frame) => frame.anchor.y))
  };
  return {
    target,
    global,
    pass: global.anchorXDrift <= 2 && global.anchorYDrift <= 2
  };
}

function renderAll() {
  drawPreview();
  drawFrameInspector();
  drawSheetPreview();
}

function drawPreview() {
  drawChecker(previewCtx, previewCanvas.width, previewCanvas.height, 24);
  const frame = selectedFrame();
  if (!state.image || !frame) return;
  const size = Math.round(Math.max(frame.cellW, frame.cellH) * state.scale * 0.38);
  const x = Math.round((previewCanvas.width - size) / 2);
  const y = Math.round((previewCanvas.height - size) / 2);
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(state.image, frame.sx, frame.sy, frame.cellW, frame.cellH, x, y, size, size);
  drawOverlay(previewCtx, frame, x, y, size / frame.cellW);
}

function drawFrameInspector() {
  drawChecker(frameCtx, frameCanvas.width, frameCanvas.height, 16);
  const frame = selectedFrame();
  if (!state.image || !frame) return;
  const scale = Math.min(frameCanvas.width / frame.cellW, frameCanvas.height / frame.cellH) * 0.92;
  const x = Math.round((frameCanvas.width - frame.cellW * scale) / 2);
  const y = Math.round((frameCanvas.height - frame.cellH * scale) / 2);
  frameCtx.imageSmoothingEnabled = false;
  frameCtx.drawImage(state.image, frame.sx, frame.sy, frame.cellW, frame.cellH, x, y, Math.round(frame.cellW * scale), Math.round(frame.cellH * scale));
  drawOverlay(frameCtx, frame, x, y, scale);
  document.querySelector("#frameLabel").textContent = `${DIRECTIONS[frame.row]} ${frame.col}`;
  document.querySelector("#frameReport").innerHTML = `
    <b>${DIRECTIONS[frame.row]} frame ${frame.col}</b>
    <span>主体：${frame.body.width}×${frame.body.height}, bottom ${frame.body.bottom}</span>
    <span>脚底锚点：${frame.anchor.x}, ${frame.anchor.y}</span>
    <span>质心：${frame.centroid.x}, ${frame.centroid.y}</span>
    <span>原始框：${frame.all.width}×${frame.all.height}, bottom ${frame.all.bottom}</span>
    <span>残留像素：${frame.residuePixels}</span>
    <span>残留块：${frame.residue.length}</span>
  `;
}

function drawSheetPreview() {
  if (!state.image) return;
  sheetCanvas.width = state.image.naturalWidth || state.image.width;
  sheetCanvas.height = state.image.naturalHeight || state.image.height;
  sheetCtx.clearRect(0, 0, sheetCanvas.width, sheetCanvas.height);
  sheetCtx.drawImage(state.image, 0, 0);
  sheetCtx.lineWidth = Math.max(1, Math.round(sheetCanvas.width / 800));
  state.frames.forEach((frame) => {
    const x = frame.sx;
    const y = frame.sy;
    if (state.showAll) strokeRect(sheetCtx, x + frame.all.left, y + frame.all.top, frame.all.width, frame.all.height, "#d85a40");
    if (state.showBody) strokeRect(sheetCtx, x + frame.body.left, y + frame.body.top, frame.body.width, frame.body.height, "#6fca9f");
    if (state.showAnchor) drawAnchor(sheetCtx, frame, x, y, 1);
    if (state.showResidue) {
      for (const residue of frame.residue) fillRect(sheetCtx, x + residue.left, y + residue.top, residue.width, residue.height, "rgba(255,0,80,.45)");
    }
  });
}

function drawOverlay(ctx, frame, x, y, scale) {
  if (state.showResidue) for (const residue of frame.residue) fillRect(ctx, x + residue.left * scale, y + residue.top * scale, residue.width * scale, residue.height * scale, "rgba(255,0,80,.45)");
  if (state.showAll) strokeRect(ctx, x + frame.all.left * scale, y + frame.all.top * scale, frame.all.width * scale, frame.all.height * scale, "#d85a40");
  if (state.showBody) strokeRect(ctx, x + frame.body.left * scale, y + frame.body.top * scale, frame.body.width * scale, frame.body.height * scale, "#6fca9f");
  if (state.showAnchor) drawAnchor(ctx, frame, x, y, scale);
  if (state.showFoot) {
    ctx.strokeStyle = "#e2b55d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + frame.body.left * scale, y + (frame.body.bottom + 1) * scale);
    ctx.lineTo(x + (frame.body.right + 1) * scale, y + (frame.body.bottom + 1) * scale);
    ctx.stroke();
  }
}

function drawAnchor(ctx, frame, x, y, scale) {
  const target = state.anchor?.target || { x: Math.round(frame.cellW / 2), y: frame.anchor.y };
  const tx = x + target.x * scale;
  const ty = y + target.y * scale;
  const ax = x + frame.anchor.x * scale;
  const ay = y + frame.anchor.y * scale;
  ctx.save();
  ctx.lineWidth = Math.max(1, Math.round(scale * 0.55));
  ctx.strokeStyle = "#58d68d";
  ctx.beginPath();
  ctx.moveTo(tx, y);
  ctx.lineTo(tx, y + frame.cellH * scale);
  ctx.stroke();
  ctx.strokeStyle = "#f5c542";
  ctx.beginPath();
  ctx.moveTo(x, ty);
  ctx.lineTo(x + frame.cellW * scale, ty);
  ctx.stroke();
  ctx.strokeStyle = "#ff4f6d";
  ctx.beginPath();
  ctx.arc(ax, ay, Math.max(3, scale * 1.25), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function footAnchor(imageData, width, height, body) {
  const band = 14;
  const xs = [];
  const data = imageData.data;
  const startY = Math.max(body.top, body.bottom - band + 1);
  for (let y = startY; y <= body.bottom; y += 1) {
    for (let x = body.left; x <= body.right; x += 1) {
      if (data[(y * width + x) * 4 + 3] >= 24) xs.push(x);
    }
  }
  if (!xs.length) return { x: body.centerX, y: body.bottom };
  xs.sort((a, b) => a - b);
  return { x: Math.round(median(xs)), y: body.bottom };
}

function centroidOf(imageData, width, height, body) {
  const data = imageData.data;
  let count = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = body.top; y <= body.bottom; y += 1) {
    for (let x = body.left; x <= body.right; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 24) continue;
      count += 1;
      sumX += x;
      sumY += y;
    }
  }
  if (!count) return { x: body.centerX, y: Math.round((body.top + body.bottom) / 2) };
  return { x: Math.round(sumX / count), y: Math.round(sumY / count) };
}

function selectedFrame() {
  const row = DIRECTIONS.indexOf(state.direction);
  return state.frames.find((frame) => frame.row === row && frame.col === state.frame);
}

function drawChecker(ctx, width, height, cell) {
  ctx.clearRect(0, 0, width, height);
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      ctx.fillStyle = (x / cell + y / cell) % 2 === 0 ? "#182018" : "#101410";
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

function strokeRect(ctx, x, y, width, height, color) {
  ctx.strokeStyle = color;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
}

function fillRect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
}

function mergeBounds(components, width, height) {
  if (!components.length) return emptyBounds(width, height);
  const left = Math.min(...components.map((component) => component.left));
  const top = Math.min(...components.map((component) => component.top));
  const right = Math.max(...components.map((component) => component.right));
  const bottom = Math.max(...components.map((component) => component.bottom));
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, centerX: Math.round((left + right) / 2) };
}

function emptyBounds(width, height) {
  return { count: 0, left: 0, top: 0, right: width - 1, bottom: height - 1, width, height, centerX: Math.round(width / 2) };
}

function range(values) {
  return Math.max(...values) - Math.min(...values);
}

function median(values) {
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
}

function log(items) {
  logEl.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

let last = 0;
function loop(now) {
  if (now - last > 1000 / state.fps) {
    state.frame = (state.frame + 1) % COLS;
    renderAll();
    last = now;
  }
  requestAnimationFrame(loop);
}

loadImage("./assets/hero-walk-sheet-anchored.png", "Anchored hero sheet");
requestAnimationFrame(loop);
