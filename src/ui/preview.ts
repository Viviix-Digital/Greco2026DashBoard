import { StreamPlayer, type StreamState } from "../live/stream";
import type { LiveStore } from "../live/store";

const STORAGE_ENABLED = "vision-expo-preview-on";
const STORAGE_MINI = "vision-expo-preview-mini";

function readBool(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === "1";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export interface PreviewDock {
  el: HTMLElement;
  /** Restart playback from the current store config + active camera. */
  sync(): void;
  destroy(): void;
}

/** Bottom-left MediaMTX mini preview dock. */
export function mountPreview(hud: HTMLElement, store: LiveStore): PreviewDock {
  const player = new StreamPlayer();
  let enabled = readBool(STORAGE_ENABLED, true);
  let mini = readBool(STORAGE_MINI, false);
  let lastUrl = "";

  const dock = document.createElement("div");
  dock.className = "preview-dock";
  dock.innerHTML = `
    <div class="preview-head">
      <span class="preview-badge" data-badge>OFF</span>
      <strong data-title>Camera</strong>
      <button type="button" class="preview-btn" data-act="toggle-mini" title="Thu nhỏ / mở rộng">▾</button>
      <button type="button" class="preview-btn" data-act="toggle-on" title="Bật / tắt preview">⏻</button>
    </div>
    <div class="preview-body" data-body></div>
    <div class="preview-foot" data-foot hidden></div>
  `;
  hud.append(dock);

  const body = dock.querySelector("[data-body]") as HTMLElement;
  const badge = dock.querySelector("[data-badge]") as HTMLElement;
  const title = dock.querySelector("[data-title]") as HTMLElement;
  const foot = dock.querySelector("[data-foot]") as HTMLElement;
  body.append(player.video);

  const applyChrome = (state: StreamState, error: string | null) => {
    dock.classList.toggle("mini", mini);
    dock.classList.toggle("off", !enabled);
    badge.dataset.state = !enabled ? "off" : state;
    badge.textContent = !enabled ? "OFF" : state === "live" ? "LIVE" : state === "connecting" ? "…" : state === "error" ? "ERR" : "OFF";
    const cam = store.activeCamera ? store.cameraName(store.activeCamera) : "—";
    title.textContent = cam;
    if (error && enabled) {
      foot.hidden = false;
      foot.textContent = error;
    } else {
      foot.hidden = true;
      foot.textContent = "";
    }
  };

  const unsubPlayer = player.subscribe(applyChrome);

  const sync = () => {
    applyChrome(player.getStatus().state, player.getStatus().error);
    if (!enabled) {
      player.stop();
      lastUrl = "";
      return;
    }
    const url = StreamPlayer.resolveUrl(store.config.streamUrl, store.activeCamera);
    if (!url) {
      player.stop();
      lastUrl = "";
      return;
    }
    if (url === lastUrl && player.getStatus().state === "live") return;
    lastUrl = url;
    void player.start(url);
  };

  dock.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "toggle-mini") {
      mini = !mini;
      writeBool(STORAGE_MINI, mini);
      applyChrome(player.getStatus().state, player.getStatus().error);
      return;
    }
    if (act === "toggle-on") {
      enabled = !enabled;
      writeBool(STORAGE_ENABLED, enabled);
      sync();
    }
  });

  let prevCam = store.activeCamera;
  let prevStream = store.config.streamUrl;
  const unsubStore = store.subscribe(() => {
    if (store.activeCamera !== prevCam || store.config.streamUrl !== prevStream) {
      prevCam = store.activeCamera;
      prevStream = store.config.streamUrl;
      lastUrl = "";
      sync();
    } else {
      applyChrome(player.getStatus().state, player.getStatus().error);
    }
  });

  sync();

  return {
    el: dock,
    sync,
    destroy() {
      unsubStore();
      unsubPlayer();
      player.stop();
      dock.remove();
    },
  };
}
