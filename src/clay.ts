import * as THREE from "three";

/**
 * Clay wrap shared by every MeshLambertMaterial in the app.
 * Half-lambert with a soft two-stop curve: the lit side reads round and bright,
 * the far side keeps its colour. No specular lobe, no ink line.
 */
const CLAY_DIRECT = /* glsl */ `
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {

	float hl = dot( geometryNormal, directLight.direction ) * 0.5 + 0.5;
	float soft = hl * hl * ( 3.0 - 2.0 * hl );
	float dotNL = mix( hl, soft, 0.55 );
	vec3 irradiance = dotNL * directLight.color;

	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

}
`;

let installed = false;

export function installClay() {
  if (installed) return;
  installed = true;
  const chunk = THREE.ShaderChunk.lights_lambert_pars_fragment;
  const start = chunk.indexOf("void RE_Direct_Lambert");
  const end = chunk.indexOf("void RE_IndirectDiffuse_Lambert");
  if (start < 0 || end < 0) throw new Error("Lambert chunk layout changed");
  THREE.ShaderChunk.lights_lambert_pars_fragment =
    chunk.slice(0, start) + CLAY_DIRECT.trim() + "\n\n" + chunk.slice(end);
}
