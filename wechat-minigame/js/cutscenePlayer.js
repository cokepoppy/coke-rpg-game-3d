class CutscenePlayer {
  constructor({ viewport, source, remoteSource, fallbackDelayMs = 2400, fallbackDurationMs = 4200, onFallback, onFinish }) {
    this.viewport = viewport;
    this.source = source;
    this.remoteSource = remoteSource;
    this.fallbackDelayMs = fallbackDelayMs;
    this.fallbackDurationMs = fallbackDurationMs;
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
  }

  play() {
    if (this.active) return;
    this.active = true;
    this.audit.started = true;
    const resolvedSource = this.resolveSource();
    this.audit.resolvedSource = resolvedSource;
    this.audit.sourceKind = /^https?:\/\//.test(resolvedSource) ? "remote" : "package";
    console.info?.("[cutscene] create video", { source: this.source, resolvedSource, sourceKind: this.audit.sourceKind });
    this.video = wx.createVideo({
      x: 0,
      y: 54,
      width: this.viewport.width,
      height: this.viewport.height - 138,
      src: resolvedSource,
      autoplay: true,
      loop: false,
      muted: false,
      controls: false,
      objectFit: "contain",
      showCenterPlayBtn: false,
      backgroundColor: "#080806"
    });
    this.video.onPlay?.(() => {
      this.audit.playEvent = true;
      console.info?.("[cutscene] video play", { source: this.audit.resolvedSource });
    });
    this.video.onTimeUpdate?.((event) => {
      this.audit.timeUpdates += 1;
      if (!this.loggedFirstFrame) {
        this.loggedFirstFrame = true;
        console.info?.("[cutscene] first video frame", { source: this.audit.resolvedSource, event });
      }
    });
    this.video.onWaiting?.(() => {
      this.audit.waitingCount = (this.audit.waitingCount || 0) + 1;
      console.warn?.("[cutscene] video waiting", { source: this.audit.resolvedSource, waitingCount: this.audit.waitingCount });
    });
    this.video.onEnded?.(() => this.finish("ended"));
    this.video.onError?.((error) => {
      this.audit.error = error?.errMsg || error?.message || "video playback failed";
      console.warn?.("[cutscene] video error", { source: this.audit.resolvedSource, error: this.audit.error, raw: error });
      this.startFallback("error");
    });
    this.video.show?.();
    this.video.play?.();
    this.watchdog = setTimeout(() => {
      if (this.finished || !this.active || this.audit.timeUpdates > 0) return;
      this.audit.error = this.audit.playEvent ? "video did not emit time updates" : "video did not start";
      console.warn?.("[cutscene] video watchdog fallback", { source: this.audit.resolvedSource, audit: this.audit });
      this.startFallback("watchdog");
    }, this.fallbackDelayMs);
  }

  skip() {
    this.finish("skipped");
  }

  resolveSource() {
    if (this.remoteSource && !wx.__assetBase) return this.remoteSource;
    return `${wx.__assetBase || ""}${this.source}`;
  }

  startFallback(reason) {
    if (this.finished || !this.active || this.audit.fallback) return;
    this.audit.fallback = true;
    this.audit.fallbackReason = reason;
    console.warn?.("[cutscene] fallback storyboard", { reason, audit: this.audit });
    this.destroyVideo();
    this.onFallback?.(reason, { ...this.audit });
    this.fallbackTimer = setTimeout(() => this.finish("fallback"), this.fallbackDurationMs);
  }

  destroyVideo() {
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
    clearTimeout(this.watchdog);
    clearTimeout(this.fallbackTimer);
    this.destroyVideo();
    this.onFinish?.(result, { ...this.audit });
  }
}

module.exports = { CutscenePlayer };
