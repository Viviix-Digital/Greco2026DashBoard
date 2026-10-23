import * as THREE from "three";
import { buildProp } from "./props";

export type Kind =
  | "rug"
  | "bench"
  | "bookcase"
  | "cabinet"
  | "table"
  | "stool"
  | "easel"
  | "chair"
  | "armchair"
  | "sofa"
  | "books"
  | "book"
  | "purplebook"
  | "box"
  | "grass"
  | "grass2"
  | "plant"
  | "plant2"
  | "cup"
  | "lamp"
  | "plate"
  | "utensils"
  | "frame"
  | "monitor"
  | "document"
  | "paper"
  | "acorn"
  | "carrot"
  | "cylinder"
  | "ring"
  // Construction pack
  | "crane"
  | "scaffold"
  | "mixer"
  | "barrier"
  | "cone"
  | "bricks"
  | "beams"
  | "toolbox"
  | "excavator"
  | "cementBags"
  | "safetyFence"
  | "workLight"
  | "safetyMat"
  // Restaurant / convenience-store pack
  | "counter"
  | "shelf"
  | "fridge"
  | "diningTable"
  | "menuBoard"
  | "pendantLamp"
  | "queueRail"
  | "cartBasket"
  | "awningSign"
  | "floorMat"
  // Event booth check-in pack
  | "boothCarpet"
  | "checkinKiosk"
  | "receptionPodium"
  | "boothMonitor";

export interface SceneItem {
  id: string;
  kind: Kind;
  x: number;
  z: number;
  rot: number;
  /** Walking-surface cover (rug / safety mat / floor mat): raises groundAt(). */
  ground?: boolean;
}

export function createObject(kind: Kind) {
  return buildProp(kind);
}

export function footprintOf(group: THREE.Group): [number, number] {
  const foot = group.userData.foot as [number, number] | undefined;
  return foot ?? [0.4, 0.4];
}
