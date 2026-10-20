/** Locked palette and room metrics, sampled from the reference then tuned in the view. */
export const PAL = {
  page0: "#b7e6d4",
  page1: "#8dceba",
  page2: "#6eab93",
  page3: "#5b947f",
  silhouette: "#4d8b74",
  wall: "#6a72c2",
  wallDeep: "#4c549c",
  wallLift: "#7d84ce",
  floorA: "#f7e7d2",
  floorB: "#ecd6b8",
  grout: "#c9ae90",
  rug: "#4f8f70",
  rugEdge: "#3f755c",
  rugStitch: "#e7f2ea",
  plinthTop: "#9aaf86",
  plinthSide: "#73956c",
  wood: "#c48a55",
  woodDeep: "#9a6840",
  woodDark: "#7a5236",
  cream: "#f6f0e4",
  pageBlock: "#f3ecdf",
  glass: "#c5efdf",
  glassGlow: "#d9fff1",
  terracotta: "#c46b45",
  soil: "#6d4a36",
  dried: "#c4a36a",
  driedDeep: "#a07e48",
  leaf: "#6eaa62",
  leafDeep: "#4e8a52",
  lamp: "#7ec96a",
  lampHot: "#d8ffb0",
  bulb: "#ffe2ad",
  skin: "#f0c3a6",
  blush: "#f0a090",
  hair: "#4a3024",
  hairBrown: "#8a5a3a",
  hairLong: "#5a3426",
  hairDark: "#3a241c",
  ink: "#3c3538",
  sweaterCream: "#e7d3b8",
  pantsBlue: "#5e6f9e",
  dress: "#a56b43",
  beret: "#c4894f",
  yellow: "#f0c14a",
  girlPants: "#4f78c4",
  greenSweater: "#3f8f56",
  beige: "#e6d3b6",
  shoe: "#6a4634",
  cat: "#e8873a",
  catDeep: "#d06e28",
  catWhite: "#fff7f0",
  pink: "#f2b0b0",
  white: "#f7f5f1",
  frame: "#e6d2a4",
  frameWood: "#b5814a",
  outlet: "#f4f1ea",
  shadow: "#243f34",
} as const;

export const ROOM = {
  w: 7.2,
  d: 6.4,
  wallH: 3.08,
  wallT: 0.18,
  floorY: 0.052,
  tile: 0.4,
  snap: 0.2,
};

export const WINDOWS = [
  { z0: 1.52, z1: 2.56, y0: 0.98, y1: 2.58 },
  { z0: 3.12, z1: 4.16, y0: 0.98, y1: 2.58 },
] as const;

export const CAM = {
  yaw: (48 * Math.PI) / 180,
  elev: (30 * Math.PI) / 180,
  dist: 32,
  view: 4.05,
  target: [ROOM.w * 0.47, 1.12, ROOM.d * 0.45] as const,
};

export const ZOOMS = [
  { id: "far", label: "Far", zoom: 0.74 },
  { id: "default", label: "Default", zoom: 1 },
  { id: "near", label: "Near", zoom: 1.28 },
  { id: "close", label: "Close", zoom: 1.58 },
] as const;

export const DAY = {
  sun: 2.15,
  hemi: 0.66,
  amb: 0.36,
  fill: 0.5,
  sky: "#f6f3ee",
  ground: "#e6d2b8",
};

export const NIGHT = {
  sun: 0.2,
  hemi: 0.34,
  amb: 0.18,
  fill: 0.1,
  sky: "#9eb0d0",
  ground: "#6a5a68",
};
