import type { SceneItem } from "../objects";

export type ThemeId = "room" | "construction" | "store" | "booth";
export type AvatarMode = "room" | "construction" | "store" | "booth";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  shell: ThemeId;
  avatarMode: AvatarMode;
  /** Backdrop gradient + silhouette palette key used by backdropMarkup(). */
  backdrop: ThemeId;
  items: SceneItem[];
}
