import type { SceneItem } from "./objects";
import { THEMES } from "./themes";

/** Static backdrop furniture for the classic room theme. Kept for compatibility; new code uses THEMES. */
export function defaultItems(): SceneItem[] {
  return THEMES.room.items;
}
