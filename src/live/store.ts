import type { LiveConfig } from "./config";
import type {
  CameraInfo,
  CompletedVisit,
  ConnInfo,
  CrossingMsg,
  FeedEvent,
  LivePersonSession,
  PeopleCamera,
  Person,
  PersonView,
  ServerMessage,
  Side,
  StatusCamera,
  StatusTotals,
  TrackMsg,
} from "./types";

const MAX_FEED = 100;
const MAX_VISITS = 200;
const MAX_OCCUPANCY = 120;
/** Sample live occupancy at most this often (seconds). */
const OCCUPANCY_SAMPLE_S = 15;
/** Keep pending dwell_s briefly so a later `track` can join it. */
const DWELL_JOIN_WINDOW_S = 30;
/** Drop live sessions that have not appeared in people for this long (matches server track delay). */
const SESSION_STALE_S = 4;

export interface CameraStats {
  persons: number;
  inside: number | null;
  outside: number | null;
  objects: number;
  alerts: number;
  status: string;
  fps: number | null;
  entries: number | null;
  exits: number | null;
}

export interface OccupancySample {
  ts: number;
  persons: number;
  inside: number;
}

interface PendingDwell {
  cameraId: string;
  trackId: number;
  dwellS: number;
  ts: number;
}

/** Latest state pushed by the backend. Message `people` is a full frame, never a delta. */
export class LiveStore {
  conn: ConnInfo = { state: "idle" };
  cameras: CameraInfo[] = [];
  activeCamera: string | null = null;
  selected: string | null = null;
  feed: FeedEvent[] = [];
  /** Recent completed visibility visits (newest last). */
  visits: CompletedVisit[] = [];
  /** Bumps on every `people` message or camera switch so the 3D stage knows to re-read. */
  peopleVersion = 0;
  /** Largest server `ts` seen, used to backfill events after a reconnect. */
  lastTs = 0;
  mock = false;
  lastError: string | null = null;
  /** Client_now_s − server_time; add to Date.now()/1000 for server-aligned clocks. */
  clockOffset = 0;

  private totals: StatusTotals | null = null;
  private statusCams = new Map<string, StatusCamera>();
  private frames = new Map<string, { frameSize: [number, number]; people: PersonView[] }>();
  private sessions = new Map<string, LivePersonSession>();
  private pendingDwells: PendingDwell[] = [];
  private occupancy: OccupancySample[] = [];
  private lastOccupancySample = 0;
  private userPicked = false;
  private seen = new Set<string>();
  private viByLabel = new Map<string, string>();
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(e: FeedEvent) => void>();

  constructor(public config: LiveConfig) {}

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onEvent(fn: (e: FeedEvent) => void) {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  setConn(info: ConnInfo) {
    this.conn = info;
    this.emit();
  }

  setConfig(config: LiveConfig) {
    this.config = config;
    this.emit();
  }

  /** Forget everything tied to one connection (called when settings change). */
  clear() {
    this.cameras = [];
    this.activeCamera = null;
    this.userPicked = false;
    this.selected = null;
    this.totals = null;
    this.statusCams.clear();
    this.frames.clear();
    this.sessions.clear();
    this.pendingDwells = [];
    this.visits = [];
    this.feed = [];
    this.occupancy = [];
    this.lastOccupancySample = 0;
    this.seen.clear();
    this.lastTs = 0;
    this.lastError = null;
    this.clockOffset = 0;
    this.peopleVersion += 1;
    this.emit();
  }

  /** Drop the live frame (connection lost) but keep cameras and the event feed. */
  clearLive() {
    this.frames.clear();
    this.statusCams.clear();
    this.totals = null;
    this.sessions.clear();
    this.peopleVersion += 1;
    this.emit();
  }

  selectCamera(id: string) {
    if (this.activeCamera === id) return;
    this.activeCamera = id;
    this.userPicked = true;
    this.selected = null;
    this.peopleVersion += 1;
    this.emit();
  }

  select(key: string | null) {
    this.selected = this.selected === key ? null : key;
    this.emit();
  }

  ingest(msg: ServerMessage) {
    if (typeof (msg as { ts?: unknown }).ts === "number") {
      this.lastTs = Math.max(this.lastTs, (msg as { ts: number }).ts);
    }
    switch (msg.type) {
      case "hello":
        this.cameras = Array.isArray(msg.cameras) ? msg.cameras : [];
        if (typeof msg.server_time === "number") {
          this.clockOffset = msg.server_time - Date.now() / 1000;
        }
        if (!this.activeCamera || !this.cameras.some((c) => c.id === this.activeCamera)) {
          const first = this.cameras.find((c) => c.enabled) ?? this.cameras[0];
          if (first && !this.userPicked) this.activeCamera = first.id;
        }
        this.peopleVersion += 1;
        break;
      case "status":
        if (msg.totals) this.totals = msg.totals;
        if (Array.isArray(msg.cameras)) {
          this.statusCams.clear();
          for (const c of msg.cameras) this.statusCams.set(c.id, c);
        }
        this.sampleOccupancy(typeof msg.ts === "number" ? msg.ts : this.now());
        break;
      case "people":
        this.applyPeople(msg.cameras ?? [], typeof msg.ts === "number" ? msg.ts : this.now());
        break;
      case "crossing":
        this.applyCrossing(msg);
        this.pushEvent(msg);
        break;
      case "alert":
        this.applyAlert(msg.camera_id, msg.track_id, msg.ts);
        this.pushEvent(msg);
        break;
      case "camera":
      case "reset":
        this.pushEvent(msg);
        break;
      case "track":
        this.applyTrack(msg);
        break;
      case "error":
        this.lastError = msg.error;
        break;
      default:
        return;
    }
    this.emit();
  }

  /** Events fetched from REST after a reconnect: add the ones not already shown. */
  ingestBackfill(events: FeedEvent[]) {
    const fresh = [...events].sort((a, b) => a.ts - b.ts);
    let added = false;
    for (const e of fresh) {
      if (e.type === "crossing") this.applyCrossing(e);
      if (e.type === "alert") this.applyAlert(e.camera_id, e.track_id, e.ts);
      if (this.pushEvent(e, false)) added = true;
    }
    if (added) this.emit();
  }

  people(): PersonView[] {
    return (this.activeCamera && this.frames.get(this.activeCamera)?.people) || [];
  }

  frameSize(): [number, number] {
    return (this.activeCamera && this.frames.get(this.activeCamera)?.frameSize) || [1920, 1080];
  }

  selectedPerson() {
    if (!this.selected) return null;
    return this.people().find((p) => p.key === this.selected) ?? null;
  }

  session(key: string): LivePersonSession | undefined {
    return this.sessions.get(key);
  }

  /** Visits for the active camera (newest first). */
  recentVisits(limit = 12): CompletedVisit[] {
    const cam = this.activeCamera;
    const list = cam ? this.visits.filter((v) => v.cameraId === cam) : this.visits;
    return [...list].reverse().slice(0, limit);
  }

  cameraName(id: string) {
    return this.cameras.find((c) => c.id === id)?.name ?? id;
  }

  /** Server-aligned unix seconds. */
  now() {
    return Date.now() / 1000 + this.clockOffset;
  }

  /** Elapsed seconds a live person has been continuously visible. */
  visibleElapsed(key: string, at = this.now()): number | null {
    const s = this.sessions.get(key);
    if (!s || s.trackId === null) return null;
    return Math.max(0, at - s.firstSeenTs);
  }

  /** Elapsed seconds currently inside the zone (null if not in / no enter). */
  zoneElapsed(key: string, at = this.now()): number | null {
    const s = this.sessions.get(key);
    if (!s || s.trackId === null || s.lastSide !== "in" || s.zoneEnterTs === null) return null;
    return Math.max(0, at - s.zoneEnterTs);
  }

  /** Preferred chip duration: zone if inside, else visible. */
  primaryElapsed(key: string, side: Side, at = this.now()): number | null {
    if (side === "in") {
      const z = this.zoneElapsed(key, at);
      if (z !== null) return z;
    }
    return this.visibleElapsed(key, at);
  }

  /** Session ring of persons/inside for the sparkline chart. */
  occupancySamples(): OccupancySample[] {
    return this.occupancy;
  }

  stats(): CameraStats {
    const people = this.people();
    const cam = this.activeCamera ? this.statusCams.get(this.activeCamera) : undefined;
    if (cam) {
      const objects = cam.objects ? Object.values(cam.objects).reduce((a, b) => a + b, 0) : 0;
      return {
        persons: cam.persons,
        inside: cam.inside,
        outside: cam.outside,
        objects,
        alerts: cam.alerts,
        status: cam.status,
        fps: cam.fps ?? null,
        entries: cam.entries ?? null,
        exits: cam.exits ?? null,
      };
    }
    const t = this.totals;
    if (t && !this.activeCamera) {
      return {
        ...t,
        status: "running",
        fps: null,
        inside: t.inside ?? null,
        outside: t.outside ?? null,
        entries: t.entries ?? null,
        exits: t.exits ?? null,
      };
    }
    return {
      persons: people.length,
      inside: null,
      outside: null,
      objects: people.reduce((n, p) => n + p.objects.length, 0),
      alerts: people.filter((p) => p.alert).length,
      status: this.conn.state === "open" ? "running" : "offline",
      fps: null,
      entries: null,
      exits: null,
    };
  }

  private sampleOccupancy(ts: number) {
    if (ts - this.lastOccupancySample < OCCUPANCY_SAMPLE_S) return;
    this.lastOccupancySample = ts;
    const s = this.stats();
    this.occupancy.push({
      ts,
      persons: s.persons,
      inside: s.inside ?? 0,
    });
    if (this.occupancy.length > MAX_OCCUPANCY) {
      this.occupancy.splice(0, this.occupancy.length - MAX_OCCUPANCY);
    }
  }

  private applyPeople(cams: PeopleCamera[], ts: number) {
    this.frames.clear();
    const liveKeys = new Set<string>();
    for (const cam of cams) {
      const people = (cam.people ?? []).map((p, index) => this.normalise(cam.id, p, index));
      this.frames.set(cam.id, { frameSize: cam.frame_size ?? [1920, 1080], people });
      for (const p of people) {
        liveKeys.add(p.key);
        this.touchSession(p, ts);
      }
    }
    for (const [key, s] of this.sessions) {
      if (liveKeys.has(key)) continue;
      if (ts - s.lastSeenTs > SESSION_STALE_S) this.sessions.delete(key);
    }
    if (!this.userPicked && (!this.activeCamera || !this.frames.has(this.activeCamera))) {
      const first = cams[0]?.id;
      if (first) this.activeCamera = first;
    }
    this.peopleVersion += 1;
  }

  private touchSession(p: PersonView, ts: number) {
    if (p.track_id === null || p.track_id === undefined) return;
    const existing = this.sessions.get(p.key);
    if (!existing) {
      const inZone = p.side === "in";
      this.sessions.set(p.key, {
        key: p.key,
        cameraId: p.cameraId,
        trackId: p.track_id,
        firstSeenTs: ts,
        lastSeenTs: ts,
        zoneEnterTs: inZone ? ts : null,
        zoneEstimated: inZone,
        lastSide: p.side,
        sideSinceTs: ts,
        lastDwellS: null,
        alertTs: p.alert ? ts : null,
      });
      return;
    }
    existing.lastSeenTs = ts;
    if (p.side !== existing.lastSide) {
      existing.lastSide = p.side;
      existing.sideSinceTs = ts;
      if (p.side === "in" && existing.zoneEnterTs === null) {
        existing.zoneEnterTs = ts;
        existing.zoneEstimated = true;
      }
      if (p.side === "out") {
        existing.zoneEnterTs = null;
        existing.zoneEstimated = false;
      }
    }
    if (p.alert && existing.alertTs === null) existing.alertTs = ts;
  }

  private applyCrossing(e: CrossingMsg) {
    if (e.track_id === null || e.track_id === undefined) return;
    const key = `${e.camera_id}:${e.track_id}`;
    const s = this.sessions.get(key);
    if (e.direction === "in") {
      if (s) {
        s.zoneEnterTs = e.ts;
        s.zoneEstimated = false;
        s.lastSide = "in";
        s.sideSinceTs = e.ts;
      }
      return;
    }
    if (typeof e.dwell_s === "number") {
      if (s) {
        s.lastDwellS = e.dwell_s;
        s.zoneEnterTs = null;
        s.zoneEstimated = false;
        s.lastSide = "out";
        s.sideSinceTs = e.ts;
      }
      this.pendingDwells.push({
        cameraId: e.camera_id,
        trackId: e.track_id,
        dwellS: e.dwell_s,
        ts: e.ts,
      });
      this.trimPendingDwells(e.ts);
      // Patch a visit that arrived before the crossing out (unlikely but safe).
      for (let i = this.visits.length - 1; i >= 0; i--) {
        const v = this.visits[i];
        if (v.cameraId !== e.camera_id || v.trackId !== e.track_id) continue;
        if (Math.abs(v.lastTs - e.ts) > DWELL_JOIN_WINDOW_S) continue;
        if (v.dwellS === undefined) v.dwellS = e.dwell_s;
        break;
      }
    }
  }

  private applyAlert(cameraId: string, trackId: number | null, ts: number) {
    if (trackId === null || trackId === undefined) return;
    const s = this.sessions.get(`${cameraId}:${trackId}`);
    if (s && s.alertTs === null) s.alertTs = ts;
  }

  private applyTrack(msg: TrackMsg) {
    const firstTs = msg.first_ts ?? (typeof msg.duration === "number" ? msg.ts - msg.duration : msg.ts);
    const lastTs = msg.last_ts ?? msg.ts;
    const duration = msg.duration ?? Math.max(0, lastTs - firstTs);
    const trackId = msg.track_id ?? null;
    const dwell = this.takePendingDwell(msg.camera_id, trackId, lastTs);
    const visit: CompletedVisit = {
      id: `${msg.camera_id}|${trackId ?? "?"}|${firstTs}|${lastTs}`,
      cameraId: msg.camera_id,
      trackId,
      firstTs,
      lastTs,
      duration,
      firstSide: msg.first_side,
      lastSide: msg.last_side,
      items: msg.items ?? {},
      frames: msg.frames,
      alert: !!msg.alert,
      ...(dwell !== undefined ? { dwellS: dwell } : {}),
    };
    if (!this.visits.some((v) => v.id === visit.id)) {
      this.visits.push(visit);
      if (this.visits.length > MAX_VISITS) this.visits.splice(0, this.visits.length - MAX_VISITS);
    }
    if (trackId !== null) this.sessions.delete(`${msg.camera_id}:${trackId}`);
  }

  private takePendingDwell(cameraId: string, trackId: number | null, at: number): number | undefined {
    if (trackId === null) return undefined;
    this.trimPendingDwells(at);
    const idx = this.pendingDwells.findIndex((d) => d.cameraId === cameraId && d.trackId === trackId);
    if (idx < 0) return undefined;
    const [d] = this.pendingDwells.splice(idx, 1);
    return d.dwellS;
  }

  private trimPendingDwells(at: number) {
    this.pendingDwells = this.pendingDwells.filter((d) => at - d.ts <= DWELL_JOIN_WINDOW_S);
  }

  /** Vietnamese name for an English label, learned from `people` (alert events only carry labels). */
  viOf(label: string) {
    return this.viByLabel.get(label) ?? label;
  }

  private normalise(cameraId: string, p: Person, index: number): PersonView {
    const objects = Array.isArray(p.objects) ? p.objects : [];
    for (const o of objects) if (o.label && o.vi) this.viByLabel.set(o.label, o.vi);
    const box = p.box;
    const foot: [number, number] | undefined =
      p.foot ?? (box ? [(box[0] + box[2]) / 2, box[3]] : undefined);
    const track = p.track_id;
    return {
      ...p,
      objects,
      items: Array.isArray(p.items) ? p.items : objects.map((o) => o.label),
      side: p.side === "in" || p.side === "out" ? p.side : "unknown",
      alert: !!p.alert || objects.some((o) => o.alert),
      foot,
      key: track === null || track === undefined ? `${cameraId}:anon:${index}` : `${cameraId}:${track}`,
      cameraId,
      index,
    };
  }

  private pushEvent(e: FeedEvent, notify = true) {
    const key = `${e.type}|${e.ts}|${e.camera_id}|${(e as { track_id?: unknown }).track_id ?? ""}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    if (this.seen.size > 400) {
      const keep = [...this.seen].slice(-200);
      this.seen = new Set(keep);
    }
    this.feed.push(e);
    this.feed.sort((a, b) => a.ts - b.ts);
    if (this.feed.length > MAX_FEED) this.feed.splice(0, this.feed.length - MAX_FEED);
    if (notify) for (const fn of this.eventListeners) fn(e);
    return true;
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }
}
