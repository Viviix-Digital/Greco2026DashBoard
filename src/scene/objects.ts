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
  | "ring";

export interface SceneItem {
  id: string;
  kind: Kind;
  x: number;
  z: number;
  rot: number;
}

export function createObject(kind: Kind) {
  return buildProp(kind);
}

export function footprintOf(group: THREE.Group): [number, number] {
  const foot = group.userData.foot as [number, number] | undefined;
  return foot ?? [0.4, 0.4];
}
