import * as THREE from "three";
import { createCamera, resizeCamera } from "./camera";
import { createLights, type LightRig } from "./lights";
import { buildGrid, buildRoom } from "./room";

import type { ThemeId } from "./themes/types";

export type World = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  lights: LightRig;
  shell: THREE.Group;
  items: THREE.Group;
  grid: THREE.Group;
};

export function createWorld(canvas: HTMLCanvasElement, theme: ThemeId = "room"): World {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = createCamera();
  const lights = createLights(scene);
  const shell = buildRoom(theme);
  scene.add(shell);
  const items = new THREE.Group();
  items.name = "items";
  scene.add(items);
  const grid = buildGrid();
  scene.add(grid);

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    resizeCamera(camera, w, h);
  };
  window.addEventListener("resize", resize);

  return { renderer, scene, camera, lights, shell, items, grid };
}
