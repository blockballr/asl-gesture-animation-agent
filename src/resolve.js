// resolve.js — turn input text into one playable clip.
//
// M3 gloss is passthrough: each English word maps directly to a sign if the
// dictionary has one, otherwise it is fingerspelled. (The real English->ASL
// gloss layer — reordering, dropping function words, disambiguation, learning
// new signs — is the agent, arriving in M4.) Known signs and fingerspelled
// words are concatenated into a single clip with short blended transitions.

import { getSignClip, hasSign, PHRASES } from './signs.js';
import { fingerspellClip } from './fingerspell.js';
import { restPose } from './handshape.js';
import { pose, lerpPose } from './pose.js';

const TRANSITION = 6; // frames blended between adjacent tokens

// Split raw input into gloss tokens. Multi-word phrases (e.g. "thank you")
// collapse to one token first; then we split on whitespace and strip anything
// that is not a letter or an intra-token hyphen.
function tokenize(text) {
  let s = ` ${text} `;
  for (const [re, replacement] of PHRASES) s = s.replace(re, ` ${replacement} `);
  return s
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z-]/g, ''))
    .filter(Boolean);
}

// Concatenate clips into one, blending TRANSITION frames between each so the
// hands glide from one sign/word to the next instead of teleporting.
function concat(clips) {
  const frames = [];
  const labels = [];
  clips.forEach((c, i) => {
    if (i > 0 && frames.length && c.frames.length) {
      const from = frames[frames.length - 1];
      const to = c.frames[0];
      for (let k = 1; k <= TRANSITION; k++) {
        frames.push(lerpPose(from, to, k / TRANSITION));
        labels.push('');
      }
    }
    for (let k = 0; k < c.frames.length; k++) {
      frames.push(c.frames[k]);
      labels.push(c.labels[k]);
    }
  });
  return { name: 'utterance', fps: 30, frames, labels };
}

// Resolve free text into { clip, gloss } where gloss is the token-by-token
// plan (each entry marks whether it was signed or fingerspelled).
export function resolveText(text) {
  const tokens = tokenize(text);
  const clips = [];
  const gloss = [];

  for (const tok of tokens) {
    if (hasSign(tok)) {
      clips.push(getSignClip(tok));
      gloss.push({ token: tok.toUpperCase(), mode: 'sign' });
    } else {
      clips.push(fingerspellClip(tok));
      gloss.push({ token: tok.toUpperCase(), mode: 'spell' });
    }
  }

  if (!clips.length) return { clip: null, gloss: [] };
  return { clip: concat(clips), gloss };
}

// A single resting pose, wrapped for the two-hand player.
export function restClipPose() {
  return pose(restPose(), null);
}
