import * as THREE from "three";
import { lerp, tween } from "../anim";
import { DAY, NIGHT, ROOM, ZOOMS } from "../theme";
import { contactShadow } from "./contactShadow";
import type { World } from "./createScene";
import { setShadowMapSize } from "./lights";
import { createObject, footprintOf, type SceneItem } from "./objects";
import { buildRoom } from "./room";
import { THEMES, type ThemeId } from "./themes";

export type RoomViewState = {
  zoom: string;
  night: boolean;
  mute: boolean;
  theme: ThemeId;
};

function disposeGroup(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.SkinnedMesh) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m.dispose();
    }
  });
  root.removeFromParent();
}

const RUG_H = 0.038;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Rug = { x: number; z: number; hw: number; hd: number; rot: number };

/**
 * The static room: backdrop furniture, zoom and day/night lighting.
 * Furniture is fixed; the figures standing in it come from the live feed.
 */
export class RoomView {
  ready = false;
  private nodes = new Map<string, THREE.Group>();
  private rugs: Rug[] = [];
  private zoomIndex = 1;
  private night = false;
  private nightK = 0;
  private muted = false;
  private shadowWarmup = 2;
  private listeners = new Set<() => void>();

  constructor(private world: World, private themeId: ThemeId = "room") {
    for (const item of THEMES[this.themeId].items) this.spawn(item);
    this.applyLight(0);
  }

  get theme() {
    return this.themeId;
  }

  /** Swap the whole static scene (shell + props) to another theme, disposing the old geometry. */
  setTheme(id: ThemeId) {
    if (id === this.themeId && this.nodes.size) return;
    this.themeId = id;
    disposeGroup(this.world.shell);
    const shell = buildRoom(id);
    this.world.shell = shell;
    this.world.scene.add(shell);
    for (const node of [...this.nodes.values()]) disposeGroup(node);
    this.nodes.clear();
    this.rugs = [];
    // world.items itself stays in the scene; only its children were disposed above.
    this.world.items.clear();
    for (const item of THEMES[id].items) this.spawn(item);
    this.shadowWarmup = 2;
    this.ready = false;
    this.applyLight(this.nightK);
    this.world.lights.sun.shadow.needsUpdate = true;
    this.emit();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  view(): RoomViewState {
    return { zoom: ZOOMS[this.zoomIndex].label, night: this.night, mute: this.muted, theme: this.themeId };
  }

  get isMuted() {
    return this.muted;
  }

  update(dt = 1 / 60) {
    for (const node of this.nodes.values()) {
      const tick = node.userData.tick as ((dt: number) => void) | undefined;
      if (tick) tick(dt);
    }
    if (this.shadowWarmup > 0) {
      this.world.lights.sun.shadow.needsUpdate = true;
      this.shadowWarmup -= 1;
      if (this.shadowWarmup === 0) this.ready = true;
    }
  }

  /** Walking surface height at a floor point: tile, or the rug pile. */
  groundAt = (x: number, z: number) => {
    let h = 0;
    for (const r of this.rugs) {
      const c = Math.cos(r.rot);
      const s = Math.sin(r.rot);
      const dx = x - r.x;
      const dz = z - r.z;
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const inset = Math.min(r.hw - Math.abs(lx), r.hd - Math.abs(lz));
      h = Math.max(h, smooth(clamp(inset / 0.08, 0, 1)));
    }
    return ROOM.floorY + RUG_H * h;
  };

  stepZoom(dir: number) {
    const next = Math.min(ZOOMS.length - 1, Math.max(0, this.zoomIndex + dir));
    if (next === this.zoomIndex) return;
    this.zoomTo(next, ZOOMS[next].zoom);
  }

  home() {
    this.zoomTo(1, 1);
  }

  toggleDay() {
    this.night = !this.night;
    const from = this.nightK;
    const to = this.night ? 1 : 0;
    tween(360, (k) => {
      this.nightK = lerp(from, to, k);
      this.applyLight(this.nightK);
    }, () => {
      this.world.lights.sun.shadow.needsUpdate = true;
    });
    this.emit();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.emit();
  }

  screenshot() {
    this.world.renderer.render(this.world.scene, this.world.camera);
    const url = this.world.renderer.domElement.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "room.png";
    a.click();
  }

  setShadowSize(size: number) {
    setShadowMapSize(this.world.lights.sun, size);
    this.world.lights.sun.shadow.needsUpdate = true;
  }

  private zoomTo(index: number, zoom: number) {
    const from = this.world.camera.zoom;
    this.zoomIndex = index;
    tween(220, (k) => {
      this.world.camera.zoom = lerp(from, zoom, k);
      this.world.camera.updateProjectionMatrix();
    });
    this.emit();
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private spawn(item: SceneItem) {
    const group = createObject(item.kind);
    const [w, d] = footprintOf(group);
    const isGround = !!item.ground || item.kind === "rug";
    const shadow = contactShadow(w * 0.92, d * 0.92, isGround ? 0.18 : 0.24);
    if (group.position.y > 0.1) shadow.visible = false; // wall-mounted: no floor shadow
    group.add(shadow);
    // Builders may raise wall-mounted props (frame, menu board, sign) via group.position.y.
    group.position.set(item.x, ROOM.floorY + group.position.y, item.z);
    group.rotation.y = item.rot;
    this.world.items.add(group);
    this.nodes.set(item.id, group);
    if (isGround) {
      this.rugs.push({ x: item.x, z: item.z, hw: w / 2, hd: d / 2, rot: item.rot });
    }
    for (const child of group.children) {
      if (child.userData.role === "contact") {
        const onRug = !isGround && this.onRug(item.x, item.z);
        child.position.y = onRug ? 0.046 : 0.008;
      }
    }
  }

  private onRug(x: number, z: number) {
    return this.rugs.some((r) => Math.abs(x - r.x) < r.hw && Math.abs(z - r.z) < r.hd);
  }

  private applyLight(k: number) {
    const { sun, hemi, amb, fill } = this.world.lights;
    sun.intensity = lerp(DAY.sun, NIGHT.sun, k);
    hemi.intensity = lerp(DAY.hemi, NIGHT.hemi, k);
    amb.intensity = lerp(DAY.amb, NIGHT.amb, k);
    fill.intensity = lerp(DAY.fill, NIGHT.fill, k);
    hemi.color.set(DAY.sky).lerp(new THREE.Color(NIGHT.sky), k);
    hemi.groundColor.set(DAY.ground).lerp(new THREE.Color(NIGHT.ground), k);
    this.world.scene.traverse((o) => {
      if (o instanceof THREE.PointLight && o.userData.role === "lampLight") {
        o.intensity = lerp(o.userData.day as number, o.userData.night as number, k);
      }
      if (o instanceof THREE.Mesh && o.userData.role === "shade") {
        const m = o.material as THREE.MeshLambertMaterial;
        m.emissiveIntensity = lerp(o.userData.day as number, o.userData.night as number, k);
      }
      if (o instanceof THREE.Mesh && o.userData.role === "windowGlow") {
        const m = o.material as THREE.MeshLambertMaterial;
        m.emissiveIntensity = lerp(o.userData.day as number, o.userData.night as number, k);
      }
      if (o instanceof THREE.Mesh && o.userData.role === "lampBlob") {
        const m = o.material as THREE.ShaderMaterial;
        m.uniforms.uOpacity.value = lerp(o.userData.day as number, o.userData.night as number, k);
      }
    });
  }
}
