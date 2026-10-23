import type { SceneItem } from "../objects";
import type { ThemeDef, ThemeId } from "./types";

export type { ThemeDef, ThemeId } from "./types";

const roomItems = (): SceneItem[] => [
  { id: "rug", kind: "rug", x: 2.75, z: 3.95, rot: 0, ground: true },
  { id: "bench", kind: "bench", x: 0.4, z: 3.2, rot: 0 },
  { id: "grass-a", kind: "grass", x: 0.4, z: 5.25, rot: 0.5 },
  { id: "grass-b", kind: "grass2", x: 0.46, z: 5.9, rot: -0.3 },
  { id: "bookcase", kind: "bookcase", x: 2.05, z: 0.28, rot: 0 },
  { id: "frame", kind: "frame", x: 3.55, z: 0.08, rot: 0 },
  { id: "cabinet", kind: "cabinet", x: 5.2, z: 0.34, rot: 0 },
  { id: "utensils", kind: "utensils", x: 6.42, z: 0.3, rot: 0.25 },
  { id: "books", kind: "books", x: 1.72, z: 3.55, rot: 0.35 },
];

const constructionItems = (): SceneItem[] => [
  { id: "safety-mat", kind: "safetyMat", x: 3.55, z: 3.45, rot: 0, ground: true },
  { id: "crane", kind: "crane", x: 6.75, z: 0.55, rot: -0.5 },
  { id: "scaffold", kind: "scaffold", x: 2.9, z: 0.32, rot: 0 },
  { id: "mixer", kind: "mixer", x: 0.72, z: 1.05, rot: 0.7 },
  { id: "excavator", kind: "excavator", x: 0.95, z: 4.85, rot: 0.9 },
  { id: "bricks", kind: "bricks", x: 0.5, z: 3.05, rot: 0.15 },
  { id: "beams", kind: "beams", x: 6.78, z: 3.15, rot: 0 },
  { id: "toolbox", kind: "toolbox", x: 2.05, z: 0.55, rot: 0.4 },
  { id: "cement-bags", kind: "cementBags", x: 5.55, z: 0.42, rot: -0.2 },
  { id: "barrier-a", kind: "barrier", x: 1.35, z: 6.05, rot: 0 },
  { id: "barrier-b", kind: "barrier", x: 5.95, z: 6.05, rot: 0 },
  { id: "cone-a", kind: "cone", x: 2.05, z: 5.45, rot: 0.2 },
  { id: "cone-b", kind: "cone", x: 5.35, z: 1.35, rot: -0.3 },
  { id: "cone-c", kind: "cone", x: 6.15, z: 4.65, rot: 0.5 },
  { id: "safety-fence", kind: "safetyFence", x: 3.6, z: 6.22, rot: 0 },
  { id: "work-light-a", kind: "workLight", x: 6.35, z: 5.65, rot: -0.6 },
  { id: "work-light-b", kind: "workLight", x: 0.55, z: 0.55, rot: 0.8 },
];

const storeItems = (): SceneItem[] => [
  { id: "floor-mat", kind: "floorMat", x: 3.45, z: 3.65, rot: 0, ground: true },
  { id: "counter", kind: "counter", x: 5.65, z: 0.5, rot: 0 },
  { id: "shelf-a", kind: "shelf", x: 1.75, z: 0.32, rot: 0 },
  { id: "shelf-b", kind: "shelf", x: 3.45, z: 0.32, rot: 0 },
  { id: "fridge", kind: "fridge", x: 0.42, z: 2.05, rot: 0 },
  { id: "menu-board", kind: "menuBoard", x: 0.12, z: 3.05, rot: Math.PI / 2 },
  { id: "dining-a", kind: "diningTable", x: 1.55, z: 4.65, rot: 0.1 },
  { id: "dining-b", kind: "diningTable", x: 5.75, z: 4.75, rot: -0.15 },
  { id: "pendant-a", kind: "pendantLamp", x: 1.55, z: 4.65, rot: 0 },
  { id: "pendant-b", kind: "pendantLamp", x: 5.75, z: 4.75, rot: 0 },
  { id: "queue-rail", kind: "queueRail", x: 5.15, z: 1.7, rot: 0 },
  { id: "cart-basket", kind: "cartBasket", x: 6.65, z: 2.35, rot: -0.4 },
  { id: "awning-sign", kind: "awningSign", x: 1.25, z: 0.95, rot: 0 },
  { id: "plant-a", kind: "plant", x: 0.5, z: 5.85, rot: 0.3 },
  { id: "plant-b", kind: "plant2", x: 6.75, z: 5.95, rot: -0.2 },
  { id: "cup-a", kind: "cup", x: 1.35, z: 4.45, rot: 0 },
  { id: "plate-a", kind: "plate", x: 5.95, z: 4.6, rot: 0.4 },
];

const boothItems = (): SceneItem[] => [
  { id: "booth-carpet", kind: "boothCarpet", x: 3.55, z: 3.35, rot: 0, ground: true },
  { id: "reception", kind: "receptionPodium", x: 1.55, z: 2.85, rot: 0.15 },
  { id: "kiosk", kind: "checkinKiosk", x: 5.55, z: 2.55, rot: -0.35 },
  { id: "booth-monitor", kind: "boothMonitor", x: 4.85, z: 0.42, rot: 0 },
  { id: "queue-a", kind: "queueRail", x: 5.25, z: 4.15, rot: 0.2 },
  { id: "plant-a", kind: "plant", x: 0.55, z: 5.55, rot: 0.25 },
  { id: "plant-b", kind: "plant2", x: 6.55, z: 5.65, rot: -0.2 },
];

export const THEMES: Record<ThemeId, ThemeDef> = {
  room: { id: "room", label: "Phòng", shell: "room", avatarMode: "room", backdrop: "room", items: roomItems() },
  construction: {
    id: "construction",
    label: "Công trường",
    shell: "construction",
    avatarMode: "construction",
    backdrop: "construction",
    items: constructionItems(),
  },
  store: {
    id: "store",
    label: "Nhà hàng / Cửa hàng",
    shell: "store",
    avatarMode: "store",
    backdrop: "store",
    items: storeItems(),
  },
  booth: {
    id: "booth",
    label: "Booth check-in",
    shell: "booth",
    avatarMode: "booth",
    backdrop: "booth",
    items: boothItems(),
  },
};

export const THEME_LIST: ThemeDef[] = [THEMES.room, THEMES.construction, THEMES.store, THEMES.booth];

export function isThemeId(value: unknown): value is ThemeId {
  return value === "room" || value === "construction" || value === "store" || value === "booth";
}

const STORAGE_KEY = "vision-expo-theme";

export function loadThemeId(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isThemeId(saved) ? saved : "room";
  } catch {
    return "room";
  }
}

export function saveThemeId(id: ThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable: theme lives for this session only */
  }
}
