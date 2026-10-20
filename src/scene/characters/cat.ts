import * as THREE from "three";
import { box, colorize, lambert, sphere, tube } from "../../geom";
import { furMaterial } from "../../materials";
import { PAL } from "../../theme";

export function buildCat() {
  const g = new THREE.Group();
  const orange = new THREE.Color(PAL.cat);
  const deep = new THREE.Color(PAL.catDeep);
  const white = new THREE.Color(PAL.catWhite);
  const fur = furMaterial();

  const bodyGeo = new THREE.SphereGeometry(0.22, 24, 16);
  bodyGeo.scale(1.25, 0.62, 0.95);
  colorize(bodyGeo, (x, y, z) => {
    if (y < -0.04 || (z > 0.05 && y < 0.05)) return white;
    if (x > 0.08 && y > 0.02) return deep;
    return orange;
  });
  const body = new THREE.Mesh(bodyGeo, fur);
  body.position.set(0, 0.15, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  const headGeo = new THREE.SphereGeometry(0.12, 18, 14);
  colorize(headGeo, (x, y, z) => (z > 0.01 && y < 0.03 && Math.abs(x) < 0.1 ? white : y > 0.03 ? deep : orange));
  const headMesh = new THREE.Mesh(headGeo, fur);
  headMesh.position.set(0.16, 0.2, 0.14);
  headMesh.castShadow = true;
  g.add(headMesh);

  for (const sx of [-1, 1]) {
    const earGeo = new THREE.ConeGeometry(0.045, 0.09, 8);
    colorize(earGeo, () => orange);
    const ear = new THREE.Mesh(earGeo, fur);
    ear.position.set(0.16 + sx * 0.05, 0.32, 0.12);
    ear.castShadow = true;
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 6), lambert(PAL.pink));
    inner.position.set(0.16 + sx * 0.05, 0.31, 0.145);
    g.add(ear, inner);
  }

  const tail = tube(
    [
      new THREE.Vector3(-0.18, 0.16, -0.04),
      new THREE.Vector3(-0.32, 0.24, 0.08),
      new THREE.Vector3(-0.12, 0.18, 0.22),
      new THREE.Vector3(0.06, 0.14, 0.16),
    ],
    0.03,
    fur,
    14,
  );
  colorize(tail.geometry, (x, y, z) => (x > -0.02 && z > 0.12 && y < 0.3 ? white : orange));
  g.add(tail);

  const lid = lambert(PAL.ink);
  for (const sx of [-1, 1]) {
    const eye = box(0.028, 0.007, 0.008, lid);
    eye.position.set(0.18 + sx * 0.035, 0.21, 0.24);
    eye.rotation.z = sx * -0.35;
    eye.castShadow = false;
    g.add(eye);
  }
  const nose = sphere(0.012, lambert(PAL.pink), 6);
  nose.position.set(0.2, 0.175, 0.25);
  g.add(nose);
  g.scale.setScalar(1.18);

  let t = Math.random() * 6;
  g.userData.tick = (dt: number) => {
    t += dt;
    const k = Math.sin((t * Math.PI * 2) / 3.1);
    body.scale.set(1 + k * 0.008, 1 + k * 0.022, 1 + k * 0.008);
  };
  g.userData.foot = [0.7, 0.55];
  return g;
}
