import * as THREE from "three";
import { box, cyl, lambert, mulberry32, ribbon, sphere } from "../geom";
import { PAL } from "../theme";
import { blobMaterial } from "../materials";

export const SPINES = [
  "#d36b62",
  "#e2a15a",
  "#6d90d2",
  "#7dba78",
  "#c46ea4",
  "#5d6eb2",
  "#ead7ae",
  "#8d5a44",
  "#4f9a88",
  "#d9d4c8",
  "#b85c48",
  "#6d7c48",
  "#8e6bb8",
  "#d27a3e",
];

export function makeBook(thickness: number, height: number, depth: number, color: string, lean = 0) {
  const g = new THREE.Group();
  const pages = box(thickness * 0.9, height * 0.94, depth * 0.88, lambert(PAL.pageBlock));
  const cover = box(thickness, height, depth * 0.2, lambert(color));
  cover.position.z = depth * 0.42;
  const bandMat = lambert("#f7f1e6");
  const band = box(thickness * 1.02, 0.014, 0.012, bandMat);
  band.position.set(0, height * 0.22, depth * 0.53);
  const band2 = box(thickness * 1.02, 0.014, 0.012, bandMat);
  band2.position.set(0, -height * 0.16, depth * 0.53);
  g.add(pages, cover, band, band2);
  g.position.y = height / 2;
  if (lean !== 0) {
    g.rotation.z = lean;
    g.position.y = Math.cos(Math.abs(lean)) * (height / 2) + Math.sin(Math.abs(lean)) * (thickness / 2);
  }
  return g;
}

export function bookRow(
  parent: THREE.Object3D,
  x0: number,
  y: number,
  z: number,
  width: number,
  seed: number,
  count: number,
) {
  const rand = mulberry32(seed);
  let x = x0;
  const end = x0 + width;
  let i = 0;
  while (x < end - 0.05 && i < count) {
    const h = 0.16 + rand() * 0.14;
    const t = 0.035 + rand() * 0.035;
    const lean = i % 7 === 3 ? (rand() > 0.5 ? 0.16 : -0.16) : 0;
    const book = makeBook(t, h, 0.16, SPINES[Math.floor(rand() * SPINES.length)], lean);
    book.position.x = x + t / 2;
    book.position.y += y;
    book.position.z = z;
    parent.add(book);
    x += t + 0.008;
    i++;
  }
}

export function storageBox(w: number, h: number, d: number, color: string, lid: string) {
  const g = new THREE.Group();
  g.add(box(w, h, d, lambert(color)));
  const top = box(w * 1.04, 0.035, d * 1.04, lambert(lid));
  top.position.y = h / 2;
  g.add(top);
  const lip = box(w * 0.72, 0.02, 0.02, lambert("#f4efe6"));
  lip.position.set(0, h * 0.05, d / 2 + 0.01);
  g.add(lip);
  g.position.y = h / 2;
  return g;
}

export function pot(radius: number, height: number, color: string) {
  const g = new THREE.Group();
  const body = cyl(radius * 0.92, radius * 0.7, height, lambert(color), 14);
  body.position.y = height / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.95, 0.018, 6, 16), lambert(color));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = height;
  rim.castShadow = true;
  const soil = cyl(radius * 0.8, radius * 0.8, 0.028, lambert(PAL.soil), 12);
  soil.position.y = height * 0.9;
  g.add(body, rim, soil);
  return g;
}

export function grassClump(scale = 1) {
  const g = new THREE.Group();
  const p = pot(0.16 * scale, 0.22 * scale, PAL.terracotta);
  g.add(p);
  const rand = mulberry32(Math.round(scale * 1000) + 7);
  const blades = 28;
  const matA = lambert(PAL.dried, { side: THREE.DoubleSide });
  const matB = lambert(PAL.driedDeep, { side: THREE.DoubleSide });
  for (let i = 0; i < blades; i++) {
    const h = (0.7 + rand() * 0.7) * scale;
    const ang = (i / blades) * Math.PI * 2 + rand() * 0.2;
    const bend = (0.16 + rand() * 0.34) * scale * (rand() > 0.5 ? 1 : -1);
    const geo = ribbon(h, bend, (rand() - 0.5) * 0.25, 0.028 * scale);
    const mesh = new THREE.Mesh(geo, i % 3 === 0 ? matB : matA);
    mesh.position.set(Math.cos(ang) * 0.05 * scale, 0.2 * scale, Math.sin(ang) * 0.05 * scale);
    mesh.rotation.y = ang;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

export function leafyPlant(style: "broad" | "rosette", potColor = "#efefeb") {
  const g = new THREE.Group();
  const p = pot(style === "broad" ? 0.1 : 0.09, 0.12, potColor);
  g.add(p);
  const leafMat = lambert(style === "broad" ? PAL.leaf : "#8fba6a");
  const deep = lambert(PAL.leafDeep);
  const n = style === "broad" ? 7 : 9;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const leaf = sphere(style === "broad" ? 0.09 : 0.055, i % 2 ? deep : leafMat, 10);
    const len = style === "broad" ? 1.7 : 0.85;
    leaf.scale.set(0.42, len, 0.18);
    leaf.position.set(Math.cos(ang) * 0.02, 0.16, Math.sin(ang) * 0.02);
    leaf.rotation.z = Math.cos(ang) * 0.7;
    leaf.rotation.x = Math.sin(ang) * 0.7;
    leaf.rotation.y = ang;
    g.add(leaf);
  }
  if (style === "rosette") {
    const center = sphere(0.03, lambert("#d6e2a4"), 8);
    center.position.y = 0.2;
    g.add(center);
  }
  return g;
}

export function cup(color = "#f7f4ef") {
  const g = new THREE.Group();
  const body = cyl(0.045, 0.038, 0.07, lambert(color), 12);
  body.position.y = 0.035;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 12), lambert(color));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.07;
  rim.castShadow = true;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 10, Math.PI), lambert(color));
  handle.rotation.y = Math.PI / 2;
  handle.position.set(0.05, 0.04, 0);
  handle.castShadow = true;
  const drink = cyl(0.038, 0.038, 0.012, lambert("#c4a07a"), 10);
  drink.position.y = 0.058;
  g.add(body, rim, handle, drink);
  return g;
}

export function plateWithFood() {
  const g = new THREE.Group();
  g.userData.scatter = true;
  const plate = cyl(0.11, 0.1, 0.02, lambert("#f4f1ea"), 16);
  plate.position.y = 0.01;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.01, 6, 16), lambert("#e7e0d4"));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  rim.castShadow = true;
  const pastry = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.016, 6, 10, Math.PI * 1.3), lambert("#e0b36a"));
  pastry.rotation.x = Math.PI / 2;
  pastry.position.set(-0.01, 0.035, 0);
  pastry.castShadow = true;
  const berry = sphere(0.016, lambert("#d45b5b"), 8);
  berry.position.set(0.04, 0.03, 0.02);
  const berry2 = sphere(0.014, lambert("#c4475a"), 8);
  berry2.position.set(0.03, 0.028, -0.02);
  g.add(plate, rim, pastry, berry, berry2);
  return g;
}

export function deskLamp() {
  const g = new THREE.Group();
  const base = cyl(0.07, 0.08, 0.025, lambert("#d7d2c8"), 14);
  base.position.y = 0.012;
  const stem = cyl(0.012, 0.014, 0.22, lambert("#c2b8a6"), 8);
  stem.position.y = 0.13;
  const neck = cyl(0.01, 0.01, 0.08, lambert("#c2b8a6"), 8);
  neck.position.set(0.03, 0.26, 0);
  neck.rotation.z = -0.5;
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, 0.11, 16, 1, true),
    lambert(PAL.lamp, { opacity: 0.94, emissive: PAL.lampHot, emissiveIntensity: 0.2, side: THREE.DoubleSide }),
  );
  shade.position.set(0.06, 0.3, 0);
  shade.userData.role = "shade";
  shade.userData.day = 0.18;
  shade.userData.night = 0.95;
  const bulb = sphere(0.028, lambert(PAL.bulb, { emissive: "#ffd28a", emissiveIntensity: 0.8 }), 10);
  bulb.position.set(0.06, 0.28, 0);
  bulb.userData.role = "shade";
  bulb.userData.day = 0.45;
  bulb.userData.night = 1.4;
  bulb.castShadow = false;

  const light = new THREE.PointLight("#ffc58a", 1.4, 3.4, 2);
  light.position.set(0.06, 0.28, 0.02);
  light.castShadow = false;
  light.userData.role = "lampLight";
  light.userData.day = 1.5;
  light.userData.night = 11;

  const wallGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55), blobMaterial(0.0, "#ffe1b0"));
  wallGlow.position.set(0.02, 0.34, -0.12);
  wallGlow.userData.role = "lampBlob";
  wallGlow.userData.day = 0.16;
  wallGlow.userData.night = 0.55;
  wallGlow.userData.ignorePick = true;
  wallGlow.castShadow = false;

  const tableGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.36), blobMaterial(0.0, "#ffd7a4"));
  tableGlow.rotation.x = -Math.PI / 2;
  tableGlow.position.set(0.05, 0.03, 0.02);
  tableGlow.userData.role = "lampBlob";
  tableGlow.userData.day = 0.12;
  tableGlow.userData.night = 0.4;
  tableGlow.userData.ignorePick = true;
  tableGlow.castShadow = false;

  g.add(base, stem, neck, shade, bulb, light, wallGlow, tableGlow);
  return g;
}

export function utensilPot() {
  const g = new THREE.Group();
  g.userData.scatter = true;
  const body = cyl(0.14, 0.12, 0.2, lambert("#3e4652"), 14);
  body.position.y = 0.1;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.012, 6, 14), lambert("#2e3540"));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.2;
  rim.castShadow = true;
  g.add(body, rim);
  const wood = lambert(PAL.wood);
  const angles = [-0.4, -0.15, 0.1, 0.32, 0.5, -0.55];
  angles.forEach((a, i) => {
    const stick = cyl(0.012, 0.012, 0.34 + (i % 3) * 0.06, wood, 6);
    stick.position.set(Math.sin(a) * 0.04, 0.32, Math.cos(a) * 0.04);
    stick.rotation.z = a * 0.35;
    stick.rotation.x = 0.15 * (i % 2 ? 1 : -1);
    g.add(stick);
  });
  return g;
}

export function pictureFrame() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 8, 20), lambert(PAL.frameWood));
  frame.scale.set(0.78, 1.15, 1);
  frame.castShadow = true;
  const mat = new THREE.Mesh(new THREE.CircleGeometry(0.125, 20), lambert("#f7f3ea"));
  mat.position.z = 0.01;
  mat.scale.set(0.78, 1.15, 1);
  const picture = new THREE.Group();
  picture.position.z = 0.02;
  const sky = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), lambert("#d5efe4"));
  sky.scale.set(0.78, 1.05, 1);
  const hill = sphere(0.06, lambert("#7dba78"), 10);
  hill.scale.set(1.4, 0.7, 0.2);
  hill.position.set(0, -0.04, 0.01);
  const hill2 = sphere(0.04, lambert("#5e9a62"), 8);
  hill2.scale.set(1.2, 0.8, 0.2);
  hill2.position.set(0.04, -0.05, 0.02);
  picture.add(sky, hill, hill2);
  g.add(frame, mat, picture);
  g.position.y = 1.72;
  return g;
}

export function monitor() {
  const g = new THREE.Group();
  const screen = box(0.46, 0.32, 0.03, lambert("#d5dbe6"));
  screen.position.y = 0.34;
  const bezel = box(0.4, 0.26, 0.01, lambert("#c5ddf0"));
  bezel.position.set(0, 0.34, 0.02);
  const bar = box(0.22, 0.02, 0.008, lambert("#8fb4d4"));
  bar.position.set(-0.05, 0.4, 0.026);
  const bar2 = box(0.16, 0.02, 0.008, lambert("#f0d78a"));
  bar2.position.set(-0.08, 0.36, 0.026);
  const stand = cyl(0.02, 0.02, 0.12, lambert("#c8c2b6"), 8);
  stand.position.y = 0.12;
  const foot = cyl(0.1, 0.1, 0.02, lambert("#c8c2b6"), 12);
  foot.position.y = 0.01;
  g.add(screen, bezel, bar, bar2, stand, foot);
  return g;
}

export function sheet(w = 0.34, h = 0.26, marks = true) {
  const g = new THREE.Group();
  const paper = box(w, 0.008, h, lambert("#f7f4ee"));
  paper.position.y = 0.004;
  g.add(paper);
  if (marks) {
    const ink = lambert("#6d7ea8");
    const m1 = box(0.12, 0.004, 0.01, ink);
    m1.position.set(-0.04, 0.01, -0.04);
    const m2 = box(0.08, 0.004, 0.01, lambert("#d07a6a"));
    m2.position.set(0.05, 0.01, 0.02);
    m2.rotation.y = 0.4;
    const m3 = box(0.05, 0.004, 0.03, lambert("#7aaa72"));
    m3.position.set(-0.02, 0.01, 0.05);
    g.add(m1, m2, m3);
  }
  return g;
}

export function cushion(w: number, h: number, d: number, color: string) {
  const m = box(w, h, d, lambert(color));
  return m;
}
