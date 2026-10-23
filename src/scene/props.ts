import * as THREE from "three";
import { box, cyl, lambert, slab } from "../geom";
import { rugMaterial, woodMaterial } from "../materials";
import { PAL } from "../theme";
import {
  bookRow,
  cup,
  deskLamp,
  grassClump,
  leafyPlant,
  makeBook,
  monitor,
  pictureFrame,
  plateWithFood,
  pot,
  sheet,
  SPINES,
  storageBox,
  utensilPot,
} from "./parts";

const wood = () => woodMaterial(PAL.wood);
const woodDeep = () => woodMaterial(PAL.woodDeep);

export function buildRug() {
  const w = 3.35;
  const d = 2.55;
  const g = new THREE.Group();
  const lip = new THREE.Mesh(slab(w + 0.1, d + 0.1, 0.018, 0.12, 0.004), lambert("#dfeee4"));
  lip.position.y = 0;
  const top = new THREE.Mesh(slab(w, d, 0.028, 0.1, 0.006), rugMaterial());
  top.position.y = 0.012;
  g.add(lip, top);
  const stitch = lambert(PAL.rugStitch);
  const dashes = 28;
  for (let i = 0; i < dashes; i++) {
    const t = i / dashes;
    const edge = Math.floor(t * 4);
    const u = (t * 4) % 1;
    let x = 0;
    let z = 0;
    const hw = w / 2 - 0.04;
    const hd = d / 2 - 0.04;
    if (edge === 0) {
      x = -hw + u * w;
      z = -hd;
    } else if (edge === 1) {
      x = hw;
      z = -hd + u * d;
    } else if (edge === 2) {
      x = hw - u * w;
      z = hd;
    } else {
      x = -hw;
      z = hd - u * d;
    }
    const dash = box(edge % 2 === 0 ? 0.07 : 0.022, 0.01, edge % 2 === 0 ? 0.022 : 0.07, stitch);
    dash.position.set(x, 0.04, z);
    dash.castShadow = false;
    g.add(dash);
  }
  g.userData.foot = [w, d];
  return g;
}

export function buildBench() {
  const g = new THREE.Group();
  const len = 2.55;
  const seat = box(0.46, 0.1, len, wood());
  seat.position.y = 0.21;
  const shelf = box(0.36, 0.04, len * 0.86, woodDeep());
  shelf.position.y = 0.08;
  g.add(seat, shelf);
  for (const z of [-len * 0.38, -len * 0.12, len * 0.16, len * 0.4]) {
    const leg = box(0.08, 0.21, 0.08, woodDeep());
    leg.position.set(0, 0.105, z);
    g.add(leg);
  }
  g.userData.foot = [0.5, len];
  return g;
}

export function buildBookcase() {
  const g = new THREE.Group();
  const w = 1.22;
  const h = 1.92;
  const d = 0.36;
  const sideT = 0.05;
  const left = box(sideT, h, d, wood());
  left.position.set(-w / 2 + sideT / 2, h / 2, 0);
  const right = box(sideT, h, d, wood());
  right.position.set(w / 2 - sideT / 2, h / 2, 0);
  const top = box(w, 0.05, d, wood());
  top.position.y = h - 0.025;
  const back = box(w - 0.02, h - 0.04, 0.02, woodDeep());
  back.position.set(0, h / 2, -d / 2 + 0.02);
  g.add(left, right, top, back);
  const levels = [0.08, 0.52, 0.96, 1.4];
  for (const y of levels) {
    const shelf = box(w - sideT * 2, 0.04, d - 0.02, wood());
    shelf.position.set(0, y, 0.01);
    g.add(shelf);
  }
  levels.forEach((y, i) => {
    bookRow(g, -w / 2 + 0.1, y + 0.04, d / 2 - 0.12, w - 0.24, 11 + i * 9, 14);
  });
  const b1 = storageBox(0.34, 0.2, 0.26, "#7ea4d0", "#9bbbe0");
  b1.position.set(-0.24, h, 0);
  const b2 = storageBox(0.3, 0.16, 0.24, "#e09aaf", "#f0c0cc");
  b2.position.set(0.22, h, 0.01);
  const b3 = storageBox(0.22, 0.12, 0.2, "#f2d7a6", "#f7e6c4");
  b3.position.set(0.22, h + 0.16, 0.01);
  g.add(b1, b2, b3);
  g.userData.foot = [w, d];
  return g;
}

export function buildCabinet() {
  const g = new THREE.Group();
  const w = 1.62;
  const h = 0.72;
  const d = 0.46;
  const body = box(w, h * 0.62, d, wood());
  body.position.y = h * 0.34;
  const top = box(w + 0.06, 0.06, d + 0.04, woodDeep());
  top.position.y = h * 0.66;
  const toe = box(w - 0.08, 0.06, d - 0.06, woodDeep());
  toe.position.y = 0.03;
  const back = box(w - 0.08, 0.22, 0.03, lambert("#f3efe6"));
  back.position.set(0, 0.28, -d / 2 + 0.08);
  g.add(body, top, toe, back);
  const books = new THREE.Group();
  books.userData.scatter = true;
  for (let i = 0; i < 6; i++) {
    const bk = makeBook(0.06, 0.16, 0.22, SPINES[i + 2]);
    bk.rotation.z = Math.PI / 2;
    bk.rotation.y = i * 0.04;
    bk.position.set(-0.42 + i * 0.16, 0.14, 0.02);
    books.add(bk);
  }
  g.add(books);
  const lamp = deskLamp();
  lamp.position.set(0.48, h * 0.7, 0);
  lamp.scale.setScalar(0.92);
  g.add(lamp);
  const p1 = leafyPlant("broad", "#f4f1ea");
  p1.position.set(-0.42, h * 0.7, 0.02);
  p1.scale.setScalar(0.85);
  p1.userData.scatter = true;
  const p2 = leafyPlant("rosette", PAL.terracotta);
  p2.position.set(-0.12, h * 0.7, 0.04);
  p2.scale.setScalar(0.8);
  p2.userData.scatter = true;
  const food = plateWithFood();
  food.position.set(0.16, h * 0.7, 0.02);
  g.add(p1, p2, food);
  g.userData.foot = [w, d];
  return g;
}

export function buildTable() {
  const g = new THREE.Group();
  const top = cyl(0.52, 0.52, 0.08, lambert("#f7f5f1"), 24);
  top.position.y = 0.42;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.016, 6, 24), lambert("#e6e2da"));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.46;
  rim.castShadow = true;
  const stem = cyl(0.07, 0.08, 0.36, lambert("#f3f1ec"), 12);
  stem.position.y = 0.2;
  const foot = cyl(0.2, 0.22, 0.04, lambert("#e7e3db"), 16);
  foot.position.y = 0.02;
  g.add(top, rim, stem, foot);
  const a = leafyPlant("broad", "#f7f4ee");
  a.position.set(-0.16, 0.46, 0.02);
  a.scale.setScalar(0.72);
  a.userData.scatter = true;
  const b = leafyPlant("rosette", "#efe8dc");
  b.position.set(0.16, 0.46, -0.02);
  b.scale.setScalar(0.7);
  b.userData.scatter = true;
  g.add(a, b);
  g.userData.foot = [1.08, 1.08];
  return g;
}

export function buildStool() {
  const g = new THREE.Group();
  const seat = cyl(0.16, 0.16, 0.06, wood(), 14);
  seat.position.y = 0.21;
  const cushion = cyl(0.15, 0.15, 0.035, lambert("#d7e2c8"), 14);
  cushion.position.y = 0.245;
  g.add(seat, cushion);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const leg = cyl(0.02, 0.025, 0.21, woodDeep(), 6);
    leg.position.set(Math.cos(a) * 0.1, 0.105, Math.sin(a) * 0.1);
    leg.rotation.z = Math.cos(a) * 0.08;
    leg.rotation.x = -Math.sin(a) * 0.08;
    g.add(leg);
  }
  g.userData.foot = [0.36, 0.36];
  return g;
}

export function buildEasel() {
  const g = new THREE.Group();
  const legMat = woodDeep();
  const feet: THREE.Vector3[] = [
    new THREE.Vector3(-0.22, 0, -0.14),
    new THREE.Vector3(0.22, 0, -0.14),
    new THREE.Vector3(0.02, 0, 0.2),
  ];
  const tops = [
    new THREE.Vector3(-0.1, 1.2, -0.02),
    new THREE.Vector3(0.1, 1.2, -0.02),
    new THREE.Vector3(0, 0.95, 0.08),
  ];
  feet.forEach((foot, i) => {
    const dir = tops[i].clone().sub(foot);
    const len = dir.length();
    const leg = cyl(0.018, 0.024, len, legMat, 6);
    leg.position.copy(foot).addScaledVector(dir, 0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    g.add(leg);
  });
  const shelf = box(0.42, 0.03, 0.1, wood());
  shelf.position.set(0, 0.72, 0.02);
  g.add(shelf);
  const frame = new THREE.Group();
  frame.position.set(0, 1.22, -0.02);
  frame.rotation.x = -0.08;
  const fw = 0.46;
  const fh = 0.58;
  frame.add(box(fw, 0.03, 0.03, wood()));
  const topBar = box(fw, 0.03, 0.03, wood());
  topBar.position.y = fh;
  const sideL = box(0.03, fh, 0.03, wood());
  sideL.position.set(-fw / 2, fh / 2, 0);
  const sideR = box(0.03, fh, 0.03, wood());
  sideR.position.set(fw / 2, fh / 2, 0);
  const canvas = box(fw - 0.06, fh - 0.06, 0.015, lambert("#f6f1e6"));
  canvas.position.set(0, fh / 2, 0.01);
  frame.add(topBar, sideL, sideR, canvas);
  const marks: [string, number, number, number, number][] = [
    ["#f0c14a", -0.06, 0.34, 0.1, 0.08],
    ["#7dba78", 0.05, 0.22, 0.12, 0.1],
    ["#d37b6a", -0.02, 0.16, 0.08, 0.05],
    ["#6d90d2", 0.08, 0.38, 0.05, 0.07],
  ];
  for (const [color, x, y, ww, hh] of marks) {
    const m = box(ww, hh, 0.008, lambert(color));
    m.position.set(x, y, 0.02);
    frame.add(m);
  }
  g.add(frame);
  const cupJar = cyl(0.04, 0.035, 0.08, lambert("#f2efe8"), 8);
  cupJar.position.set(0.22, 0.8, 0.04);
  const brush = cyl(0.006, 0.006, 0.16, lambert(PAL.woodDark), 4);
  brush.position.set(0.22, 0.9, 0.04);
  brush.rotation.z = 0.2;
  g.add(cupJar, brush);
  // Toy scale: the painter reaches the canvas, so the whole easel sits in its own scaled group.
  g.scale.setScalar(0.6);
  const outer = new THREE.Group();
  outer.add(g);
  outer.userData.foot = [0.36, 0.3];
  return outer;
}

export function buildChair() {
  const g = new THREE.Group();
  const seat = box(0.38, 0.05, 0.38, wood());
  seat.position.y = 0.42;
  const back = box(0.38, 0.42, 0.04, wood());
  back.position.set(0, 0.68, -0.17);
  g.add(seat, back);
  for (const [x, z] of [
    [-0.15, -0.15],
    [0.15, -0.15],
    [-0.15, 0.15],
    [0.15, 0.15],
  ] as const) {
    const leg = box(0.04, 0.42, 0.04, woodDeep());
    leg.position.set(x, 0.21, z);
    g.add(leg);
  }
  g.userData.foot = [0.42, 0.42];
  return g;
}

export function buildArmchair() {
  const g = new THREE.Group();
  const seat = box(0.52, 0.1, 0.48, lambert("#dfe8d4"));
  seat.position.y = 0.36;
  const back = box(0.52, 0.42, 0.1, lambert("#c9d8bc"));
  back.position.set(0, 0.58, -0.2);
  const armL = box(0.1, 0.16, 0.42, lambert("#d7e3cc"));
  armL.position.set(-0.28, 0.46, 0);
  const armR = armL.clone();
  armR.position.x = 0.28;
  g.add(seat, back, armL, armR);
  for (const [x, z] of [
    [-0.2, -0.18],
    [0.2, -0.18],
    [-0.2, 0.18],
    [0.2, 0.18],
  ] as const) {
    const leg = box(0.05, 0.28, 0.05, woodDeep());
    leg.position.set(x, 0.14, z);
    g.add(leg);
  }
  g.userData.foot = [0.64, 0.56];
  return g;
}

export function buildSofa() {
  const g = new THREE.Group();
  const seat = box(1.15, 0.16, 0.48, lambert("#f2d9b0"));
  seat.position.y = 0.36;
  const back = box(1.15, 0.4, 0.12, lambert("#e7c89a"));
  back.position.set(0, 0.58, -0.2);
  const armL = box(0.12, 0.22, 0.48, lambert("#f0d4aa"));
  armL.position.set(-0.6, 0.46, 0);
  const armR = armL.clone();
  armR.position.x = 0.6;
  g.add(seat, back, armL, armR);
  for (const x of [-0.48, 0.48]) {
    const leg = box(0.08, 0.16, 0.36, woodDeep());
    leg.position.set(x, 0.08, 0);
    g.add(leg);
  }
  g.userData.foot = [1.3, 0.58];
  return g;
}

export function buildLooseBooks() {
  const g = new THREE.Group();
  g.userData.scatter = true;
  const a = makeBook(0.18, 0.05, 0.24, "#6d90d2");
  a.rotation.z = Math.PI / 2;
  a.position.set(0, 0.02, 0);
  const b = makeBook(0.16, 0.045, 0.22, "#e07d6a");
  b.rotation.z = Math.PI / 2;
  b.rotation.y = 0.08;
  b.position.set(0.02, 0.08, 0.01);
  const c = makeBook(0.14, 0.04, 0.2, "#7dba78");
  c.rotation.z = Math.PI / 2;
  c.rotation.y = -0.12;
  c.position.set(-0.01, 0.14, -0.01);
  g.add(a, b, c);
  g.userData.foot = [0.28, 0.26];
  return g;
}

export function buildSingleBook(color = "#6d5aa8") {
  const g = makeBook(0.08, 0.22, 0.16, color, 0.04);
  g.userData.foot = [0.2, 0.18];
  g.userData.scatter = true;
  return g;
}

import {
  buildBarrier, buildBeams, buildBricks, buildCementBags, buildCone, buildCrane, buildExcavator,
  buildMixer, buildSafetyFence, buildSafetyMat, buildScaffold, buildToolbox, buildWorkLight,
} from "./propPacks/construction";
import {
  buildAwningSign, buildCartBasket, buildCounter, buildDiningTable, buildFloorMat, buildFridge,
  buildMenuBoard, buildPendantLamp, buildQueueRail, buildShelf,
} from "./propPacks/store";
import {
  buildBoothCarpet, buildBoothMonitor, buildCheckinKiosk, buildReceptionPodium,
} from "./propPacks/booth";

const ROUND = new Set(["table", "stool", "grass", "grass2", "plant", "plant2", "utensils", "cylinder", "cone", "pendantLamp"]);

export function buildProp(kind: string) {
  const g = makeProp(kind);
  if (ROUND.has(kind)) g.userData.round = true;
  return g;
}

function makeProp(kind: string): THREE.Group {
  switch (kind) {
    case "rug":
      return buildRug();
    case "bench":
      return buildBench();
    case "bookcase":
      return buildBookcase();
    case "cabinet":
      return buildCabinet();
    case "table":
      return buildTable();
    case "stool":
      return buildStool();
    case "easel":
      return buildEasel();
    case "chair":
      return buildChair();
    case "armchair":
      return buildArmchair();
    case "sofa":
      return buildSofa();
    case "books":
      return buildLooseBooks();
    case "book":
      return buildSingleBook("#c46b45");
    case "purplebook":
      return buildSingleBook("#7a68b8");
    case "box":
      return place(storageBox(0.28, 0.18, 0.22, "#e09aaf", "#f3c3d0"), [0.3, 0.24]);
    case "grass":
      return place(grassClump(1), [0.36, 0.36]);
    case "grass2":
      return place(grassClump(0.86), [0.32, 0.32]);
    case "plant":
      return place(leafyPlant("broad"), [0.28, 0.28], true);
    case "plant2":
      return place(leafyPlant("rosette", PAL.terracotta), [0.26, 0.26], true);
    case "cup":
      return place(cup(), [0.14, 0.14], true);
    case "lamp":
      return place(deskLamp(), [0.28, 0.28]);
    case "plate":
      return place(plateWithFood(), [0.26, 0.26], true);
    case "utensils":
      return place(utensilPot(), [0.32, 0.32], true);
    case "frame":
      return place(pictureFrame(), [0.3, 0.08]);
    case "monitor":
      return place(monitor(), [0.5, 0.28]);
    case "document":
    case "paper":
      return place(sheet(0.28, 0.36, true), [0.3, 0.38], true);
    case "acorn":
      return place(acorn(), [0.16, 0.16], true);
    case "carrot":
      return place(carrot(), [0.16, 0.16], true);
    case "cylinder":
      return place(pot(0.12, 0.2, "#d7efe4"), [0.28, 0.28], true);
    case "ring":
      return place(ring(), [0.28, 0.28], true);
    // Construction pack
    case "crane": return buildCrane();
    case "scaffold": return buildScaffold();
    case "mixer": return buildMixer();
    case "barrier": return buildBarrier();
    case "cone": return buildCone();
    case "bricks": return buildBricks();
    case "beams": return buildBeams();
    case "toolbox": return buildToolbox();
    case "excavator": return buildExcavator();
    case "cementBags": return buildCementBags();
    case "safetyFence": return buildSafetyFence();
    case "workLight": return buildWorkLight();
    case "safetyMat": return buildSafetyMat();
    // Restaurant / convenience-store pack
    case "counter": return buildCounter();
    case "shelf": return buildShelf();
    case "fridge": return buildFridge();
    case "diningTable": return buildDiningTable();
    case "menuBoard": return buildMenuBoard();
    case "pendantLamp": return buildPendantLamp();
    case "queueRail": return buildQueueRail();
    case "cartBasket": return buildCartBasket();
    case "awningSign": return buildAwningSign();
    case "floorMat": return buildFloorMat();
    // Event booth check-in pack
    case "boothCarpet": return buildBoothCarpet();
    case "checkinKiosk": return buildCheckinKiosk();
    case "receptionPodium": return buildReceptionPodium();
    case "boothMonitor": return buildBoothMonitor();
    default:
      return place(new THREE.Group(), [0.2, 0.2]);
  }
}

function place(g: THREE.Group, foot: [number, number], scatter = false) {
  g.userData.foot = foot;
  if (scatter) g.userData.scatter = true;
  return g;
}

function acorn() {
  const g = new THREE.Group();
  const nut = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), lambert("#8d5a34"));
  nut.scale.set(1, 1.15, 1);
  nut.position.y = 0.07;
  nut.castShadow = true;
  const cap = cyl(0.065, 0.05, 0.04, lambert("#6a442c"), 10);
  cap.position.y = 0.12;
  g.add(nut, cap);
  return g;
}

function carrot() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 10), lambert("#e07830"));
  body.position.y = 0.1;
  body.castShadow = true;
  g.add(body);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 5), lambert(PAL.leaf));
    leaf.position.set((i - 2) * 0.015, 0.22, 0);
    leaf.rotation.z = (i - 2) * 0.25;
    leaf.castShadow = true;
    g.add(leaf);
  }
  return g;
}

function ring() {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 18), lambert("#e6c56a"));
  mesh.position.y = 0.12;
  mesh.rotation.y = 0.4;
  mesh.castShadow = true;
  g.add(mesh);
  return g;
}
