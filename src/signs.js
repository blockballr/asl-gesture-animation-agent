// signs.js — procedural whole-word ASL signs.
//
// M3 extends the parametric handshape model (handshape.js) from single letters
// to whole-word signs. A sign is authored declaratively as a sequence of
// keyframes; each keyframe places one or both hands (handshape + location +
// orientation), and buildSignClip synthesizes a { name, fps, frames } clip
// whose frames are two-hand poses (pose.js). This is the same synthesis idea
// as fingerspellClip, generalized to poses, orientation, and movement.
//
// Fidelity note: these are recognizable approximations for a *floating-hands*
// avatar. With no body or face, sign *location* (chest vs. forehead) and
// non-manual markers (facial grammar) can only be weakly conveyed — handshape
// and movement do most of the work. Real ASL fidelity needs the body/face
// channels (later milestones) and, ideally, Deaf-signer review.

import { makeHandshape } from './handshape.js';
import { pose, lerpPose, translatePose, mirrorHand, rotateHand, translateHand } from './pose.js';

const FPS = 30;

// --- handshape presets (configs for makeHandshape) -----------------------
const SHAPE = {
  flat:  { fingers: [0, 0, 0, 0], spread: 0,   thumb: 'across' }, // B / flat hand
  open:  { fingers: [0, 0, 0, 0], spread: 1,   thumb: 'out' },    // 5 / open spread hand
  point: { fingers: [0, 1, 1, 1], spread: 0,   thumb: 'side' },   // 1 / index point
  fist:  { fingers: [1, 1, 1, 1], spread: 0,   thumb: 'front' },  // S / fist
  U:     { fingers: [0, 0, 1, 1], spread: 0,   thumb: 'across' }, // index + middle together
  bentU: { fingers: [0.55, 0.55, 1, 1], spread: 0, thumb: 'touch' }, // index + middle half-closed
  H:     { fingers: [0, 0, 1, 1], spread: 0.1, thumb: 'across' }, // H (index + middle, sideways)
};

// Movement overlays applied during a keyframe's hold: a function of progress
// u in [0,1] returning a [dx, dy, dz] offset for both hands.
const OVERLAY = {
  shakeX: (u) => [0.10 * Math.sin(u * Math.PI * 4), 0, 0],
  shakeY: (u) => [0, 0.06 * Math.sin(u * Math.PI * 4), 0],
};

// --- keyframe -> pose -----------------------------------------------------
// A hand spec is { shape, loc?, rot?, side }. Order of ops: build the parametric
// handshape at the origin, orient it about the wrist, mirror if it is the left
// hand, then translate it to its signing location.
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

// Synthesize a playable clip from a sign's keyframes. Each keyframe transitions
// from the previous pose over `t` frames, then holds for `hold` frames with an
// optional movement overlay.
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

// --- the seed vocabulary --------------------------------------------------
// ~10 high-frequency signs. Each is approximate; comments name the real sign
// so the intent is auditable. Locations are kept modest so the floating hands
// stay on screen (there is no body to anchor absolute location to yet).
const VOCAB = {
  // Point to self, drawing the fingertip back toward the chest.
  ME: { name: 'ME', keyframes: [
    { R: { shape: 'point', rot: { x: -0.5 }, loc: { dy: -0.05, dz: 0.35 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: -0.5 }, loc: { dy: -0.05, dz: -0.15 } }, t: 10, hold: 10 },
  ] },

  // Point outward, away from the signer, toward "you".
  YOU: { name: 'YOU', keyframes: [
    { R: { shape: 'point', rot: { x: -0.3 }, loc: { dz: -0.1 } }, t: 8, hold: 4 },
    { R: { shape: 'point', rot: { x: -0.3 }, loc: { dz: 0.45 } }, t: 10, hold: 10 },
  ] },

  // Flat hand at the forehead sweeping outward — a salute-style HELLO.
  HELLO: { name: 'HELLO', keyframes: [
    { R: { shape: 'flat', rot: { z: -0.25 }, loc: { dy: 0.30, dx: -0.15 } }, t: 8, hold: 6 },
    { R: { shape: 'flat', rot: { z: -0.5 }, loc: { dy: 0.18, dx: 0.30 } }, t: 10, hold: 8 },
  ] },

  // Flat hand from the chin moving forward and down.
  'THANK-YOU': { name: 'THANK-YOU', keyframes: [
    { R: { shape: 'flat', rot: { x: -0.35 }, loc: { dy: 0.12, dz: 0.05 } }, t: 8, hold: 6 },
    { R: { shape: 'flat', rot: { x: -0.55 }, loc: { dy: -0.05, dz: 0.45 } }, t: 12, hold: 10 },
  ] },

  // Right flat hand comes down onto the upturned left palm.
  GOOD: { name: 'GOOD', keyframes: [
    {
      R: { shape: 'flat', rot: { x: -0.3 }, loc: { dy: 0.16, dz: 0.05 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dx: -0.05, dy: -0.32, dz: 0.15 } },
      t: 8, hold: 6,
    },
    {
      R: { shape: 'flat', rot: { x: 1.2 }, loc: { dy: -0.22, dz: 0.18 } },
      L: { shape: 'flat', rot: { x: 1.4 }, loc: { dx: -0.05, dy: -0.32, dz: 0.15 } },
      t: 12, hold: 10,
    },
  ] },

  // Nodding fist (like a head nodding "yes").
  YES: { name: 'YES', keyframes: [
    { R: { shape: 'fist', rot: { x: -0.1 } }, t: 8, hold: 3 },
    { R: { shape: 'fist', rot: { x: 0.6 } }, t: 5, hold: 3 },
    { R: { shape: 'fist', rot: { x: -0.1 } }, t: 5, hold: 3 },
    { R: { shape: 'fist', rot: { x: 0.6 } }, t: 5, hold: 3 },
    { R: { shape: 'fist', rot: { x: -0.1 } }, t: 5, hold: 4 },
  ] },

  // Index + middle snapping closed to the thumb, twice.
  NO: { name: 'NO', keyframes: [
    { R: { shape: 'U', loc: { dy: 0.05 } }, t: 8, hold: 3 },
    { R: { shape: 'bentU', loc: { dy: 0.05 } }, t: 5, hold: 3 },
    { R: { shape: 'U', loc: { dy: 0.05 } }, t: 5, hold: 3 },
    { R: { shape: 'bentU', loc: { dy: 0.05 } }, t: 5, hold: 4 },
  ] },

  // Index finger up, shaking side to side.
  WHERE: { name: 'WHERE', keyframes: [
    { R: { shape: 'point', loc: { dy: 0.12 } }, t: 8, hold: 26, overlay: 'shakeX' },
  ] },

  // Both open palms turned up, shaking slightly — the classic "what?" gesture.
  WHAT: { name: 'WHAT', keyframes: [
    {
      R: { shape: 'open', rot: { x: 1.3 }, loc: { dx: 0.18, dy: -0.1 } },
      L: { shape: 'open', rot: { x: 1.3 }, loc: { dx: -0.18, dy: -0.1 } },
      t: 8, hold: 24, overlay: 'shakeX',
    },
  ] },

  // Two H hands tapping across each other, twice.
  NAME: { name: 'NAME', keyframes: [
    {
      R: { shape: 'H', rot: { z: -0.35 }, loc: { dy: 0.09, dz: 0.06 } },
      L: { shape: 'H', rot: { z: 0.35 }, loc: { dy: -0.04 } },
      t: 8, hold: 3,
    },
    {
      R: { shape: 'H', rot: { z: -0.35 }, loc: { dy: 0.00, dz: 0.06 } },
      L: { shape: 'H', rot: { z: 0.35 }, loc: { dy: -0.04 } },
      t: 5, hold: 3,
    },
    {
      R: { shape: 'H', rot: { z: -0.35 }, loc: { dy: 0.09, dz: 0.06 } },
      L: { shape: 'H', rot: { z: 0.35 }, loc: { dy: -0.04 } },
      t: 5, hold: 3,
    },
    {
      R: { shape: 'H', rot: { z: -0.35 }, loc: { dy: 0.00, dz: 0.06 } },
      L: { shape: 'H', rot: { z: 0.35 }, loc: { dy: -0.04 } },
      t: 5, hold: 4,
    },
  ] },
};

// Aliases: alternate English words that map to the same sign.
const ALIAS = {
  I: 'ME',
  HI: 'HELLO',
  THANKS: 'THANK-YOU',
  'THANK-YOU': 'THANK-YOU',
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

// Return a playable clip for a known word, or null if we have no sign for it.
export function getSignClip(word) {
  const key = canonical(word);
  return key ? buildSignClip(VOCAB[key]) : null;
}

export function vocabularyList() {
  return Object.keys(VOCAB);
}
