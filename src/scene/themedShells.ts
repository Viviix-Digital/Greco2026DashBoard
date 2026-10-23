import * as THREE from "three";
import { box, cyl, lambert, slab } from "../geom";
import { concreteMaterial, hazardMaterial, stripedMaterial, tileMaterial } from "../materials";
import { ROOM } from "../theme";
import { pageShadow } from "./contactShadow";

function plinth(colorSide: string, colorTop: string) {
  const g = new THREE.Group();
  const plinthW = ROOM.w + 1.05;
  const plinthD = ROOM.d + 1.05;
  const geo = slab(plinthW, plinthD, 0.7, 0.5, 0.08);
  geo.computeBoundingBox();
  const h = geo.boundingBox?.max.y ?? 0.7;
  // Two-tone plinth approximated with a side block + top slab.
  const side = new THREE.Mesh(geo, lambert(colorSide));
  side.position.set(ROOM.w / 2 - 0.08, -h, ROOM.d / 2 - 0.08);
  side.receiveShadow = true;
  const top = new THREE.Mesh(slab(plinthW - 0.1, plinthD - 0.1, 0.62, 0.45, 0.05), lambert(colorTop));
  top.position.set(ROOM.w / 2 - 0.08, -h + 0.06, ROOM.d / 2 - 0.08);
  top.receiveShadow = true;
  const drop = pageShadow(plinthW * 1.32, plinthD * 1.2);
  drop.position.set(ROOM.w / 2, -h + 0.02, ROOM.d / 2 + 0.2);
  g.add(side, top, drop);
  return g;
}

function floor(mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, 0.05, ROOM.d), mat);
  m.position.set(ROOM.w / 2, 0.025, ROOM.d / 2);
  m.receiveShadow = true;
  return m;
}

/** Open-air construction plot: concrete slab, low barriers + mesh fencing on the two walled edges. */
export function buildConstructionShell() {
  const g = new THREE.Group();
  g.name = "room-construction";
  g.add(plinth("#8a7a5f", "#9c8d6e"));
  g.add(floor(concreteMaterial()));

  const barrierMat = hazardMaterial();
  // Back edge (z = 0): concrete jersey barriers
  for (let i = 0; i < 5; i++) {
    const b = box(1.25, 0.55, 0.32, lambert("#b9bab2"));
    b.position.set(0.75 + i * 1.4, 0.3, 0.12);
    const stripe = box(1.25, 0.12, 0.34, barrierMat);
    stripe.position.set(0.75 + i * 1.4, 0.48, 0.12);
    g.add(b, stripe);
  }
  // Left edge (x = 0): posts + orange mesh panels + top rail
  for (let i = 0; i <= 6; i++) {
    const post = cyl(0.03, 0.03, 1.15, lambert("#55606b"), 8);
    post.position.set(0.1, 0.6, 0.3 + i * 1.02);
    g.add(post);
  }
  const mesh = box(0.02, 0.72, ROOM.d - 0.4, lambert("#e87f2e", { opacity: 0.55 }));
  mesh.position.set(0.1, 0.62, ROOM.d / 2);
  mesh.castShadow = false;
  const rail = cyl(0.025, 0.025, ROOM.d - 0.3, lambert("#f2b705"), 8);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(0.1, 1.02, ROOM.d / 2);
  g.add(mesh, rail);

  // Distant unfinished block behind the back edge (silhouette, no shadow cost)
  const tower = box(1.4, 2.6, 0.5, lambert("#9aa0a4"));
  tower.position.set(5.4, 1.3, -0.75);
  tower.castShadow = false;
  const tower2 = box(0.9, 1.7, 0.5, lambert("#a8adb0"));
  tower2.position.set(6.6, 0.85, -0.7);
  tower2.castShadow = false;
  g.add(tower, tower2);
  for (let i = 0; i < 3; i++) {
    const slabEdge = box(1.5, 0.08, 0.56, lambert("#8b9094"));
    slabEdge.position.set(5.4, 0.7 + i * 0.85, -0.75);
    slabEdge.castShadow = false;
    g.add(slabEdge);
  }
  // Warning sign on the fence
  const sign = box(0.55, 0.4, 0.03, lambert("#f7f2e8"));
  sign.position.set(0.14, 0.75, 3.2);
  sign.rotation.y = Math.PI / 2;
  const signStripe = box(0.55, 0.1, 0.035, barrierMat);
  signStripe.position.copy(sign.position);
  signStripe.position.y = 0.88;
  signStripe.rotation.y = Math.PI / 2;
  g.add(sign, signStripe);
  return g;
}

/** Restaurant / convenience store: tiled floor, storefront glass + awning, warm side wall with windows. */
export function buildStoreShell() {
  const g = new THREE.Group();
  g.name = "room-store";
  g.add(plinth("#c9a68a", "#a8bf97"));
  g.add(floor(tileMaterial({ floorA: "#fdf6ea", floorB: "#f3e3cb", grout: "#d8c3a5", tileSize: 0.32, key: "store" })));

  const wallMat = lambert("#f0dfc2");
  const wallDeep = lambert("#dfc49c");
  // Back edge (z = 0): storefront — low wall, glass, awning, sign band
  const low = box(ROOM.w, 0.75, 0.16, wallDeep);
  low.position.set(ROOM.w / 2, 0.4, -0.02);
  g.add(low);
  const glassMat = lambert("#c5efdf", { opacity: 0.38 });
  glassMat.depthWrite = false;
  const glass = box(ROOM.w - 0.5, 1.55, 0.03, glassMat);
  glass.position.set(ROOM.w / 2, 1.62, -0.02);
  glass.castShadow = false;
  g.add(glass);
  const glowMat = new THREE.MeshLambertMaterial({ color: "#fff3d6", emissive: new THREE.Color("#ffe9bb"), emissiveIntensity: 0.5 });
  const glow = box(ROOM.w - 0.7, 1.4, 0.02, glowMat);
  glow.position.set(ROOM.w / 2, 1.62, -0.09);
  glow.castShadow = false;
  glow.userData.role = "windowGlow";
  glow.userData.day = 0.6;
  glow.userData.night = 0.25;
  g.add(glow);
  for (let i = 0; i <= 6; i++) {
    const mullion = box(0.07, 1.65, 0.06, lambert("#b5814a"));
    mullion.position.set(0.35 + i * 1.08, 1.62, -0.01);
    g.add(mullion);
  }
  const header = box(ROOM.w, 0.5, 0.18, lambert("#d9574a"));
  header.position.set(ROOM.w / 2, 2.68, -0.02);
  g.add(header);
  const signBand = box(3.2, 0.3, 0.05, lambert("#f7f2e8"));
  signBand.position.set(ROOM.w / 2, 2.68, 0.06);
  g.add(signBand);
  const signDot = cyl(0.09, 0.09, 0.04, lambert("#63a86b"), 14);
  signDot.rotation.x = Math.PI / 2;
  signDot.position.set(ROOM.w / 2 - 1.25, 2.68, 0.09);
  const signLine = box(1.7, 0.09, 0.03, lambert("#4a4f58"));
  signLine.position.set(ROOM.w / 2 + 0.35, 2.68, 0.09);
  g.add(signDot, signLine);
  // Awning, slanted striped canopy over the storefront
  const awning = box(ROOM.w - 0.6, 0.05, 0.85, stripedMaterial());
  awning.position.set(ROOM.w / 2, 2.32, 0.38);
  awning.rotation.x = 0.38;
  g.add(awning);

  // Left edge (x = 0): warm wall with two big cafe windows
  const H = 2.95;
  const wall = box(0.16, H, ROOM.d, wallMat);
  wall.position.set(-0.02, H / 2, ROOM.d / 2);
  g.add(wall);
  const wins: [number, number][] = [[1.35, 2.65], [3.55, 4.85]];
  for (const [z0, z1] of wins) {
    const zc = (z0 + z1) / 2;
    const wdt = z1 - z0;
    const frameMat = lambert("#b5814a");
    const top = box(0.06, 0.07, wdt + 0.1, frameMat);
    top.position.set(0.08, 2.35, zc);
    const bot = box(0.06, 0.07, wdt + 0.1, frameMat);
    bot.position.set(0.08, 0.95, zc);
    const mid = box(0.05, 0.05, wdt, frameMat);
    mid.position.set(0.08, 1.65, zc);
    const gGlass = box(0.02, 1.32, wdt - 0.05, glassMat);
    gGlass.position.set(0.06, 1.65, zc);
    gGlass.castShadow = false;
    const sill = box(0.18, 0.05, wdt + 0.14, lambert("#c48a55"));
    sill.position.set(0.1, 0.92, zc);
    g.add(top, bot, mid, gGlass, sill);
  }
  const baseboard = box(0.05, 0.1, ROOM.d, lambert("#c48a55"));
  baseboard.position.set(0.09, 0.1, ROOM.d / 2);
  g.add(baseboard);
  return g;
}

const BOOTH_ORANGE = ["#ff4d0a", "#ff6a1a", "#ff8535", "#ffa05c", "#ffc090", "#ffe0c8", "#fff5ee"];

/** Stacked horizontal bands approximating an orange→white vertical gradient. */
function gradientWallFace(w: number, h: number, depth: number) {
  const g = new THREE.Group();
  const n = BOOTH_ORANGE.length;
  const bandH = h / n;
  for (let i = 0; i < n; i++) {
    const band = box(w, bandH + 0.01, depth, lambert(BOOTH_ORANGE[i]));
    band.position.y = h - (i + 0.5) * bandH;
    band.castShadow = i < 2;
    g.add(band);
  }
  return g;
}

function brandMark(parent: THREE.Group, x: number, y: number, z: number, rotY = 0) {
  const mark = new THREE.Group();
  const cube = box(0.12, 0.12, 0.04, lambert("#e6331a"));
  const bar1 = box(0.42, 0.055, 0.03, lambert("#d92a12"));
  bar1.position.set(0.32, 0.03, 0);
  const bar2 = box(0.28, 0.04, 0.025, lambert("#c42510"));
  bar2.position.set(0.25, -0.05, 0);
  mark.add(cube, bar1, bar2);
  mark.position.set(x, y, z);
  mark.rotation.y = rotY;
  parent.add(mark);
}

/** Mini exhibition check-in booth: grey carpet, orange L-wall with displays. */
export function buildBoothShell() {
  const g = new THREE.Group();
  g.name = "room-booth";
  g.add(plinth("#b8bcc2", "#d0d4d8"));

  const carpet = floor(lambert("#9aa0a8"));
  g.add(carpet);
  // White border band around the carpet edge
  const borderMat = lambert("#f4f5f7");
  const bw = 0.08;
  const edgeN = box(ROOM.w, 0.02, bw, borderMat);
  edgeN.position.set(ROOM.w / 2, 0.055, bw / 2);
  edgeN.castShadow = false;
  const edgeS = box(ROOM.w, 0.02, bw, borderMat);
  edgeS.position.set(ROOM.w / 2, 0.055, ROOM.d - bw / 2);
  edgeS.castShadow = false;
  const edgeW = box(bw, 0.02, ROOM.d - bw * 2, borderMat);
  edgeW.position.set(bw / 2, 0.055, ROOM.d / 2);
  edgeW.castShadow = false;
  const edgeE = box(bw, 0.02, ROOM.d - bw * 2, borderMat);
  edgeE.position.set(ROOM.w - bw / 2, 0.055, ROOM.d / 2);
  edgeE.castShadow = false;
  g.add(edgeN, edgeS, edgeW, edgeE);

  const wallH = 3.05;
  // Back wall (z ≈ 0): full-width orange gradient face
  const back = gradientWallFace(ROOM.w - 0.15, wallH, 0.14);
  back.position.set(ROOM.w / 2 + 0.05, 0, 0.05);
  g.add(back);

  // Left L-return (x ≈ 0): shorter depth so the open corner reads clearly
  const returnD = 2.85;
  const side = gradientWallFace(0.14, wallH, returnD);
  side.position.set(0.07, 0, returnD / 2 + 0.05);
  g.add(side);

  brandMark(g, 1.15, 2.72, 0.16);

  // Large recessed media display on the back wall
  const frame = box(2.65, 1.45, 0.08, lambert("#2a2e34"));
  frame.position.set(3.15, 1.55, 0.16);
  const screenMat = new THREE.MeshLambertMaterial({
    color: "#1a4a3a",
    emissive: new THREE.Color("#3ecf8a"),
    emissiveIntensity: 0.55,
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.28, 0.03), screenMat);
  screen.position.set(3.15, 1.55, 0.22);
  screen.castShadow = false;
  screen.userData.role = "windowGlow";
  screen.userData.day = 0.55;
  screen.userData.night = 0.95;
  // Abstract “ad” bars on the screen
  const ad1 = box(0.7, 0.12, 0.02, lambert("#7dffb0", { emissive: "#4dff90", emissiveIntensity: 0.4 }));
  ad1.position.set(2.55, 1.85, 0.25);
  ad1.castShadow = false;
  const ad2 = box(0.45, 0.08, 0.02, lambert("#e8f5ee"));
  ad2.position.set(2.45, 1.65, 0.25);
  ad2.castShadow = false;
  const figure = box(0.35, 0.7, 0.02, lambert("#2d8a55", { emissive: "#3ecf8a", emissiveIntensity: 0.25 }));
  figure.position.set(3.85, 1.45, 0.25);
  figure.castShadow = false;
  g.add(frame, screen, ad1, ad2, figure);

  // Smaller side monitor mounted on the back wall (right of the large display)
  const smallFrame = box(1.05, 0.62, 0.06, lambert("#2a2e34"));
  smallFrame.position.set(5.55, 1.85, 0.15);
  const smallScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.5, 0.025),
    new THREE.MeshLambertMaterial({
      color: "#3a5068",
      emissive: new THREE.Color("#6a9cc8"),
      emissiveIntensity: 0.45,
    }),
  );
  smallScreen.position.set(5.55, 1.85, 0.2);
  smallScreen.castShadow = false;
  smallScreen.userData.role = "windowGlow";
  smallScreen.userData.day = 0.4;
  smallScreen.userData.night = 0.85;
  const hill = box(0.55, 0.12, 0.015, lambert("#8fbf88"));
  hill.position.set(5.4, 1.72, 0.22);
  hill.castShadow = false;
  g.add(smallFrame, smallScreen, hill);

  return g;
}
