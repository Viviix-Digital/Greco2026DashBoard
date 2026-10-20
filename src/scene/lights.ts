import * as THREE from "three";
import { DAY, ROOM } from "../theme";

export type LightRig = {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  amb: THREE.AmbientLight;
  fill: THREE.DirectionalLight;
};

export function createLights(scene: THREE.Scene): LightRig {
  const hemi = new THREE.HemisphereLight(DAY.sky, DAY.ground, DAY.hemi);
  const amb = new THREE.AmbientLight("#fff8f2", DAY.amb);
  const fill = new THREE.DirectionalLight("#fff6ee", DAY.fill);
  fill.position.set(ROOM.w + 5, 7.5, ROOM.d + 4);

  const sun = new THREE.DirectionalLight("#fff5ea", DAY.sun);
  sun.position.set(-2.8, 4.15, 3.15);
  sun.target.position.set(3.4, 0.15, 3.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.00018;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 7;
  sun.shadow.blurSamples = 16;
  const cam = sun.shadow.camera;
  cam.left = -7.2;
  cam.right = 7.2;
  cam.top = 7.2;
  cam.bottom = -7.2;
  cam.near = 0.5;
  cam.far = 26;
  cam.updateProjectionMatrix();

  scene.add(hemi, amb, fill, sun, sun.target);
  return { sun, hemi, amb, fill };
}

export function setShadowMapSize(sun: THREE.DirectionalLight, size: number) {
  sun.shadow.mapSize.set(size, size);
  sun.shadow.map?.dispose();
  sun.shadow.map = null;
  sun.shadow.needsUpdate = true;
}
