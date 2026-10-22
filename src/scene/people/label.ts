import * as THREE from "three";
import type { PersonView } from "../../live/types";

/** Label pixels per world unit. The ortho camera shows about 100 CSS px per unit at default zoom. */
const PX = 100;
const DPR = 2;
const MAX_LINES = 4;

export const SIDE_TEXT: Record<string, string> = {
  in: "Trong vùng",
  out: "Ngoài vùng",
  unknown: "Chưa rõ",
};

export const SIDE_COLOR: Record<string, string> = {
  in: "#4fc38a",
  out: "#e0a43a",
  unknown: "#9aa6bd",
};

export const ALERT_COLOR = "#e04f4f";

export function personTitle(p: PersonView) {
  return p.track_id === null || p.track_id === undefined ? "Người #?" : `Người #${p.track_id}`;
}

/** Item names to show: Vietnamese `vi` from the server, never a hard-coded label list. */
export function itemNames(p: PersonView) {
  return p.objects.length ? p.objects.map((o) => o.vi || o.label) : p.items;
}

export interface Label {
  sprite: THREE.Sprite;
  update(p: PersonView): void;
  dispose(): void;
}

export function createLabel(): Label {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas unavailable");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.renderOrder = 20;
  sprite.userData.ignorePick = true;
  let last = "";

  const draw = (p: PersonView) => {
    const names = itemNames(p);
    const shown = names.slice(0, MAX_LINES);
    const more = names.length - shown.length;
    const lines = shown.map((n) => ({ text: n, muted: false }));
    if (more > 0) lines.push({ text: `+${more}`, muted: true });
    if (!lines.length) lines.push({ text: "Không có vật phẩm", muted: true });

    const head = `${p.alert ? "CẢNH BÁO · " : ""}${personTitle(p)}`;
    const sub = SIDE_TEXT[p.side] ?? SIDE_TEXT.unknown;
    const padX = 10;
    const padY = 8;
    const headH = 17;
    const subH = 15;
    const lineH = 16;
    const font = (size: number, weight: number) => `${weight} ${size}px "Segoe UI", "Trebuchet MS", sans-serif`;

    const measure = document.createElement("canvas").getContext("2d");
    if (!measure) return;
    measure.font = font(13, 700);
    let width = measure.measureText(head).width;
    measure.font = font(12, 500);
    width = Math.max(width, measure.measureText(sub).width + 14);
    for (const l of lines) width = Math.max(width, measure.measureText(l.text).width + 12);
    const w = Math.ceil(width + padX * 2);
    const h = padY * 2 + headH + subH + lines.length * lineH + 4;

    canvas.width = w * DPR;
    canvas.height = (h + 7) * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, w, h + 7);

    const accent = p.alert ? ALERT_COLOR : SIDE_COLOR[p.side] ?? SIDE_COLOR.unknown;
    ctx.fillStyle = p.alert ? "#fff0ee" : "rgba(250,252,251,0.96)";
    ctx.strokeStyle = p.alert ? ALERT_COLOR : "rgba(120,140,160,0.35)";
    ctx.lineWidth = p.alert ? 2 : 1;
    roundRect(ctx, 1, 1, w - 2, h - 2, 10);
    ctx.fill();
    ctx.stroke();
    // pointer toward the head
    ctx.beginPath();
    ctx.moveTo(w / 2 - 6, h - 1);
    ctx.lineTo(w / 2, h + 6);
    ctx.lineTo(w / 2 + 6, h - 1);
    ctx.closePath();
    ctx.fillStyle = p.alert ? "#fff0ee" : "rgba(250,252,251,0.96)";
    ctx.fill();

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    let y = padY + headH / 2;
    ctx.fillStyle = p.alert ? ALERT_COLOR : "#4d5874";
    ctx.font = font(13, 700);
    ctx.fillText(head, padX, y);

    y += headH / 2 + subH / 2;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(padX + 4, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6d7690";
    ctx.font = font(12, 500);
    ctx.fillText(sub, padX + 14, y);

    y += subH / 2 + 4;
    for (const l of lines) {
      y += lineH / 2;
      ctx.font = font(12, 500);
      ctx.fillStyle = l.muted ? "#98a1b5" : "#3c4560";
      ctx.fillText(l.text, padX + 2, y);
      y += lineH / 2;
    }

    texture.needsUpdate = true;
    sprite.scale.set(w / PX, (h + 7) / PX, 1);
  };

  return {
    sprite,
    update(p) {
      const sig = `${p.alert}|${p.side}|${p.track_id}|${itemNames(p).join(",")}`;
      if (sig === last) return;
      last = sig;
      draw(p);
    },
    dispose() {
      texture.dispose();
      material.dispose();
    },
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
