const canvas = document.querySelector("#game");
const listeners = { start: [], move: [], end: [], cancel: [] };
const storage = new Map();

window.__cangshanLoading?.set("准备浏览器调试环境", "初始化触摸、音频和视频模拟器。", 0.08);

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
  getLogManager: () => ({ log: (...args) => console.log(...args), warn: (...args) => console.warn(...args) }),
  loadSubpackage: ({ success }) => { queueMicrotask(() => success && success()); return { onProgressUpdate() {} }; },
  createInnerAudioContext: () => {
    const audio = new Audio();
    return {
      set src(value) { audio.src = value; },
      set loop(value) { audio.loop = value; },
      set volume(value) { audio.volume = value; },
      set obeyMuteSwitch(_value) {},
      play: () => audio.play().catch(() => {}),
      pause: () => audio.pause(),
      stop: () => { audio.pause(); audio.currentTime = 0; },
      seek: (time) => { audio.currentTime = time; },
      onPlay: (handler) => audio.addEventListener("play", handler),
      onError: (handler) => audio.addEventListener("error", () => handler({ errMsg: "browser audio error" }))
    };
  },
  createVideo: (options) => createBrowserVideo(options)
};

function createBrowserVideo(options) {
  const video = document.createElement("video");
  video.dataset.wechatVideo = "true";
  video.src = options.src;
  video.autoplay = Boolean(options.autoplay);
  video.loop = Boolean(options.loop);
  video.muted = Boolean(options.muted);
  video.controls = Boolean(options.controls);
  video.playsInline = true;
  video.style.position = "fixed";
  video.style.zIndex = "10";
  video.style.objectFit = options.objectFit || "contain";
  video.style.background = options.backgroundColor || "#000";
  const place = () => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    video.style.left = `${rect.left + options.x * scaleX}px`;
    video.style.top = `${rect.top + options.y * scaleY}px`;
    video.style.width = `${options.width * scaleX}px`;
    video.style.height = `${options.height * scaleY}px`;
  };
  place();
  window.addEventListener("resize", place);
  document.body.appendChild(video);
  return {
    play: () => video.play().catch(() => {}),
    pause: () => video.pause(),
    stop: () => { video.pause(); video.currentTime = 0; },
    show: () => { video.style.display = "block"; },
    hide: () => { video.style.display = "none"; },
    destroy: () => { window.removeEventListener("resize", place); video.remove(); },
    onEnded: (handler) => video.addEventListener("ended", handler, { once: true }),
    onPlay: (handler) => video.addEventListener("play", handler),
    onTimeUpdate: (handler) => video.addEventListener("timeupdate", handler),
    onWaiting: (handler) => video.addEventListener("waiting", handler),
    onError: (handler) => video.addEventListener("error", () => handler({ errMsg: "browser video error" }), { once: true })
  };
}
