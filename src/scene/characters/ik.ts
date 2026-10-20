import * as THREE from "three";

const _d = new THREE.Vector3();
const _u = new THREE.Vector3();
const _n = new THREE.Vector3();
const _a = new THREE.Vector3();
const _d1 = new THREE.Vector3();
const _d2 = new THREE.Vector3();
const _k = new THREE.Vector3();
const _t = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q0 = new THREE.Quaternion();
const _qi = new THREE.Quaternion();

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function basisQuat(out: THREE.Quaternion, hinge: THREE.Vector3, dir: THREE.Vector3) {
  _x.copy(hinge);
  _y.copy(dir).negate();
  _z.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

/**
 * Two-bone IK for chains that hang along local -Y (thigh/shin, upper arm/forearm).
 * `target` and `pole` live in the parent space of `j0`. The mid joint bends toward `pole`.
 * Both joints get a pure hinge about the local X axis, so cloth and mitts never twist.
 * Returns the second bone's orientation in the parent space of `j0` (`out`).
 */
export function solveTwoBone(
  j0: THREE.Object3D,
  j1: THREE.Object3D,
  l1: number,
  l2: number,
  target: THREE.Vector3,
  pole: THREE.Vector3,
  out: THREE.Quaternion,
) {
  const origin = j0.position;
  _d.copy(target).sub(origin);
  let dist = _d.length();
  if (dist < 1e-5) {
    _d.set(0, -1, 0);
    dist = 1e-5;
  }
  _u.copy(_d).divideScalar(dist);
  dist = clamp(dist, Math.abs(l1 - l2) + 0.02, (l1 + l2) * 0.996);

  _n.copy(pole).addScaledVector(_u, -pole.dot(_u));
  if (_n.lengthSq() < 1e-6) _n.set(0, 0, 1).addScaledVector(_u, -_u.z);
  _n.normalize();

  const cosA = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const A = Math.acos(cosA);
  _d1.copy(_u).multiplyScalar(Math.cos(A)).addScaledVector(_n, Math.sin(A));
  _k.copy(origin).addScaledVector(_d1, l1);
  _t.copy(origin).addScaledVector(_u, dist);
  _d2.copy(_t).sub(_k).normalize();

  _a.crossVectors(_n, _u).normalize();
  if (_a.x < 0) _a.negate();

  basisQuat(_q0, _a, _d1);
  j0.quaternion.copy(_q0);
  basisQuat(out, _a, _d2);
  _qi.copy(_q0).invert();
  j1.quaternion.copy(_qi).multiply(out);
  return out;
}
