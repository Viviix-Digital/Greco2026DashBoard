import * as THREE from "three";

export function lambert(
  hex: string,
  opts?: { opacity?: number; side?: THREE.Side; emissive?: string; emissiveIntensity?: number },
) {
  const m = new THREE.MeshLambertMaterial({ color: hex });
  if (opts?.opacity !== undefined && opts.opacity < 1) {
    m.transparent = true;
    m.opacity = opts.opacity;
    m.depthWrite = false;
  }
  if (opts?.side) m.side = opts.side;
  if (opts?.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.4;
  }
  m.userData.baseOpacity = m.opacity;
  return m;
}

export function shade(obj: THREE.Object3D, cast = true, receive = true) {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}

export function box(w: number, h: number, d: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sphere(r: number, mat: THREE.Material, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(
  rTop: number,
  rBot: number,
  h: number,
  mat: THREE.Material,
  seg = 16,
) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Capsule whose origin sits at the bottom and whose length runs up +Y. */
export function limb(length: number, radius: number, mat: THREE.Material) {
  const mid = Math.max(0.02, length - radius * 2);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, mid, 4, 8), mat);
  mesh.position.y = length / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}

export function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const rad = Math.min(r, w / 2 - 0.001, h / 2 - 0.001);
  s.moveTo(x + rad, y);
  s.lineTo(x + w - rad, y);
  s.absarc(x + w - rad, y + rad, rad, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - rad);
  s.absarc(x + w - rad, y + h - rad, rad, 0, Math.PI / 2, false);
  s.lineTo(x + rad, y + h);
  s.absarc(x + rad, y + h - rad, rad, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rad);
  s.absarc(x + rad, y + rad, rad, Math.PI, Math.PI * 1.5, false);
  return s;
}

export function slab(w: number, d: number, height: number, r: number, bevel = 0.015) {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, d, r), {
    depth: Math.max(0.01, height - bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.65,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.translate(0, -(geo.boundingBox?.min.y ?? 0), 0);
  return geo;
}

export function ribbon(
  height: number,
  bend: number,
  twist: number,
  width: number,
) {
  const n = 7;
  const pos: number[] = [];
  const norm: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = height * t;
    const x = bend * t * t;
    const z = twist * t * t;
    const w = width * (1 - t * 0.82);
    pos.push(x, y, z - w, x, y, z + w);
    norm.push(1, 0, 0, 1, 0, 0);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(norm, 3));
  geo.setIndex(idx);
  return geo;
}

export function tube(points: THREE.Vector3[], radius: number, mat: THREE.Material, seg = 10) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, seg, radius, 6, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function colorize(
  geo: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number) => THREE.Color,
) {
  const pos = geo.getAttribute("position");
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.copy(fn(pos.getX(i), pos.getY(i), pos.getZ(i)));
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return geo;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
