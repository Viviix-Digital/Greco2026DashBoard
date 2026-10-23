const stroke = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const illus = (body: string) =>
  `<svg viewBox="0 0 48 48" width="34" height="34" fill="none">${body}</svg>`;

export const ICONS = {
  menu: stroke(`<path d="M5 7h14M5 12h14M5 17h14"/>`),
  camera: stroke(`<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.2"/>`),
  home: stroke(`<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>`),
  undo: stroke(`<path d="M8 8H4v4"/><path d="M4.5 11a7 7 0 1 1-1 4"/>`),
  minus: stroke(`<path d="M6 12h12"/>`),
  plus: stroke(`<path d="M12 6v12M6 12h12"/>`),
  eye: stroke(`<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.2"/>`),
  eyeOff: stroke(`<path d="M3 4.5 20 18"/><path d="M9.2 6.8A8 8 0 0 1 12 6.5C18 6.5 21.5 12 21.5 12a16 16 0 0 1-3.2 3.6M6.2 8.4A16 16 0 0 0 2.5 12S6 17.5 12 17.5a8 8 0 0 0 3.2-.7"/>`),
  trash: stroke(`<path d="M5 8h14M9 8V6h6v2M7 8l1 12h8l1-12"/>`),
  record: stroke(`<rect x="4" y="7" width="12" height="10" rx="2"/><path d="M16 11.5 21 9v6l-5-2.5z"/>`),
  help: stroke(`<circle cx="12" cy="12" r="8"/><path d="M9.2 9.2a2.8 2.8 0 1 1 3.6 2.7c-.7.3-1.1.8-1.1 1.5V14"/><path d="M12 17h.01"/>`),
  settings: stroke(`<circle cx="12" cy="12" r="3"/><path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4"/>`),
  grid: stroke(`<path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"/>`),
  move: stroke(`<path d="M12 3v18M3 12h18"/><path d="M12 3l-2.2 2.2M12 3l2.2 2.2M12 21l-2.2-2.2M12 21l2.2-2.2M3 12l2.2-2.2M3 12l2.2 2.2M21 12l-2.2-2.2M21 12l-2.2 2.2"/>`),
  sun: stroke(`<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>`),
  moon: stroke(`<path d="M16 14.5A6.2 6.2 0 0 1 9.2 6 6.5 6.5 0 1 0 16 14.5z"/>`),
  volume: stroke(`<path d="M4 10h3l4-3v10l-4-3H4z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5M17 7.5a6 6 0 0 1 0 9"/>`),
  mute: stroke(`<path d="M4 10h3l4-3v10l-4-3H4z"/><path d="M16 10l4 4M20 10l-4 4"/>`),
  search: stroke(`<circle cx="11" cy="11" r="5.5"/><path d="M15.5 15.5 20 20"/>`),
  store: stroke(`<path d="M4 9l1.2-4h13.6L20 9"/><path d="M4 9a2.4 2.4 0 0 0 4.8 0A2.4 2.4 0 0 0 13.6 9 2.4 2.4 0 0 0 18.4 9 2.3 2.3 0 0 0 20 9"/><path d="M5.5 11.5V20h13v-8.5"/><path d="M9.5 20v-5h5v5"/>`),
  hammer: stroke(`<path d="M4 14l6-6 3 3-6 6H4v-3z"/><path d="M13 8l3-3 3 3-3 3"/><path d="M14 14l6 6"/>`),
  seatTool: stroke(`<path d="M6 14h12v2H6z"/><path d="M8 14V8h8v6M7 16v3M17 16v3"/>`),
  books: illus(`<rect x="10" y="28" width="28" height="7" rx="1.5" fill="#6d90d2"/><rect x="12" y="20" width="26" height="7" rx="1.5" fill="#e07a62"/><rect x="11" y="12" width="24" height="7" rx="1.5" fill="#7dba78"/><rect x="14" y="8" width="18" height="4" rx="1" fill="#e2b15a"/>`),
  armchair: illus(`<path d="M10 30h28v4H10z" fill="#c9d8bc"/><path d="M12 18h24v12H12z" fill="#d7e6cc"/><path d="M8 16h6v16H8z" fill="#b7cbae"/><path d="M34 16h6v16h-6z" fill="#b7cbae"/><path d="M12 14h24v6H12z" fill="#e3eedc"/>`),
  book: illus(`<path d="M12 10h18v26H12z" fill="#d36b62"/><path d="M14 12h14v22H14z" fill="#f4ecdf"/><path d="M16 16h10M16 20h10M16 24h7" stroke="#d7c4b0" stroke-width="1.4"/>`),
  frame: illus(`<ellipse cx="24" cy="24" rx="10" ry="14" fill="#f4efe4" stroke="#c4894f" stroke-width="3"/><ellipse cx="24" cy="25" rx="5" ry="6" fill="#8fca8a"/>`),
  chair: illus(`<path d="M14 18h20v4H14z" fill="#d7b07a"/><path d="M15 22h18v8H15z" fill="#e6c496"/><path d="M16 30v8M32 30v8M18 34h12" stroke="#a87445" stroke-width="2"/>`),
  box: illus(`<path d="M10 18h28v16H10z" fill="#e7a0b4"/><path d="M10 18l14-6 14 6" fill="#f3c4d2"/><path d="M24 12v22" stroke="#c47d92" stroke-width="1.5"/>`),
  monitor: illus(`<rect x="10" y="12" width="28" height="18" rx="2" fill="#d5deea"/><rect x="13" y="15" width="22" height="12" rx="1" fill="#c5dff2"/><path d="M20 30h8v4h-8z" fill="#c8c2b6"/><path d="M16 34h16v2H16z" fill="#b7b1a6"/>`),
  lamp: illus(`<path d="M16 14h16l-3 12H19z" fill="#8ed472"/><circle cx="24" cy="24" r="3" fill="#ffe1a8"/><path d="M24 26v8M18 36h12" stroke="#c2b8a6" stroke-width="2"/>`),
  cup: illus(`<path d="M16 14h14v14a7 7 0 0 1-14 0z" fill="#f7f4ef" stroke="#e4ddd0" stroke-width="1.5"/><path d="M30 18h4a4 4 0 0 1 0 8h-4" stroke="#e4ddd0" stroke-width="1.6" fill="none"/><path d="M18 28h10" stroke="#d2b48a" stroke-width="1.4"/>`),
  doc: illus(`<path d="M16 8h12l6 6v24H16z" fill="#f7f4ee"/><path d="M28 8v6h6" fill="#e7e0d4"/><path d="M20 20h12M20 24h12M20 28h8" stroke="#c9bfb0" stroke-width="1.4"/>`),
  cabinet: illus(`<path d="M10 16h28v20H10z" fill="#e0b07a"/><path d="M12 28h24v6H12z" fill="#c48a55"/><circle cx="24" cy="22" r="1.4" fill="#f4efe4"/>`),
  acorn: illus(`<ellipse cx="24" cy="28" rx="8" ry="9" fill="#8d5a34"/><path d="M14 24c2-8 18-8 20 0" fill="#6a442c"/><path d="M24 12v6" stroke="#6a442c" stroke-width="1.5"/>`),
  carrot: illus(`<path d="M24 14c6 8 8 16 0 22c-8-6-6-14 0-22z" fill="#e07830"/><path d="M20 12c2 4 2 4 4 2M24 10c2 4 3 5 6 3M28 13c-1 4-1 4 2 5" stroke="#5f9a52" stroke-width="1.6" fill="none"/>`),
  stool: illus(`<ellipse cx="24" cy="16" rx="12" ry="4" fill="#e7c496"/><path d="M14 16l-3 18M34 16l3 18M20 18l-1 16M28 18l1 16" stroke="#a87445" stroke-width="2"/>`),
  can: illus(`<ellipse cx="24" cy="14" rx="10" ry="4" fill="#d7efe4"/><path d="M14 14v16c0 2 4.5 4 10 4s10-2 10-4V14" fill="#c5e4d6"/><ellipse cx="24" cy="14" rx="10" ry="4" fill="none" stroke="#8fb8a4" stroke-width="1.4"/>`),
  sofa: illus(`<path d="M8 22h32v10H8z" fill="#f0d2a4"/><path d="M10 18h28v6H10z" fill="#e7c496"/><path d="M8 20h5v12H8zM35 20h5v12h-5z" fill="#e2bc8a"/>`),
  bench: illus(`<path d="M8 20h32v5H8z" fill="#e0b07a"/><path d="M12 25v10M36 25v10M16 28h16" stroke="#a87445" stroke-width="2"/>`),
  ring: illus(`<circle cx="24" cy="26" r="8" stroke="#e6c56a" stroke-width="3" fill="none"/><path d="M24 14l2 6h-4z" fill="#f2d98a"/>`),
  paper: illus(`<path d="M14 10h16l6 6v20H14z" fill="#f7f4ee"/><path d="M30 10v6h6" fill="#e6dfd2"/><path d="M18 22h8M20 26h10" stroke="#d08a78" stroke-width="1.4"/>`),
  journal: illus(`<path d="M14 10h18v28H14z" fill="#7a68b8"/><path d="M16 12h14v24H16z" fill="#f4ecdf"/><path d="M18 18h8M18 22h10M18 26h6" stroke="#c9b8e4" stroke-width="1.3"/>`),
} as const;

export type IconName = keyof typeof ICONS;
