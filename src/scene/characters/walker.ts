import * as THREE from "three";
import { ROOM } from "../../theme";
import { Avatar, DIM, SIDE } from "./avatar";

const V3 = THREE.Vector3;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Absolute walking surface height at a floor point (tile or rug). */
export type GroundFn = (x: number, z: number) => number;

class Foot {
  plant = new V3();
  from = new V3();
  to = new V3();
  pos = new V3();
  swing = false;
  t = 0;
  dur = 0.24;
  yaw = 0;
  fromYaw = 0;
  pitch = 0;
  lift = 0;
}

const STEP_HALF = 0.16;
const REACH = (DIM.thigh + DIM.shin) * 0.985;

/**
 * Procedural two-step gait. Stance feet stay pinned to the floor point they landed on,
 * the pelvis height comes from the leg reach, and every upper-body swing is read from
 * the foot offsets so legs, arms and torso can never drift out of phase.
 */
export class Walker {
  readonly feet = [new Foot(), new Foot()];
  speed = 0;
  walkAmt = 0;
  pelvisY: number;
  private sway = 0;
  private time = Math.random() * 10;
  private tw = new V3();
  private fq = new THREE.Quaternion();
  private fe = new THREE.Euler(0, 0, 0, "YXZ");

  constructor(
    readonly avatar: Avatar,
    private ground: GroundFn,
  ) {
    this.pelvisY = DIM.standHip;
  }

  /** Put the avatar at rest with both feet beside each other. */
  place(x: number, z: number, heading: number) {
    const lat = new V3(Math.cos(heading), 0, -Math.sin(heading));
    for (let i = 0; i < 2; i++) {
      const f = this.feet[i];
      f.swing = false;
      f.plant.set(x + lat.x * SIDE[i] * DIM.footSep, 0, z + lat.z * SIDE[i] * DIM.footSep);
      f.plant.y = this.ground(f.plant.x, f.plant.z);
      f.pos.copy(f.plant);
      f.yaw = heading;
      f.pitch = 0;
      f.lift = 0;
    }
    this.pelvisY = DIM.standHip + (this.ground(x, z) - ROOM.floorY);
    this.speed = 0;
    this.walkAmt = 0;
  }

  update(dt: number, px: number, pz: number, heading: number, vx: number, vz: number) {
    if (dt <= 0) return;
    const a = this.avatar;
    this.time += dt;
    const sp = Math.hypot(vx, vz);
    this.speed += (sp - this.speed) * Math.min(1, dt * 14);
    const moving = this.speed > 0.1;
    this.walkAmt += (clamp((this.speed - 0.08) / 0.4, 0, 1) - this.walkAmt) * Math.min(1, dt * 9);

    const sin = Math.sin(heading);
    const cos = Math.cos(heading);
    const fx = sin;
    const fz = cos;
    const lx = cos;
    const lz = -sin;

    a.root.position.set(px, ROOM.floorY, pz);
    a.root.rotation.y = heading;
    a.root.updateMatrixWorld(true);

    // Foot stepping
    const feet = this.feet;
    if (!feet[0].swing && !feet[1].swing) {
      let best = -1;
      let bestOff = 0;
      for (let i = 0; i < 2; i++) {
        const rx = px + lx * SIDE[i] * DIM.footSep;
        const rz = pz + lz * SIDE[i] * DIM.footSep;
        const off = Math.hypot(rx - feet[i].plant.x, rz - feet[i].plant.z);
        const thr = moving ? STEP_HALF : 0.05;
        if (off > thr && off > bestOff) {
          best = i;
          bestOff = off;
        }
      }
      if (best >= 0) {
        const f = feet[best];
        f.swing = true;
        f.t = 0;
        f.from.copy(f.plant);
        f.fromYaw = f.yaw;
        f.dur = moving ? 0.27 - 0.07 * clamp(this.speed / 0.85, 0, 1) : 0.22;
      }
    }

    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      if (f.swing) {
        f.t = Math.min(1, f.t + dt / f.dur);
        const remain = (1 - f.t) * f.dur;
        const lead = moving ? clamp(this.speed * 0.3, 0, 0.16) : 0;
        f.to.set(
          px + vx * remain + lx * SIDE[i] * DIM.footSep + fx * lead,
          0,
          pz + vz * remain + lz * SIDE[i] * DIM.footSep + fz * lead,
        );
        f.to.y = this.ground(f.to.x, f.to.z);
        const e = smooth(f.t);
        f.pos.x = f.from.x + (f.to.x - f.from.x) * e;
        f.pos.z = f.from.z + (f.to.z - f.from.z) * e;
        const groundY = this.ground(f.pos.x, f.pos.z);
        const amp = moving ? 0.07 : 0.045;
        f.lift = Math.sin(Math.PI * Math.pow(f.t, 0.9)) * amp;
        f.pos.y = groundY + f.lift;
        f.yaw = f.fromYaw + wrapAngle(heading - f.fromYaw) * e;
        const toeOff = 0.42 * (1 - clamp(f.t / 0.35, 0, 1));
        const heel = -0.3 * clamp((f.t - 0.62) / 0.38, 0, 1);
        f.pitch = toeOff + heel;
        if (f.t >= 1) {
          f.swing = false;
          f.plant.copy(f.to);
          f.plant.y = this.ground(f.plant.x, f.plant.z);
          f.pos.copy(f.plant);
          f.lift = 0;
          f.yaw = heading;
        }
      } else {
        f.pos.copy(f.plant);
        f.lift = 0;
        f.pitch += (0 - f.pitch) * Math.min(1, dt * 16);
      }
    }

    // Pelvis height from leg reach: stance feet that trail or lead pull the hips down.
    const groundP = this.ground(px, pz) - ROOM.floorY;
    const standY = DIM.standHip + groundP;
    let target = standY;
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      if (f.swing) continue;
      const hx = px + lx * SIDE[i] * DIM.hipX;
      const hz = pz + lz * SIDE[i] * DIM.hipX;
      const d = Math.hypot(f.pos.x - hx, f.pos.z - hz);
      const ankleRoot = f.pos.y - ROOM.floorY + DIM.ankleH;
      const dy = Math.sqrt(Math.max(1e-4, REACH * REACH - d * d));
      target = Math.min(target, ankleRoot + dy - DIM.hipY);
    }
    this.pelvisY += (target - this.pelvisY) * Math.min(1, dt * 22);
    const bob = this.pelvisY - standY;

    // Phase read from the feet
    const f0 = (feet[0].pos.x - px) * fx + (feet[0].pos.z - pz) * fz;
    const f1 = (feet[1].pos.x - px) * fx + (feet[1].pos.z - pz) * fz;
    const dn = clamp((f0 - f1) / (STEP_HALF * 2), -1, 1) * this.walkAmt;
    const w0 = feet[0].swing ? 0 : 1;
    const w1 = feet[1].swing ? 0 : 1;
    const weight = (w0 - w1) * this.walkAmt;
    this.sway += (weight * 0.012 - this.sway) * Math.min(1, dt * 10);

    const idle = 1 - this.walkAmt;
    const shift = Math.sin((this.time * Math.PI * 2) / 7) * idle;
    const breath = Math.sin((this.time * Math.PI * 2) / 2.4);

    const pelvisYaw = -0.07 * dn;
    a.pelvis.position.set(this.sway + shift * 0.012, this.pelvisY, 0);
    a.pelvis.rotation.set(0, pelvisYaw, weight * 0.03 + shift * 0.025);
    a.spine.rotation.set(0.06 * this.walkAmt, -pelvisYaw * 0.7, -shift * 0.012);
    a.chest.rotation.set(0.02 * this.walkAmt, -pelvisYaw * 0.7, -(weight * 0.03 + shift * 0.025) * 0.6);
    a.chest.scale.set(1 + breath * 0.004, 1 + breath * 0.012, 1 + breath * 0.004);
    a.head.position.y = a.headBaseY - 0.7 * bob;
    a.head.rotation.set(
      0.03 * this.walkAmt - 0.02 * breath * idle,
      0.14 * Math.sin((this.time * Math.PI * 2) / 9) * idle + pelvisYaw * 0.3,
      -(weight * 0.03 + shift * 0.025) * 0.5,
    );

    // Arms oppose the legs
    for (let i = 0; i < 2; i++) {
      const s = SIDE[i];
      const swing = (i === 0 ? -dn : dn) * 0.38;
      const back = Math.max(0, -swing / 0.38);
      const bend = 0.44 + 0.15 * back + 0.06 * breath * idle * 0;
      a.armUp[i].rotation.set(-swing, 0, s * (0.1 + 0.015 * breath * idle));
      a.armLow[i].rotation.set(-bend, 0, 0);
      a.hand[i].rotation.set(0, 0, 0);
    }

    // Legs
    a.pelvis.updateMatrix();
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      this.tw.set(f.pos.x, f.pos.y + DIM.ankleH, f.pos.z);
      a.root.worldToLocal(this.tw);
      const yawRel = wrapAngle(f.yaw - heading) + SIDE[i] * 0.07;
      this.fe.set(f.pitch, yawRel, 0, "YXZ");
      this.fq.setFromEuler(this.fe);
      a.legIK(i, this.tw, this.fq, 0.22);
    }
  }
}
