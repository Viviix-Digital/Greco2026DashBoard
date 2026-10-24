import Hls from "hls.js";

export type StreamState = "idle" | "connecting" | "live" | "error";

export type StreamListener = (state: StreamState, error: string | null) => void;

const PLAY_TIMEOUT_MS = 8000;

/**
 * MediaMTX HLS player: try native video first, then hls.js (lowLatencyMode).
 * Mirrors room-occupancy-3d usePreviewVideo strategy without React.
 */
export class StreamPlayer {
  readonly video: HTMLVideoElement;
  private hls: Hls | null = null;
  private state: StreamState = "idle";
  private error: string | null = null;
  private url: string | null = null;
  private listeners = new Set<StreamListener>();
  private gen = 0;

  constructor() {
    const el = document.createElement("video");
    el.muted = true;
    el.playsInline = true;
    el.autoplay = true;
    el.setAttribute("playsinline", "true");
    el.setAttribute("muted", "");
    el.crossOrigin = "anonymous";
    el.className = "preview-video";
    this.video = el;
  }

  subscribe(fn: StreamListener) {
    this.listeners.add(fn);
    fn(this.state, this.error);
    return () => this.listeners.delete(fn);
  }

  getStatus() {
    return { state: this.state, error: this.error, url: this.url };
  }

  /** Resolve a template like `http://host:8888/{camera}/index.m3u8` with the active camera id. */
  static resolveUrl(template: string, cameraId: string | null) {
    const raw = template.trim();
    if (!raw) return "";
    if (!raw.includes("{camera}")) return raw;
    const cam = (cameraId || "cam1").replace(/^\/+|\/+$/g, "");
    return raw.replaceAll("{camera}", cam);
  }

  async start(url: string) {
    const trimmed = url.trim();
    if (!trimmed) {
      this.stop();
      this.set("error", "Chưa cấu hình URL stream");
      return;
    }
    if (trimmed === this.url && this.state === "live") return;

    const token = ++this.gen;
    this.stopInternal(false);
    this.url = trimmed;
    this.set("connecting", null);

    this.video.srcObject = null;
    this.video.src = trimmed;
    this.video.load();
    this.video.muted = true;

    try {
      await this.video.play();
      if (token !== this.gen) return;
      this.set("live", null);
      return;
    } catch {
      /* fall through to hls.js */
    }

    if (!Hls.isSupported()) {
      if (token !== this.gen) return;
      this.set("error", "Trình duyệt không phát được URL MediaMTX này");
      return;
    }

    try {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      this.hls = hls;
      hls.loadSource(trimmed);
      hls.attachMedia(this.video);
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("HLS timeout")), PLAY_TIMEOUT_MS);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          window.clearTimeout(timeout);
          resolve();
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            window.clearTimeout(timeout);
            reject(new Error(data.details || "HLS fatal error"));
          }
        });
      });
      if (token !== this.gen) return;
      await this.video.play().catch(() => undefined);
      if (token !== this.gen) return;
      this.set("live", null);
    } catch (err) {
      if (token !== this.gen) return;
      const message = err instanceof Error ? err.message : "HLS playback failed";
      this.set("error", `${message} — không phát được stream MediaMTX`);
    }
  }

  stop() {
    this.gen += 1;
    this.stopInternal(true);
  }

  private stopInternal(resetUrl: boolean) {
    this.hls?.destroy();
    this.hls = null;
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.srcObject = null;
    this.video.load();
    if (resetUrl) this.url = null;
    this.set("idle", null);
  }

  private set(state: StreamState, error: string | null) {
    this.state = state;
    this.error = error;
    for (const fn of this.listeners) fn(state, error);
  }
}
