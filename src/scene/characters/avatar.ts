import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { lambert, sphere } from "../../geom";
import { PAL } from "../../theme";
import { type Ctrl, mix, paint, skin, ss, sweep, unitSphere } from "./body";
import { solveTwoBone } from "./ik";

export type HairStyle = "short" | "player" | "long" | "bun";

export interface Recipe {
  skin?: string;
  top: string;
  topAlt?: string;
  bottom: string;
  shoe: string;
  sole?: string;
  hair: string;
  hairStyle: HairStyle;
  beret?: string;
  lower?: "pants" | "skirt";
  skirtColor?: string;
  /** Player extras: ribbed cuffs, collar roll, ahoge. */
  detail?: boolean;
  /** Sleeve length: arms in top colour (long) or skin (short). */
  sleeves?: "long" | "short";
}

/** Metres-ish units shared with the room (tile 0.4, wall 3.08). Standing height is about 1.08. */
export const DIM = {
  ankleH: 0.08,
  thigh: 0.17,
  shin: 0.17,
  hipX: 0.072,
  hipY: -0.005,
  standHip: 0.395,
  upperArm: 0.15,
  foreArm: 0.135,
  shoulderX: 0.15,
  shoulderY: 0.15,
  footSep: 0.085,
};

export const SIDE = [1, -1] as const;

const V = THREE.Vector3;

function joint(parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const o = new THREE.Bone();
  o.position.set(x, y, z);
  parent.add(o);
  return o as THREE.Object3D;
}

function put<T extends THREE.Object3D>(parent: THREE.Object3D, child: T, x = 0, y = 0, z = 0) {
  child.position.set(x, y, z);
  parent.add(child);
  return child;
}

function blob(r: number, sx: number, sy: number, sz: number, mat: THREE.Material, seg = 16) {
  const m = sphere(r, mat, seg);
  m.scale.set(sx, sy, sz);
  return m;
}

const tmpM = new THREE.Matrix4();
const tmpV = new V();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();

const HAIR = {
  short: { F: 0.058, S: 0.052, B: -0.05, vol: 1.0, sweep: 0.0, lock: 0.008 },
  player: { F: 0.03, S: -0.012, B: -0.085, vol: 1.07, sweep: 0.03, lock: 0.01 },
  long: { F: 0.05, S: -0.06, B: -0.16, vol: 1.05, sweep: 0.0, lock: 0.008 },
  bun: { F: 0.054, S: 0.004, B: -0.04, vol: 1.0, sweep: 0.0, lock: 0.008 },
} as const;

export class Avatar {
  readonly root = new THREE.Group();
  readonly pelvis: THREE.Object3D;
  readonly spine: THREE.Object3D;
  readonly chest: THREE.Object3D;
  readonly neck: THREE.Object3D;
  readonly head: THREE.Object3D;
  readonly armUp: THREE.Object3D[] = [];
  readonly armLow: THREE.Object3D[] = [];
  readonly hand: THREE.Object3D[] = [];
  readonly thigh: THREE.Object3D[] = [];
  readonly shin: THREE.Object3D[] = [];
  readonly ankle: THREE.Object3D[] = [];
  readonly headBaseY = 0.05;
  readonly materials: Record<string, THREE.Material> = {};
  private readonly bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true });

  constructor(readonly recipe: Recipe) {
    const r = recipe;
    const skinM = lambert(r.skin ?? PAL.skin);
    const hairMat = lambert(r.hair);
    this.materials = { skin: skinM, hair: hairMat, body: this.bodyMat };

    this.pelvis = joint(this.root, 0, DIM.standHip, 0);
    this.spine = joint(this.pelvis, 0, 0.04, 0);
    this.chest = joint(this.spine, 0, 0.06, 0);
    this.neck = joint(this.chest, 0, 0.2, 0);
    this.head = joint(this.neck, 0, this.headBaseY, 0);
    for (let i = 0; i < 2; i++) {
      const s = SIDE[i];
      const up = joint(this.chest, s * DIM.shoulderX, DIM.shoulderY, 0);
      const low = joint(up, 0, -DIM.upperArm, 0);
      const hand = joint(low, 0, -DIM.foreArm, 0);
      this.armUp.push(up);
      this.armLow.push(low);
      this.hand.push(hand);
      const th = joint(this.pelvis, s * DIM.hipX, DIM.hipY, 0);
      const sh = joint(th, 0, -DIM.thigh, 0);
      const an = joint(sh, 0, -DIM.shin, 0);
      this.thigh.push(th);
      this.shin.push(sh);
      this.ankle.push(an);
    }

    this.buildBody(r);
    this.buildHead(skinM, hairMat, r);
    this.buildHands(skinM);
    this.buildFeet(r);
    if (r.lower === "skirt") this.buildSkirt(r);
  }

  /** Torso, arms and legs as one continuous vertex-coloured skinned surface. */
  private buildBody(r: Recipe) {
    this.root.updateMatrixWorld(true);
    const wp = (o: THREE.Object3D) => new V().setFromMatrixPosition(o.matrixWorld);
    const bones: THREE.Object3D[] = [this.pelvis, this.spine, this.chest];
    const armBase = 3;
    const legBase = 9;
    for (let i = 0; i < 2; i++) bones.push(this.armUp[i], this.armLow[i], this.hand[i]);
    for (let i = 0; i < 2; i++) bones.push(this.thigh[i], this.shin[i], this.ankle[i]);

    const cSkin = new THREE.Color(r.skin ?? PAL.skin);
    const cTop = new THREE.Color(r.top);
    const cAlt = new THREE.Color(r.topAlt ?? shift(r.top, -0.07));
    const cBot = new THREE.Color(r.bottom);
    const cLow = r.lower === "skirt" ? new THREE.Color(r.skirtColor ?? r.bottom) : cBot;
    const detail = !!r.detail;
    const shortSleeve = r.sleeves === "short";
    const tmp = new THREE.Color();

    const parts: THREE.BufferGeometry[] = [];

    // Torso: pelvis-local control rings, shifted to root space.
    const py = wp(this.pelvis).y;
    const torsoCtrl: Ctrl[] = [
      [0.352, 0, 0],
      [0.344, 0.032, 0.03],
      [0.33, 0.052, 0.05],
      [0.316, 0.066, 0.062],
      [0.303, 0.082, 0.074],
      [0.288, 0.102, 0.086],
      [0.262, 0.126, 0.097],
      [0.222, 0.141, 0.106],
      [0.16, 0.147, 0.112],
      [0.1, 0.147, 0.114],
      [0.04, 0.146, 0.114],
      [0.0, 0.144, 0.112],
      [-0.03, 0.136, 0.107],
      [-0.06, 0.118, 0.097],
      [-0.085, 0.084, 0.074],
      [-0.1, 0.04, 0.04],
      [-0.106, 0, 0],
    ];
    const torso = sweep(torsoCtrl.map(([y, a, b]) => [y + py, a, b] as Ctrl), 36, 4);
    const hemY = 0.002 + py;
    paint(torso, (_x, y) => {
      tmp.copy(cLow);
      mix(tmp, cAlt, ss(hemY - 0.004, hemY + 0.004, y), tmp);
      mix(tmp, cTop, ss(hemY + 0.02, hemY + 0.03, y), tmp);
      if (detail) {
        mix(tmp, cAlt, ss(0.286 + py, 0.292 + py, y), tmp);
      }
      mix(tmp, cSkin, ss(0.308 + py, 0.314 + py, y), tmp);
      return tmp.clone();
    });
    skin(torso, (_x, y) => {
      const ly = y - py;
      const wp0 = 1 - ss(0.0, 0.07, ly);
      const wc = ss(0.07, 0.2, ly);
      return [
        [0, wp0],
        [1, Math.max(0, 1 - wp0 - wc)],
        [2, wc],
      ];
    });
    parts.push(torso);

    // Arms.
    for (let i = 0; i < 2; i++) {
      const s = wp(this.armUp[i]);
      const dy = (n: number): Ctrl[0] => n;
      const armCtrl: Ctrl[] = [
        [0.066, 0, 0],
        [0.062, 0.028, 0.028],
        [0.048, 0.048, 0.047],
        [0.022, 0.058, 0.056],
        [-0.01, 0.06, 0.058],
        [-0.06, 0.058, 0.055],
        [-0.11, 0.053, 0.051],
        [-0.15, 0.051, 0.049],
        [-0.19, 0.05, 0.048],
        [-0.24, 0.049, 0.047],
        [-0.272, 0.05, 0.048],
        [-0.285, 0.046, 0.044],
        [-0.298, 0.042, 0.039],
        [-0.322, 0.049, 0.042],
        [-0.346, 0.054, 0.043],
        [-0.368, 0.05, 0.039],
        [-0.386, 0.034, 0.028],
        [-0.396, 0.014, 0.012],
        [-0.401, 0, 0],
      ];
      const geo = sweep(
        armCtrl.map(([y, a, b]) => [dy(y) + s.y, a, b] as Ctrl),
        26,
        4,
      );
      geo.translate(s.x, 0, 0);
      const sleeveEnd = shortSleeve ? -0.085 : -0.282;
      paint(geo, (_x, y) => {
        const d = y - s.y;
        tmp.copy(cTop);
        if (detail && !shortSleeve) {
          mix(tmp, cAlt, ss(-0.256, -0.262, d), tmp);
          mix(tmp, cTop, ss(-0.273, -0.279, d), tmp);
        }
        mix(tmp, cSkin, ss(sleeveEnd + 0.004, sleeveEnd - 0.004, d), tmp);
        return tmp.clone();
      });
      const up = armBase + i * 3;
      skin(geo, (_x, y) => {
        const d = y - s.y;
        const wLow = ss(-0.105, -0.195, d);
        const wHand = ss(-0.272, -0.296, d);
        return [
          [up, 1 - wLow],
          [up + 1, wLow * (1 - wHand)],
          [up + 2, wLow * wHand],
        ];
      });
      parts.push(geo);
    }

    // Legs.
    for (let i = 0; i < 2; i++) {
      const h = wp(this.thigh[i]);
      const legCtrl: Ctrl[] = [
        [0.06, 0, 0],
        [0.054, 0.03, 0.03],
        [0.038, 0.054, 0.054],
        [0.012, 0.066, 0.066],
        [-0.03, 0.071, 0.07],
        [-0.09, 0.069, 0.068],
        [-0.14, 0.065, 0.064],
        [-0.17, 0.062, 0.062],
        [-0.21, 0.059, 0.059],
        [-0.26, 0.057, 0.057],
        [-0.29, 0.057, 0.057],
        [-0.306, 0.061, 0.06],
        [-0.322, 0.059, 0.058],
        [-0.334, 0.046, 0.046],
        [-0.341, 0.024, 0.024],
        [-0.344, 0, 0],
      ];
      const geo = sweep(
        legCtrl.map(([y, a, b]) => [y + h.y, a, b] as Ctrl),
        26,
        4,
      );
      geo.translate(h.x, 0, 0);
      paint(geo, (_x, y) => {
        const d = y - h.y;
        tmp.copy(cBot);
        if (detail) mix(tmp, cBot.clone().offsetHSL(0, 0, -0.07), ss(-0.298, -0.306, d), tmp);
        return tmp.clone();
      });
      const th = legBase + i * 3;
      skin(geo, (_x, y) => {
        const d = y - h.y;
        const wShin = ss(-0.12, -0.22, d);
        const wAnk = ss(-0.318, -0.346, d);
        return [
          [th, 1 - wShin],
          [th + 1, wShin * (1 - wAnk)],
          [th + 2, wShin * wAnk],
        ];
      });
      parts.push(geo);
    }

    const merged = mergeGeometries(parts, false);
    if (!merged) throw new Error("avatar body merge failed");
    const mesh = new THREE.SkinnedMesh(merged, this.bodyMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones as THREE.Bone[]), mesh.matrixWorld);
  }

  private buildHands(skinM: THREE.Material) {
    for (let i = 0; i < 2; i++) {
      const thumb = blob(0.021, 0.8, 1.25, 0.9, skinM, 10);
      thumb.rotation.x = 0.45;
      put(this.hand[i], thumb, SIDE[i] * -0.03, -0.04, 0.022);
    }
  }

  private buildFeet(r: Recipe) {
    const cShoe = new THREE.Color(r.shoe);
    const cSole = new THREE.Color(r.sole ?? (r.detail ? "#f4eadb" : shift(r.shoe, -0.05)));
    const tmp = new THREE.Color();
    const base = unitSphere(12);
    for (let i = 0; i < 2; i++) {
      const g = base.clone();
      const p = g.getAttribute("position");
      for (let k = 0; k < p.count; k++) {
        const ux = p.getX(k);
        const uy = p.getY(k);
        const uz = p.getZ(k);
        const toe = ss(0.0, 1.0, uz);
        let y: number;
        if (uy >= 0) y = -0.024 + uy * 0.05 * (1 - 0.5 * toe * toe);
        else y = -0.024 - Math.pow(-uy, 0.62) * 0.05;
        const w = 0.058 * (1 - 0.1 * toe);
        p.setXYZ(k, ux * w, y, 0.034 + uz * 0.104);
      }
      g.computeVertexNormals();
      paint(g, (_x, y) => mix(cShoe, cSole, ss(-0.05, -0.056, y), tmp).clone());
      const m = new THREE.Mesh(g, this.bodyMat);
      m.castShadow = true;
      m.receiveShadow = true;
      this.ankle[i].add(m);
    }
  }

  private buildSkirt(r: Recipe) {
    const lowerMat = lambert(r.skirtColor ?? r.bottom);
    const altMat = lambert(r.topAlt ?? shift(r.top, -0.07));
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.205, 0.2, 32, 1), lowerMat);
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    put(this.pelvis, skirt, 0, -0.06, 0);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.011, 8, 32), altMat);
    hem.rotation.x = Math.PI / 2;
    hem.castShadow = true;
    put(this.pelvis, hem, 0, -0.16, 0);
  }

  private buildHead(skinM: THREE.Material, hairMat: THREE.Material, r: Recipe) {
    const h = this.head;
    put(h, blob(0.17, 1.0, 0.93, 0.95, skinM, 32), 0, 0.15, 0);
    for (const s of SIDE) {
      put(h, blob(0.033, 0.55, 1.0, 0.8, skinM, 10), s * 0.168, 0.135, -0.005);
    }

    const ink = lambert(PAL.ink);
    const white = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const blushM = lambert(PAL.blush, { opacity: 0.5 });
    for (const s of SIDE) {
      const eye = blob(0.026, 0.85, 1.22, 0.5, ink, 14);
      eye.castShadow = false;
      put(h, eye, s * 0.062, 0.118, 0.141);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 10), white);
      glint.scale.z = 0.3;
      glint.rotation.y = s * 0.5;
      put(h, glint, s * 0.062 + 0.007, 0.131, 0.15);
      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 8, 8), white);
      glint2.scale.z = 0.3;
      put(h, glint2, s * 0.062 - 0.007, 0.104, 0.148);
      const blush = blob(0.03, 1.15, 0.64, 0.22, blushM, 12);
      blush.castShadow = false;
      const az = 0.66;
      const lat = -0.44;
      put(
        h,
        blush,
        s * 0.17 * Math.cos(lat) * Math.sin(az) * 0.985,
        0.15 + 0.158 * Math.sin(lat) * 0.985,
        0.1615 * Math.cos(lat) * Math.cos(az) * 0.985,
      );
      blush.rotation.y = s * az;
      blush.rotation.x = -lat * 0.6;
      const brow = blob(0.016, 1.5, 0.24, 0.36, lambert(r.hair), 8);
      brow.castShadow = false;
      brow.rotation.z = s * 0.14;
      put(h, brow, s * 0.064, 0.161, 0.14);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0046, 6, 14, Math.PI), lambert("#b8605a"));
    mouth.rotation.z = Math.PI;
    mouth.castShadow = false;
    put(h, mouth, 0, 0.082, 0.145);

    const hr = r.hairStyle;
    h.add(this.hairShell(hr, hairMat));

    const tuft = (x: number, y: number, z: number, rr: number, sx: number, sy: number, sz: number, rz = 0) => {
      const m = blob(rr, sx, sy, sz, hairMat, 16);
      m.rotation.z = rz;
      put(h, m, x, y, z);
      return m;
    };

    if (hr === "player") {
      for (const s of SIDE) tuft(s * 0.152, 0.082, 0.03, 0.036, 0.62, 1.55, 0.8, s * -0.1);
      tuft(0.045, 0.213, 0.118, 0.062, 1.7, 0.4, 0.5, -0.32);
      tuft(-0.05, 0.208, 0.122, 0.052, 1.5, 0.38, 0.5, 0.28);
      const ahoge = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new V(0.0, 0.3, 0.03),
            new V(0.012, 0.345, 0.04),
            new V(0.04, 0.372, 0.038),
            new V(0.07, 0.372, 0.028),
          ]),
          12,
          0.0125,
          8,
          false,
        ),
        hairMat,
      );
      ahoge.castShadow = true;
      h.add(ahoge);
    } else if (hr === "long") {
      tuft(0, -0.01, -0.095, 0.15, 1.0, 1.9, 0.62);
      for (const s of SIDE) tuft(s * 0.152, 0.05, 0.0, 0.052, 0.75, 2.0, 0.95, s * -0.05);
    } else if (hr === "bun") {
      tuft(0, 0.345, -0.06, 0.07, 1, 1, 1);
      tuft(0, 0.316, -0.06, 0.057, 1.5, 0.45, 1.5);
    }

    if (r.beret) {
      const beretM = lambert(r.beret);
      const beret = blob(0.155, 1.2, 0.4, 1.15, beretM, 22);
      beret.rotation.z = -0.28;
      beret.rotation.x = 0.1;
      put(h, beret, 0.03, 0.305, 0.0);
      put(h, blob(0.014, 1, 1, 1, beretM, 8), 0.01, 0.345, 0.0);
    }
  }

  /** One smooth hair shell: a sphere pulled in under the hairline so only the cap stays proud. */
  private hairShell(style: HairStyle, mat: THREE.Material) {
    const cfg = HAIR[style];
    const g = unitSphere(30);
    const p = g.getAttribute("position");
    const cy = 0.152;
    const cz = -0.012;
    for (let k = 0; k < p.count; k++) {
      const ux = p.getX(k);
      const uy = p.getY(k);
      const uz = p.getZ(k);
      const az = Math.atan2(ux, uz);
      const a = Math.abs(az);
      let hl: number;
      if (a < Math.PI / 2) {
        const u = a / (Math.PI / 2);
        hl = cfg.F + (cfg.S - cfg.F) * ((1 - Math.cos(u * Math.PI)) / 2);
      } else {
        const u = (a - Math.PI / 2) / (Math.PI / 2);
        hl = cfg.S + (cfg.B - cfg.S) * ((1 - Math.cos(u * Math.PI)) / 2);
      }
      const front = Math.max(0, Math.cos(az));
      hl += cfg.sweep * Math.sin(az) * front;
      hl += cfg.lock * Math.cos(az * 6 + 0.4) * front * front;
      const yy = uy * 0.17 * cfg.vol;
      const t = ss(hl - 0.07, hl + 0.03, yy);
      const sc = 0.84 + 0.16 * t;
      const back = Math.max(0, -Math.cos(az));
      p.setXYZ(
        k,
        ux * 0.178 * sc * cfg.vol,
        cy + uy * 0.17 * sc * cfg.vol,
        cz + uz * 0.176 * sc * (1 + 0.05 * back),
      );
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  setCastShadow(cast: boolean) {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = cast;
    });
  }

  /** Matrix of `node` relative to the avatar root. */
  inRoot(node: THREE.Object3D, out = new THREE.Matrix4()) {
    out.identity();
    const path: THREE.Object3D[] = [];
    for (let n: THREE.Object3D | null = node; n && n !== this.root; n = n.parent) path.push(n);
    for (let k = path.length - 1; k >= 0; k--) {
      path[k].updateMatrix();
      out.multiply(path[k].matrix);
    }
    return out;
  }

  /** Leg IK. `target` is the ankle joint position in root space. */
  legIK(i: number, target: THREE.Vector3, footQuat?: THREE.Quaternion, poleOut = 0.2) {
    const parentInRoot = this.inRoot(this.pelvis, tmpM);
    tmpV.copy(target).applyMatrix4(parentInRoot.invert());
    const pole = new V(SIDE[i] * poleOut, 0, 1).normalize();
    const q1 = solveTwoBone(this.thigh[i], this.shin[i], DIM.thigh, DIM.shin, tmpV, pole, tmpQ);
    if (footQuat) {
      tmpQ2.copy(this.pelvis.quaternion).invert().multiply(footQuat);
      this.ankle[i].quaternion.copy(q1).invert().multiply(tmpQ2);
    }
  }

  /** Arm IK. `target` is the wrist joint position in root space. */
  armIK(i: number, target: THREE.Vector3, poleOut = 0.5, poleDown = -0.2) {
    const parentInRoot = this.inRoot(this.chest, tmpM);
    tmpV.copy(target).applyMatrix4(parentInRoot.invert());
    const pole = new V(SIDE[i] * poleOut, poleDown, -1).normalize();
    solveTwoBone(this.armUp[i], this.armLow[i], DIM.upperArm, DIM.foreArm, tmpV, pole, tmpQ);
    this.hand[i].quaternion.identity();
  }

  /** Wrist position in root space for the current pose (needs fresh matrices). */
  wristInRoot(i: number, out = new V()) {
    return out.set(0, 0, 0).applyMatrix4(this.inRoot(this.hand[i], tmpM));
  }
}

function shift(hex: string, amount: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${c.getHexString()}`;
}

