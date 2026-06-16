function systemInfo() {
  const info = wx.getSystemInfoSync();
  const width = info.windowWidth || info.screenWidth || 390;
  const height = info.windowHeight || info.screenHeight || 844;
  const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
  return { width, height, dpr: info.pixelRatio || 1, safeArea: info.safeArea || { top: 0, bottom: height }, menuButton };
}

function createSurface() {
  const canvas = wx.createCanvas();
  const viewport = systemInfo();
  canvas.width = Math.round(viewport.width * viewport.dpr);
  canvas.height = Math.round(viewport.height * viewport.dpr);
  if (canvas.style) {
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
  }
  const context = canvas.getContext("2d");
  context.scale(viewport.dpr, viewport.dpr);
  context.imageSmoothingEnabled = false;
  return { canvas, context, viewport };
}

function loadImage(canvas, source) {
  return new Promise((resolve, reject) => {
    const image = canvas.createImage ? canvas.createImage() : wx.createImage();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `${wx.__assetBase || ""}${source}`;
  });
}

function createAudio(source) {
  const audio = wx.createInnerAudioContext();
  audio.src = `${wx.__assetBase || ""}${source}`;
  audio.loop = true;
  audio.volume = 0.38;
  audio.audit = { source, playCount: 0, pauseCount: 0 };
  const play = audio.play.bind(audio);
  const pause = audio.pause.bind(audio);
  audio.play = () => {
    audio.audit.playCount += 1;
    return play();
  };
  audio.pause = () => {
    audio.audit.pauseCount += 1;
    return pause();
  };
  return audio;
}

function createSfx(source) {
  const audio = wx.createInnerAudioContext();
  audio.src = `${wx.__assetBase || ""}${source}`;
  audio.loop = false;
  audio.volume = 0.72;
  return {
    audit: { source, playCount: 0 },
    play() {
      this.audit.playCount += 1;
      if (audio.stop) audio.stop();
      audio.play();
    }
  };
}

function loadAssetPacks() {
  if (!wx.loadSubpackage) return Promise.resolve();
  const load = (name) => new Promise((resolve, reject) => wx.loadSubpackage({ name, success: resolve, fail: reject }));
  return Promise.all([load("worldWestPack"), load("worldEastPack"), load("worldMapPack"), load("roomPack"), load("characterPack"), load("audioPack"), load("battlePack")]);
}

function readSave(key) {
  try { return wx.getStorageSync(key) || null; } catch { return null; }
}

function writeSave(key, value) {
  try { wx.setStorageSync(key, value); } catch (error) { console.warn("Save failed", error); }
}

module.exports = { createSurface, loadImage, createAudio, createSfx, loadAssetPacks, readSave, writeSave };
