import type { SceneItem } from "./objects";

export function defaultItems(): SceneItem[] {
  return [
    { id: "rug", kind: "rug", x: 2.75, z: 3.95, rot: 0 },
    { id: "bench", kind: "bench", x: 0.4, z: 3.2, rot: 0 },
    { id: "reader", kind: "reader", x: 0.4, z: 3.0, rot: 1.45 },
    { id: "grass-a", kind: "grass", x: 0.4, z: 5.25, rot: 0.5 },
    { id: "grass-b", kind: "grass2", x: 0.46, z: 5.9, rot: -0.3 },
    { id: "easel", kind: "easel", x: 1.15, z: 1.12, rot: 0.85 },
    { id: "painter", kind: "painter", x: 1.5, z: 1.11, rot: -1.667 },
    { id: "bookcase", kind: "bookcase", x: 2.05, z: 0.28, rot: 0 },
    { id: "frame", kind: "frame", x: 3.55, z: 0.08, rot: 0 },
    { id: "cabinet", kind: "cabinet", x: 5.2, z: 0.34, rot: 0 },
    { id: "utensils", kind: "utensils", x: 6.42, z: 0.3, rot: 0.25 },
    { id: "table", kind: "table", x: 4.25, z: 2.4, rot: 0.2 },
    { id: "stool", kind: "stool", x: 4.7, z: 3.02, rot: 0 },
    { id: "girl", kind: "girl", x: 4.7, z: 3.02, rot: -2.51 },
    { id: "drawing", kind: "drawing", x: 2.45, z: 4.05, rot: 0.35 },
    { id: "books", kind: "books", x: 1.72, z: 3.55, rot: 0.35 },
    { id: "cat", kind: "cat", x: 3.4, z: 4.45, rot: -0.7 },
  ];
}
