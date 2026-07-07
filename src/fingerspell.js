// fingerspell.js - turn a word into a playable landmark clip.
//
// For each letter: a short transition from the previous pose, then a hold.
// Doubled letters get a small lateral re-articulation bounce so "LL" reads as
// two letters. J and Z carry a motion path traced during their hold. Spaces
// insert a rest beat. Output is the standard { name, fps, frames } clip plus a
// parallel `labels` array so the HUD can show the current letter.

import { makeLetter, ALPHABET, restPose } from './handshape.js';

const FPS = 30;
const TRANSITION = 5; // frames to morph between letters
const HOLD = 11;      // frames to hold a letter

function lerpFrame(a, b, t) {
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

function translate(frame, dx, dy, dz) {
  return frame.map((p) => [p[0] + dx, p[1] + dy, p[2] + dz]);
}

// Motion offsets (dx, dy, dz) as a function of progress u in [0,1].
const MOTION = {
  // J: pinky drops and hooks to the left.
  J: (u) => [-0.28 * u, -0.30 * Math.sin(u * Math.PI * 0.9), 0],
  // Z: index traces a Z - right, diagonal down-left, right.
  Z: (u) => {
    if (u < 0.33) return [0.30 * (u / 0.33), 0.0, 0];
    if (u < 0.66) { const k = (u - 0.33) / 0.33; return [0.30 - 0.30 * k, -0.30 * k, 0]; }
    const k = (u - 0.66) / 0.34; return [0.0 + 0.30 * k, -0.30, 0];
  },
};

export function fingerspellClip(text) {
  const rest = restPose();
  const frames = [];
  const labels = [];
  // Frames are two-hand poses; fingerspelling uses the right hand only, so the
  // left hand (L) is null and the renderer hides it.
  const push = (f, l) => { frames.push({ R: f, L: null }); labels.push(l); };

  const tokens = text.toUpperCase().replace(/[^A-Z ]/g, '').split('');
  let prev = rest;
  let prevLetter = '';

  for (const ch of tokens) {
    if (ch === ' ') {
      for (let i = 1; i <= TRANSITION; i++) push(lerpFrame(prev, rest, i / TRANSITION), '·');
      for (let i = 0; i < 4; i++) push(rest, '·');
      prev = rest;
      prevLetter = '';
      continue;
    }
    if (!ALPHABET[ch]) continue;

    // Re-articulate a doubled letter with a quick sideways bounce.
    if (ch === prevLetter) {
      const bumped = translate(prev, 0.18, 0, 0);
      for (let i = 1; i <= 3; i++) push(lerpFrame(prev, bumped, i / 3), ch);
      prev = bumped;
    }

    const pose = makeLetter(ch);
    for (let i = 1; i <= TRANSITION; i++) push(lerpFrame(prev, pose, i / TRANSITION), ch);

    const motion = MOTION[ALPHABET[ch].motion];
    for (let i = 0; i < HOLD; i++) {
      if (motion) {
        const [dx, dy, dz] = motion(i / (HOLD - 1));
        push(translate(pose, dx, dy, dz), ch);
      } else {
        push(pose, ch);
      }
    }
    prev = makeLetter(ch); // reset to the clean pose (motion offsets not carried)
    prevLetter = ch;
  }

  // Settle back to rest.
  for (let i = 1; i <= TRANSITION + 2; i++) push(lerpFrame(prev, rest, i / (TRANSITION + 2)), '');

  return { name: `spell:${text}`, fps: FPS, frames, labels };
}

// Idle: a slow, low-amplitude sway of the rest pose so the hand looks alive.
export function idleClip({ frames = 120, fps = FPS } = {}) {
  const rest = restPose();
  const out = [];
  for (let f = 0; f < frames; f++) {
    const t = f / frames;
    const dx = 0.05 * Math.sin(t * Math.PI * 2);
    const dy = 0.03 * Math.sin(t * Math.PI * 4);
    out.push({ R: translate(rest, dx, dy, 0), L: null });
  }
  return { name: 'idle', fps, frames: out, labels: out.map(() => '') };
}
