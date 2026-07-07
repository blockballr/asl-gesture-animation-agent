// pose.js - a "pose" is the state of both hands in a single frame.
//
// A single hand is 21 [x, y, z] landmarks in MediaPipe Hand order (see
// hand.js). A pose is { R, L } where R is the right hand and L is the left
// hand, or null when only one hand is signing. Whole-word signs (signs.js)
// play as sequences of poses through the two-hand renderer; fingerspelling
// (one hand) sets L to null.

import * as THREE from 'three';

export function pose(R, L = null) {
  return { R, L };
}

function lerpHand(a, b, t) {
  const out = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = [
      a[i][0] + (b[i][0] - a[i][0]) * t,
      a[i][1] + (b[i][1] - a[i][1]) * t,
      a[i][2] + (b[i][2] - a[i][2]) * t,
    ];
  }
  return out;
}

// Interpolate two poses. If a hand is present in only one endpoint we snap to
// whichever exists rather than fading a half-formed hand in from the origin.
export function lerpPose(a, b, t) {
  const R = lerpHand(a.R, b.R, t);
  let L = null;
  if (a.L && b.L) L = lerpHand(a.L, b.L, t);
  else if (b.L) L = b.L;
  else if (a.L) L = a.L;
  return { R, L };
}

export function translateHand(hand, dx, dy, dz) {
  return hand.map((p) => [p[0] + dx, p[1] + dy, p[2] + dz]);
}

// Translate both hands of a pose by the same offset (used for movement overlays).
export function translatePose(p, dx, dy, dz) {
  return pose(
    translateHand(p.R, dx, dy, dz),
    p.L ? translateHand(p.L, dx, dy, dz) : null,
  );
}

// Mirror a right hand into a left hand across the YZ plane (x -> -x). The
// thumb, which points -x on the right hand, ends up pointing +x - correct for
// a left hand.
export function mirrorHand(hand) {
  return hand.map((p) => [-p[0], p[1], p[2]]);
}

const _pivot = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();

// Rotate a hand about its wrist (landmark 0) by euler angles {x, y, z} in
// radians. The wrist stays put; the fingers swing - this is how a sign orients
// the palm (toward the viewer, upward, tilted, etc.).
export function rotateHand(hand, { x = 0, y = 0, z = 0 } = {}) {
  _pivot.set(hand[0][0], hand[0][1], hand[0][2]);
  _q.setFromEuler(_e.set(x, y, z, 'XYZ'));
  return hand.map((p) => {
    _v.set(p[0], p[1], p[2]).sub(_pivot).applyQuaternion(_q).add(_pivot);
    return [_v.x, _v.y, _v.z];
  });
}
