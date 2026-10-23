import * as THREE from "three";
import { box, cyl, lambert, slab, sphere } from "../../geom";
import { hazardMaterial, woodMaterial } from "../../materials";
import { PAL } from "../../theme";

const steel = () => lambert("#7d8a96");
const steelDark = () => lambert("#55606b");
const orange = () => lambert("#e87f2e");
const safetyYellow = () => lambert("#f2b705");

function foot(g: THREE.Group, w: number, d: number) {
  g.userData.foot = [w, d];
  return g;
}

/** Flat plywood / rubber walking mat, the construction stand-in for the rug. */
export function buildSafetyMat() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(slab(3.1, 2.3, 0.03, 0.1, 0.005), woodMaterial("#b08954"));
  base.position.y = 0.012;
  base.receiveShadow = true;
  const edge = new THREE.Mesh(slab(3.22, 2.42, 0.018, 0.12, 0.004), hazardMaterial());
  edge.position.y = 0.002;
  edge.receiveShadow = true;
  g.add(edge, base);
  return foot(g, 3.22, 2.42);
}

export function buildCone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 14), orange());
  body.position.y = 0.25;
  body.castShadow = true;
  const band = cyl(0.085, 0.105, 0.09, lambert("#f7f5f1"), 14);
  band.position.y = 0.27;
  const base = box(0.3, 0.04, 0.3, orange());
  base.position.y = 0.02;
  g.add(body, band, base);
  return foot(g, 0.32, 0.32);
}

export function buildBarrier() {
  const g = new THREE.Group();
  const panel = box(1.15, 0.32, 0.05, hazardMaterial());
  panel.position.y = 0.48;
  g.add(panel);
  for (const x of [-0.5, 0.5]) {
    const leg = box(0.06, 0.48, 0.06, steelDark());
    leg.position.set(x, 0.24, 0);
    const footBar = box(0.08, 0.05, 0.42, steelDark());
    footBar.position.set(x, 0.025, 0);
    g.add(leg, footBar);
  }
  const light = sphere(0.045, lambert("#ffb02e", { emissive: "#ff9a1e", emissiveIntensity: 0.7 }), 10);
  light.position.set(0, 0.72, 0);
  light.userData.role = "shade";
  light.userData.day = 0.5;
  light.userData.night = 1.6;
  g.add(light);
  return foot(g, 1.2, 0.44);
}

export function buildSafetyFence() {
  const g = new THREE.Group();
  const mat = lambert("#e87f2e", { opacity: 0.85 });
  const mesh = box(3.4, 0.75, 0.02, mat);
  mesh.position.y = 0.55;
  mesh.castShadow = false;
  g.add(mesh);
  for (let i = 0; i <= 4; i++) {
    const post = cyl(0.025, 0.025, 0.95, steelDark(), 8);
    post.position.set(-1.7 + i * 0.85, 0.48, 0);
    g.add(post);
  }
  return foot(g, 3.4, 0.2);
}

export function buildScaffold() {
  const g = new THREE.Group();
  const pipe = steel();
  const w = 2.2;
  const levels = [0.75, 1.5, 2.25];
  for (const x of [-w / 2, w / 2]) {
    for (const z of [-0.28, 0.28]) {
      const post = cyl(0.03, 0.03, 2.55, pipe, 8);
      post.position.set(x, 1.27, z);
      g.add(post);
    }
  }
  for (const y of levels) {
    const plank = box(w + 0.15, 0.05, 0.68, woodMaterial(PAL.wood));
    plank.position.y = y;
    g.add(plank);
    for (const z of [-0.28, 0.28]) {
      const rail = cyl(0.02, 0.02, w, pipe, 8);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, y + 0.45, z);
      g.add(rail);
    }
  }
  const bucket = cyl(0.11, 0.09, 0.16, safetyYellow(), 10);
  bucket.position.set(-0.7, 1.62, 0);
  const bucket2 = cyl(0.11, 0.09, 0.16, orange(), 10);
  bucket2.position.set(0.55, 2.37, 0.05);
  g.add(bucket, bucket2);
  return foot(g, w + 0.2, 0.72);
}

export function buildMixer() {
  const g = new THREE.Group();
  const drum = sphere(0.34, orange(), 16);
  drum.scale.set(1, 0.9, 1);
  drum.position.set(0, 0.52, 0);
  drum.rotation.z = 0.5;
  const mouth = cyl(0.16, 0.2, 0.18, steelDark(), 12);
  mouth.position.set(0.28, 0.68, 0);
  mouth.rotation.z = -0.7;
  const frame = box(0.55, 0.08, 0.4, steelDark());
  frame.position.y = 0.22;
  g.add(drum, mouth, frame);
  for (const [x, z] of [[-0.22, -0.16], [0.22, -0.16], [-0.22, 0.16], [0.22, 0.16]] as const) {
    const leg = box(0.05, 0.22, 0.05, steelDark());
    leg.position.set(x, 0.11, z);
    g.add(leg);
  }
  const wheel = cyl(0.11, 0.11, 0.05, lambert("#33302c"), 12);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(-0.2, 0.11, 0.24);
  const wheel2 = wheel.clone();
  wheel2.position.x = 0.2;
  g.add(wheel, wheel2);
  return foot(g, 0.75, 0.55);
}

export function buildBricks() {
  const g = new THREE.Group();
  const pallet = box(0.62, 0.06, 0.5, woodMaterial(PAL.woodDeep));
  pallet.position.y = 0.03;
  g.add(pallet);
  const brickMat = lambert("#b85c40");
  const brickMat2 = lambert("#c96a4a");
  for (let layer = 0; layer < 4; layer++) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const b = box(0.18, 0.075, 0.2, layer % 2 ? brickMat : brickMat2);
        b.position.set(-0.2 + i * 0.2 + (layer % 2 ? 0.03 : 0), 0.1 + layer * 0.08, -0.12 + j * 0.23);
        g.add(b);
      }
    }
  }
  return foot(g, 0.66, 0.54);
}

export function buildBeams() {
  const g = new THREE.Group();
  const mat = steel();
  for (let i = 0; i < 3; i++) {
    const y = 0.09 + i * 0.17;
    const top = box(0.16, 0.03, 1.7, mat);
    top.position.y = y + 0.06;
    const web = box(0.035, 0.12, 1.7, mat);
    web.position.y = y;
    const bot = box(0.16, 0.03, 1.7, mat);
    bot.position.y = y - 0.06;
    const beam = new THREE.Group();
    beam.add(top, web, bot);
    beam.position.x = (i - 1) * 0.05;
    g.add(beam);
  }
  return foot(g, 0.3, 1.75);
}

export function buildToolbox() {
  const g = new THREE.Group();
  const body = box(0.48, 0.22, 0.24, lambert("#d94f3d"));
  body.position.y = 0.14;
  const lid = box(0.5, 0.07, 0.26, lambert("#c24334"));
  lid.position.y = 0.28;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 6, 12, Math.PI), steelDark());
  handle.position.y = 0.32;
  handle.castShadow = true;
  g.add(body, lid, handle);
  return foot(g, 0.52, 0.28);
}

export function buildCementBags() {
  const g = new THREE.Group();
  const mat = lambert("#cfc8b8");
  const mat2 = lambert("#bfb7a4");
  const positions: [number, number, number, number][] = [
    [0, 0.09, 0, 0.1], [0.05, 0.09, 0.24, -0.15], [-0.03, 0.24, 0.1, 0.35], [0.02, 0.38, 0.05, -0.1],
  ];
  positions.forEach(([x, y, z, r], i) => {
    const bag = box(0.52, 0.14, 0.34, i % 2 ? mat : mat2);
    bag.position.set(x, y, z);
    bag.rotation.y = r;
    g.add(bag);
    const stripe = box(0.53, 0.05, 0.12, lambert("#8a9bb0"));
    stripe.position.set(x, y, z);
    stripe.rotation.y = r;
    g.add(stripe);
  });
  return foot(g, 0.6, 0.62);
}

export function buildCrane() {
  const g = new THREE.Group();
  const yellow = safetyYellow();
  const base = box(0.55, 0.18, 0.55, hazardMaterial());
  base.position.y = 0.09;
  g.add(base);
  const mastH = 3.1;
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]] as const) {
    const post = box(0.05, mastH, 0.05, yellow);
    post.position.set(x, 0.18 + mastH / 2, z);
    g.add(post);
  }
  for (let i = 0; i < 5; i++) {
    const y = 0.45 + i * 0.6;
    const ringFrame = box(0.34, 0.04, 0.34, yellow);
    ringFrame.position.y = y;
    g.add(ringFrame);
  }
  const jib = box(1.9, 0.07, 0.07, yellow);
  jib.position.set(-0.65, 0.18 + mastH + 0.1, 0);
  const counter = box(0.55, 0.07, 0.07, yellow);
  counter.position.set(0.45, 0.18 + mastH + 0.1, 0);
  const weight = box(0.22, 0.3, 0.2, steelDark());
  weight.position.set(0.68, 0.18 + mastH - 0.08, 0);
  const cab = box(0.24, 0.24, 0.24, steel());
  cab.position.set(0, 0.18 + mastH - 0.12, 0.18);
  g.add(jib, counter, weight, cab);
  // Cable + hanging beam, kept inside the plot corner.
  const cable = cyl(0.008, 0.008, 0.85, steelDark(), 6);
  cable.position.set(-1.35, 0.18 + mastH - 0.32, 0);
  const load = box(0.14, 0.12, 0.9, steel());
  load.position.set(-1.35, 0.18 + mastH - 0.82, 0);
  g.add(cable, load);
  return foot(g, 0.7, 0.7);
}

export function buildExcavator() {
  const g = new THREE.Group();
  const yellow = safetyYellow();
  const trackMat = lambert("#3a3a3c");
  for (const z of [-0.22, 0.22]) {
    const track = box(0.85, 0.22, 0.18, trackMat);
    track.position.set(0, 0.11, z);
    g.add(track);
  }
  const deck = box(0.7, 0.12, 0.55, yellow);
  deck.position.y = 0.28;
  const cab = box(0.42, 0.42, 0.45, yellow);
  cab.position.set(-0.08, 0.55, 0);
  const glass = box(0.3, 0.24, 0.47, lambert("#bfe3ea", { opacity: 0.7 }));
  glass.position.set(-0.14, 0.6, 0);
  g.add(deck, cab, glass);
  const arm1 = box(0.65, 0.11, 0.11, yellow);
  arm1.position.set(0.42, 0.72, 0);
  arm1.rotation.z = 0.55;
  const arm2 = box(0.5, 0.09, 0.09, yellow);
  arm2.position.set(0.78, 0.55, 0);
  arm2.rotation.z = -0.9;
  const bucket = box(0.24, 0.18, 0.3, steelDark());
  bucket.position.set(0.95, 0.22, 0);
  bucket.rotation.z = 0.5;
  g.add(arm1, arm2, bucket);
  return foot(g, 1.15, 0.62);
}

export function buildWorkLight() {
  const g = new THREE.Group();
  const pole = cyl(0.025, 0.035, 1.25, steelDark(), 8);
  pole.position.y = 0.62;
  g.add(pole);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.015, 0.015, 0.5, steelDark(), 6);
    leg.position.set(Math.cos(a) * 0.14, 0.2, Math.sin(a) * 0.14);
    leg.rotation.z = Math.cos(a) * 0.6;
    leg.rotation.x = -Math.sin(a) * 0.6;
    g.add(leg);
  }
  const head = box(0.26, 0.16, 0.08, lambert("#44484e"));
  head.position.y = 1.3;
  const face = box(0.22, 0.12, 0.02, lambert("#ffe2a8", { emissive: "#ffc46a", emissiveIntensity: 0.35 }));
  face.position.set(0, 1.3, 0.05);
  face.userData.role = "shade";
  face.userData.day = 0.3;
  face.userData.night = 1.8;
  const light = new THREE.PointLight("#ffc58a", 1.2, 3.2, 2);
  light.position.set(0, 1.28, 0.18);
  light.userData.role = "lampLight";
  light.userData.day = 0.6;
  light.userData.night = 9;
  g.add(head, face, light);
  return foot(g, 0.42, 0.42);
}
