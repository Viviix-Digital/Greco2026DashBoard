import * as THREE from "three";
import { box, cyl, lambert, slab, sphere } from "../../geom";
import { woodMaterial } from "../../materials";
import { PAL } from "../../theme";
import { cup, leafyPlant, monitor, plateWithFood, SPINES, storageBox } from "../parts";

function foot(g: THREE.Group, w: number, d: number, round = false) {
  g.userData.foot = [w, d];
  if (round) g.userData.round = true;
  return g;
}

const GOODS = ["#d9574a", "#e2a15a", "#5d8ad2", "#63a86b", "#e7d154", "#c47ab0", "#5fb3a6", "#e8873a"];

export function buildFloorMat() {
  const g = new THREE.Group();
  const edge = new THREE.Mesh(slab(3.0, 2.2, 0.018, 0.12, 0.004), lambert("#d9574a"));
  edge.position.y = 0.002;
  edge.receiveShadow = true;
  const top = new THREE.Mesh(slab(2.85, 2.05, 0.028, 0.1, 0.006), lambert("#f3e3cf"));
  top.position.y = 0.012;
  top.receiveShadow = true;
  g.add(edge, top);
  // Welcome stripe pattern
  for (let i = 0; i < 5; i++) {
    const s = box(0.34, 0.008, 0.1, lambert(GOODS[i % GOODS.length]));
    s.position.set(-0.8 + i * 0.4, 0.032, 0);
    s.castShadow = false;
    g.add(s);
  }
  return foot(g, 3.0, 2.2);
}

export function buildCounter() {
  const g = new THREE.Group();
  const body = box(1.7, 0.62, 0.55, lambert("#f2ead9"));
  body.position.y = 0.36;
  const front = box(1.6, 0.4, 0.03, lambert("#d9574a"));
  front.position.set(0, 0.34, 0.28);
  const top = box(1.8, 0.06, 0.65, woodMaterial(PAL.woodDeep));
  top.position.y = 0.7;
  g.add(body, front, top);
  const pos = monitor();
  pos.position.set(0.45, 0.73, 0);
  pos.scale.setScalar(0.9);
  g.add(pos);
  const till = box(0.32, 0.14, 0.3, lambert("#4a4f58"));
  till.position.set(-0.45, 0.8, 0);
  const tray = plateWithFood();
  tray.position.set(-0.05, 0.73, 0.08);
  const c = cup();
  c.position.set(0.05, 0.73, -0.08);
  g.add(till, tray, c);
  return foot(g, 1.8, 0.68);
}

export function buildShelf() {
  const g = new THREE.Group();
  const w = 1.35;
  const h = 1.55;
  const d = 0.38;
  const frame = lambert("#e8e0cf");
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) {
    const side = box(0.05, h, d, frame);
    side.position.set(x, h / 2, 0);
    g.add(side);
  }
  const levels = [0.12, 0.52, 0.92, 1.32];
  for (const y of levels) {
    const shelf = box(w, 0.04, d, frame);
    shelf.position.y = y;
    g.add(shelf);
  }
  levels.forEach((y, li) => {
    let x = -w / 2 + 0.12;
    let i = 0;
    while (x < w / 2 - 0.14 && i < 6) {
      const gw = 0.13 + ((li + i) % 3) * 0.03;
      const gh = 0.2 + ((li * 2 + i) % 3) * 0.05;
      const item = li % 2 === 0
        ? storageBox(gw, gh, 0.22, GOODS[(li * 3 + i) % GOODS.length], "#f7f2e8")
        : (() => { const can = cyl(0.055, 0.055, gh, lambert(GOODS[(li * 2 + i) % GOODS.length]), 10); const grp = new THREE.Group(); grp.add(can); can.position.y = gh / 2; return grp; })();
      item.position.x = x + gw / 2;
      item.position.y = li % 2 === 0 ? y + 0.02 + gh / 2 - gh / 2 : y + 0.02;
      if (li % 2 === 0) item.position.y = y + 0.02;
      item.position.z = 0.02;
      g.add(item);
      x += gw + 0.05;
      i++;
    }
  });
  const sign = box(0.7, 0.16, 0.03, lambert("#63a86b"));
  sign.position.set(0, h + 0.06, 0.1);
  g.add(sign);
  return foot(g, w, d);
}

export function buildFridge() {
  const g = new THREE.Group();
  const body = box(0.55, 1.65, 1.15, lambert("#eef2f4"));
  body.position.y = 0.85;
  g.add(body);
  const glassMat = lambert("#7fb8cc", { opacity: 0.62 });
  glassMat.depthWrite = false;
  const door = box(0.03, 1.35, 0.95, glassMat);
  door.position.set(0.315, 0.9, 0);
  door.castShadow = false;
  g.add(door);
  const glowMat = new THREE.MeshLambertMaterial({ color: "#dff6ff", emissive: new THREE.Color("#bfeaff"), emissiveIntensity: 0.5 });
  const glow = box(0.02, 1.25, 0.85, glowMat);
  glow.position.set(0.285, 0.9, 0);
  glow.castShadow = false;
  glow.userData.role = "windowGlow";
  glow.userData.day = 0.55;
  glow.userData.night = 0.9;
  g.add(glow);
  // Door frame + handle so the glass front reads against the white body.
  const frameMat = lambert("#8a97a3");
  for (const z of [-0.48, 0.48]) {
    const edge = box(0.035, 1.4, 0.04, frameMat);
    edge.position.set(0.3, 0.9, z);
    g.add(edge);
  }
  const handle = box(0.03, 0.4, 0.03, frameMat);
  handle.position.set(0.33, 0.95, 0.4);
  g.add(handle);
  for (let i = 0; i < 4; i++) {
    const shelf = box(0.02, 0.03, 0.85, lambert("#ffffff"));
    shelf.position.set(0.29, 0.4 + i * 0.32, 0);
    shelf.castShadow = false;
    g.add(shelf);
    for (let j = 0; j < 3; j++) {
      const bottle = cyl(0.035, 0.035, 0.18, lambert(GOODS[(i * 3 + j) % GOODS.length]), 8);
      bottle.rotation.z = Math.PI / 2;
      bottle.position.set(0.295, 0.5 + i * 0.32, -0.28 + j * 0.28);
      bottle.castShadow = false;
      g.add(bottle);
    }
  }
  const topSign = box(0.08, 0.2, 1.0, lambert("#5d8ad2"));
  topSign.position.set(0, 1.78, 0);
  g.add(topSign);
  return foot(g, 0.6, 1.2);
}

export function buildDiningTable() {
  const g = new THREE.Group();
  const top = cyl(0.46, 0.46, 0.06, woodMaterial(PAL.wood), 20);
  top.position.y = 0.52;
  const stem = cyl(0.05, 0.06, 0.48, lambert("#6a5a4a"), 10);
  stem.position.y = 0.26;
  const base = cyl(0.2, 0.22, 0.04, lambert("#6a5a4a"), 14);
  base.position.y = 0.02;
  g.add(top, stem, base);
  const food = plateWithFood();
  food.position.set(0.12, 0.55, 0.05);
  const c = cup("#f2b0b0");
  c.position.set(-0.16, 0.55, -0.08);
  g.add(food, c);
  for (const a of [0.5, Math.PI + 0.5]) {
    const chair = new THREE.Group();
    const seat = box(0.34, 0.05, 0.34, lambert("#d9574a"));
    seat.position.y = 0.34;
    const back = box(0.34, 0.36, 0.04, lambert("#e0685e"));
    back.position.set(0, 0.55, -0.15);
    chair.add(seat, back);
    for (const [x, z] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]] as const) {
      const leg = box(0.035, 0.34, 0.035, lambert("#6a5a4a"));
      leg.position.set(x, 0.17, z);
      chair.add(leg);
    }
    chair.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
    chair.rotation.y = -a + Math.PI / 2;
    g.add(chair);
  }
  return foot(g, 1.55, 1.55);
}

export function buildMenuBoard() {
  const g = new THREE.Group();
  g.position.y = 1.85;
  const board = box(1.05, 0.72, 0.04, lambert("#3f4a4a"));
  g.add(board);
  const title = box(0.6, 0.09, 0.01, lambert("#f2c14e"));
  title.position.set(0, 0.24, 0.03);
  g.add(title);
  for (let i = 0; i < 3; i++) {
    const line = box(0.55 - i * 0.08, 0.035, 0.01, lambert("#f7f2e8"));
    line.position.set(-0.12, 0.08 - i * 0.13, 0.03);
    const price = box(0.12, 0.035, 0.01, lambert(SPINES[i + 1]));
    price.position.set(0.34, 0.08 - i * 0.13, 0.03);
    g.add(line, price);
  }
  return foot(g, 1.05, 0.1);
}

export function buildPendantLamp() {
  const g = new THREE.Group();
  const cord = cyl(0.008, 0.008, 0.85, lambert("#4a4038"), 6);
  cord.position.y = 2.62;
  cord.castShadow = false;
  const shadeMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.2, 0.18, 16, 1, true),
    lambert("#d9574a", { emissive: "#ffb08a", emissiveIntensity: 0.2, side: THREE.DoubleSide }),
  );
  shadeMesh.position.y = 2.15;
  shadeMesh.castShadow = true;
  shadeMesh.userData.role = "shade";
  shadeMesh.userData.day = 0.15;
  shadeMesh.userData.night = 0.95;
  const bulb = sphere(0.035, lambert(PAL.bulb, { emissive: "#ffd28a", emissiveIntensity: 0.8 }), 10);
  bulb.position.y = 2.08;
  bulb.castShadow = false;
  bulb.userData.role = "shade";
  bulb.userData.day = 0.45;
  bulb.userData.night = 1.4;
  const light = new THREE.PointLight("#ffc58a", 1.2, 3.2, 2);
  light.position.y = 2.05;
  light.userData.role = "lampLight";
  light.userData.day = 1.2;
  light.userData.night = 9;
  g.add(cord, shadeMesh, bulb, light);
  return foot(g, 0.4, 0.4, true);
}

export function buildQueueRail() {
  const g = new THREE.Group();
  const mat = lambert("#8a8f98");
  for (const x of [-0.6, 0.6]) {
    const post = cyl(0.025, 0.025, 0.65, mat, 8);
    post.position.set(x, 0.32, 0);
    const ball = sphere(0.04, mat, 10);
    ball.position.set(x, 0.68, 0);
    const base = cyl(0.11, 0.12, 0.03, mat, 10);
    base.position.set(x, 0.015, 0);
    g.add(post, ball, base);
  }
  const belt = box(1.2, 0.09, 0.02, lambert("#3f6fb5"));
  belt.position.y = 0.55;
  g.add(belt);
  return foot(g, 1.3, 0.25);
}

export function buildCartBasket() {
  const g = new THREE.Group();
  const mat = lambert("#aab2bc");
  const basket = box(0.5, 0.32, 0.35, lambert("#d9574a", { opacity: 0.9 }));
  basket.position.y = 0.48;
  g.add(basket);
  for (let i = 0; i < 4; i++) {
    const bar = box(0.48, 0.02, 0.02, mat);
    bar.position.set(0, 0.38 + i * 0.07, 0.18);
    g.add(bar);
  }
  const handle = cyl(0.015, 0.015, 0.4, mat, 8);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(-0.3, 0.62, 0);
  g.add(handle);
  for (const [x, z] of [[-0.18, -0.13], [0.18, -0.13], [-0.18, 0.13], [0.18, 0.13]] as const) {
    const leg = box(0.03, 0.3, 0.03, mat);
    leg.position.set(x, 0.18, z);
    const wheel = cyl(0.045, 0.045, 0.025, lambert("#333"), 10);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.045, z);
    g.add(leg, wheel);
  }
  const goods = storageBox(0.3, 0.16, 0.24, GOODS[3], "#f7e6c4");
  goods.position.set(0, 0.72, 0);
  g.add(goods);
  return foot(g, 0.65, 0.45);
}

export function buildAwningSign() {
  const g = new THREE.Group();
  g.position.y = 2.05;
  const board = box(0.95, 0.34, 0.05, lambert("#f7f2e8"));
  g.add(board);
  const stripe = box(0.95, 0.09, 0.055, lambert("#d9574a"));
  stripe.position.y = 0.1;
  const dot = sphere(0.07, lambert("#63a86b"), 10);
  dot.position.set(-0.3, -0.03, 0.04);
  const line = box(0.45, 0.06, 0.01, lambert("#4a4f58"));
  line.position.set(0.12, -0.03, 0.04);
  g.add(stripe, dot, line);
  const plant = leafyPlant("rosette", PAL.terracotta);
  plant.position.set(0, -2.05, 0.15);
  plant.scale.setScalar(0.9);
  g.add(plant);
  return foot(g, 0.95, 0.2);
}
