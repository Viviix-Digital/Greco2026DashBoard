import type { LiveConfig } from "./config";
import type {
  CameraInfo,
  ConnInfo,
  FeedEvent,
  PeopleCamera,
  Person,
  PersonView,
  ServerMessage,
  StatusCamera,
  StatusTotals,
} from "./types";

const MAX_FEED = 40;

export interface CameraStats {
  persons: number;
  inside: number | null;
  outside: number | null;
  objects: number;
  alerts: number;
  status: string;
  fps: number | null;
}

/** Latest state pushed by the backend. Message `people` is a full frame, never a delta. */
export class LiveStore {
  conn: ConnInfo = { state: "idle" };
  cameras: CameraInfo[] = [];
  activeCamera: string | null = null;
  selected: string | null = null;
  feed: FeedEvent[] = [];
  /** Bumps on every `people` message or camera switch so the 3D stage knows to re-read. */
  peopleVersion = 0;
  /** Largest server `ts` seen, used to backfill events after a reconnect. */
  lastTs = 0;
  mock = false;
  lastError: string | null = null;

  private totals: StatusTotals | null = null;
  private statusCams = new Map<string, StatusCamera>();
  private frames = new Map<string, { frameSize: [number, number]; people: PersonView[] }>();
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
    this.feed = [];
    this.seen.clear();
    this.lastTs = 0;
    this.lastError = null;
    this.peopleVersion += 1;
    this.emit();
  }

  /** Drop the live frame (connection lost) but keep cameras and the event feed. */
  clearLive() {
    this.frames.clear();
    this.statusCams.clear();
    this.totals = null;
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
        break;
      case "people":
        this.applyPeople(msg.cameras ?? []);
        break;
      case "crossing":
      case "alert":
      case "camera":
      case "reset":
        this.pushEvent(msg);
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

  cameraName(id: string) {
    return this.cameras.find((c) => c.id === id)?.name ?? id;
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
      };
    }
    const t = this.totals;
    if (t && !this.activeCamera) {
      return { ...t, status: "running", fps: null, inside: t.inside ?? null, outside: t.outside ?? null };
    }
    return {
      persons: people.length,
      inside: null,
      outside: null,
      objects: people.reduce((n, p) => n + p.objects.length, 0),
      alerts: people.filter((p) => p.alert).length,
      status: this.conn.state === "open" ? "running" : "offline",
      fps: null,
    };
  }

  private applyPeople(cams: PeopleCamera[]) {
    this.frames.clear();
    for (const cam of cams) {
      const people = (cam.people ?? []).map((p, index) => this.normalise(cam.id, p, index));
      this.frames.set(cam.id, { frameSize: cam.frame_size ?? [1920, 1080], people });
    }
    if (!this.userPicked && (!this.activeCamera || !this.frames.has(this.activeCamera))) {
      const first = cams[0]?.id;
      if (first) this.activeCamera = first;
    }
    this.peopleVersion += 1;
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
