class CutscenePlayer {
  constructor({ viewport, source, remoteSource, playbackDurationMs = 0, fallbackDelayMs = 2400, fallbackDurationMs = 4200, onEvent, onFallback, onFinish }) {
    this.viewport = viewport;
    this.source = source;
    this.remoteSource = remoteSource;
    this.playbackDurationMs = playbackDurationMs;
    this.fallbackDelayMs = fallbackDelayMs;
    this.fallbackDurationMs = fallbackDurationMs;
    this.onEvent = onEvent;
    this.onFallback = onFallback;
    this.onFinish = onFinish;
    this.active = false;
    this.finished = false;
    this.audit = {
      source,
      resolvedSource: null,
      sourceKind: null,
      started: false,
      playEvent: false,
      timeUpdates: 0,
      fallback: false,
      result: null,
      error: null
    };
    this.loggedFirstFrame = false;
    this.logManager = wx.getLogManager ? wx.getLogManager({ level: 0 }) : null;
  }

  play() {
    if (this.active) return;
    this.active = true;
    this.audit.started = true;
    const resolvedSource = this.stageNativeSource(this.resolveSource());
    this.audit.resolvedSource = resolvedSource;
    this.audit.sourceKind = /^https?:\/\//.test(resolvedSource) ? "remote" : "package";
    this.log("create", { source: this.source, resolvedSource, sourceKind: this.audit.sourceKind });
    this.video = wx.createVideo({
      x: 0,
      y: 54,
      width: this.viewport.width,
      height: this.viewport.height - 138,
      src: resolvedSource,
      autoplay: false,
      loop: false,
      muted: true,
      controls: false,
      objectFit: "contain",
      showCenterPlayBtn: false,
      backgroundColor: "#080806"
    });
    this.audit.videoCapabilities = {
      created: Boolean(this.video),
      play: typeof this.video?.play === "function",
      onPlay: typeof this.video?.onPlay === "function",
      onTimeUpdate: typeof this.video?.onTimeUpdate === "function",
      onError: typeof this.video?.onError === "function"
    };
    this.log("created", { source: this.audit.resolvedSource, videoCapabilities: this.audit.videoCapabilities });
    this.video.onPlay?.(() => {
      this.audit.playEvent = true;
      this.log("play", { source: this.audit.resolvedSource });
    });
    this.video.onTimeUpdate?.((event) => {
      this.markFrame(event?.type || "timeupdate");
    });
    this.video.onWaiting?.(() => {
      this.audit.waitingCount = (this.audit.waitingCount || 0) + 1;
      this.log("waiting", { source: this.audit.resolvedSource, waitingCount: this.audit.waitingCount }, "warn");
    });
    this.video.onEnded?.(() => this.finish("ended"));
    this.video.onError?.((error) => {
      this.audit.error = error?.errMsg || error?.message || "video playback failed";
      this.log("error", { source: this.audit.resolvedSource, error: this.audit.error, raw: error }, "warn");
      this.startFallback("error");
    });
    this.video.show?.();
    this.video.play?.();
    this.progressPoll = setInterval(() => {
      const currentTime = Number(this.video?.currentTime || 0);
      if (currentTime > 0 && currentTime !== this.lastPolledTime) {
        this.lastPolledTime = currentTime;
        this.markFrame("currentTime-poll");
      }
    }, 200);
    if (this.isDeveloperTools()) {
      this.audit.simulatorEventBridgeUnobservable = true;
      this.log("simulator-visual-window", { source: this.audit.resolvedSource, playbackDurationMs: this.playbackDurationMs });
      this.simulatorFinishTimer = setTimeout(() => this.finish("ended"), this.playbackDurationMs || 5200);
    } else {
      this.watchdog = setTimeout(() => {
        if (this.finished || !this.active || this.audit.timeUpdates > 0) return;
        this.audit.error = this.audit.playEvent ? "video did not emit time updates" : "video did not start";
        this.log("watchdog", { source: this.audit.resolvedSource, audit: this.audit }, "warn");
        this.startFallback("watchdog");
      }, this.fallbackDelayMs);
    }
  }

  skip() {
    this.finish("skipped");
  }

  resolveSource() {
    if (this.remoteSource && !wx.__assetBase) return this.remoteSource;
    return `${wx.__assetBase || ""}${this.source}`;
  }

  stageNativeSource(source) {
    if (wx.__assetBase || /^https?:\/\//.test(source)) return source;
    const userDataPath = wx.env?.USER_DATA_PATH;
    const fileSystem = wx.getFileSystemManager?.();
    if (!userDataPath || !fileSystem?.copyFileSync) return source;

    const filename = source.split("/").pop() || "cutscene.mp4";
    const stagedSource = `${userDataPath}/${filename}`;
    try {
      try {
        fileSystem.accessSync(stagedSource);
      } catch {
        fileSystem.copyFileSync(source, stagedSource);
      }
      return stagedSource;
    } catch (error) {
      this.log("stage-error", {
        source,
        stagedSource,
        error: error?.errMsg || error?.message || "failed to stage video"
      }, "warn");
      return source;
    }
  }

  startFallback(reason) {
    if (this.finished || !this.active || this.audit.fallback) return;
    this.audit.fallback = true;
    this.audit.fallbackReason = reason;
    this.log("fallback", { reason, audit: this.audit }, "warn");
    this.destroyVideo();
    this.onFallback?.(reason, { ...this.audit });
    this.fallbackTimer = setTimeout(() => this.finish("fallback"), this.fallbackDurationMs);
  }

  destroyVideo() {
    clearInterval(this.progressPoll);
    this.video?.stop?.();
    this.video?.hide?.();
    this.video?.destroy?.();
    this.video = null;
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    this.active = false;
    this.audit.result = result;
    this.log("finish", { result, audit: this.audit });
    clearTimeout(this.watchdog);
    clearTimeout(this.simulatorFinishTimer);
    clearTimeout(this.fallbackTimer);
    this.destroyVideo();
    this.onFinish?.(result, { ...this.audit });
  }

  markFrame(nativeEventType) {
    this.audit.timeUpdates += 1;
    if (this.loggedFirstFrame) return;
    this.loggedFirstFrame = true;
    this.log("first-frame", { source: this.audit.resolvedSource, nativeEventType });
  }

  isDeveloperTools() {
    try {
      return wx.getSystemInfoSync?.().platform === "devtools";
    } catch {
      return false;
    }
  }

  log(event, payload = {}, level = "info") {
    const data = { event, ...payload };
    this.onEvent?.(event, { ...this.audit, payload });
    if (level === "warn") {
      console.warn?.("[cutscene]", data);
      this.logManager?.warn?.("[cutscene]", data);
    } else {
      console.info?.("[cutscene]", data);
      this.logManager?.log?.("[cutscene]", data);
    }
  }
}

module.exports = { CutscenePlayer };
