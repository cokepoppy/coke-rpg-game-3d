const ROWS = 4;
const COLS = 4;
const DIRECTIONS = ["down", "left", "right", "up"];

const state = {
  image: null,
  sourceName: "",
  normalized: null,
  frames: [],
  direction: "down",
  frame: 0,
  fps: 8,
  scale: 4
};

const previewCanvas = document.querySelector("#previewCanvas");
const previewCtx = previewCanvas.getContext("2d");
const sheetCanvas = document.querySelector("#sheetCanvas");
const sheetCtx = sheetCanvas.getContext("2d");
const logEl = document.querySelector("#pipelineLog");
const downloadLink = document.querySelector("#downloadLink");

document.querySelector("#loadExample").addEventListener("click", () => loadImage("./assets/hero-walk-sheet.png", "GPT Image 2 wuxia sheet"));
document.querySelector("#normalizeSheet").addEventListener("click", normalizeAndRender);
document.querySelector("#fps").addEventListener("input", (event) => {
  state.fps = Number(event.target.value);
});
document.querySelector("#scale").addEventListener("input", (event) => {
  state.scale = Number(event.target.value);
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
  });
});

function loadImage(src, name) {
  const image = new Image();
  image.onload = () => {
    state.image = image;
    state.sourceName = name;
    state.normalized = null;
    drawSheetPreview(image);
    analyzeSource(image);
    log(["载入 sheet。", "按 4x4 网格切分。", "等待执行脚底锚点对齐。"]);
  };
  image.src = src;
}

function analyzeSource(image) {
  const frames = extractFrameMeta(image);
  state.frames = frames;
  const metrics = measureDrift(frames);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  document.querySelector("#sourceMetric").textContent = `${width}×${height}`;
  document.querySelector("#xDrift").textContent = `${metrics.x}px`;
  document.querySelector("#yDrift").textContent = `${metrics.y}px`;
}

function normalizeAndRender() {
  if (!state.image) return;
  const cellW = Math.floor(state.image.naturalWidth / COLS);
  const cellH = Math.floor(state.image.naturalHeight / ROWS);
  const output = document.createElement("canvas");
  output.width = cellW * COLS;
  output.height = cellH * ROWS;
  const ctx = output.getContext("2d");
  ctx.clearRect(0, 0, output.width, output.height);

  const frames = extractFrameMeta(state.image);
  const byRow = groupByRow(frames);
  frames.forEach((frame) => {
    const rowFrames = byRow[frame.row];
    const targetCenter = Math.round(cellW / 2);
    const targetFoot = Math.max(...rowFrames.map((item) => item.bounds.bottom));
    const dx = Math.round(targetCenter - frame.bounds.centerX);
    const dy = Math.round(targetFoot - frame.bounds.bottom);
    ctx.drawImage(
      state.image,
      frame.sx,
      frame.sy,
      cellW,
      cellH,
      frame.col * cellW + dx,
      frame.row * cellH + dy,
      cellW,
      cellH
    );
  });

  state.normalized = output;
  drawSheetPreview(output);
  analyzeSource(output);
  downloadLink.href = output.toDataURL("image/png");
  log(["检测每帧透明像素包围盒。", "按每一行动作统一 bottom-center 脚底锚点。", "重新合成稳定 4x4 sheet。", "下载链接已更新。"]);
}

function extractFrameMeta(image) {
  const cellW = Math.floor(image.naturalWidth / COLS || image.width / COLS);
  const cellH = Math.floor(image.naturalHeight / ROWS || image.height / ROWS);
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
      frames.push({ row, col, sx, sy, bounds: findAlphaBounds(pixels, cellW, cellH) });
    }
  }
  return frames;
}

function findAlphaBounds(imageData, width, height) {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  const data = imageData.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (data[index + 3] < 24) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (left > right) return { left: 0, top: 0, right: width, bottom: height, centerX: width / 2 };
  return { left, top, right, bottom, centerX: Math.round((left + right) / 2) };
}

function groupByRow(frames) {
  return DIRECTIONS.map((_, row) => frames.filter((frame) => frame.row === row));
}

function measureDrift(frames) {
  let maxX = 0;
  let maxY = 0;
  groupByRow(frames).forEach((rowFrames) => {
    const xs = rowFrames.map((frame) => frame.bounds.centerX);
    const ys = rowFrames.map((frame) => frame.bounds.bottom);
    maxX = Math.max(maxX, Math.max(...xs) - Math.min(...xs));
    maxY = Math.max(maxY, Math.max(...ys) - Math.min(...ys));
  });
  return { x: Math.round(maxX), y: Math.round(maxY) };
}

function drawSheetPreview(image) {
  sheetCanvas.width = image.naturalWidth || image.width;
  sheetCanvas.height = image.naturalHeight || image.height;
  sheetCtx.clearRect(0, 0, sheetCanvas.width, sheetCanvas.height);
  sheetCtx.drawImage(image, 0, 0);
  sheetCtx.strokeStyle = "rgba(255,255,255,.45)";
  sheetCtx.lineWidth = Math.max(1, Math.round(sheetCanvas.width / 640));
  for (let x = 1; x < COLS; x += 1) {
    sheetCtx.beginPath();
    sheetCtx.moveTo((sheetCanvas.width / COLS) * x, 0);
    sheetCtx.lineTo((sheetCanvas.width / COLS) * x, sheetCanvas.height);
    sheetCtx.stroke();
  }
  for (let y = 1; y < ROWS; y += 1) {
    sheetCtx.beginPath();
    sheetCtx.moveTo(0, (sheetCanvas.height / ROWS) * y);
    sheetCtx.lineTo(sheetCanvas.width, (sheetCanvas.height / ROWS) * y);
    sheetCtx.stroke();
  }
}

function drawPreview() {
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.fillStyle = "#172319";
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.strokeStyle = "rgba(255,255,255,.08)";
  for (let i = 0; i <= previewCanvas.width; i += 24) {
    previewCtx.beginPath();
    previewCtx.moveTo(i, 0);
    previewCtx.lineTo(i, previewCanvas.height);
    previewCtx.stroke();
    previewCtx.beginPath();
    previewCtx.moveTo(0, i);
    previewCtx.lineTo(previewCanvas.width, i);
    previewCtx.stroke();
  }

  const source = state.normalized || state.image;
  if (!source) return;
  const cellW = Math.floor((source.naturalWidth || source.width) / COLS);
  const cellH = Math.floor((source.naturalHeight || source.height) / ROWS);
  const row = DIRECTIONS.indexOf(state.direction);
  const frame = state.frame % COLS;
  const scale = state.scale;
  const dw = Math.round(cellW * scale * 0.32);
  const dh = Math.round(cellH * scale * 0.32);
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(
    source,
    frame * cellW,
    row * cellH,
    cellW,
    cellH,
    Math.round((previewCanvas.width - dw) / 2),
    Math.round((previewCanvas.height - dh) / 2),
    dw,
    dh
  );
}

function log(items) {
  logEl.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

let last = 0;
function loop(now) {
  if (now - last > 1000 / state.fps) {
    state.frame = (state.frame + 1) % COLS;
    drawPreview();
    last = now;
  }
  requestAnimationFrame(loop);
}

loadImage("./assets/hero-walk-sheet.png", "GPT Image 2 wuxia sheet");
requestAnimationFrame(loop);
