import type { Feed } from "./socket";
import type { LiveStore } from "./store";
import type { Person, PersonObject, ServerMessage, Side, StatusCamera } from "./types";

/** Offline stand-in for Vision Expo: replays the message shapes from WEBSOCKET_API.md. Open with `?mock=1`. */

const CAMERAS = [
  { id: "camera_1", name: "Cổng chính", enabled: true },
  { id: "camera_2", name: "Sảnh", enabled: true },
];

const ZONE = { x0: 0.32, x1: 0.84, y0: 0.32, y1: 0.92 };

type Kit = { label: string; vi: string; category: string; alert?: boolean };

const KITS: Kit[][] = [
  [
    { label: "backpack", vi: "ba lô", category: "bags" },
    { label: "glasses", vi: "kính mắt", category: "face" },
  ],
  [
    { label: "cell phone", vi: "điện thoại", category: "devices" },
    { label: "handbag", vi: "túi xách", category: "bags" },
    { label: "watch", vi: "đồng hồ", category: "accessories" },
  ],
  [
    { label: "hat", vi: "nón", category: "headwear" },
    { label: "id badge", vi: "thẻ nhân viên", category: "accessories" },
    { label: "headphones", vi: "tai nghe", category: "accessories" },
    { label: "scarf", vi: "khăn", category: "accessories" },
    { label: "gloves", vi: "găng tay", category: "accessories" },
    { label: "belt", vi: "thắt lưng", category: "accessories" },
  ],
  [
    { label: "backpack", vi: "ba lô", category: "bags" },
    { label: "knife", vi: "dao", category: "weapons", alert: true },
  ],
];

interface Actor {
  cameraId: string;
  kit: Kit[];
  track: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  side: Side;
  firstSide: Side;
  entered: number | null;
  firstTs: number | null;
  frames: number;
  itemFrames: Record<string, number>;
  life: number;
  gap: number;
  alertAt: number;
  alerted: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const sideOf = (x: number, y: number): Side =>
  x >= ZONE.x0 && x <= ZONE.x1 && y >= ZONE.y0 && y <= ZONE.y1 ? "in" : "out";

export class MockFeed implements Feed {
  private timers: number[] = [];
  private actors: Actor[] = [];
  private nextTrack = 1;
  private t = 0;
  private last = 0;
  private entries = new Map<string, number>();
  private exits = new Map<string, number>();

  constructor(private store: LiveStore) {
    this.store.mock = true;
  }

  start() {
    this.stop();
    this.store.setConn({ state: "open" });
    this.entries.clear();
    this.exits.clear();
    for (const c of CAMERAS) {
      this.entries.set(c.id, 0);
      this.exits.set(c.id, 0);
    }
    this.actors = [
      this.spawn("camera_1", 0, 0),
      this.spawn("camera_1", 1, 2),
      this.spawn("camera_1", 3, 7),
      this.spawn("camera_2", 2, 1),
    ];
    this.last = performance.now();
    this.send({ type: "hello", client_id: 1, version: "1.0.0", server_time: Date.now() / 1000, cameras: CAMERAS });
    this.sendStatus();
    this.timers.push(
      window.setInterval(() => this.step(), 200),
      window.setInterval(() => this.sendStatus(), 500),
    );
  }

  stop() {
    for (const id of this.timers) window.clearInterval(id);
    this.timers = [];
    this.store.setConn({ state: "idle" });
  }

  private send(msg: ServerMessage) {
    this.store.ingest(msg);
  }

  private spawn(cameraId: string, kitIndex: number, delay: number): Actor {
    const edge = Math.random() < 0.5;
    const x = edge ? rand(0.05, 0.2) : rand(0.88, 0.95);
    const y = rand(0.45, 0.85);
    const side = sideOf(x, y);
    return {
      cameraId,
      kit: KITS[kitIndex],
      track: this.nextTrack++,
      x,
      y,
      tx: rand(0.15, 0.9),
      ty: rand(0.3, 0.9),
      speed: rand(0.07, 0.13),
      side,
      firstSide: side,
      entered: null,
      firstTs: null,
      frames: 0,
      itemFrames: {},
      life: rand(30, 55),
      gap: delay,
      alertAt: 2,
      alerted: false,
    };
  }

  private finishTrack(a: Actor, ts: number) {
    if (a.firstTs === null || a.frames < 5) return;
    const items: Record<string, number> = {};
    for (const [label, n] of Object.entries(a.itemFrames)) {
      if (n >= 3) items[label] = n;
    }
    this.send({
      type: "track",
      ts,
      camera_id: a.cameraId,
      track_id: a.track,
      first_ts: a.firstTs,
      last_ts: ts,
      duration: Math.round((ts - a.firstTs) * 10) / 10,
      frames: a.frames,
      items,
      alert: a.alerted,
      first_side: a.firstSide,
      last_side: a.side,
    });
  }

  private step() {
    const now = performance.now();
    const dt = Math.min(0.5, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    const ts = Date.now() / 1000;

    this.actors = this.actors.map((a, i) => {
      if (a.gap > 0) {
        a.gap -= dt;
        return a;
      }
      a.life -= dt;
      if (a.life <= 0) {
        this.finishTrack(a, ts);
        const kitIndex = KITS.indexOf(a.kit);
        return this.spawn(a.cameraId, kitIndex, rand(2, 6) + i * 0.1);
      }
      if (a.firstTs === null) {
        a.firstTs = ts;
        a.firstSide = a.side;
      }
      a.frames += 1;
      for (const k of a.kit) a.itemFrames[k.label] = (a.itemFrames[k.label] ?? 0) + 1;

      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.03) {
        a.tx = rand(0.1, 0.92);
        a.ty = rand(0.28, 0.92);
      } else {
        a.x += (dx / d) * a.speed * dt;
        a.y += (dy / d) * a.speed * dt;
      }
      const side = sideOf(a.x, a.y);
      if (side !== a.side) {
        if (side === "in") {
          a.entered = ts;
          this.entries.set(a.cameraId, (this.entries.get(a.cameraId) ?? 0) + 1);
          this.send({ type: "crossing", ts, camera_id: a.cameraId, track_id: a.track, direction: "in", mode: "zone" });
        } else {
          const dwell = a.entered ? ts - a.entered : undefined;
          this.exits.set(a.cameraId, (this.exits.get(a.cameraId) ?? 0) + 1);
          this.send({
            type: "crossing",
            ts,
            camera_id: a.cameraId,
            track_id: a.track,
            direction: "out",
            mode: "zone",
            ...(dwell !== undefined ? { dwell_s: Math.round(dwell * 10) / 10 } : {}),
          });
        }
        a.side = side;
      }
      a.alertAt -= dt;
      const weapons = a.kit.filter((k) => k.alert);
      if (weapons.length && a.alertAt <= 0) {
        a.alertAt = 30;
        a.alerted = true;
        this.send({
          type: "alert",
          ts,
          camera_id: a.cameraId,
          track_id: a.track,
          items: weapons.map((k) => k.label),
          all_items: a.kit.map((k) => k.label),
        });
      }
      return a;
    });

    this.send({
      type: "people",
      ts,
      cameras: CAMERAS.map((c) => ({
        id: c.id,
        frame_size: [1920, 1080] as [number, number],
        people: this.actors.filter((a) => a.cameraId === c.id && a.gap <= 0).map((a) => this.person(a)),
      })),
    });
  }

  private person(a: Actor): Person {
    const objects: PersonObject[] = a.kit.map((k, i) => ({
      label: k.label,
      vi: k.vi,
      category: k.category,
      conf: Math.round((0.7 + 0.2 * Math.abs(Math.sin(this.t * 0.7 + i))) * 100) / 100,
      alert: !!k.alert,
      box: [a.x - 0.03 + i * 0.01, a.y - 0.4 + i * 0.07, a.x + 0.03 + i * 0.01, a.y - 0.3 + i * 0.07],
    }));
    return {
      track_id: a.track,
      side: a.side,
      alert: objects.some((o) => o.alert),
      items: [...new Set(objects.map((o) => o.label))].sort(),
      objects,
      conf: 0.88,
      box: [a.x - 0.05, a.y - 0.55, a.x + 0.05, a.y],
      foot: [a.x, a.y],
    };
  }

  private sendStatus() {
    const ts = Date.now() / 1000;
    const cams: StatusCamera[] = CAMERAS.map((c) => {
      const here = this.actors.filter((a) => a.cameraId === c.id && a.gap <= 0);
      const objects: Record<string, number> = {};
      for (const a of here) for (const k of a.kit) objects[k.label] = (objects[k.label] ?? 0) + 1;
      return {
        id: c.id,
        name: c.name,
        status: "running",
        fps: 14.9,
        persons: here.length,
        inside: here.filter((a) => a.side === "in").length,
        outside: here.filter((a) => a.side === "out").length,
        mode: "zone",
        entries: this.entries.get(c.id) ?? 0,
        exits: this.exits.get(c.id) ?? 0,
        alerts: here.filter((a) => a.kit.some((k) => k.alert)).length,
        objects,
      };
    });
    const sum = (f: (c: StatusCamera) => number) => cams.reduce((n, c) => n + f(c), 0);
    this.send({
      type: "status",
      ts,
      totals: {
        persons: sum((c) => c.persons),
        inside: sum((c) => c.inside ?? 0),
        outside: sum((c) => c.outside ?? 0),
        entries: sum((c) => c.entries ?? 0),
        exits: sum((c) => c.exits ?? 0),
        objects: sum((c) => Object.values(c.objects ?? {}).reduce((a, b) => a + b, 0)),
        alerts: sum((c) => c.alerts),
      },
      cameras: cams,
    });
  }
}
