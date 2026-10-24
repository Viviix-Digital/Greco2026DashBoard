export interface LiveConfig {
  host: string;
  port: number;
  token: string;
  /** Camera ids to receive. Empty = every camera. */
  cameras: string[];
  /**
   * MediaMTX HLS URL template. `{camera}` is replaced with the active camera id.
   * Example: `http://127.0.0.1:8888/{camera}/index.m3u8`
   */
  streamUrl: string;
}

const STORAGE_KEY = "vision-expo-config";
const DEFAULT_STREAM = "http://127.0.0.1:8888/{camera}/index.m3u8";

const env = import.meta.env;

export function defaultConfig(): LiveConfig {
  return {
    host: String(env.VITE_VISION_HOST || "127.0.0.1"),
    port: Number(env.VITE_VISION_PORT) || 8000,
    token: String(env.VITE_VISION_TOKEN || ""),
    cameras: splitList(String(env.VITE_VISION_CAMERAS || "")),
    streamUrl: String(env.VITE_STREAM_URL || DEFAULT_STREAM),
  };
}

/** `.env` defaults, overridden by values saved from the Settings panel. */
export function loadConfig(): LiveConfig {
  const base = defaultConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<LiveConfig>;
    return {
      host: typeof saved.host === "string" && saved.host.trim() ? saved.host.trim() : base.host,
      port: Number(saved.port) > 0 ? Number(saved.port) : base.port,
      token: typeof saved.token === "string" ? saved.token : base.token,
      cameras: Array.isArray(saved.cameras) ? saved.cameras.filter(Boolean) : base.cameras,
      streamUrl:
        typeof saved.streamUrl === "string" && saved.streamUrl.trim()
          ? saved.streamUrl.trim()
          : base.streamUrl,
    };
  } catch {
    return base;
  }
}

export function saveConfig(config: LiveConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* storage unavailable: the config lives for this session only */
  }
}

export function splitList(text: string) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function wsUrl(config: LiveConfig) {
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const q = new URLSearchParams({ topics: "status,people,events,tracks" });
  if (config.cameras.length) q.set("cameras", config.cameras.join(","));
  if (config.token) q.set("token", config.token);
  return `${scheme}://${config.host}:${config.port}/ws?${q.toString()}`;
}

export function httpBase(config: LiveConfig) {
  const scheme = location.protocol === "https:" ? "https" : "http";
  return `${scheme}://${config.host}:${config.port}`;
}
