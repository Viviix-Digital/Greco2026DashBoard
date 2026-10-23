import * as THREE from "three";
import { box, cyl, lambert, slab } from "../../geom";
import { leafyPlant } from "../parts";

function foot(g: THREE.Group, w: number, d: number, round = false) {
  g.userData.foot = [w, d];
  if (round) g.userData.round = true;
  return g;
}

const ORANGE = ["#ff4d0a", "#ff6a1a", "#ff8535", "#ffa05c", "#ffc090", "#fff0e4"];

function orangeFace(w: number, h: number, d: number) {
  const g = new THREE.Group();
  const n = ORANGE.length;
  const bandH = h / n;
  for (let i = 0; i < n; i++) {
    const band = box(w, bandH + 0.008, d, lambert(ORANGE[i]));
    band.position.y = h - (i + 0.5) * bandH;
    g.add(band);
  }
  return g;
}

function miniLogo() {
  const g = new THREE.Group();
  const cube = box(0.07, 0.07, 0.025, lambert("#e6331a"));
  const bar = box(0.22, 0.035, 0.02, lambert("#d92a12"));
  bar.position.set(0.16, 0.01, 0);
  g.add(cube, bar);
  return g;
}

function tablet() {
  const g = new THREE.Group();
  const body = box(0.28, 0.02, 0.2, lambert("#2a2e34"));
  const screen = box(0.24, 0.008, 0.16, lambert("#5ec8ff", { emissive: "#3aa8e8", emissiveIntensity: 0.55 }));
  screen.position.y = 0.012;
  screen.castShadow = false;
  const dot = box(0.08, 0.006, 0.04, lambert("#ff9a4a"));
  dot.position.set(-0.04, 0.016, 0.02);
  dot.castShadow = false;
  g.add(body, screen, dot);
  return g;
}

export function buildBoothCarpet() {
  const g = new THREE.Group();
  const edge = new THREE.Mesh(slab(3.4, 2.6, 0.016, 0.1, 0.004), lambert("#f4f5f7"));
  edge.position.y = 0.002;
  edge.receiveShadow = true;
  const top = new THREE.Mesh(slab(3.2, 2.4, 0.024, 0.08, 0.005), lambert("#9aa0a8"));
  top.position.y = 0.012;
  top.receiveShadow = true;
  g.add(edge, top);
  return foot(g, 3.4, 2.6);
}

export function buildCheckinKiosk() {
  const g = new THREE.Group();
  // Slim angled pedestal body
  const body = orangeFace(0.42, 1.15, 0.28);
  body.position.y = 0;
  body.rotation.x = -0.12;
  g.add(body);
  const base = box(0.48, 0.06, 0.38, lambert("#e8eaed"));
  base.position.y = 0.03;
  g.add(base);
  // Tablet deck on top
  const deck = box(0.4, 0.04, 0.28, lambert("#fff5ee"));
  deck.position.set(0, 1.18, 0.04);
  deck.rotation.x = -0.35;
  g.add(deck);
  const pad = tablet();
  pad.position.set(0, 1.22, 0.04);
  pad.rotation.x = -0.35;
  g.add(pad);
  const logo = miniLogo();
  logo.position.set(-0.05, 0.72, 0.16);
  g.add(logo);
  return foot(g, 0.5, 0.42);
}

export function buildReceptionPodium() {
  const g = new THREE.Group();
  const body = box(0.85, 0.95, 0.48, lambert("#fff8f2"));
  body.position.y = 0.475;
  g.add(body);
  const face = orangeFace(0.82, 0.88, 0.04);
  face.position.set(0, 0.06, 0.24);
  g.add(face);
  const top = box(0.92, 0.05, 0.55, lambert("#f4f5f7"));
  top.position.y = 0.98;
  g.add(top);
  const logo = miniLogo();
  logo.position.set(-0.12, 0.55, 0.28);
  g.add(logo);
  const pad = tablet();
  pad.position.set(0.18, 1.02, 0.02);
  g.add(pad);
  const plant = leafyPlant("rosette", "#efefeb");
  plant.position.set(-0.28, 1.01, 0.05);
  plant.scale.setScalar(0.45);
  g.add(plant);
  return foot(g, 0.95, 0.58);
}

export function buildBoothMonitor() {
  const g = new THREE.Group();
  const stand = cyl(0.035, 0.04, 0.55, lambert("#c8ccd2"), 10);
  stand.position.y = 0.28;
  const footRing = cyl(0.16, 0.18, 0.03, lambert("#aeb4bc"), 14);
  footRing.position.y = 0.015;
  const bezel = box(0.72, 0.45, 0.05, lambert("#2a2e34"));
  bezel.position.y = 0.78;
  const screen = box(
    0.64,
    0.38,
    0.02,
    lambert("#3a5068", { emissive: "#6a9cc8", emissiveIntensity: 0.5 }),
  );
  screen.position.set(0, 0.78, 0.03);
  screen.castShadow = false;
  screen.userData.role = "windowGlow";
  screen.userData.day = 0.4;
  screen.userData.night = 0.85;
  // Landscape bars
  const hill = box(0.4, 0.08, 0.015, lambert("#8fbf88"));
  hill.position.set(-0.05, 0.7, 0.05);
  hill.castShadow = false;
  const sky = box(0.2, 0.06, 0.012, lambert("#e8f0f8"));
  sky.position.set(0.15, 0.88, 0.05);
  sky.castShadow = false;
  g.add(stand, footRing, bezel, screen, hill, sky);
  return foot(g, 0.75, 0.35);
}
