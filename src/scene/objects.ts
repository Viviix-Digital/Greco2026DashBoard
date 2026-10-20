import * as THREE from "three";
import { buildCat, buildDrawing, buildGirl, buildPainter, buildReader } from "./characters/index";
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
  | "reader"
  | "painter"
  | "girl"
  | "drawing"
  | "cat";

export type Mount = "floor" | "right-wall";

export interface SceneItem {
  id: string;
  kind: Kind;
  x: number;
  z: number;
  rot: number;
}

export function mountOf(kind: Kind): Mount {
  return kind === "frame" ? "right-wall" : "floor";
}

export function createObject(kind: Kind) {
  switch (kind) {
    case "reader":
      return buildReader();
    case "painter":
      return buildPainter();
    case "girl":
      return buildGirl();
    case "drawing":
      return buildDrawing();
    case "cat":
      return buildCat();
    default:
      return buildProp(kind);
  }
}

export function footprintOf(group: THREE.Group): [number, number] {
  const foot = group.userData.foot as [number, number] | undefined;
  return foot ?? [0.4, 0.4];
}
