import * as THREE from "three";
import { box, cyl, lambert, sphere } from "../../geom";
import { PAL } from "../../theme";
import { cup, sheet } from "../parts";
import { Avatar } from "./avatar";

const V = THREE.Vector3;

const footQuat = (pitch: number, yaw: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));

function wrap(av: Avatar, foot: [number, number], extra?: (dt: number, t: number) => void) {
  const g = new THREE.Group();
  g.add(av.root);
  g.userData.foot = foot;
  let t = Math.random() * 8;
  const period = 2.6 + Math.random() * 0.6;
  g.userData.tick = (dt: number) => {
    t += dt;
    const k = Math.sin((t * Math.PI * 2) / period);
    av.chest.scale.set(1 + k * 0.004, 1 + k * 0.012, 1 + k * 0.004);
    extra?.(dt, t);
  };
  return g;
}

/** Sits on the low bench, both mitts holding a small green book. */
export function buildReader() {
  const av = new Avatar({
    top: PAL.sweaterCream,
    topAlt: "#d6bd9d",
    bottom: PAL.pantsBlue,
    shoe: PAL.shoe,
    hair: PAL.hair,
    hairStyle: "short",
  });
  av.pelvis.position.set(0, 0.342, -0.02);
  av.pelvis.rotation.set(-0.05, 0, 0);
  av.spine.rotation.set(0.2, 0, 0);
  av.chest.rotation.set(0.14, 0, 0);
  av.head.rotation.set(0.1, 0.06, 0.03);
  av.legIK(0, new V(0.095, 0.08, 0.2), footQuat(0.05, 0.14));
  av.legIK(1, new V(-0.095, 0.08, 0.17), footQuat(0.05, -0.1));
  av.armIK(0, new V(0.085, 0.52, 0.19), 0.6, -0.1);
  av.armIK(1, new V(-0.085, 0.52, 0.19), 0.6, -0.1);

  const book = new THREE.Group();
  book.add(box(0.15, 0.018, 0.19, lambert("#6faa62")));
  const pages = box(0.13, 0.012, 0.16, lambert(PAL.pageBlock));
  pages.position.y = 0.014;
  book.add(pages);
  const spine = box(0.012, 0.022, 0.19, lambert("#58944f"));
  spine.position.set(0, 0.002, 0);
  book.add(spine);
  book.position.set(0, 0.5, 0.215);
  book.rotation.x = -0.95;
  av.root.add(book);
  return wrap(av, [0.46, 0.5]);
}

/** Stands beside the easel, brush on canvas, palette in the other hand. */
export function buildPainter() {
  const av = new Avatar({
    top: PAL.dress,
    topAlt: "#8d5a38",
    bottom: "#5b3b2d",
    shoe: "#4a3024",
    hair: PAL.hairLong,
    hairStyle: "long",
    beret: PAL.beret,
    lower: "skirt",
    skirtColor: PAL.dress,
  });
  av.pelvis.position.set(-0.014, 0.388, 0);
  av.pelvis.rotation.set(0, 0.06, 0.035);
  av.spine.rotation.set(0.1, -0.05, -0.02);
  av.chest.rotation.set(0.08, 0.2, -0.03);
  av.head.rotation.set(-0.12, -0.12, 0.05);
  av.legIK(0, new V(0.1, 0.08, 0.05), footQuat(0, 0.2));
  av.legIK(1, new V(-0.082, 0.08, -0.05), footQuat(0, -0.12));
  const wristTarget = new V(-0.07, 0.86, 0.24);
  av.armIK(1, wristTarget, 0.5, -0.1);
  av.armIK(0, new V(0.17, 0.56, 0.16), 0.6, -0.1);

  const brush = new THREE.Group();
  brush.add(cyl(0.007, 0.007, 0.18, lambert(PAL.woodDark), 6));
  const tip = sphere(0.015, lambert("#f4f1ea"), 8);
  tip.scale.set(1, 1.5, 1);
  tip.position.y = 0.1;
  brush.add(tip);
  const paint = sphere(0.011, lambert("#d86a5a"), 8);
  paint.position.y = 0.114;
  brush.add(paint);
  av.root.add(brush);

  const palette = new THREE.Group();
  const board = cyl(0.085, 0.085, 0.012, lambert("#d9b58a"), 20);
  board.scale.set(1, 1, 0.72);
  palette.add(board);
  const dabs = ["#d86a5a", "#f0c14a", "#6d90d2", "#7dba78"];
  dabs.forEach((c, i) => {
    const d = sphere(0.014, lambert(c), 8);
    d.scale.set(1, 0.5, 1);
    const a = -1 + i * 0.7;
    d.position.set(Math.sin(a) * 0.05, 0.01, -Math.cos(a) * 0.03);
    palette.add(d);
  });
  palette.position.set(0.17, 0.585, 0.2);
  palette.rotation.set(0.35, 0.5, -0.2);
  av.root.add(palette);

  const place = () => {
    av.root.updateMatrixWorld(true);
    const w = av.wristInRoot(1);
    brush.position.copy(w).add(new V(0.0, 0.018, 0.03));
    brush.rotation.set(1.15, 0, -0.1);
  };
  place();
  let acc = 0;
  return wrap(av, [0.42, 0.42], (dt, t) => {
    acc += dt;
    if (acc < 1 / 30) return;
    acc = 0;
    const stroke = Math.sin(t * 2.2);
    wristTarget.set(-0.07 + stroke * 0.035, 0.86 + Math.sin(t * 1.1) * 0.015, 0.24);
    av.armIK(1, wristTarget, 0.5, -0.1);
    place();
  });
}

/** Perched on a toy stool facing the table, both mitts around a cup. */
export function buildGirl() {
  const av = new Avatar({
    top: PAL.yellow,
    topAlt: "#e2ae3a",
    bottom: PAL.girlPants,
    shoe: "#cfc8bc",
    hair: PAL.hair,
    hairStyle: "bun",
  });
  av.pelvis.position.set(0, 0.342, -0.02);
  av.pelvis.rotation.set(-0.03, 0, 0);
  av.spine.rotation.set(0.1, 0.0, 0);
  av.chest.rotation.set(0.08, 0.04, 0);
  av.head.rotation.set(0.2, -0.06, 0.04);
  av.legIK(0, new V(0.095, 0.08, 0.17), footQuat(0.05, 0.1));
  av.legIK(1, new V(-0.095, 0.08, 0.14), footQuat(0.05, -0.1));
  av.armIK(0, new V(0.055, 0.5, 0.27), 0.5, -0.1);
  av.armIK(1, new V(-0.055, 0.5, 0.27), 0.5, -0.1);
  const mug = cup("#f7f4ef");
  mug.position.set(0, 0.46, 0.3);
  mug.scale.setScalar(1.15);
  mug.rotation.y = Math.PI / 2;
  av.root.add(mug);
  return wrap(av, [0.4, 0.42]);
}

/** Lies on the rug on his stomach, propped on his forearms, pencil on paper, feet kicked up. */
export function buildDrawing() {
  const av = new Avatar({
    top: PAL.greenSweater,
    topAlt: "#2f7a46",
    bottom: PAL.beige,
    shoe: PAL.shoe,
    hair: PAL.hairBrown,
    hairStyle: "short",
  });
  av.pelvis.position.set(0, 0.12, -0.34);
  av.pelvis.rotation.set(1.42, 0, 0);
  av.spine.rotation.set(-0.12, 0, 0);
  av.chest.rotation.set(-0.12, 0, 0);
  av.neck.rotation.set(0.0, 0, 0);
  av.head.rotation.set(-0.6, 0.12, -0.12);
  av.root.position.y = 0.04;
  av.legIK(0, new V(0.07, 0.32, -0.56), footQuat(-1.15, 0.05), 0.2);
  av.legIK(1, new V(-0.07, 0.27, -0.6), footQuat(-1.25, -0.05), 0.2);

  const wristR = new V(-0.1, 0.07, 0.3);
  av.armIK(0, new V(0.14, 0.06, 0.24), 0.8, 0.2);
  av.armIK(1, wristR, 0.8, 0.2);

  const paper = sheet(0.46, 0.34, true);
  paper.position.set(0.0, 0.0, 0.4);
  paper.rotation.y = 0.12;
  av.root.add(paper);
  const pencil = new THREE.Group();
  pencil.add(cyl(0.008, 0.008, 0.18, lambert("#e2b34a"), 6));
  const lead = sphere(0.009, lambert("#444"), 6);
  lead.position.y = -0.09;
  pencil.add(lead);
  av.root.add(pencil);
  const place = () => {
    av.root.updateMatrixWorld(true);
    const w = av.wristInRoot(1);
    pencil.position.copy(w).add(new V(0.0, -0.02, 0.05));
    pencil.rotation.set(-1.0, 0, 0.1);
  };
  place();
  let acc = 0;
  return wrap(av, [0.7, 1.2], (dt, t) => {
    acc += dt;
    if (acc < 1 / 30) return;
    acc = 0;
    wristR.set(-0.1 + Math.sin(t * 3.1) * 0.02, 0.07, 0.3 + Math.sin(t * 2.3) * 0.015);
    av.armIK(1, wristR, 0.8, 0.2);
    place();
  });
}
