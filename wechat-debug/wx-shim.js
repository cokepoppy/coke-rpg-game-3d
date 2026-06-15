const canvas = document.querySelector("#game");
const listeners = { start: [], move: [], end: [], cancel: [] };
const storage = new Map();

function eventFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return { changedTouches: [{ identifier: event.pointerId || 0, clientX: event.clientX - rect.left, clientY: event.clientY - rect.top }] };
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  listeners.start.forEach((handler) => handler(eventFromPointer(event)));
});
canvas.addEventListener("pointermove", (event) => {
  if (event.buttons) listeners.move.forEach((handler) => handler(eventFromPointer(event)));
});
canvas.addEventListener("pointerup", (event) => listeners.end.forEach((handler) => handler(eventFromPointer(event))));
canvas.addEventListener("pointercancel", (event) => listeners.cancel.forEach((handler) => handler(eventFromPointer(event))));

window.wx = {
  __assetBase: "../wechat-minigame/",
  createCanvas: () => canvas,
  createImage: () => new Image(),
  getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 844, screenWidth: 390, screenHeight: 844, pixelRatio: Math.min(2, window.devicePixelRatio || 1), safeArea: { top: 0, bottom: 844 } }),
  getMenuButtonBoundingClientRect: () => ({ top: 10, right: 378, bottom: 44, left: 292, width: 86, height: 34 }),
  onTouchStart: (handler) => listeners.start.push(handler),
  onTouchMove: (handler) => listeners.move.push(handler),
  onTouchEnd: (handler) => listeners.end.push(handler),
  onTouchCancel: (handler) => listeners.cancel.push(handler),
  getStorageSync: (key) => storage.get(key) || "",
  setStorageSync: (key, value) => storage.set(key, value),
  loadSubpackage: ({ success }) => { queueMicrotask(() => success && success()); return { onProgressUpdate() {} }; },
  createInnerAudioContext: () => {
    const audio = new Audio();
    return {
      set src(value) { audio.src = value; },
      set loop(value) { audio.loop = value; },
      set volume(value) { audio.volume = value; },
      play: () => audio.play().catch(() => {}),
      pause: () => audio.pause(),
      stop: () => { audio.pause(); audio.currentTime = 0; }
    };
  }
};
