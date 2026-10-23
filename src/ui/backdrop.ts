import type { ThemeId } from "../scene/themes/types";

const ROOM_SKY = ["#9ed8c4", "#8dceba", "#6aa890"];
const CONSTRUCTION_SKY = ["#bcd3e2", "#9fb8cc", "#7d97ad"];
const STORE_SKY = ["#f6d9b8", "#f0c49b", "#dd9d78"];
const BOOTH_SKY = ["#d8dde8", "#c4cad8", "#a8b0c2"];

function skyFor(theme: ThemeId) {
  if (theme === "construction") return CONSTRUCTION_SKY;
  if (theme === "store") return STORE_SKY;
  if (theme === "booth") return BOOTH_SKY;
  return ROOM_SKY;
}

function silhouettesFor(theme: ThemeId) {
  if (theme === "construction") {
    return `<g fill="#5d7183" opacity="0.5">
        <path d="M120 620V300h18v320zM60 310l220-28 4 16-220 28zM250 282v60h-14v-58zM246 342l4 54h-10l-4-52z"/>
        <rect x="238" y="396" width="26" height="20"/>
        <path d="M1150 640V360h90v280zM1170 330V220h14v110zM1120 226l190-20 3 13-190 20z"/>
        <path d="M1180 390h50M1180 440h50M1180 490h50M1180 540h50" stroke="#5d7183" stroke-width="10"/>
        <path d="M80 700h260M1080 720h280" stroke="#5d7183" stroke-width="12" stroke-linecap="round"/>
      </g>
      <g fill="#7d97ad" opacity="0.55">
        <circle cx="260" cy="810" r="3"/><circle cx="520" cy="835" r="2.4"/><circle cx="980" cy="825" r="2.6"/>
      </g>`;
  }
  if (theme === "store") {
    return `<g fill="#b96a4e" opacity="0.42">
        <path d="M60 300h300l-22 44H84z"/><rect x="92" y="344" width="14" height="120"/><rect x="322" y="344" width="14" height="120"/>
        <path d="M1100 260h300l-22 44h-256z"/><rect x="1132" y="304" width="14" height="110"/><rect x="1352" y="304" width="14" height="110"/>
        <path d="M180 780c8-30 20-40 24-18 6 10 2 28-8 36-12 8-22 2-16-18z"/>
        <path d="M1210 800c8-28 22-36 24-12 4 14-2 30-12 36-12 6-20-2-12-24z"/>
      </g>
      <g fill="#c98a63" opacity="0.5">
        <circle cx="250" cy="820" r="3"/><circle cx="430" cy="840" r="2.4"/><circle cx="980" cy="830" r="2.6"/><circle cx="1100" cy="848" r="2"/>
      </g>`;
  }
  if (theme === "booth") {
    return `<g fill="#7a8498" opacity="0.42">
        <rect x="40" y="280" width="220" height="160" rx="4"/>
        <rect x="70" y="300" width="90" height="55" rx="2" fill="#9aa3b5" opacity="0.7"/>
        <rect x="175" y="310" width="55" height="35" rx="2" fill="#9aa3b5" opacity="0.55"/>
        <rect x="1180" y="240" width="200" height="180" rx="4"/>
        <rect x="1210" y="265" width="100" height="60" rx="2" fill="#9aa3b5" opacity="0.65"/>
        <rect x="200" y="200" width="18" height="320"/>
        <rect x="1260" y="180" width="22" height="340"/>
        <path d="M80 700h240M1080 720h260" stroke="#7a8498" stroke-width="10" stroke-linecap="round"/>
      </g>
      <g fill="#96a0b4" opacity="0.5">
        <circle cx="280" cy="815" r="2.8"/><circle cx="520" cy="838" r="2.2"/><circle cx="960" cy="828" r="2.5"/><circle cx="1120" cy="845" r="2"/>
      </g>`;
  }
  return `<g fill="#4f8d76" opacity="0.45">
        <path d="M40 250c40-120 180-150 250-90 30 26 20 70-10 86-40 8-70 40-120 36-70-6-150-10-120-32z"/>
        <rect x="168" y="230" width="46" height="150" rx="23"/>
        <path d="M1180 180c30-90 150-120 210-70 28 24 18 60-8 74-36 8-60 34-100 30-58-4-120-8-102-34z"/>
        <rect x="1290" y="170" width="36" height="130" rx="18"/>
        <path d="M1280 520c50-80 140-70 160-10 8 24-10 40-36 42-30 2-50 20-78 16-36-6-62-18-46-48z"/>
        <rect x="1352" y="530" width="28" height="90" rx="14"/>
      </g>
      <g fill="#5e9a82" opacity="0.55">
        <path d="M180 760c8-30 20-40 24-18 6 10 2 28-8 36-12 8-22 2-16-18z"/>
        <path d="M210 780c6-26 18-34 20-14 4 12 0 26-10 32-10 6-16 0-10-18z"/>
        <path d="M1180 800c8-28 22-36 24-12 4 14-2 30-12 36-12 6-20-2-12-24z"/>
        <path d="M1224 812c6-22 16-28 18-10 3 10-1 22-8 26-8 4-14 0-10-16z"/>
        <circle cx="250" cy="820" r="3"/>
        <circle cx="430" cy="840" r="2.4"/>
        <circle cx="980" cy="830" r="2.6"/>
        <circle cx="1100" cy="848" r="2"/>
      </g>`;
}

export function backdropMarkup(theme: ThemeId = "room") {
  const sky = skyFor(theme);
  const silhouettes = silhouettesFor(theme);
  return `
    <svg class="backdrop" data-backdrop viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${sky[0]}"/>
          <stop offset="45%" stop-color="${sky[1]}"/>
          <stop offset="100%" stop-color="${sky[2]}"/>
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#page)"/>
      ${silhouettes}
      <rect x="18" y="16" width="1404" height="868" rx="28" fill="none" stroke="#e7f6ef" stroke-opacity="0.55" stroke-width="2"/>
    </svg>
  `;
}
