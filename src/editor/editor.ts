import * as THREE from "three";
import { lerp, tween } from "../anim";
import { Player, type Env, type Obstacle } from "../scene/characters/player";
import { contactShadow } from "../scene/contactShadow";
import type { World } from "../scene/createScene";
import { defaultItems } from "../scene/defaultScene";
import { setShadowMapSize } from "../scene/lights";
import {
  createObject,
  footprintOf,
  mountOf,
  type Kind,
  type SceneItem,
} from "../scene/objects";
import { DAY, NIGHT, ROOM, ZOOMS } from "../theme";

const WALKABLE = new Set<Kind>([
  "frame",
  "paper",
  "document",
  "plate",
  "cup",
  "acorn",
  "carrot",
  "ring",
  "book",
  "purplebook",
]);

type Pose = { x: number; z: number; rot: number };
type Cmd =
  | { t: "add"; item: SceneItem }
  | { t: "remove"; item: SceneItem }
  | { t: "move"; id: string; from: Pose; to: Pose };

type Tool = "select" | "move" | "place";

export type EditorView = {
  zoom: string;
  grid: boolean;
  move: boolean;
  night: boolean;
  hidden: boolean;
  mute: boolean;
  record: boolean;
  placeKind: Kind | null;
  canUndo: boolean;
};

export class Editor {
  readonly items: SceneItem[] = [];
  private nodes = new Map<string, THREE.Group>();
  private undoStack: Cmd[] = [];
  private tool: Tool = "select";
  private selected: string | null = null;
  private placeKind: Kind | null = null;
  private ghost: THREE.Group | null = null;
  private gridOn = false;
  private night = false;
  private nightK = 0;
  private showScatter = true;
  private muted = false;
  private recording = false;
  private zoomIndex = 1;
  private listeners = new Set<() => void>();
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ROOM.floorY);
  private hit = new THREE.Vector3();
  private dragging = false;
  private dragFrom: Pose | null = null;
  private ring: THREE.Mesh;
  private shadowWarmup = 2;
  ready = false;
  readonly player: Player;

  constructor(private world: World) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.28, 40),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = ROOM.floorY + 0.02;
    ring.visible = false;
    ring.userData.ignorePick = true;
    this.ring = ring;
    world.scene.add(ring);

    for (const item of defaultItems()) this.spawn(item, false);
    this.player = new Player(world.scene, () => this.collisionEnv());
    this.applyLight(0);
    this.bind();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  view(): EditorView {
    return {
      zoom: ZOOMS[this.zoomIndex].label,
      grid: this.gridOn,
      move: this.tool === "move",
      night: this.night,
      hidden: !this.showScatter,
      mute: this.muted,
      record: this.recording,
      placeKind: this.placeKind,
      canUndo: this.undoStack.length > 0,
    };
  }

  update(dt = 1 / 60) {
    this.player.update(dt);
    for (const node of this.nodes.values()) {
      const tick = node.userData.tick as ((dt: number) => void) | undefined;
      if (tick) tick(dt);
    }
    if (this.shadowWarmup > 0) {
      this.world.lights.sun.shadow.needsUpdate = true;
      this.shadowWarmup -= 1;
      if (this.shadowWarmup === 0) this.ready = true;
    }
    this.syncRing();
  }

  stepZoom(dir: number) {
    const next = Math.min(ZOOMS.length - 1, Math.max(0, this.zoomIndex + dir));
    if (next === this.zoomIndex) return;
    const from = this.world.camera.zoom;
    const to = ZOOMS[next].zoom;
    this.zoomIndex = next;
    tween(220, (k) => {
      this.world.camera.zoom = lerp(from, to, k);
      this.world.camera.updateProjectionMatrix();
    });
    this.emit();
  }

  home() {
    this.zoomIndex = 1;
    const from = this.world.camera.zoom;
    tween(220, (k) => {
      this.world.camera.zoom = lerp(from, 1, k);
      this.world.camera.updateProjectionMatrix();
    });
    this.selected = null;
    this.clearGhost();
    this.placeKind = null;
    if (this.tool === "place") this.tool = "select";
    this.emit();
  }

  toggleGrid() {
    this.gridOn = !this.gridOn;
    const grid = this.world.grid;
    const mat = grid.userData.mat as THREE.LineBasicMaterial;
    grid.visible = true;
    const from = mat.opacity;
    const to = this.gridOn ? 0.55 : 0;
    tween(180, (k) => {
      mat.opacity = lerp(from, to, k);
    }, () => {
      grid.visible = this.gridOn;
    });
    this.emit();
  }

  toggleMove() {
    this.tool = this.tool === "move" ? "select" : "move";
    if (this.tool === "move") {
      this.clearGhost();
      this.placeKind = null;
    }
    this.world.renderer.domElement.style.cursor = this.tool === "move" ? "grab" : "default";
    this.emit();
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

  toggleEye() {
    this.showScatter = !this.showScatter;
    const show = this.showScatter;
    for (const node of this.nodes.values()) {
      for (const target of scatterRoots(node)) {
        target.visible = true;
        tween(200, (k) => setOpacity(target, show ? k : 1 - k), () => {
          target.visible = show;
          if (show) setOpacity(target, 1);
        });
      }
    }
    this.emit();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.emit();
  }

  toggleRecord() {
    this.recording = !this.recording;
    this.emit();
  }

  beginPlace(kind: Kind) {
    if (this.placeKind === kind) {
      this.clearGhost();
      this.placeKind = null;
      this.tool = "select";
      this.emit();
      return;
    }
    this.placeKind = kind;
    this.tool = "place";
    this.rebuildGhost(kind);
    this.emit();
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    if (cmd.t === "add") this.destroy(cmd.item.id, false);
    else if (cmd.t === "remove") this.spawn(cmd.item, true);
    else {
      const item = this.items.find((it) => it.id === cmd.id);
      if (item) {
        item.x = cmd.from.x;
        item.z = cmd.from.z;
        item.rot = cmd.from.rot;
        this.placeNode(item);
      }
    }
    this.bakeShadow();
    this.emit();
  }

  reset() {
    this.clearGhost();
    this.placeKind = null;
    this.selected = null;
    this.tool = "select";
    for (const id of [...this.nodes.keys()]) this.destroy(id, false);
    this.items.length = 0;
    this.undoStack.length = 0;
    for (const item of defaultItems()) this.spawn(item, false);
    this.showScatter = true;
    this.bakeShadow();
    this.emit();
  }

  deleteSelection() {
    if (!this.selected) return;
    const item = this.items.find((it) => it.id === this.selected);
    if (!item) return;
    const snapshot = { ...item };
    const node = this.nodes.get(item.id);
    this.selected = null;
    if (!node) return;
    const y = node.position.y;
    tween(220, (k) => {
      node.position.y = y + k * 0.35;
      node.scale.setScalar(1 - k * 0.25);
      setOpacity(node, 1 - k);
    }, () => {
      this.destroy(item.id, false);
      this.undoStack.push({ t: "remove", item: snapshot });
      this.bakeShadow();
      this.emit();
    });
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
    this.bakeShadow();
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private bind() {
    const canvas = this.world.renderer.domElement;
    canvas.addEventListener("pointermove", (e) => this.onMove(e));
    canvas.addEventListener("pointerdown", (e) => this.onDown(e));
    window.addEventListener("pointerup", () => this.onUp());
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.stepZoom(e.deltaY > 0 ? -1 : 1);
    }, { passive: false });
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") {
        this.clearGhost();
        this.placeKind = null;
        this.selected = null;
        if (this.tool !== "move") this.tool = "select";
        this.emit();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        this.deleteSelection();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        this.undo();
      } else if (this.selected && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        this.nudge(e.key);
      }
    });
  }

  private onMove(e: PointerEvent) {
    this.setPointer(e);
    if (this.ghost && this.placeKind) {
      const point = this.floorPoint();
      if (point) this.moveGhost(point.x, point.z);
    }
    if (this.dragging && this.selected) {
      const point = this.floorPoint();
      if (!point) return;
      const item = this.items.find((it) => it.id === this.selected);
      if (!item) return;
      this.writePose(item, point.x, point.z, item.rot);
      this.placeNode(item);
    }
  }

  private onDown(e: PointerEvent) {
    this.setPointer(e);
    if (this.placeKind && this.ghost) {
      const point = this.floorPoint();
      if (!point) return;
      const item: SceneItem = {
        id: `${this.placeKind}-${Math.random().toString(36).slice(2, 7)}`,
        kind: this.placeKind,
        x: 0,
        z: 0,
        rot: 0,
      };
      this.writePose(item, point.x, point.z, 0);
      this.spawn(item, true);
      this.undoStack.push({ t: "add", item: { ...item } });
      this.selected = item.id;
      this.bakeShadow();
      this.emit();
      return;
    }
    const id = this.pick(e);
    this.selected = id;
    if (!id && this.tool === "select" && e.button === 0) {
      const point = this.floorPoint();
      if (point) this.player.walkTo(point.x, point.z);
    }
    if (id && this.tool === "move") {
      this.dragging = true;
      const item = this.items.find((it) => it.id === id);
      if (item) this.dragFrom = { x: item.x, z: item.z, rot: item.rot };
      this.world.renderer.domElement.style.cursor = "grabbing";
    }
    this.emit();
  }

  private onUp() {
    if (this.dragging && this.selected && this.dragFrom) {
      const item = this.items.find((it) => it.id === this.selected);
      if (item && (item.x !== this.dragFrom.x || item.z !== this.dragFrom.z)) {
        this.undoStack.push({
          t: "move",
          id: item.id,
          from: this.dragFrom,
          to: { x: item.x, z: item.z, rot: item.rot },
        });
        this.bakeShadow();
      }
    }
    this.dragging = false;
    this.dragFrom = null;
    if (this.tool === "move") this.world.renderer.domElement.style.cursor = "grab";
  }

  private nudge(key: string) {
    const item = this.items.find((it) => it.id === this.selected);
    if (!item) return;
    const from = { x: item.x, z: item.z, rot: item.rot };
    const step = ROOM.snap;
    if (key === "ArrowLeft") item.x -= step;
    if (key === "ArrowRight") item.x += step;
    if (key === "ArrowUp") item.z -= step;
    if (key === "ArrowDown") item.z += step;
    this.writePose(item, item.x, item.z, item.rot);
    this.placeNode(item);
    this.undoStack.push({ t: "move", id: item.id, from, to: { x: item.x, z: item.z, rot: item.rot } });
    this.bakeShadow();
  }

  private spawn(item: SceneItem, animate: boolean) {
    const group = createObject(item.kind);
    group.userData.itemId = item.id;
    const [w, d] = footprintOf(group);
    const shadow = contactShadow(w * 0.92, d * 0.92, item.kind === "rug" ? 0.18 : 0.24);
    group.add(shadow);
    this.world.items.add(group);
    this.nodes.set(item.id, group);
    if (!this.items.some((it) => it.id === item.id)) this.items.push(item);
    this.placeNode(item);
    if (!this.showScatter) {
      for (const target of scatterRoots(group)) target.visible = false;
    }
    if (animate) {
      setOpacity(group, 0);
      group.scale.setScalar(0.84);
      const y = group.position.y;
      group.position.y = y + 0.2;
      tween(280, (k) => {
        group.scale.setScalar(lerp(0.84, 1, k));
        group.position.y = lerp(y + 0.2, y, k);
        setOpacity(group, k);
      }, () => this.bakeShadow());
    }
  }

  private destroy(id: string, _animate: boolean) {
    const node = this.nodes.get(id);
    node?.parent?.remove(node);
    this.nodes.delete(id);
    const idx = this.items.findIndex((it) => it.id === id);
    if (idx >= 0) this.items.splice(idx, 1);
    if (this.selected === id) this.selected = null;
  }

  private placeNode(item: SceneItem) {
    const node = this.nodes.get(item.id);
    if (!node) return;
    node.position.set(item.x, ROOM.floorY, item.z);
    node.rotation.y = item.rot;
    const onRug = item.kind !== "rug" && this.items.some((r) => {
      if (r.kind !== "rug") return false;
      const rn = this.nodes.get(r.id);
      if (!rn) return false;
      const [w, d] = footprintOf(rn);
      return Math.abs(item.x - r.x) < w / 2 && Math.abs(item.z - r.z) < d / 2;
    });
    for (const child of node.children) {
      if (child.userData.role === "contact") child.position.y = onRug ? 0.046 : 0.008;
    }
  }

  private writePose(item: SceneItem, x: number, z: number, rot: number) {
    const node = this.nodes.get(item.id);
    const foot = node ? footprintOf(node) : [0.4, 0.4];
    if (mountOf(item.kind) === "right-wall") {
      item.x = snap(clamp(x, foot[0] / 2 + 0.05, ROOM.w - foot[0] / 2 - 0.05));
      item.z = 0.08;
    } else {
      item.x = snap(clamp(x, foot[0] / 2 + 0.02, ROOM.w - foot[0] / 2 - 0.02));
      item.z = snap(clamp(z, foot[1] / 2 + 0.02, ROOM.d - foot[1] / 2 - 0.02));
    }
    item.rot = rot;
  }

  private rebuildGhost(kind: Kind) {
    this.clearGhost();
    const ghost = createObject(kind);
    stripLights(ghost);
    ghost.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = false;
    });
    setOpacity(ghost, 0.45);
    ghost.userData.ignorePick = true;
    ghost.position.y = ROOM.floorY;
    this.world.scene.add(ghost);
    this.ghost = ghost;
  }

  private moveGhost(x: number, z: number) {
    if (!this.ghost || !this.placeKind) return;
    const fake: SceneItem = { id: "ghost", kind: this.placeKind, x: 0, z: 0, rot: 0 };
    this.ghost.userData.foot = footprintOf(this.ghost);
    const prev = this.nodes.get("ghost");
    this.nodes.set("ghost", this.ghost);
    this.writePose(fake, x, z, 0);
    this.nodes.delete("ghost");
    if (prev) this.nodes.set("ghost", prev);
    this.ghost.position.set(fake.x, ROOM.floorY, fake.z);
  }

  private clearGhost() {
    if (this.ghost) {
      this.ghost.parent?.remove(this.ghost);
      this.ghost = null;
    }
  }

  private pick(e: PointerEvent) {
    this.setPointer(e);
    this.ray.setFromCamera(this.pointer, this.world.camera);
    const hits = this.ray.intersectObjects(this.world.items.children, true);
    for (const hit of hits) {
      if (ignored(hit.object)) continue;
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        if (o.userData.itemId) return o.userData.itemId as string;
        o = o.parent;
      }
    }
    return null;
  }

  private floorPoint() {
    this.ray.setFromCamera(this.pointer, this.world.camera);
    const ok = this.ray.ray.intersectPlane(this.floor, this.hit);
    return ok ? this.hit : null;
  }

  private setPointer(e: PointerEvent) {
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private syncRing() {
    const node = this.selected ? this.nodes.get(this.selected) : null;
    if (!node) {
      this.ring.visible = false;
      return;
    }
    const [w, d] = footprintOf(node);
    this.ring.visible = true;
    this.ring.position.x = node.position.x;
    this.ring.position.z = node.position.z;
    this.ring.scale.set(Math.max(0.7, w * 1.6), Math.max(0.7, d * 1.6), 1);
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

  private bakeShadow() {
    this.world.lights.sun.shadow.needsUpdate = true;
  }

  /** Furniture footprints the player walks around. Flat and wall items stay walkable. */
  private collisionEnv(): Env {
    const obstacles: Obstacle[] = [];
    const rugs: Obstacle[] = [];
    for (const item of this.items) {
      const node = this.nodes.get(item.id);
      if (!node) continue;
      const [w, d] = footprintOf(node);
      const o: Obstacle = {
        x: item.x,
        z: item.z,
        hw: w / 2,
        hd: d / 2,
        rot: item.rot,
        round: !!node.userData.round,
      };
      if (item.kind === "rug") rugs.push(o);
      else if (!WALKABLE.has(item.kind)) obstacles.push(o);
    }
    return { obstacles, rugs };
  }
}

function snap(v: number) {
  return Math.round(v / ROOM.snap) * ROOM.snap;
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

function ignored(o: THREE.Object3D) {
  let p: THREE.Object3D | null = o;
  while (p) {
    if (p.userData.ignorePick || p.userData.role === "contact") return true;
    p = p.parent;
  }
  return false;
}

function scatterRoots(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!o.userData.scatter) return;
    let p = o.parent;
    let nested = false;
    while (p) {
      if (p.userData.scatter) nested = true;
      p = p.parent;
    }
    if (!nested) out.push(o);
  });
  return out;
}

function setOpacity(root: THREE.Object3D, k: number) {
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (seen.has(m)) continue;
      seen.add(m);
      const base = (m.userData.baseOpacity as number | undefined) ?? m.opacity;
      m.userData.baseOpacity = base;
      m.opacity = base * k;
      m.transparent = m.opacity < 0.999;
      m.depthWrite = m.opacity > 0.85;
      if (m instanceof THREE.ShaderMaterial && m.uniforms?.uOpacity) {
        if (m.userData.baseUniform === undefined) m.userData.baseUniform = m.uniforms.uOpacity.value;
        m.uniforms.uOpacity.value = (m.userData.baseUniform as number) * k;
      }
    }
  });
}

function stripLights(root: THREE.Object3D) {
  const found: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Light) found.push(o);
  });
  for (const light of found) light.parent?.remove(light);
}
