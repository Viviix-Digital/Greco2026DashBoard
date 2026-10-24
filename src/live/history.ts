import { httpBase, type LiveConfig } from "./config";
import type { CompletedVisit, FeedEvent } from "./types";

export type HistoryRange = "today" | "24h" | "7d";

export interface HourlyBucket {
  hour: number;
  /** Unix seconds start of the hour, if provided by the API. */
  ts?: number;
  entries: number;
  exits: number;
  persons?: number;
  alerts?: number;
  label: string;
}

export interface TopItem {
  label: string;
  count: number;
  vi?: string;
}

export interface HistoryQuery {
  from: number;
  to: number;
  cameraId?: string | null;
  limit?: number;
  offset?: number;
}

export function rangeWindow(range: HistoryRange, now = Date.now() / 1000): { from: number; to: number } {
  const to = Math.ceil(now) + 60;
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return { from: Math.floor(d.getTime() / 1000), to };
  }
  if (range === "24h") return { from: Math.floor(now - 86400), to };
  return { from: Math.floor(now - 7 * 86400), to };
}

function asList(body: unknown, keys: string[]): unknown[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  const o = body as Record<string, unknown>;
  for (const k of keys) {
    if (Array.isArray(o[k])) return o[k] as unknown[];
  }
  return [];
}

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

export async function fetchHourly(config: LiveConfig, q: HistoryQuery): Promise<HourlyBucket[]> {
  const params = new URLSearchParams({
    from: String(Math.floor(q.from)),
    to: String(Math.ceil(q.to)),
  });
  if (q.cameraId) params.set("camera_id", q.cameraId);
  const res = await fetch(`${httpBase(config)}/api/db/hourly?${params}`);
  if (!res.ok) throw new Error(`hourly HTTP ${res.status}`);
  const body = await res.json();
  const list = asList(body, ["hourly", "items", "buckets", "data"]);
  return list.map((raw, i) => {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const hour = num(r.hour ?? r.h ?? r.hour_of_day, i);
    const ts = r.ts != null ? num(r.ts) : r.start != null ? num(r.start) : undefined;
    const label =
      ts != null
        ? new Date(ts * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })
        : `${String(hour).padStart(2, "0")}:00`;
    return {
      hour,
      ts,
      entries: num(r.entries ?? r.ins ?? r.in),
      exits: num(r.exits ?? r.outs ?? r.out),
      persons: r.persons != null ? num(r.persons) : undefined,
      alerts: r.alerts != null ? num(r.alerts) : undefined,
      label,
    };
  });
}

export async function fetchTopItems(config: LiveConfig, q: HistoryQuery): Promise<TopItem[]> {
  const params = new URLSearchParams({
    from: String(Math.floor(q.from)),
    to: String(Math.ceil(q.to)),
  });
  if (q.cameraId) params.set("camera_id", q.cameraId);
  if (q.limit) params.set("limit", String(q.limit));
  const res = await fetch(`${httpBase(config)}/api/db/top_items?${params}`);
  if (!res.ok) throw new Error(`top_items HTTP ${res.status}`);
  const body = await res.json();
  const list = asList(body, ["items", "top_items", "data"]);
  return list
    .map((raw) => {
      const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      return {
        label: str(r.label ?? r.item ?? r.name ?? r.key, "?"),
        count: num(r.count ?? r.n ?? r.total),
        vi: typeof r.vi === "string" ? r.vi : undefined,
      };
    })
    .filter((x) => x.label !== "?")
    .sort((a, b) => b.count - a.count);
}

export async function fetchEvents(config: LiveConfig, q: HistoryQuery): Promise<FeedEvent[]> {
  const params = new URLSearchParams({
    from: String(Math.floor(q.from)),
    to: String(Math.ceil(q.to)),
    types: "crossing,alert,camera,reset",
    limit: String(q.limit ?? 100),
    offset: String(q.offset ?? 0),
  });
  if (q.cameraId) params.set("camera_id", q.cameraId);
  const res = await fetch(`${httpBase(config)}/api/db/events?${params}`);
  if (!res.ok) throw new Error(`events HTTP ${res.status}`);
  const body = await res.json();
  const list = asList(body, ["events", "items", "data"]);
  const out: FeedEvent[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const nested = [r.data, r.payload, r.json].find((v) => v && typeof v === "object") as
      | Record<string, unknown>
      | undefined;
    const e = { ...r, ...(nested ?? {}) } as Record<string, unknown>;
    if (
      (e.type === "crossing" || e.type === "alert" || e.type === "camera" || e.type === "reset") &&
      typeof e.ts === "number" &&
      typeof e.camera_id === "string"
    ) {
      out.push(e as unknown as FeedEvent);
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

export async function fetchTracks(config: LiveConfig, q: HistoryQuery): Promise<CompletedVisit[]> {
  const params = new URLSearchParams({
    from: String(Math.floor(q.from)),
    to: String(Math.ceil(q.to)),
  });
  if (q.cameraId) params.set("camera_id", q.cameraId);
  if (q.limit) params.set("limit", String(q.limit));
  if (q.offset) params.set("offset", String(q.offset));
  const res = await fetch(`${httpBase(config)}/api/db/tracks?${params}`);
  if (!res.ok) throw new Error(`tracks HTTP ${res.status}`);
  const body = await res.json();
  const list = asList(body, ["tracks", "items", "data"]);
  const out: CompletedVisit[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const cameraId = str(r.camera_id ?? r.cameraId);
    if (!cameraId) continue;
    const firstTs = num(r.first_ts ?? r.firstTs ?? (typeof r.duration === "number" ? num(r.ts) - num(r.duration) : r.ts));
    const lastTs = num(r.last_ts ?? r.lastTs ?? r.ts, firstTs);
    const trackId = r.track_id == null && r.trackId == null ? null : num(r.track_id ?? r.trackId);
    const items =
      r.items && typeof r.items === "object" && !Array.isArray(r.items)
        ? (r.items as Record<string, number>)
        : {};
    out.push({
      id: str(r.id, `${cameraId}|${trackId ?? "?"}|${firstTs}|${lastTs}`),
      cameraId,
      trackId: trackId === null || Number.isNaN(trackId) ? null : trackId,
      firstTs,
      lastTs,
      duration: num(r.duration, Math.max(0, lastTs - firstTs)),
      firstSide: (r.first_side as CompletedVisit["firstSide"]) ?? undefined,
      lastSide: (r.last_side as CompletedVisit["lastSide"]) ?? undefined,
      items,
      frames: r.frames != null ? num(r.frames) : undefined,
      alert: !!(r.alert ?? r.had_alert),
      dwellS: r.dwell_s != null ? num(r.dwell_s) : r.dwellS != null ? num(r.dwellS) : undefined,
    });
  }
  return out.sort((a, b) => b.lastTs - a.lastTs);
}
