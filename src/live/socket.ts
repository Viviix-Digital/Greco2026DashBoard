import { httpBase, wsUrl } from "./config";
import type { LiveStore } from "./store";
import type { FeedEvent, ServerMessage } from "./types";

const CLOSE_NOTES: Record<number, string> = {
  1008: "Sai token (1008)",
  1013: "WebSocket đang tắt trên server (1013)",
  1001: "Server đang khởi động lại (1001)",
};

/** Anything that pushes backend-shaped messages into the store. */
export interface Feed {
  start(): void;
  stop(): void;
}

/** Browser WebSocket client with 1, 2, 4… up to 30 second reconnect backoff. */
export class VisionSocket implements Feed {
  private ws: WebSocket | null = null;
  private retry = 1;
  private timer = 0;
  private tick = 0;
  private everOpen = false;
  private stopped = true;
  private backfillFrom = 0;

  constructor(private store: LiveStore) {}

  start() {
    this.stop();
    this.stopped = false;
    this.retry = 1;
    this.everOpen = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    window.clearTimeout(this.timer);
    window.clearInterval(this.tick);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null;
      ws.close();
    }
    this.store.setConn({ state: "idle" });
  }

  private connect() {
    window.clearTimeout(this.timer);
    window.clearInterval(this.tick);
    this.store.setConn({ state: "connecting" });
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl(this.store.config));
    } catch {
      this.store.setConn({ state: "closed", note: "Địa chỉ không hợp lệ" });
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 1;
      this.store.setConn({ state: "open" });
      if (this.everOpen && this.backfillFrom > 0) void this.backfill(this.backfillFrom);
      this.everOpen = true;
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== "string") return;
      try {
        this.store.ingest(JSON.parse(e.data) as ServerMessage);
      } catch {
        /* a malformed frame must not drop the connection */
      }
    };
    ws.onclose = (e) => {
      if (this.ws !== ws || this.stopped) return;
      this.ws = null;
      this.backfillFrom = this.store.lastTs;
      this.store.clearLive();
      this.scheduleRetry(e.code);
    };
    ws.onerror = () => {
      /* onclose follows and carries the retry logic */
    };
  }

  private scheduleRetry(code: number) {
    const wait = this.retry;
    this.retry = Math.min(this.retry * 2, 30);
    const note = CLOSE_NOTES[code] ?? (this.everOpen ? "Mất kết nối" : "Không kết nối được");
    let left = wait;
    this.store.setConn({ state: "retrying", code, retryIn: left, note });
    this.tick = window.setInterval(() => {
      left -= 1;
      if (left > 0) this.store.setConn({ state: "retrying", code, retryIn: left, note });
    }, 1000);
    this.timer = window.setTimeout(() => this.connect(), wait * 1000);
  }

  /** Events missed while offline come back through REST (section 6 of the API doc). */
  private async backfill(from: number) {
    const cfg = this.store.config;
    const q = new URLSearchParams({
      from: String(Math.floor(from)),
      to: String(Math.ceil(Date.now() / 1000) + 3600),
      types: "crossing,alert",
      limit: "50",
    });
    if (cfg.cameras.length === 1) q.set("camera_id", cfg.cameras[0]);
    try {
      const res = await fetch(`${httpBase(cfg)}/api/db/events?${q.toString()}`);
      if (!res.ok) return;
      const events = extractEvents(await res.json());
      if (events.length) this.store.ingestBackfill(events);
    } catch {
      /* REST may be unreachable (CORS or network): live data keeps flowing */
    }
  }
}

function extractEvents(body: unknown): FeedEvent[] {
  const list = Array.isArray(body)
    ? body
    : Array.isArray((body as { events?: unknown })?.events)
      ? (body as { events: unknown[] }).events
      : Array.isArray((body as { items?: unknown })?.items)
        ? (body as { items: unknown[] }).items
        : [];
  const out: FeedEvent[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const nested = [r.data, r.payload, r.json].find((v) => v && typeof v === "object") as
      | Record<string, unknown>
      | undefined;
    const e = { ...r, ...(nested ?? {}) } as Record<string, unknown>;
    if ((e.type === "crossing" || e.type === "alert") && typeof e.ts === "number" && typeof e.camera_id === "string") {
      out.push(e as unknown as FeedEvent);
    }
  }
  return out;
}
