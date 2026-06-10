const MUSIC_KEY = "coke-game-rpg-music-enabled";

export class AudioManager {
  constructor(trackUrl) {
    this.trackUrl = trackUrl;
    this.enabled = localStorage.getItem(MUSIC_KEY) !== "false";
    this.audio = new Audio(trackUrl);
    this.audio.loop = true;
    this.audio.volume = 0.34;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    localStorage.setItem(MUSIC_KEY, String(this.enabled));
    if (this.enabled) {
      this.play();
    } else {
      this.pause();
    }
  }

  async play() {
    if (!this.enabled) return;
    try {
      await this.audio.play();
    } catch {
      // Browsers may reject autoplay until the next direct user gesture.
    }
  }

  pause() {
    this.audio.pause();
  }
}
