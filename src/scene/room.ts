import * as THREE from "three";
import { box, cyl, lambert, shade, slab } from "../geom";
import { tileMaterial, wallpaperMaterial, woodMaterial } from "../materials";
import { pageShadow } from "./contactShadow";
import { PAL, ROOM, WINDOWS } from "../theme";

const wood = () => woodMaterial(PAL.wood);
const woodDeep = () => woodMaterial(PAL.woodDeep);

import { buildBoothShell, buildConstructionShell, buildStoreShell } from "./themedShells";
import type { ThemeId } from "./themes/types";

export function buildRoom(theme: ThemeId = "room") {
  if (theme === "construction") return buildConstructionShell();
  if (theme === "store") return buildStoreShell();
  if (theme === "booth") return buildBoothShell();
  return buildClassicRoom();
}

function buildClassicRoom() {
  const group = new THREE.Group();
  group.name = "room";

  const plinthW = ROOM.w + 1.05;
  const plinthD = ROOM.d + 1.05;
  const plinthGeo = slab(plinthW, plinthD, 0.7, 0.5, 0.08);
  plinthGeo.computeBoundingBox();
  const plinthH = plinthGeo.boundingBox?.max.y ?? 0.7;
  const plinth = new THREE.Mesh(plinthGeo, plinthMaterial());
  plinth.position.set(ROOM.w / 2 - 0.08, -plinthH, ROOM.d / 2 - 0.08);
  plinth.castShadow = false;
  plinth.receiveShadow = true;
  group.add(plinth);

  const drop = pageShadow(plinthW * 1.32, plinthD * 1.2);
  drop.position.set(ROOM.w / 2, -plinthH + 0.02, ROOM.d / 2 + 0.2);
  group.add(drop);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.05, ROOM.d), tileMaterial());
  floor.position.set(ROOM.w / 2, 0.025, ROOM.d / 2);
  floor.receiveShadow = true;
  floor.castShadow = false;
  group.add(floor);

  group.add(buildLeftWall());
  group.add(buildRightWall());
  group.add(buildWindows());
  group.add(buildOutlet());

  return group;
}

function plinthMaterial() {
  const mat = new THREE.MeshLambertMaterial({ color: PAL.plinthSide });
  mat.customProgramCacheKey = () => "plinth";
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vN;")
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        vN = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vN;`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float up = smoothstep(0.25, 0.85, vN.y);
        vec3 side = vec3(${rgb(PAL.plinthSide)});
        vec3 top = vec3(${rgb(PAL.plinthTop)});
        diffuseColor.rgb = mix(side, top, up);`,
      );
  };
  return mat;
}

function rgb(hex: string) {
  const c = new THREE.Color(hex);
  return `${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)}`;
}

function buildLeftWall() {
  const g = new THREE.Group();
  const H = ROOM.wallH;
  const T = ROOM.wallT;
  const solid = lambert(PAL.wallDeep);
  const y0 = 0;

  const addBlock = (z0: number, z1: number, yLo: number, yHi: number) => {
    const h = yHi - yLo;
    const d = z1 - z0;
    if (h <= 0.02 || d <= 0.02) return;
    const m = box(T, h, d, solid);
    m.position.set(-T / 2, yLo + h / 2, (z0 + z1) / 2);
    g.add(m);
  };

  const spans: [number, number][] = [[-0.02, WINDOWS[0].z0]];
  spans.push([WINDOWS[0].z1, WINDOWS[1].z0]);
  spans.push([WINDOWS[1].z1, ROOM.d + 0.02]);
  for (const [z0, z1] of spans) addBlock(z0, z1, y0, H);
  for (const w of WINDOWS) {
    addBlock(w.z0, w.z1, y0, w.y0);
    addBlock(w.z0, w.z1, w.y1, H);
  }

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.d + 0.04, H),
    wallpaperMaterial(new THREE.Vector2(ROOM.d + 0.04, H), { flipU: true, cutWindows: true }),
  );
  paper.geometry.rotateY(Math.PI / 2);
  paper.position.set(0.012, H / 2, ROOM.d / 2);
  paper.castShadow = false;
  paper.receiveShadow = true;
  g.add(paper);

  const capMat = lambert(PAL.wall);
  const cap = cyl(T * 0.62, T * 0.62, H, capMat, 12);
  cap.position.set(-T / 2, H / 2, ROOM.d);
  g.add(cap);

  const board = wood();
  const base = box(0.045, 0.09, ROOM.d, board);
  base.position.set(0.03, ROOM.floorY + 0.045, ROOM.d / 2);
  g.add(base);
  return g;
}

function buildRightWall() {
  const g = new THREE.Group();
  const H = ROOM.wallH;
  const T = ROOM.wallT;
  const solid = box(ROOM.w, H, T, lambert(PAL.wallDeep));
  solid.position.set(ROOM.w / 2, H / 2, -T / 2);
  g.add(solid);

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.w + 0.04, H),
    wallpaperMaterial(new THREE.Vector2(ROOM.w + 0.04, H), { flipU: false, cutWindows: false }),
  );
  paper.position.set(ROOM.w / 2 - 0.02, H / 2, 0.012);
  paper.castShadow = false;
  paper.receiveShadow = true;
  g.add(paper);

  const cap = cyl(T * 0.62, T * 0.62, H, lambert(PAL.wall), 12);
  cap.position.set(ROOM.w, H / 2, -T / 2);
  g.add(cap);

  const base = box(ROOM.w, 0.09, 0.045, woodDeep());
  base.position.set(ROOM.w / 2, ROOM.floorY + 0.045, 0.03);
  g.add(base);

  const corner = cyl(0.07, 0.07, H, lambert(PAL.wallDeep), 10);
  corner.position.set(-0.02, H / 2, -0.02);
  g.add(corner);
  paper.castShadow = false;
  return g;
}

function buildWindows() {
  const g = new THREE.Group();
  for (const w of WINDOWS) {
    g.add(makeWindow((w.z0 + w.z1) / 2, w.z1 - w.z0, w.y0, w.y1 - w.y0));
  }
  return g;
}

function makeWindow(z: number, width: number, y0: number, height: number) {
  const g = new THREE.Group();
  const frame = woodMaterial(PAL.wood);
  const deep = woodMaterial(PAL.woodDeep);
  const t = 0.055;
  const x = 0.02;

  const add = (w: number, h: number, d: number, mat: THREE.Material, px: number, py: number, pz: number) => {
    const m = box(w, h, d, mat);
    m.position.set(px, py, pz);
    g.add(m);
    return m;
  };

  add(t, height + t * 2, t, frame, x, y0 + height / 2, z - width / 2);
  add(t, height + t * 2, t, frame, x, y0 + height / 2, z + width / 2);
  add(t, t, width, frame, x, y0 + height, z);
  add(t, t, width, deep, x, y0, z);
  add(t * 0.7, height, t * 0.55, frame, x + 0.01, y0 + height / 2, z);
  const rows = 3;
  for (let i = 1; i < rows; i++) {
    add(t * 0.55, t * 0.5, width, frame, x + 0.01, y0 + (height * i) / rows, z);
  }

  const glassMat = lambert(PAL.glass, { opacity: 0.42 });
  glassMat.depthWrite = false;
  const glass = box(0.02, height - 0.04, width - 0.06, glassMat);
  glass.position.set(x - 0.01, y0 + height / 2, z);
  glass.castShadow = false;
  g.add(glass);

  const glowMat = new THREE.MeshLambertMaterial({
    color: PAL.glassGlow,
    emissive: new THREE.Color("#c8ffe8"),
    emissiveIntensity: 0.7,
  });
  glowMat.userData.baseOpacity = 1;
  const glow = box(0.02, height - 0.08, width - 0.1, glowMat);
  glow.position.set(-0.06, y0 + height / 2, z);
  glow.castShadow = false;
  glow.receiveShadow = false;
  glow.userData.role = "windowGlow";
  glow.userData.day = 0.72;
  glow.userData.night = 0.08;
  g.add(glow);

  const sill = box(0.16, 0.045, width + 0.12, wood());
  sill.position.set(0.08, y0 - 0.01, z);
  g.add(sill);
  shade(g);
  glass.castShadow = false;
  glow.castShadow = false;
  glow.receiveShadow = false;
  return g;
}

function buildOutlet() {
  const g = new THREE.Group();
  const plate = box(0.11, 0.15, 0.025, lambert(PAL.outlet));
  plate.position.set(6.85, 0.72, 0.03);
  g.add(plate);
  for (const dy of [-0.028, 0.028]) {
    const slot = box(0.018, 0.055, 0.012, lambert("#c5c0b6"));
    slot.position.set(6.85, 0.72 + dy, 0.046);
    slot.castShadow = false;
    g.add(slot);
  }
  g.userData.ignorePick = true;
  return g;
}

export function buildGrid() {
  const g = new THREE.Group();
  g.name = "grid";
  const y = ROOM.floorY + 0.004;
  const pts: number[] = [];
  const step = ROOM.tile;
  for (let x = 0; x <= ROOM.w + 0.001; x += step) {
    pts.push(x, y, 0, x, y, ROOM.d);
  }
  for (let z = 0; z <= ROOM.d + 0.001; z += step) {
    pts.push(0, y, z, ROOM.w, y, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({
    color: "#b7a48c",
    transparent: true,
    opacity: 0.0,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.userData.ignorePick = true;
  g.add(lines);
  g.visible = false;
  g.userData.mat = mat;
  return g;
}
