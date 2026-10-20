import * as THREE from "three";
import { CAM } from "../theme";

export function createCamera() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const v = CAM.view;
  const camera = new THREE.OrthographicCamera(-v * aspect, v * aspect, v, -v, 0.1, 80);
  placeCamera(camera);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  return camera;
}

export function placeCamera(camera: THREE.OrthographicCamera) {
  const [tx, ty, tz] = CAM.target;
  const dist = CAM.dist;
  camera.position.set(
    tx + dist * Math.cos(CAM.elev) * Math.sin(CAM.yaw),
    ty + dist * Math.sin(CAM.elev),
    tz + dist * Math.cos(CAM.elev) * Math.cos(CAM.yaw),
  );
  camera.lookAt(tx, ty, tz);
}

export function resizeCamera(camera: THREE.OrthographicCamera, width: number, height: number) {
  const aspect = width / Math.max(1, height);
  const v = CAM.view;
  camera.left = -v * aspect;
  camera.right = v * aspect;
  camera.top = v;
  camera.bottom = -v;
  camera.updateProjectionMatrix();
}
