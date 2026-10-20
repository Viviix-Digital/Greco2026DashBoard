import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** One control ring of a swept body: height, half-width along X, half-depth along Z. */
export type Ctrl = [y: number, rx: number, rz: number];

export function ss(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Smooth closed tube of elliptical rings along Y, top to bottom, pole at both ends.
 * The whole limb or torso is one continuous surface (no stacked capsules).
 */
export function sweep(ctrl: Ctrl[], seg = 28, per = 4) {
  const curve = new THREE.CatmullRomCurve3(
    ctrl.map((c) => new THREE.Vector3(c[0], c[1], c[2])),
    false,
    "centripetal",
  );
  const n = (ctrl.length - 1) * per;
  const pts = curve.getPoints(n);
  const pos: number[] = [];
  const idx: number[] = [];
  const start: number[] = [];
  const pole: boolean[] = [];
  pts.forEach((p, i) => {
    const isPole = i === 0 || i === n;
    start.push(pos.length / 3);
    pole.push(isPole);
    if (isPole) {
      pos.push(0, p.x, 0);
      return;
    }
    const rx = Math.max(0.002, p.y);
    const rz = Math.max(0.002, p.z);
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      pos.push(Math.cos(a) * rx, p.x, Math.sin(a) * rz);
    }
  });
  for (let i = 0; i < n; i++) {
    const a = start[i];
    const b = start[i + 1];
    for (let k = 0; k < seg; k++) {
      const k1 = (k + 1) % seg;
      if (pole[i]) {
        idx.push(a, b + k1, b + k);
      } else if (pole[i + 1]) {
        idx.push(a + k, a + k1, b);
      } else {
        idx.push(a + k, a + k1, b + k);
        idx.push(a + k1, b + k1, b + k);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Welded unit sphere (no seam, so normals stay smooth after displacement). */
export function unitSphere(detail: number) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-4);
  return g;
}

export function paint(geo: THREE.BufferGeometry, fn: (x: number, y: number, z: number) => THREE.Color) {
  const p = geo.getAttribute("position");
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const c = fn(p.getX(i), p.getY(i), p.getZ(i));
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
}

/** Up to three weighted bones per vertex. */
export function skin(
  geo: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number) => [number, number][],
) {
  const p = geo.getAttribute("position");
  const si = new Uint16Array(p.count * 4);
  const sw = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    const list = fn(p.getX(i), p.getY(i), p.getZ(i)).filter((e) => e[1] > 1e-4);
    const sum = list.reduce((a, e) => a + e[1], 0) || 1;
    for (let k = 0; k < 4 && k < list.length; k++) {
      si[i * 4 + k] = list[k][0];
      sw[i * 4 + k] = list[k][1] / sum;
    }
  }
  geo.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4));
  geo.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
}

export const mix = (a: THREE.Color, b: THREE.Color, t: number, out = new THREE.Color()) => out.copy(a).lerp(b, t);
