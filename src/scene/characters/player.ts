import * as THREE from "three";
import type { ShaderMaterial } from "three";
import { PAL, ROOM } from "../../theme";
import { contactShadow } from "../contactShadow";
import { Avatar } from "./avatar";
import { BOUNDS, planPath } from "./nav";
import { Walker } from "./walker";

export interface Obstacle {
  x: number;
  z: number;
  hw: number;
  hd: number;
  rot: number;
  round: boolean;
}

export interface Env {
  obstacles: Obstacle[];
  rugs: Obstacle[];
}

const RADIUS = 0.2;
const MAX_SPEED = 0.85;
const ACCEL = 4.2;
const DECEL = 7;
const TURN = 9;
const RUG_H = 0.038;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (t: number) => t * t * (3 - 2 * t);

export const SPAWN = { x: 5.1, z: 4.95, heading: 0.2 };

export function playerRecipe() {
  return {
    top: PAL.sweaterCream,
    topAlt: "#d6bd9d",
    bottom: PAL.pantsBlue,
    shoe: PAL.shoe,
    hair: PAL.hairBrown,
    hairStyle: "player" as const,
    detail: true,
  };
}

export class Player {
  readonly holder = new THREE.Group();
  readonly avatar: Avatar;
  readonly walker: Walker;
  x = SPAWN.x;
  z = SPAWN.z;
  heading = SPAWN.heading;
  speed = 0;
  target: { x: number; z: number } | null = null;
  private path: { x: number; z: number }[] = [];
  private stuck = 0;
  private footDisc: THREE.Mesh[] = [];
  private bodyDisc: THREE.Mesh;
  private discBase: number[] = [];
  private env: () => Env;
  private cur: Env;

  constructor(scene: THREE.Scene, env: () => Env) {
    this.env = env;
    this.cur = env();
    this.avatar = new Avatar(playerRecipe());
    this.avatar.setCastShadow(false);
    this.holder.name = "player";
    this.holder.userData.ignorePick = true;
    this.holder.add(this.avatar.root);

    this.walker = new Walker(this.avatar, (x, z) => this.groundAt(x, z));
    for (let i = 0; i < 2; i++) {
      const d = contactShadow(0.2, 0.3, 0.3);
      this.footDisc.push(d);
      this.discBase.push(0.3);
      this.holder.add(d);
    }
    this.bodyDisc = contactShadow(0.5, 0.44, 0.16);
    this.holder.add(this.bodyDisc);
    scene.add(this.holder);

    this.walker.place(this.x, this.z, this.heading);
    this.walker.update(0.0001, this.x, this.z, this.heading, 0, 0);
    this.syncShadows();
  }

  groundAt(x: number, z: number) {
    let h = 0;
    for (const r of this.cur.rugs) {
      const c = Math.cos(r.rot);
      const s = Math.sin(r.rot);
      const dx = x - r.x;
      const dz = z - r.z;
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const inset = Math.min(r.hw - Math.abs(lx), r.hd - Math.abs(lz));
      h = Math.max(h, smooth(clamp(inset / 0.08, 0, 1)));
    }
    return ROOM.floorY + RUG_H * h;
  }

  /** Walk to a floor point. Returns false when the point sits inside furniture. */
  walkTo(x: number, z: number) {
    const p = { x, z };
    this.clampBounds(p);
    this.cur = this.env();
    const probe = { x: p.x, z: p.z };
    this.pushOut(probe, this.cur);
    if (Math.hypot(probe.x - p.x, probe.z - p.z) > 0.32) return false;
    const path = planPath(this.cur, { x: this.x, z: this.z }, probe, RADIUS);
    if (!path) return false;
    this.path = path.slice(1);
    this.target = probe;
    this.stuck = 0;
    return true;
  }

  stop() {
    this.target = null;
    this.path = [];
  }

  update(dt: number) {
    dt = Math.min(dt, 0.05);
    if (dt <= 0) return;
    this.cur = this.env();
    let desired = 0;
    const wp = this.path[0];
    if (wp) {
      const dx = wp.x - this.x;
      const dz = wp.z - this.z;
      const dist = Math.hypot(dx, dz);
      const last = this.path.length === 1;
      if (dist < (last ? 0.08 : 0.16)) {
        this.path.shift();
        if (!this.path.length) this.target = null;
      } else {
        const err = wrapAngle(Math.atan2(dx, dz) - this.heading);
        this.heading = wrapAngle(this.heading + clamp(err, -TURN * dt, TURN * dt));
        const align = clamp(Math.cos(err) * 1.5 - 0.25, 0, 1);
        desired = (last ? Math.min(MAX_SPEED, dist * 4 + 0.12) : MAX_SPEED) * align;
      }
    }
    const dv = desired - this.speed;
    this.speed += clamp(dv, -DECEL * dt, ACCEL * dt);
    if (this.speed < 0.002 && desired === 0) this.speed = 0;

    const next = {
      x: this.x + Math.sin(this.heading) * this.speed * dt,
      z: this.z + Math.cos(this.heading) * this.speed * dt,
    };
    const intended = Math.hypot(next.x - this.x, next.z - this.z);
    this.clampBounds(next);
    this.pushOut(next, this.cur);
    const dx = next.x - this.x;
    const dz = next.z - this.z;
    const moved = Math.hypot(dx, dz);
    if (this.target && intended > 1e-5 && moved < intended * 0.25) {
      this.stuck += dt;
      if (this.stuck > 0.6) {
        this.stop();
        this.stuck = 0;
      }
    } else {
      this.stuck = 0;
    }
    this.x = next.x;
    this.z = next.z;
    this.walker.update(dt, this.x, this.z, this.heading, dx / dt, dz / dt);
    this.syncShadows();
  }

  private clampBounds(p: { x: number; z: number }) {
    p.x = clamp(p.x, BOUNDS.minX, BOUNDS.maxX);
    p.z = clamp(p.z, BOUNDS.minZ, BOUNDS.maxZ);
  }

  private pushOut(p: { x: number; z: number }, env: Env) {
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const o of env.obstacles) {
        const dx = p.x - o.x;
        const dz = p.z - o.z;
        if (o.round) {
          const r = Math.max(o.hw, o.hd) + RADIUS;
          const d = Math.hypot(dx, dz);
          if (d < r) {
            const k = d < 1e-5 ? 0 : 1 / d;
            p.x = o.x + (d < 1e-5 ? r : dx * k * r);
            p.z = o.z + (d < 1e-5 ? 0 : dz * k * r);
            moved = true;
          }
          continue;
        }
        const c = Math.cos(o.rot);
        const s = Math.sin(o.rot);
        const lx = dx * c - dz * s;
        const lz = dx * s + dz * c;
        const hw = o.hw + RADIUS;
        const hd = o.hd + RADIUS;
        if (Math.abs(lx) >= hw || Math.abs(lz) >= hd) continue;
        const cx = clamp(lx, -o.hw, o.hw);
        const cz = clamp(lz, -o.hd, o.hd);
        let nx = lx - cx;
        let nz = lz - cz;
        let ox: number;
        let oz: number;
        const d = Math.hypot(nx, nz);
        if (d > 1e-5) {
          if (d >= RADIUS) continue;
          ox = cx + (nx / d) * RADIUS;
          oz = cz + (nz / d) * RADIUS;
        } else {
          const px = hw - Math.abs(lx);
          const pz = hd - Math.abs(lz);
          if (px < pz) {
            ox = Math.sign(lx || 1) * hw;
            oz = lz;
          } else {
            ox = lx;
            oz = Math.sign(lz || 1) * hd;
          }
        }
        nx = ox;
        nz = oz;
        p.x = o.x + nx * c + nz * s;
        p.z = o.z - nx * s + nz * c;
        moved = true;
      }
      if (!moved) break;
      this.clampBounds(p);
    }
  }

  private syncShadows() {
    const feet = this.walker.feet;
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      const d = this.footDisc[i];
      const k = clamp(f.lift / 0.07, 0, 1);
      d.position.set(f.pos.x, this.groundAt(f.pos.x, f.pos.z) + 0.008, f.pos.z);
      d.rotation.y = f.yaw;
      d.scale.setScalar(1 - 0.38 * k);
      (d.material as ShaderMaterial).uniforms.uOpacity.value = this.discBase[i] * (1 - 0.7 * k);
    }
    this.bodyDisc.position.set(this.x, this.groundAt(this.x, this.z) + 0.006, this.z);
  }
}
