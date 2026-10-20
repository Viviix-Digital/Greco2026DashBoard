import { ROOM } from "../../theme";
import type { Env, Obstacle } from "./player";

export interface Pt {
  x: number;
  z: number;
}

const CELL = 0.1;
const NX = Math.ceil(ROOM.w / CELL);
const NZ = Math.ceil(ROOM.d / CELL);
const SQRT2 = Math.SQRT2;

export const BOUNDS = { minX: 0.32, minZ: 0.32, maxX: ROOM.w - 0.25, maxZ: ROOM.d - 0.25 };

function distToShape(o: Obstacle, x: number, z: number) {
  const dx = x - o.x;
  const dz = z - o.z;
  if (o.round) return Math.hypot(dx, dz) - Math.max(o.hw, o.hd);
  const c = Math.cos(o.rot);
  const s = Math.sin(o.rot);
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  const ex = Math.abs(lx) - o.hw;
  const ez = Math.abs(lz) - o.hd;
  if (ex <= 0 && ez <= 0) return Math.max(ex, ez);
  return Math.hypot(Math.max(ex, 0), Math.max(ez, 0));
}

/** True when a body of radius `r` at (x, z) overlaps furniture or leaves the floor. */
export function blockedAt(env: Env, x: number, z: number, r: number) {
  if (x < BOUNDS.minX || z < BOUNDS.minZ || x > BOUNDS.maxX || z > BOUNDS.maxZ) return true;
  for (const o of env.obstacles) if (distToShape(o, x, z) < r) return true;
  return false;
}

function segmentFree(env: Env, a: Pt, b: Pt, r: number) {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const n = Math.max(1, Math.ceil(len / 0.04));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (blockedAt(env, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, r)) return false;
  }
  return true;
}

class Heap {
  private a: number[] = [];
  constructor(private key: Float32Array) {}
  get size() {
    return this.a.length;
  }
  push(v: number) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.key[a[p]] <= this.key[a[i]]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop() as number;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.key[a[l]] < this.key[a[m]]) m = l;
        if (r < a.length && this.key[a[r]] < this.key[a[m]]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

const cellOf = (x: number, z: number) => {
  const cx = Math.min(NX - 1, Math.max(0, Math.floor(x / CELL)));
  const cz = Math.min(NZ - 1, Math.max(0, Math.floor(z / CELL)));
  return cz * NX + cx;
};
const centerOf = (i: number): Pt => ({ x: ((i % NX) + 0.5) * CELL, z: (Math.floor(i / NX) + 0.5) * CELL });

/**
 * Grid A* around furniture, then line-of-sight smoothing.
 * The first waypoint is the start, the last is the goal (nudged to the nearest free cell when needed).
 */
export function planPath(env: Env, start: Pt, goal: Pt, radius: number): Pt[] | null {
  const infl = radius + 0.01;
  const blocked = new Uint8Array(NX * NZ);
  for (let i = 0; i < blocked.length; i++) {
    const c = centerOf(i);
    blocked[i] = blockedAt(env, c.x, c.z, infl) ? 1 : 0;
  }

  const nearestFree = (p: Pt) => {
    const base = cellOf(p.x, p.z);
    if (!blocked[base]) return base;
    const bx = base % NX;
    const bz = Math.floor(base / NX);
    let best = -1;
    let bestD = Infinity;
    for (let r = 1; r <= 8 && best < 0; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = bx + dx;
          const cz = bz + dz;
          if (cx < 0 || cz < 0 || cx >= NX || cz >= NZ) continue;
          const i = cz * NX + cx;
          if (blocked[i]) continue;
          const d = dx * dx + dz * dz;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    return best;
  };

  const s = nearestFree(start);
  const g = nearestFree(goal);
  if (s < 0 || g < 0) return null;

  const direct = [start, goal];
  if (segmentFree(env, start, goal, radius - 0.005)) return direct;

  const gx = g % NX;
  const gz = Math.floor(g / NX);
  const cost = new Float32Array(NX * NZ).fill(Infinity);
  const score = new Float32Array(NX * NZ).fill(Infinity);
  const from = new Int32Array(NX * NZ).fill(-1);
  const open = new Heap(score);
  const heur = (i: number) => {
    const dx = Math.abs((i % NX) - gx);
    const dz = Math.abs(Math.floor(i / NX) - gz);
    return (dx + dz + (SQRT2 - 2) * Math.min(dx, dz)) * CELL;
  };
  cost[s] = 0;
  score[s] = heur(s);
  open.push(s);
  const closed = new Uint8Array(NX * NZ);
  let found = false;
  while (open.size) {
    const cur = open.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === g) {
      found = true;
      break;
    }
    const cx = cur % NX;
    const cz = Math.floor(cur / NX);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) continue;
        const ni = nz * NX + nx;
        if (blocked[ni] || closed[ni]) continue;
        if (dx && dz && (blocked[cz * NX + nx] || blocked[nz * NX + cx])) continue;
        const c = cost[cur] + (dx && dz ? SQRT2 : 1) * CELL;
        if (c < cost[ni]) {
          cost[ni] = c;
          from[ni] = cur;
          score[ni] = c + heur(ni);
          open.push(ni);
        }
      }
    }
  }
  if (!found) return null;

  const cells: Pt[] = [];
  for (let i = g; i >= 0; i = from[i]) cells.push(centerOf(i));
  cells.reverse();
  const raw: Pt[] = [start, ...cells.slice(1), goal];

  const out: Pt[] = [raw[0]];
  let anchor = 0;
  while (anchor < raw.length - 1) {
    let next = anchor + 1;
    for (let j = raw.length - 1; j > anchor + 1; j--) {
      if (segmentFree(env, raw[anchor], raw[j], radius - 0.005)) {
        next = j;
        break;
      }
    }
    out.push(raw[next]);
    anchor = next;
  }
  return out;
}
