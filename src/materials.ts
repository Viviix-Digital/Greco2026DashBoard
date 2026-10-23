import * as THREE from "three";
import { PAL, ROOM, WINDOWS } from "./theme";

function worldVarying(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vW;")
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vW = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
    );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <common>",
    `#include <common>
    varying vec3 vW;
    float hash12(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
  );
}

function cache(mat: THREE.Material, key: string) {
  mat.customProgramCacheKey = () => key;
  return mat;
}

export interface TilePalette {
  floorA?: string;
  floorB?: string;
  grout?: string;
  tileSize?: number;
  key?: string;
}

export function tileMaterial(palette: TilePalette = {}) {
  const floorA = palette.floorA ?? PAL.floorA;
  const floorB = palette.floorB ?? PAL.floorB;
  const grout = palette.grout ?? PAL.grout;
  const tileSize = palette.tileSize ?? ROOM.tile;
  const mat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
  cache(mat, `tile-floor-${palette.key ?? "room"}`);
  mat.onBeforeCompile = (shader) => {
    worldVarying(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 gp = vW.xz / ${tileSize.toFixed(3)};
      vec2 id = floor(gp);
      vec2 f = fract(gp);
      float gw = 0.07;
      float mx = smoothstep(0.0, 0.012, f.x - gw) * smoothstep(0.0, 0.012, (1.0 - gw) - f.x);
      float my = smoothstep(0.0, 0.012, f.y - gw) * smoothstep(0.0, 0.012, (1.0 - gw) - f.y);
      float mask = mx * my;
      float n = hash12(id);
      vec3 tile = mix(vec3(${hex(floorA)}), vec3(${hex(floorB)}), n);
      float lip = smoothstep(gw + 0.01, gw + 0.055, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
      tile *= mix(0.9, 1.0, lip);
      vec3 grout = vec3(${hex(grout)});
      diffuseColor.rgb = mix(grout, tile, mask);
      float edge = smoothstep(0.0, 0.55, min(vW.x, vW.z));
      diffuseColor.rgb *= mix(0.84, 1.0, edge);`,
    );
  };
  return mat;
}

export function wallpaperMaterial(size: THREE.Vector2, opts: { flipU: boolean; cutWindows: boolean }) {
  const mat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
  mat.defines = { USE_UV: "" };
  cache(mat, opts.cutWindows ? "wallpaper-cut" : "wallpaper");
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSize = { value: size };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vP;\nvarying vec3 vW;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vW = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      )
      .replace("#include <uv_vertex>", `#include <uv_vertex>\n vP = vUv;`);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec2 vP;
      varying vec3 vW;
      uniform vec2 uSize;
      bool insideWin(vec3 p) {
        vec4 wins[2];
        wins[0] = vec4(${WINDOWS[0].z0.toFixed(3)}, ${WINDOWS[0].y0.toFixed(3)}, ${WINDOWS[0].z1.toFixed(3)}, ${WINDOWS[0].y1.toFixed(3)});
        wins[1] = vec4(${WINDOWS[1].z0.toFixed(3)}, ${WINDOWS[1].y0.toFixed(3)}, ${WINDOWS[1].z1.toFixed(3)}, ${WINDOWS[1].y1.toFixed(3)});
        for (int i = 0; i < 2; i++) {
          if (p.z > wins[i].x && p.z < wins[i].z && p.y > wins[i].y && p.y < wins[i].w) return true;
        }
        return false;
      }`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      if (${opts.cutWindows ? "true" : "false"} && insideWin(vW)) discard;
      vec2 p = vec2(${opts.flipU ? "1.0 - vP.x" : "vP.x"}, vP.y) * uSize;
      float rowH = 0.2;
      float colW = 0.22;
      float row = floor(p.y / rowH);
      float x = p.x / colW + mod(row, 2.0) * 0.5;
      vec2 cell = vec2(fract(x), fract(p.y / rowH));
      float d = distance(cell, vec2(0.5, 0.08));
      float scale = smoothstep(0.58, 0.4, d);
      float groove = smoothstep(0.045, 0.0, abs(d - 0.5));
      vec3 base = vec3(${hex(PAL.wallDeep)});
      vec3 alt = vec3(${hex(PAL.wallLift)});
      diffuseColor.rgb = mix(base, alt, scale);
      diffuseColor.rgb = mix(diffuseColor.rgb, alt * 1.12, groove);`,
    );
  };
  return mat;
}

export function woodMaterial(hexColor: string) {
  const mat = new THREE.MeshLambertMaterial({ color: hexColor });
  cache(mat, "wood-grain");
  mat.onBeforeCompile = (shader) => {
    worldVarying(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float stripe = sin(vW.y * 46.0 + vW.x * 7.0 + vW.z * 5.0);
      float fine = sin(vW.y * 120.0 + vW.x * 16.0);
      diffuseColor.rgb *= 0.94 + 0.07 * stripe + 0.025 * fine;`,
    );
  };
  return mat;
}

export function furMaterial() {
  const mat = new THREE.MeshLambertMaterial({ color: "#ffffff", vertexColors: true });
  cache(mat, "cat-fur");
  mat.onBeforeCompile = (shader) => {
    worldVarying(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float n = hash12(floor(vW.xz * 26.0 + vW.y * 18.0));
      float n2 = hash12(floor(vW.xy * 14.0));
      diffuseColor.rgb *= mix(0.9, 1.07, n);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.04, 0.98, 0.94), n2 * 0.35);`,
    );
  };
  return mat;
}

export function rugMaterial() {
  const mat = new THREE.MeshLambertMaterial({ color: PAL.rug });
  mat.defines = { USE_UV: "" };
  cache(mat, "rug-cloth");
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vP;")
      .replace("#include <uv_vertex>", `#include <uv_vertex>\n vP = uv;`);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec2 vP;
      float hash12(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float n = hash12(floor(vP * 48.0));
      diffuseColor.rgb *= mix(0.96, 1.04, n);`,
    );
  };
  return mat;
}

/** Grey concrete with per-cell noise and faint painted guide lines, for the construction floor. */
export function concreteMaterial() {
  const mat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
  cache(mat, "concrete-floor");
  mat.onBeforeCompile = (shader) => {
    worldVarying(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 gp = vW.xz / 0.8;
      vec2 id = floor(gp);
      vec2 f = fract(gp);
      float n = hash12(id);
      vec3 base = mix(vec3(${hex("#a8a9a4")}), vec3(${hex("#94958f")}), n);
      float seam = smoothstep(0.0, 0.02, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
      base *= mix(0.82, 1.0, seam);
      float speckle = hash12(floor(vW.xz * 22.0));
      base *= mix(0.94, 1.05, speckle);
      float lane = smoothstep(0.035, 0.0, abs(fract(vW.z / 1.6) - 0.5) - 0.42) * smoothstep(3.2, 2.4, vW.x) * step(0.4, vW.x);
      base = mix(base, vec3(${hex("#d9a92c")}) * 0.9, lane * 0.28);
      diffuseColor.rgb = base;
      float edge = smoothstep(0.0, 0.55, min(vW.x, vW.z));
      diffuseColor.rgb *= mix(0.84, 1.0, edge);`,
    );
  };
  return mat;
}

/** Diagonal black/yellow hazard stripes (barriers, crane base, kerbs). */
export function hazardMaterial(a = "#f2b705", b = "#33302c") {
  const mat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
  cache(mat, `hazard-${a}-${b}`);
  mat.onBeforeCompile = (shader) => {
    worldVarying(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float s = step(0.5, fract((vW.x + vW.z + vW.y) * 3.2));
      diffuseColor.rgb = mix(vec3(${hex(a)}), vec3(${hex(b)}), s);`,
    );
  };
  return mat;
}

/** Two-colour awning stripes for the storefront. */
export function stripedMaterial(a = "#d9574a", b = "#f7f2e8") {
  const mat = new THREE.MeshLambertMaterial({ color: "#ffffff" });
  cache(mat, `stripes-${a}-${b}`);
  mat.onBeforeCompile = (shader) => {
    worldVarying(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float s = step(0.5, fract(vW.x * 2.6 + vW.z * 2.6));
      diffuseColor.rgb = mix(vec3(${hex(a)}), vec3(${hex(b)}), s);`,
    );
  };
  return mat;
}

function hex(h: string) {
  const c = new THREE.Color(h);
  return `${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)}`;
}

export function blobMaterial(opacity: number, color: string = PAL.shadow) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = dot(p, p);
        float a = smoothstep(1.0, 0.2, r) * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
}
