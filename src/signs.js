// signs.js — procedural whole-word ASL signs.
//
// A sign is authored declaratively as a sequence of keyframes; each keyframe
// places one or both hands (handshape + location + orientation), and
// buildSignClip synthesizes a { name, fps, frames } clip whose frames are
// two-hand poses (pose.js). Same synthesis idea as fingerspellClip,
// generalized to poses, orientation, and movement.
//
// Fidelity note: these are recognizable approximations for a floating-hands
// avatar with a faint head/shoulders reference. Location (forehead vs chin vs
// chest) is conveyed via the LOC presets below, tuned against that reference;
// non-manual (facial) grammar is still absent. Real ASL fidelity needs the
// face channel and, ideally, Deaf-signer review.

import { makeHandshape } from './handshape.js';
import { pose, lerpPose, translatePose, mirrorHand, rotateHand, translateHand } from './pose.js';

const FPS = 30;

// --- handshape presets (configs for makeHandshape) -----------------------
const SHAPE = {
  flat:  { fingers: [0, 0, 0, 0], spread: 0,   thumb: 'across' }, // B / flat hand
  open:  { fingers: [0, 0, 0, 0], spread: 1,   thumb: 'out' },    // 5 / open spread hand
  point: { fingers: [0, 1, 1, 1], spread: 0,   thumb: 'side' },   // 1 / index point
  fist:  { fingers: [1, 1, 1, 1], spread: 0,   thumb: 'front' },  // S / fist
  A:     { fingers: [1, 1, 1, 1], spread: 0,   thumb: 'side' },   // A / thumb-alongside fist
  U:     { fingers: [0, 0, 1, 1], spread: 0,   thumb: 'across' }, // index + middle together
  V:     { fingers: [0, 0, 1, 1], spread: 0.6, thumb: 'across' }, // index + middle spread
  bentU: { fingers: [0.55, 0.55, 1, 1], spread: 0, thumb: 'touch' },
  H:     { fingers: [0, 0, 1, 1], spread: 0.1, thumb: 'across' },
  C:     { fingers: [0.4, 0.4, 0.4, 0.4], spread: 0, thumb: 'up' },  // curved C
  claw:  { fingers: [0.5, 0.5, 0.5, 0.5], spread: 0.6, thumb: 'up' },// clawed 5
  O:     { fingers: [0.55, 0.55, 0.55, 0.55], spread: 0, thumb: 'touch' }, // O / flat-O
  L:     { fingers: [0, 1, 1, 1], spread: 0, thumb: 'out' },        // L
  Y:     { fingers: [1, 1, 1, 0], spread: 0, thumb: 'out' },        // Y
  W:     { fingers: [0, 0, 0, 1], spread: 0.5, thumb: 'touch' },    // W
  X:     { fingers: [0.5, 1, 1, 1], spread: 0, thumb: 'side' },     // X / hooked index
};

// --- body-location presets ------------------------------------------------
// dy/dx/dz offsets (pre-scale) that move a hand to a spot against the head +
// shoulders reference. The hand group is lifted so the neutral hand sits at
// face level; these nudge up (forehead) or down (chest) from there. TUNE HERE
// to recalibrate every location-based sign at once.
const LOC = {
  forehead: { dy: 0.34 },
  temple:   { dy: 0.30, dx: -0.30 },
  ear:      { dy: 0.24, dx: -0.42 },
  eye:      { dy: 0.20, dx: -0.10 },
  cheek:    { dy: 0.12, dx: -0.30 },
  mouth:    { dy: 0.02 },
  chin:     { dy: -0.08 },
  neck:     { dy: -0.26 },
  chest:    { dy: -0.52 },
  neutral:  { dy: -0.22 },
};

// Movement overlays applied during a keyframe's hold: a function of progress
// u in [0,1] returning a [dx, dy, dz] offset for both hands.
const OVERLAY = {
  shakeX: (u) => [0.10 * Math.sin(u * Math.PI * 4), 0, 0],
  shakeY: (u) => [0, 0.06 * Math.sin(u * Math.PI * 4), 0],
  circle: (u) => [0.07 * Math.cos(u * Math.PI * 4), 0.07 * Math.sin(u * Math.PI * 4), 0],
};

// --- keyframe -> pose -----------------------------------------------------
function buildHand({ shape, loc, rot, side = 'R' }) {
  let h = makeHandshape(typeof shape === 'string' ? SHAPE[shape] : shape);
  if (rot) h = rotateHand(h, rot);
  if (side === 'L') h = mirrorHand(h);
  if (loc) h = translateHand(h, loc.dx || 0, loc.dy || 0, loc.dz || 0);
  return h;
}

function buildPose(kf) {
  const R = buildHand({ ...kf.R, side: 'R' });
  const L = kf.L ? buildHand({ ...kf.L, side: 'L' }) : null;
  return pose(R, L);
}

export function buildSignClip(sign) {
  const frames = [];
  const labels = [];
  const push = (p) => { frames.push(p); labels.push(sign.name); };

  let prev = null;
  sign.keyframes.forEach((kf, idx) => {
    const target = buildPose(kf);
    const t = idx === 0 ? 0 : (kf.t ?? 6);
    for (let i = 1; i <= t; i++) push(lerpPose(prev, target, i / t));

    const hold = kf.hold ?? 8;
    const ov = kf.overlay ? OVERLAY[kf.overlay] : null;
    for (let i = 0; i < hold; i++) {
      if (ov) {
        const [dx, dy, dz] = ov(hold <= 1 ? 0 : i / (hold - 1));
        push(translatePose(target, dx, dy, dz));
      } else {
        push(target);
      }
    }
    prev = target;
  });

  return { name: sign.name, fps: sign.fps ?? FPS, frames, labels };
}

// --- the vocabulary -------------------------------------------------------
// ~50 high-frequency signs. Each is an approximation; the comment names the
// real sign so intent is auditable. Location-based signs use LOC presets.
const VOCAB = {
  // ---- pronouns ----
  ME: { name: 'ME', keyframes: [
    { R: { shape: 'point', rot: { x: -0.5 }, loc: { dy: -0.05, dz: 0.35 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: -0.5 }, loc: { dy: -0.05, dz: -0.15 } }, t: 10, hold: 10 },
  ] },
  YOU: { name: 'YOU', keyframes: [
    { R: { shape: 'point', rot: { x: -0.3 }, loc: { dz: -0.1 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: -0.3 }, loc: { dz: 0.45 } }, t: 10, hold: 10 },
  ] },
  WE: { name: 'WE', keyframes: [ // index arcs from right chest to left chest
    { R: { shape: 'point', rot: { x: -0.4 }, loc: { ...LOC.chest, dx: 0.18 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: -0.4 }, loc: { ...LOC.chest, dx: -0.18 } }, t: 12, hold: 8 },
  ] },
  THEY: { name: 'THEY', keyframes: [ // point outward, sweep aside
    { R: { shape: 'point', rot: { x: -0.6 }, loc: { dx: -0.1, dz: 0.2 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: -0.6 }, loc: { dx: 0.35, dz: 0.2 } }, t: 12, hold: 8 },
  ] },
  MY: { name: 'MY', keyframes: [ // flat palm pressed to chest
    { R: { shape: 'flat', rot: { x: 1.4 }, loc: { ...LOC.chest, dz: 0.15 } }, t: 10, hold: 12 },
  ] },
  YOUR: { name: 'YOUR', keyframes: [ // flat palm pushed outward
    { R: { shape: 'flat', rot: { x: -0.2 }, loc: { ...LOC.neutral, dz: 0.1 } }, t: 8, hold: 4 },
    { R: { shape: 'flat', rot: { x: -0.2 }, loc: { ...LOC.neutral, dz: 0.42 } }, t: 10, hold: 8 },
  ] },

  // ---- question words ----
  WHAT: { name: 'WHAT', keyframes: [
    { R: { shape: 'open', rot: { x: 1.3 }, loc: { dx: 0.18, dy: -0.1 } },
      L: { shape: 'open', rot: { x: 1.3 }, loc: { dx: -0.18, dy: -0.1 } },
      t: 8, hold: 24, overlay: 'shakeX' },
  ] },
  WHERE: { name: 'WHERE', keyframes: [
    { R: { shape: 'point', loc: { dy: 0.12 } }, t: 8, hold: 26, overlay: 'shakeX' },
  ] },
  WHO: { name: 'WHO', keyframes: [ // L-hand near mouth, small wag
    { R: { shape: 'L', rot: { z: -0.3 }, loc: { ...LOC.mouth } }, t: 8, hold: 20, overlay: 'shakeY' },
  ] },
  WHEN: { name: 'WHEN', keyframes: [ // R index orbits L index
    { R: { shape: 'point', rot: { x: -0.4 }, loc: { dy: 0.05, dx: 0.06 } },
      L: { shape: 'point', rot: { x: -0.4 }, loc: { dy: 0.0, dx: -0.12 } },
      t: 8, hold: 22, overlay: 'circle' },
  ] },
  WHY: { name: 'WHY', keyframes: [ // forehead, then Y-hand down
    { R: { shape: 'point', rot: { x: -0.3 }, loc: { ...LOC.forehead } }, t: 8, hold: 5 },
    { R: { shape: 'Y', rot: { x: -0.3 }, loc: { ...LOC.neck } }, t: 10, hold: 8 },
  ] },
  HOW: { name: 'HOW', keyframes: [ // curved hands roll up to palms up
    { R: { shape: 'C', rot: { x: 0.8, z: -0.3 }, loc: { dy: -0.22, dx: 0.12 } },
      L: { shape: 'C', rot: { x: 0.8, z: 0.3 }, loc: { dy: -0.22, dx: -0.12 } },
      t: 8, hold: 4 },
    { R: { shape: 'C', rot: { x: 1.4, z: -0.3 }, loc: { dy: -0.1, dx: 0.12 } },
      L: { shape: 'C', rot: { x: 1.4, z: 0.3 }, loc: { dy: -0.1, dx: -0.12 } },
      t: 10, hold: 8 },
  ] },

  // ---- responses ----
  YES: { name: 'YES', keyframes: [
    { R: { shape: 'fist', rot: { x: -0.1 } }, t: 8, hold: 3 },
    { R: { shape: 'fist', rot: { x: 0.6 } }, t: 5, hold: 3 },
    { R: { shape: 'fist', rot: { x: -0.1 } }, t: 5, hold: 3 },
    { R: { shape: 'fist', rot: { x: 0.6 } }, t: 5, hold: 3 },
    { R: { shape: 'fist', rot: { x: -0.1 } }, t: 5, hold: 4 },
  ] },
  NO: { name: 'NO', keyframes: [
    { R: { shape: 'U', loc: { dy: 0.05 } }, t: 8, hold: 3 },
    { R: { shape: 'bentU', loc: { dy: 0.05 } }, t: 5, hold: 3 },
    { R: { shape: 'U', loc: { dy: 0.05 } }, t: 5, hold: 3 },
    { R: { shape: 'bentU', loc: { dy: 0.05 } }, t: 5, hold: 4 },
  ] },
  NOT: { name: 'NOT', keyframes: [ // thumb under chin, flicks out
    { R: { shape: 'A', rot: { x: -0.3 }, loc: { ...LOC.chin } }, t: 8, hold: 4 },
    { R: { shape: 'A', rot: { x: -0.3 }, loc: { dy: 0.02, dz: 0.35 } }, t: 8, hold: 8 },
  ] },
  MAYBE: { name: 'MAYBE', keyframes: [ // two flat palms up, alternating (scales)
    { R: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.1, dx: 0.2 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.35, dx: -0.2 } }, t: 8, hold: 3 },
    { R: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.35, dx: 0.2 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.1, dx: -0.2 } }, t: 8, hold: 3 },
    { R: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.1, dx: 0.2 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.35, dx: -0.2 } }, t: 8, hold: 6 },
  ] },

  // ---- social ----
  HELLO: { name: 'HELLO', keyframes: [
    { R: { shape: 'flat', rot: { z: -0.25 }, loc: { dy: 0.30, dx: -0.15 } }, t: 8, hold: 6 },
    { R: { shape: 'flat', rot: { z: -0.5 }, loc: { dy: 0.18, dx: 0.30 } }, t: 10, hold: 8 },
  ] },
  'THANK-YOU': { name: 'THANK-YOU', keyframes: [
    { R: { shape: 'flat', rot: { x: -0.35 }, loc: { ...LOC.chin, dz: 0.05 } }, t: 8, hold: 6 },
    { R: { shape: 'flat', rot: { x: -0.55 }, loc: { dy: -0.05, dz: 0.45 } }, t: 12, hold: 10 },
  ] },
  PLEASE: { name: 'PLEASE', keyframes: [ // flat hand circles on chest
    { R: { shape: 'flat', rot: { x: 1.3 }, loc: { ...LOC.chest, dz: 0.15 } }, t: 8, hold: 24, overlay: 'circle' },
  ] },
  SORRY: { name: 'SORRY', keyframes: [ // fist circles on chest
    { R: { shape: 'A', rot: { x: 1.3 }, loc: { ...LOC.chest, dz: 0.15 } }, t: 8, hold: 24, overlay: 'circle' },
  ] },
  NAME: { name: 'NAME', keyframes: [
    { R: { shape: 'H', rot: { z: -0.35 }, loc: { dy: 0.09, dz: 0.06 } },
      L: { shape: 'H', rot: { z: 0.35 }, loc: { dy: -0.04 } }, t: 8, hold: 3 },
    { R: { shape: 'H', rot: { z: -0.35 }, loc: { dy: 0.00, dz: 0.06 } },
      L: { shape: 'H', rot: { z: 0.35 }, loc: { dy: -0.04 } }, t: 5, hold: 3 },
    { R: { shape: 'H', rot: { z: -0.35 }, loc: { dy: 0.09, dz: 0.06 } },
      L: { shape: 'H', rot: { z: 0.35 }, loc: { dy: -0.04 } }, t: 5, hold: 3 },
    { R: { shape: 'H', rot: { z: -0.35 }, loc: { dy: 0.00, dz: 0.06 } },
      L: { shape: 'H', rot: { z: 0.35 }, loc: { dy: -0.04 } }, t: 5, hold: 4 },
  ] },
  FINE: { name: 'FINE', keyframes: [ // open-5 thumb on chest, out
    { R: { shape: 'open', rot: { x: -0.2 }, loc: { ...LOC.chest, dz: 0.15 } }, t: 8, hold: 5 },
    { R: { shape: 'open', rot: { x: -0.2 }, loc: { ...LOC.chest, dz: 0.38 } }, t: 8, hold: 8 },
  ] },

  // ---- verbs ----
  WANT: { name: 'WANT', keyframes: [ // two claw palms up, pull in
    { R: { shape: 'claw', rot: { x: 1.2 }, loc: { dy: -0.2, dx: 0.18, dz: 0.35 } },
      L: { shape: 'claw', rot: { x: 1.2 }, loc: { dy: -0.2, dx: -0.18, dz: 0.35 } }, t: 8, hold: 4 },
    { R: { shape: 'claw', rot: { x: 1.2 }, loc: { dy: -0.3, dx: 0.18, dz: 0.0 } },
      L: { shape: 'claw', rot: { x: 1.2 }, loc: { dy: -0.3, dx: -0.18, dz: 0.0 } }, t: 10, hold: 8 },
  ] },
  NEED: { name: 'NEED', keyframes: [ // X-hand nods down twice
    { R: { shape: 'X', rot: { x: -0.5 }, loc: { ...LOC.neutral } }, t: 8, hold: 3 },
    { R: { shape: 'X', rot: { x: -0.5 }, loc: { dy: -0.44, dz: 0.1 } }, t: 5, hold: 3 },
    { R: { shape: 'X', rot: { x: -0.5 }, loc: { ...LOC.neutral } }, t: 5, hold: 3 },
    { R: { shape: 'X', rot: { x: -0.5 }, loc: { dy: -0.44, dz: 0.1 } }, t: 5, hold: 5 },
  ] },
  HAVE: { name: 'HAVE', keyframes: [ // bent hands, fingertips to chest
    { R: { shape: 'flat', rot: { x: 1.5 }, loc: { dy: -0.2, dx: 0.18, dz: 0.4 } },
      L: { shape: 'flat', rot: { x: 1.5 }, loc: { dy: -0.2, dx: -0.18, dz: 0.4 } }, t: 8, hold: 4 },
    { R: { shape: 'flat', rot: { x: 1.5 }, loc: { ...LOC.chest, dx: 0.18, dz: 0.15 } },
      L: { shape: 'flat', rot: { x: 1.5 }, loc: { ...LOC.chest, dx: -0.18, dz: 0.15 } }, t: 8, hold: 8 },
  ] },
  LIKE: { name: 'LIKE', keyframes: [ // from chest, pull out and close
    { R: { shape: 'open', rot: { x: -0.2 }, loc: { ...LOC.chest, dz: 0.15 } }, t: 8, hold: 4 },
    { R: { shape: 'O', rot: { x: -0.2 }, loc: { dy: -0.35, dz: 0.4 } }, t: 10, hold: 8 },
  ] },
  KNOW: { name: 'KNOW', keyframes: [ // flat fingertips tap temple/forehead
    { R: { shape: 'flat', rot: { x: -0.6 }, loc: { ...LOC.temple } }, t: 8, hold: 16, overlay: 'shakeY' },
  ] },
  THINK: { name: 'THINK', keyframes: [ // index at forehead
    { R: { shape: 'point', rot: { x: -0.5 }, loc: { ...LOC.forehead } }, t: 8, hold: 14 },
  ] },
  GO: { name: 'GO', keyframes: [ // index points forward and down
    { R: { shape: 'point', rot: { x: -1.0 }, loc: { dy: 0.1, dz: 0.1 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: -1.4 }, loc: { dy: -0.15, dz: 0.42 } }, t: 10, hold: 8 },
  ] },
  COME: { name: 'COME', keyframes: [ // beckon inward
    { R: { shape: 'point', rot: { x: 0.4 }, loc: { dy: -0.1, dx: 0.05, dz: 0.42 } },
      L: { shape: 'point', rot: { x: 0.4 }, loc: { dy: -0.1, dx: -0.15, dz: 0.42 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: 0.4 }, loc: { dy: -0.1, dx: 0.05, dz: 0.0 } },
      L: { shape: 'point', rot: { x: 0.4 }, loc: { dy: -0.1, dx: -0.15, dz: 0.0 } }, t: 10, hold: 8 },
  ] },
  SEE: { name: 'SEE', keyframes: [ // V at eyes, moves outward
    { R: { shape: 'V', rot: { x: -0.3 }, loc: { ...LOC.eye } }, t: 8, hold: 4 },
    { R: { shape: 'V', rot: { x: -0.3 }, loc: { dy: 0.05, dz: 0.42 } }, t: 10, hold: 8 },
  ] },
  EAT: { name: 'EAT', keyframes: [ // flat-O taps mouth twice
    { R: { shape: 'O', rot: { x: -0.3 }, loc: { dy: 0.12, dz: 0.2 } }, t: 8, hold: 3 },
    { R: { shape: 'O', rot: { x: -0.3 }, loc: { ...LOC.mouth, dz: 0.1 } }, t: 5, hold: 3 },
    { R: { shape: 'O', rot: { x: -0.3 }, loc: { dy: 0.12, dz: 0.2 } }, t: 5, hold: 3 },
    { R: { shape: 'O', rot: { x: -0.3 }, loc: { ...LOC.mouth, dz: 0.1 } }, t: 5, hold: 5 },
  ] },
  DRINK: { name: 'DRINK', keyframes: [ // C-hand at mouth, tips up
    { R: { shape: 'C', rot: { z: -0.3 }, loc: { ...LOC.mouth, dz: 0.15 } }, t: 8, hold: 4 },
    { R: { shape: 'C', rot: { z: -0.3, x: 0.5 }, loc: { ...LOC.mouth, dz: 0.15 } }, t: 8, hold: 8 },
  ] },
  HELP: { name: 'HELP', keyframes: [ // fist on flat palm, both rise
    { R: { shape: 'A', rot: { x: 0.2 }, loc: { dy: -0.35, dx: 0.05, dz: 0.2 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.45, dx: -0.05, dz: 0.2 } }, t: 8, hold: 4 },
    { R: { shape: 'A', rot: { x: 0.2 }, loc: { dy: -0.05, dx: 0.05, dz: 0.2 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.15, dx: -0.05, dz: 0.2 } }, t: 10, hold: 8 },
  ] },
  LOVE: { name: 'LOVE', keyframes: [ // two fists crossed on chest
    { R: { shape: 'A', rot: { z: -0.6 }, loc: { ...LOC.chest, dx: -0.12, dz: 0.15 } },
      L: { shape: 'A', rot: { z: 0.6 }, loc: { ...LOC.chest, dx: 0.12, dz: 0.15 } }, t: 10, hold: 14 },
  ] },
  LEARN: { name: 'LEARN', keyframes: [ // grab from L palm up to forehead, closing
    { R: { shape: 'open', rot: { x: 1.2 }, loc: { dy: -0.45, dx: 0.1, dz: 0.3 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.5, dx: -0.05, dz: 0.3 } }, t: 8, hold: 4 },
    { R: { shape: 'O', rot: { x: -0.3 }, loc: { ...LOC.forehead, dx: 0.05 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dy: -0.5, dx: -0.05, dz: 0.3 } }, t: 12, hold: 8 },
  ] },
  FINISH: { name: 'FINISH', keyframes: [ // two open hands flip out with shake
    { R: { shape: 'open', rot: { x: 1.2 }, loc: { dy: -0.2, dx: 0.18 } },
      L: { shape: 'open', rot: { x: 1.2 }, loc: { dy: -0.2, dx: -0.18 } }, t: 8, hold: 4 },
    { R: { shape: 'open', rot: { x: -0.4 }, loc: { dy: -0.2, dx: 0.22 } },
      L: { shape: 'open', rot: { x: -0.4 }, loc: { dy: -0.2, dx: -0.22 } }, t: 8, hold: 10, overlay: 'shakeX' },
  ] },
  UNDERSTAND: { name: 'UNDERSTAND', keyframes: [ // flick at temple: fist -> point
    { R: { shape: 'A', rot: { x: -0.3 }, loc: { ...LOC.temple } }, t: 8, hold: 5 },
    { R: { shape: 'point', rot: { x: -0.3 }, loc: { ...LOC.temple } }, t: 5, hold: 8 },
  ] },

  // ---- feelings / adjectives ----
  GOOD: { name: 'GOOD', keyframes: [ // flat hand from chin down onto left palm
    { R: { shape: 'flat', rot: { x: -0.3 }, loc: { ...LOC.chin, dz: 0.05 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dx: -0.05, dy: -0.4, dz: 0.15 } }, t: 8, hold: 6 },
    { R: { shape: 'flat', rot: { x: 1.2 }, loc: { dy: -0.4, dz: 0.18 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dx: -0.05, dy: -0.4, dz: 0.15 } }, t: 12, hold: 10 },
  ] },
  BAD: { name: 'BAD', keyframes: [ // flat from chin flips down/out
    { R: { shape: 'flat', rot: { x: -0.4 }, loc: { ...LOC.chin } }, t: 8, hold: 4 },
    { R: { shape: 'flat', rot: { x: 1.6 }, loc: { dy: -0.4, dz: 0.35 } }, t: 10, hold: 8 },
  ] },
  MORE: { name: 'MORE', keyframes: [ // two flat-O tap fingertips twice
    { R: { shape: 'O', loc: { dy: -0.2, dx: 0.22 } },
      L: { shape: 'O', loc: { dy: -0.2, dx: -0.22 } }, t: 8, hold: 3 },
    { R: { shape: 'O', loc: { dy: -0.2, dx: 0.06 } },
      L: { shape: 'O', loc: { dy: -0.2, dx: -0.06 } }, t: 5, hold: 3 },
    { R: { shape: 'O', loc: { dy: -0.2, dx: 0.22 } },
      L: { shape: 'O', loc: { dy: -0.2, dx: -0.22 } }, t: 5, hold: 3 },
    { R: { shape: 'O', loc: { dy: -0.2, dx: 0.06 } },
      L: { shape: 'O', loc: { dy: -0.2, dx: -0.06 } }, t: 5, hold: 5 },
  ] },
  HAPPY: { name: 'HAPPY', keyframes: [ // flat brushes up on chest
    { R: { shape: 'flat', rot: { x: 1.2 }, loc: { ...LOC.chest, dz: 0.15 } }, t: 8, hold: 22, overlay: 'shakeY' },
  ] },
  SAD: { name: 'SAD', keyframes: [ // open hands slide down the face
    { R: { shape: 'open', rot: { x: -0.2 }, loc: { dy: 0.28, dx: 0.14, dz: 0.2 } },
      L: { shape: 'open', rot: { x: -0.2 }, loc: { dy: 0.28, dx: -0.14, dz: 0.2 } }, t: 8, hold: 4 },
    { R: { shape: 'open', rot: { x: -0.2 }, loc: { dy: -0.2, dx: 0.14, dz: 0.2 } },
      L: { shape: 'open', rot: { x: -0.2 }, loc: { dy: -0.2, dx: -0.14, dz: 0.2 } }, t: 12, hold: 8 },
  ] },
  HUNGRY: { name: 'HUNGRY', keyframes: [ // C-hand at neck moves down chest
    { R: { shape: 'C', rot: { x: 0.2 }, loc: { ...LOC.neck, dz: 0.15 } }, t: 8, hold: 4 },
    { R: { shape: 'C', rot: { x: 0.2 }, loc: { ...LOC.chest, dz: 0.15 } }, t: 10, hold: 8 },
  ] },

  // ---- nouns ----
  HOME: { name: 'HOME', keyframes: [ // flat-O at mouth, then cheek
    { R: { shape: 'O', rot: { x: -0.2 }, loc: { ...LOC.mouth, dz: 0.1 } }, t: 8, hold: 5 },
    { R: { shape: 'flat', rot: { x: -0.2 }, loc: { ...LOC.cheek, dz: 0.1 } }, t: 8, hold: 8 },
  ] },
  FRIEND: { name: 'FRIEND', keyframes: [ // hooked index fingers interlock, swap
    { R: { shape: 'X', rot: { x: -0.2, z: -0.4 }, loc: { dy: -0.15, dx: 0.06 } },
      L: { shape: 'X', rot: { x: -0.2, z: 0.4 }, loc: { dy: -0.1, dx: -0.06 } }, t: 8, hold: 4 },
    { R: { shape: 'X', rot: { x: -0.2, z: 0.4 }, loc: { dy: -0.1, dx: 0.06 } },
      L: { shape: 'X', rot: { x: -0.2, z: -0.4 }, loc: { dy: -0.15, dx: -0.06 } }, t: 8, hold: 8 },
  ] },
  WORK: { name: 'WORK', keyframes: [ // R fist taps on L fist
    { R: { shape: 'A', rot: { x: 0.3 }, loc: { dy: -0.25, dx: 0.02, dz: 0.15 } },
      L: { shape: 'A', rot: { x: 0.3 }, loc: { dy: -0.35, dx: -0.02, dz: 0.15 } }, t: 8, hold: 3 },
    { R: { shape: 'A', rot: { x: 0.3 }, loc: { dy: -0.32, dx: 0.02, dz: 0.15 } },
      L: { shape: 'A', rot: { x: 0.3 }, loc: { dy: -0.35, dx: -0.02, dz: 0.15 } }, t: 5, hold: 3 },
    { R: { shape: 'A', rot: { x: 0.3 }, loc: { dy: -0.25, dx: 0.02, dz: 0.15 } },
      L: { shape: 'A', rot: { x: 0.3 }, loc: { dy: -0.35, dx: -0.02, dz: 0.15 } }, t: 5, hold: 5 },
  ] },
  TIME: { name: 'TIME', keyframes: [ // index taps back of other wrist
    { R: { shape: 'point', rot: { x: -0.8 }, loc: { dy: -0.2, dx: 0.05, dz: 0.15 } },
      L: { shape: 'A', rot: { x: 0.6 }, loc: { dy: -0.3, dx: -0.05, dz: 0.15 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: -0.8 }, loc: { dy: -0.28, dx: 0.02, dz: 0.15 } },
      L: { shape: 'A', rot: { x: 0.6 }, loc: { dy: -0.3, dx: -0.05, dz: 0.15 } }, t: 5, hold: 8 },
  ] },
  WATER: { name: 'WATER', keyframes: [ // W-hand taps chin
    { R: { shape: 'W', rot: { x: -0.3 }, loc: { dy: 0.02, dz: 0.15 } }, t: 8, hold: 3 },
    { R: { shape: 'W', rot: { x: -0.3 }, loc: { ...LOC.chin, dz: 0.15 } }, t: 5, hold: 3 },
    { R: { shape: 'W', rot: { x: -0.3 }, loc: { dy: 0.02, dz: 0.15 } }, t: 5, hold: 5 },
  ] },
  DEAF: { name: 'DEAF', keyframes: [ // index at ear, then chin
    { R: { shape: 'point', rot: { x: -0.3 }, loc: { ...LOC.ear } }, t: 8, hold: 5 },
    { R: { shape: 'point', rot: { x: -0.3 }, loc: { ...LOC.chin, dx: -0.1 } }, t: 8, hold: 8 },
  ] },
  SIGN: { name: 'SIGN', keyframes: [ // two index fingers circle
    { R: { shape: 'point', rot: { x: 0.3 }, loc: { dy: -0.15, dx: 0.18 } },
      L: { shape: 'point', rot: { x: 0.3 }, loc: { dy: -0.15, dx: -0.18 } }, t: 8, hold: 24, overlay: 'circle' },
  ] },
};

// Aliases: alternate English words that map to the same sign.
const ALIAS = {
  I: 'ME', MINE: 'MY',
  HI: 'HELLO', HEY: 'HELLO',
  THANKS: 'THANK-YOU', 'THANK-YOU': 'THANK-YOU',
  US: 'WE', THEM: 'THEY',
  OK: 'FINE', OKAY: 'FINE',
  WANNA: 'WANT', WANTS: 'WANT',
  NEEDS: 'NEED', HAS: 'HAVE',
  LIKES: 'LIKE', KNOWS: 'KNOW',
  THINKS: 'THINK', GOING: 'GO', GOES: 'GO',
  COMES: 'COME', SEES: 'SEE', HELPS: 'HELP',
  LOVES: 'LOVE', LEARNS: 'LEARN',
  DONE: 'FINISH', FINISHED: 'FINISH',
  UNDERSTOOD: 'UNDERSTAND', UNDERSTANDS: 'UNDERSTAND',
  FRIENDS: 'FRIEND', WORKS: 'WORK',
};

// Multi-word phrases to fold into a single gloss token before lookup.
export const PHRASES = [
  [/\bthank\s+you\b/gi, 'THANK-YOU'],
];

function canonical(word) {
  const w = word.toUpperCase();
  if (VOCAB[w]) return w;
  if (ALIAS[w]) return ALIAS[w];
  return null;
}

export function hasSign(word) {
  return canonical(word) !== null;
}

export function getSignClip(word) {
  const key = canonical(word);
  return key ? buildSignClip(VOCAB[key]) : null;
}

export function vocabularyList() {
  return Object.keys(VOCAB);
}
