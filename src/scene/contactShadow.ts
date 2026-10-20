import * as THREE from "three";
import { blobMaterial } from "../materials";

export function contactShadow(w: number, d: number, opacity = 0.22) {
  const geo = new THREE.PlaneGeometry(Math.max(0.18, w), Math.max(0.18, d));
  geo.rotateX(-Math.PI / 2);
  const mat = blobMaterial(opacity);
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -2;
  mat.polygonOffsetUnits = -2;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.008;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.renderOrder = 2;
  mesh.userData.ignorePick = true;
  mesh.userData.role = "contact";
  return mesh;
}

export function pageShadow(w: number, d: number) {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  const mat = blobMaterial(0.42, "#245445");
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.68;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.renderOrder = -2;
  mesh.userData.ignorePick = true;
  return mesh;
}
