// hand.js — the sign data contract.
//
// A "sign clip" is an array of frames. Each frame is 21 landmarks in
// MediaPipe Hand order, every landmark an [x, y, z] triple. This is exactly
// the shape MediaPipe Holistic produces, so real captured signs will drop
// straight into the same renderer that plays this hand-authored wave.

import * as THREE from 'three';

// MediaPipe hand landmark indices (21):
// 0 wrist
// 1-4  thumb  (cmc, mcp, ip, tip)
// 5-8  index  (mcp, pip, dip, tip)
// 9-12 middle
// 13-16 ring
// 17-20 pinky
export const LANDMARK_COUNT = 21;

// Bone topology — the MediaPipe HAND_CONNECTIONS set.
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],        // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],        // index
  [5, 9], [9, 10], [10, 11], [11, 12],   // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20],// pinky
  [0, 17],                               // palm base
];

// Canonical open right hand, palm toward the viewer (+Z), fingers up (+Y).
// Units are normalized so the hand is ~1 unit tall; the renderer scales it.
const OPEN_HAND = [
  [ 0.00, 0.00, 0.00], // 0  wrist
  [-0.30, 0.15, 0.02], // 1  thumb cmc
  [-0.45, 0.30, 0.03], // 2  thumb mcp
  [-0.52, 0.45, 0.03], // 3  thumb ip
  [-0.55, 0.58, 0.03], // 4  thumb tip
  [-0.18, 0.55, 0.00], // 5  index mcp
  [-0.20, 0.75, 0.00], // 6  index pip
  [-0.21, 0.88, 0.00], // 7  index dip
  [-0.22, 0.98, 0.00], // 8  index tip
  [ 0.00, 0.58, 0.00], // 9  middle mcp
  [ 0.00, 0.80, 0.00], // 10 middle pip
  [ 0.00, 0.94, 0.00], // 11 middle dip
  [ 0.00, 1.05, 0.00], // 12 middle tip
  [ 0.18, 0.55, 0.00], // 13 ring mcp
  [ 0.20, 0.76, 0.00], // 14 ring pip
  [ 0.21, 0.89, 0.00], // 15 ring dip
  [ 0.22, 0.99, 0.00], // 16 ring tip
  [ 0.34, 0.50, 0.00], // 17 pinky mcp
  [ 0.38, 0.66, 0.00], // 18 pinky pip
  [ 0.40, 0.77, 0.00], // 19 pinky dip
  [ 0.42, 0.86, 0.00], // 20 pinky tip
];

export function baseHand() {
  // Deep copy so callers can mutate frames freely.
  return OPEN_HAND.map((p) => [p[0], p[1], p[2]]);
}

// Rotate a landmark set about the wrist (landmark 0) on the given axis.
function rotateAboutWrist(landmarks, axis, angle) {
  const pivot = new THREE.Vector3(...landmarks[0]);
  const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  const v = new THREE.Vector3();
  return landmarks.map((p) => {
    v.set(p[0], p[1], p[2]).sub(pivot).applyQuaternion(q).add(pivot);
    return [v.x, v.y, v.z];
  });
}

// Generate a "wave" sign clip: the open hand tilts side to side about the
// wrist while rocking slightly in depth, so it reads as a friendly wave.
// Returns { name, fps, frames } — the standard clip shape.
export function waveClip({ frames = 90, fps = 30 } = {}) {
  const base = baseHand();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const out = [];
  for (let f = 0; f < frames; f++) {
    const t = f / frames; // 0..1 over the loop
    const tilt = 0.5 * Math.sin(t * Math.PI * 2 * 2); // two waves per loop
    const rock = 0.25 * Math.sin(t * Math.PI * 2);    // gentle depth rock
    let frame = rotateAboutWrist(base, zAxis, tilt);
    frame = rotateAboutWrist(frame, yAxis, rock);
    out.push(frame);
  }
  return { name: 'wave', fps, frames: out };
}
