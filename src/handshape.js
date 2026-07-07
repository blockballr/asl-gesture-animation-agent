// handshape.js — parametric hand -> 21 MediaPipe landmarks.
//
// Instead of hand-typing 63 numbers per letter, a handshape is described by
// four finger-curl values (0 = straight, 1 = fully curled), a spread amount
// (fingers fanned apart), and a thumb preset. makeLetter('A') returns a frame
// in the exact same shape hand.js/waveClip use, so fingerspelling plays
// through the identical renderer.
//
// Fidelity note: these are recognizable approximations, not textbook-perfect
// ASL. A few pairs (S/T, K/P, G/Q) are only weakly distinguished here and will
// be refined later with real MediaPipe-captured handshapes.

import * as THREE from 'three';

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

// Finger roots + segment lengths, matching the open hand in hand.js.
// spreadSign fans the finger left(+)/right(-) when spread > 0.
const FINGERS = {
  index:  { idx: [5, 6, 7, 8],     mcp: [-0.18, 0.55, 0], seg: [0.20, 0.13, 0.10], dir: [-0.05, 1, 0], spreadSign:  1.0 },
  middle: { idx: [9, 10, 11, 12],  mcp: [ 0.00, 0.58, 0], seg: [0.22, 0.14, 0.11], dir: [ 0.00, 1, 0], spreadSign:  0.3 },
  ring:   { idx: [13, 14, 15, 16], mcp: [ 0.18, 0.55, 0], seg: [0.21, 0.13, 0.10], dir: [ 0.05, 1, 0], spreadSign: -0.3 },
  pinky:  { idx: [17, 18, 19, 20], mcp: [ 0.34, 0.50, 0], seg: [0.16, 0.11, 0.09], dir: [ 0.12, 1, 0], spreadSign: -1.0 },
};

const CURL_GAINS = [0.7, 1.1, 0.9]; // per-segment bend; sums to ~155° at curl=1
const SPREAD_MAX = 0.28;            // radians of fan at spread=1

const THUMB_CMC = [-0.30, 0.15, 0.02]; // landmark 1, fixed
// Thumb presets give landmarks 2 (mcp), 3 (ip), 4 (tip).
const THUMB = {
  side:  { mcp: [-0.30, 0.30, 0.03], ip: [-0.30, 0.44, 0.03], tip: [-0.29, 0.56, 0.03] }, // alongside fist (A)
  up:    { mcp: [-0.40, 0.28, 0.05], ip: [-0.48, 0.42, 0.05], tip: [-0.52, 0.55, 0.05] }, // up/open (C, G)
  out:   { mcp: [-0.45, 0.22, 0.03], ip: [-0.58, 0.30, 0.03], tip: [-0.70, 0.36, 0.03] }, // extended sideways (L, Y)
  across:{ mcp: [-0.15, 0.32, 0.12], ip: [ 0.02, 0.40, 0.14], tip: [ 0.16, 0.44, 0.14] }, // across palm (B, U)
  front: { mcp: [-0.10, 0.28, 0.20], ip: [ 0.06, 0.34, 0.22], tip: [ 0.18, 0.36, 0.20] }, // across front of fist (S, T)
  touch: { mcp: [-0.28, 0.35, 0.10], ip: [-0.20, 0.50, 0.16], tip: [-0.10, 0.60, 0.18] }, // touching a fingertip (F, O, D)
};

function buildFinger(def, curl, spread) {
  const dir = new THREE.Vector3(...def.dir).normalize();
  dir.applyAxisAngle(Z, def.spreadSign * spread * SPREAD_MAX);
  const pos = new THREE.Vector3(...def.mcp);
  const pts = [[pos.x, pos.y, pos.z]];
  for (let k = 0; k < 3; k++) {
    dir.applyAxisAngle(X, curl * CURL_GAINS[k]);
    pos.addScaledVector(dir, def.seg[k]);
    pts.push([pos.x, pos.y, pos.z]);
  }
  return pts; // [mcp, pip, dip, tip]
}

// cfg: { fingers: [index, middle, ring, pinky] curls, spread, thumb, crossed? }
export function makeHandshape(cfg) {
  const L = new Array(21);
  L[0] = [0, 0, 0]; // wrist

  const order = ['index', 'middle', 'ring', 'pinky'];
  order.forEach((name, i) => {
    const def = FINGERS[name];
    const pts = buildFinger(def, cfg.fingers[i], cfg.spread || 0);
    def.idx.forEach((li, k) => { L[li] = pts[k]; });
  });

  const th = THUMB[cfg.thumb] || THUMB.side;
  L[1] = [...THUMB_CMC];
  L[2] = [...th.mcp];
  L[3] = [...th.ip];
  L[4] = [...th.tip];

  if (cfg.crossed) {
    // R: index and middle cross over each other.
    L[8] = [L[8][0] + 0.10, L[8][1], L[8][2] + 0.03];
    L[7] = [L[7][0] + 0.06, L[7][1], L[7][2] + 0.02];
    L[12] = [L[12][0] - 0.10, L[12][1], L[12][2] + 0.06];
    L[11] = [L[11][0] - 0.06, L[11][1], L[11][2] + 0.04];
  }
  return L;
}

// ASL fingerspelling alphabet as parametric configs.
// fingers = [index, middle, ring, pinky] curl; 0 straight .. 1 fist.
export const ALPHABET = {
  A: { fingers: [1, 1, 1, 1], spread: 0, thumb: 'side' },
  B: { fingers: [0, 0, 0, 0], spread: 0, thumb: 'across' },
  C: { fingers: [0.4, 0.4, 0.4, 0.4], spread: 0, thumb: 'up' },
  D: { fingers: [0, 1, 1, 1], spread: 0, thumb: 'touch' },
  E: { fingers: [0.75, 0.75, 0.75, 0.75], spread: 0, thumb: 'across' },
  F: { fingers: [0.55, 0, 0, 0], spread: 0.2, thumb: 'touch' },
  G: { fingers: [0, 1, 1, 1], spread: 0, thumb: 'up' },
  H: { fingers: [0, 0, 1, 1], spread: 0, thumb: 'across' },
  I: { fingers: [1, 1, 1, 0], spread: 0, thumb: 'side' },
  J: { fingers: [1, 1, 1, 0], spread: 0, thumb: 'side', motion: 'J' },
  K: { fingers: [0, 0, 1, 1], spread: 0.25, thumb: 'up' },
  L: { fingers: [0, 1, 1, 1], spread: 0, thumb: 'out' },
  M: { fingers: [0.9, 0.9, 0.9, 1], spread: 0, thumb: 'front' },
  N: { fingers: [0.9, 0.9, 1, 1], spread: 0, thumb: 'front' },
  O: { fingers: [0.55, 0.55, 0.55, 0.55], spread: 0, thumb: 'touch' },
  P: { fingers: [0, 0, 1, 1], spread: 0.25, thumb: 'touch' },
  Q: { fingers: [0, 1, 1, 1], spread: 0, thumb: 'touch' },
  R: { fingers: [0, 0, 1, 1], spread: 0, thumb: 'across', crossed: true },
  S: { fingers: [1, 1, 1, 1], spread: 0, thumb: 'front' },
  T: { fingers: [1, 1, 1, 1], spread: 0, thumb: 'side' },
  U: { fingers: [0, 0, 1, 1], spread: 0, thumb: 'across' },
  V: { fingers: [0, 0, 1, 1], spread: 0.6, thumb: 'across' },
  W: { fingers: [0, 0, 0, 1], spread: 0.5, thumb: 'touch' },
  X: { fingers: [0.5, 1, 1, 1], spread: 0, thumb: 'side' },
  Y: { fingers: [1, 1, 1, 0], spread: 0, thumb: 'out' },
  Z: { fingers: [0, 1, 1, 1], spread: 0, thumb: 'side', motion: 'Z' },
};

export function makeLetter(ch) {
  const cfg = ALPHABET[ch.toUpperCase()];
  return cfg ? makeHandshape(cfg) : restPose();
}

// A relaxed, slightly-curled open hand for idle + inter-word rest.
export function restPose() {
  return makeHandshape({ fingers: [0.15, 0.15, 0.15, 0.2], spread: 0.15, thumb: 'up' });
}
