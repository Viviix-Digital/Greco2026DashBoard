import * as THREE from "three";
import type { LiveStore } from "../../live/store";
import type { PersonView } from "../../live/types";
import { PAL, ROOM, CAM } from "../../theme";
import { Avatar, type HairStyle, type Recipe } from "../characters/avatar";
import { Walker } from "../characters/walker";
import { contactShadow } from "../contactShadow";
import type { World } from "../createScene";
import type { RoomView } from "../roomView";
import { ALERT_COLOR, SIDE_COLOR, createLabel, type Label } from "./label";
import type { ThemeId } from "../themes/types";

/** An avatar that stops showing up in `people` is removed after this long (5 Hz feed, so no flicker). */
const GRACE_MS = 400;
const MAX_AVATARS = 24;
const FOLLOW = 7;
const TURN = 9;
const MAX_SPEED = 1.6;
const DEADBAND = 0.05;
const LABEL_Y = 1.22;

const FLOOR = { x0: 0.7, x1: ROOM.w - 0.6, z0: 0.9, z1: ROOM.d - 0.5 };

const TOPS = ["#e7d3b8", "#f0c14a", "#3f8f56", "#a56b43", "#6d90d2", "#e07a62", "#8d7bc8", "#5fb3a6"];
const BOTTOMS = ["#5e6f9e", "#4f78c4", "#e6d3b6", "#5b3b2d", "#3f4a63"];
const HAIRS = [PAL.hair, PAL.hairBrown, PAL.hairLong, PAL.hairDark];
const STYLES: HairStyle[] = ["short", "player", "long", "bun"];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Normalised camera foot point (0-1, origin top-left) to a floor position inside the room. */
export function floorPos(foot: [number, number]): { x: number; z: number } {
  const fx = clamp(foot[0], 0, 1);
  const fy = clamp(foot[1], 0, 1);
  return {
    x: FLOOR.x0 + fx * (FLOOR.x1 - FLOOR.x0),
    z: FLOOR.z0 + fy * (FLOOR.z1 - FLOOR.z0),
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const CONSTRUCTION_TOPS = ["#f2760a", "#f2b705", "#e87f2e", "#d94f3d"];
const CONSTRUCTION_BOTTOMS = ["#3f4a63", "#5a5148", "#4a5568"];
const HARD_HATS = ["#f2b705", "#f7f5f1", "#f2760a"];
const STORE_TOPS = ["#f7f2e8", "#d9574a", "#63a86b", "#5d8ad2"];
const STORE_BOTTOMS = ["#4a4038", "#3f4a63", "#6a5a4a"];
const CAPS = ["#d9574a", "#3f6fb5", "#63a86b"];
const APRONS = ["#d9574a", "#3f6fb5", "#4a7a52"];
const BOOTH_CAPS = ["#ff6a1a", "#ff8535", "#2a2e34"];
const BOOTH_APRONS = ["#ff6a1a", "#ff8535", "#e6331a"];
const BOOTH_BOTTOMS = ["#3f4a63", "#4a5568", "#2a2e34"];

function recipeFor(key: string, theme: ThemeId = "room"): Recipe {
  const h = hash(key);
  const pick = <T>(list: readonly T[], salt: number) => list[(Math.imul(h ^ (h >>> 13), 2654435761 + salt * 40503) >>> 0) % list.length];
  if (theme === "construction") {
    return {
      top: pick(CONSTRUCTION_TOPS, 0),
      topAlt: "#e8e4da",
      bottom: pick(CONSTRUCTION_BOTTOMS, 3),
      shoe: "#5a3d24",
      hair: pick(HAIRS, 5),
      hairStyle: pick(STYLES, 7),
      hardHat: pick(HARD_HATS, 11),
      detail: true,
    };
  }
  if (theme === "store") {
    // Every other person is staff (cap + apron); the rest are customers.
    const staff = h % 2 === 0;
    return {
      top: staff ? "#f7f2e8" : pick(STORE_TOPS, 0),
      bottom: pick(STORE_BOTTOMS, 3),
      shoe: PAL.shoe,
      hair: pick(HAIRS, 5),
      hairStyle: staff ? "bun" : pick(STYLES, 7),
      ...(staff ? { cap: pick(CAPS, 11), apron: pick(APRONS, 13) } : {}),
    };
  }
  if (theme === "booth") {
    // Alternate booth staff (orange brand apron/cap) vs event guests.
    const staff = h % 2 === 0;
    return {
      top: staff ? "#f7f2e8" : pick(TOPS, 0),
      bottom: staff ? pick(BOOTH_BOTTOMS, 3) : pick(BOTTOMS, 3),
      shoe: PAL.shoe,
      hair: pick(HAIRS, 5),
      hairStyle: staff ? "short" : pick(STYLES, 7),
      ...(staff ? { cap: pick(BOOTH_CAPS, 11), apron: pick(BOOTH_APRONS, 13) } : {}),
    };
  }
  const top = pick(TOPS, 0);
  return {
    top,
    bottom: pick(BOTTOMS, 3),
    shoe: PAL.shoe,
    hair: pick(HAIRS, 5),
    hairStyle: pick(STYLES, 7),
  };
}

class PersonAvatar {
  readonly holder = new THREE.Group();
  readonly avatar: Avatar;
  readonly walker: Walker;
  readonly label: Label;
  readonly hit: THREE.Mesh;
  person: PersonView;
  lastSeen = performance.now();
  private x: number;
  private z: number;
  private heading = CAM.yaw;
  private tx: number;
  private tz: number;
  private appear = 0;
  private bodyDisc: THREE.Mesh;
  private footDisc: THREE.Mesh[] = [];
  private ring: THREE.Mesh;
  private sel: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;

  constructor(person: PersonView, pos: { x: number; z: number }, private ground: (x: number, z: number) => number, theme: ThemeId = "room") {
    this.person = person;
    this.x = this.tx = pos.x;
    this.z = this.tz = pos.z;
    this.avatar = new Avatar(recipeFor(person.key, theme));
    this.avatar.setCastShadow(false);
    this.holder.userData.personKey = person.key;
    this.holder.add(this.avatar.root);

    this.walker = new Walker(this.avatar, ground);
    for (let i = 0; i < 2; i++) {
      const d = contactShadow(0.2, 0.3, 0.3);
      this.footDisc.push(d);
      this.holder.add(d);
    }
    this.bodyDisc = contactShadow(0.5, 0.44, 0.16);
    this.holder.add(this.bodyDisc);

    this.ringMat = new THREE.MeshBasicMaterial({
      color: SIDE_COLOR.unknown,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.27, 0.33, 40), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.userData.ignorePick = true;
    this.holder.add(this.ring);

    this.sel = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.46, 40),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.sel.rotation.x = -Math.PI / 2;
    this.sel.visible = false;
    this.sel.userData.ignorePick = true;
    this.holder.add(this.sel);

    this.label = createLabel();
    this.holder.add(this.label.sprite);

    this.hit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 1.15, 10),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.hit.position.y = ROOM.floorY + 0.58;
    this.hit.userData.personKey = person.key;
    this.holder.add(this.hit);

    this.walker.place(this.x, this.z, this.heading);
    this.walker.update(0.0001, this.x, this.z, this.heading, 0, 0);
    this.holder.scale.setScalar(0.01);
    this.apply(person);
    this.syncDecor();
  }

  setTarget(person: PersonView, pos: { x: number; z: number }) {
    if (Math.hypot(pos.x - this.tx, pos.z - this.tz) > DEADBAND) {
      this.tx = pos.x;
      this.tz = pos.z;
    }
    this.apply(person);
  }

  private apply(person: PersonView) {
    this.person = person;
    this.label.update(person);
    this.ringMat.color.set(person.alert ? ALERT_COLOR : SIDE_COLOR[person.side] ?? SIDE_COLOR.unknown);
  }

  setSelected(on: boolean) {
    this.sel.visible = on;
  }

  update(dt: number) {
    this.appear = Math.min(1, this.appear + dt / 0.25);
    const e = 1 - (1 - this.appear) ** 3;
    this.holder.scale.setScalar(Math.max(0.01, e));

    const k = 1 - Math.exp(-dt * FOLLOW);
    let nx = this.x + (this.tx - this.x) * k;
    let nz = this.z + (this.tz - this.z) * k;
    let vx = (nx - this.x) / dt;
    let vz = (nz - this.z) / dt;
    const sp = Math.hypot(vx, vz);
    if (sp > MAX_SPEED) {
      const s = MAX_SPEED / sp;
      vx *= s;
      vz *= s;
      nx = this.x + vx * dt;
      nz = this.z + vz * dt;
    }
    this.x = nx;
    this.z = nz;

    const speed = Math.hypot(vx, vz);
    const desired = speed > 0.12 ? Math.atan2(vx, vz) : CAM.yaw;
    const err = wrapAngle(desired - this.heading);
    this.heading = wrapAngle(this.heading + clamp(err, -TURN * dt, TURN * dt));
    this.walker.update(dt, this.x, this.z, this.heading, vx, vz);
    this.syncDecor();
  }

  private syncDecor() {
    const feet = this.walker.feet;
    for (let i = 0; i < 2; i++) {
      const f = feet[i];
      const d = this.footDisc[i];
      const lift = clamp(f.lift / 0.07, 0, 1);
      d.position.set(f.pos.x, this.ground(f.pos.x, f.pos.z) + 0.008, f.pos.z);
      d.rotation.y = f.yaw;
      d.scale.setScalar(1 - 0.38 * lift);
      (d.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.3 * (1 - 0.7 * lift);
    }
    const gy = this.ground(this.x, this.z);
    this.bodyDisc.position.set(this.x, gy + 0.006, this.z);
    this.ring.position.set(this.x, gy + 0.02, this.z);
    this.sel.position.set(this.x, gy + 0.022, this.z);
    this.hit.position.set(this.x, gy + 0.58, this.z);
    this.label.sprite.position.set(this.x, gy + LABEL_Y, this.z);
  }

  dispose() {
    this.label.dispose();
    this.holder.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.SkinnedMesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
    this.holder.removeFromParent();
  }
}

/** Standing figures in the room, one per person in the active camera's `people` frame. */
export class PeopleStage {
  private group = new THREE.Group();
  private avatars = new Map<string, PersonAvatar>();
  private version = -1;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private theme: ThemeId = "room";

  constructor(
    private world: World,
    private store: LiveStore,
    private room: RoomView,
  ) {
    this.group.name = "people";
    world.scene.add(this.group);
  }

  /** Re-dress everyone for the new theme: avatars are rebuilt on the next sync. */
  setTheme(theme: ThemeId) {
    if (theme === this.theme) return;
    this.theme = theme;
    for (const a of this.avatars.values()) a.dispose();
    this.avatars.clear();
    this.version = -999;
  }

  update(dt: number) {
    if (dt <= 0) return;
    const now = performance.now();
    if (this.version !== this.store.peopleVersion) {
      this.version = this.store.peopleVersion;
      this.sync(now);
    }
    for (const [key, a] of this.avatars) {
      if (now - a.lastSeen > GRACE_MS) {
        a.dispose();
        this.avatars.delete(key);
        continue;
      }
      a.setSelected(key === this.store.selected);
      a.update(dt);
    }
  }

  /** Person key under a pointer event, or null. */
  pick(e: PointerEvent | MouseEvent): string | null {
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.ray.setFromCamera(this.pointer, this.world.camera);
    const proxies = [...this.avatars.values()].map((a) => a.hit);
    const hits = this.ray.intersectObjects(proxies, false);
    return hits.length ? (hits[0].object.userData.personKey as string) : null;
  }

  get count() {
    return this.avatars.size;
  }

  private sync(now: number) {
    for (const p of this.store.people()) {
      if (!p.foot) continue;
      const pos = floorPos(p.foot);
      const existing = this.avatars.get(p.key);
      if (existing) {
        existing.lastSeen = now;
        existing.setTarget(p, pos);
        continue;
      }
      if (this.avatars.size >= MAX_AVATARS) continue;
      const a = new PersonAvatar(p, pos, this.room.groundAt, this.theme);
      a.lastSeen = now;
      this.avatars.set(p.key, a);
      this.group.add(a.holder);
    }
  }
}
