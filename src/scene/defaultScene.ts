import type { SceneItem } from "./objects";

/** Static backdrop furniture. People come from the live feed, so no resident figures here. */
export function defaultItems(): SceneItem[] {
  return [
    { id: "rug", kind: "rug", x: 2.75, z: 3.95, rot: 0 },
    { id: "bench", kind: "bench", x: 0.4, z: 3.2, rot: 0 },
    { id: "grass-a", kind: "grass", x: 0.4, z: 5.25, rot: 0.5 },
    { id: "grass-b", kind: "grass2", x: 0.46, z: 5.9, rot: -0.3 },
    { id: "bookcase", kind: "bookcase", x: 2.05, z: 0.28, rot: 0 },
    { id: "frame", kind: "frame", x: 3.55, z: 0.08, rot: 0 },
    { id: "cabinet", kind: "cabinet", x: 5.2, z: 0.34, rot: 0 },
    { id: "utensils", kind: "utensils", x: 6.42, z: 0.3, rot: 0.25 },
    { id: "books", kind: "books", x: 1.72, z: 3.55, rot: 0.35 },
  ];
}
