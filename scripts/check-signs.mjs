// Headless data-path check for M3. Verifies that every seed sign, a
// fingerspelled word, and a full mixed sentence all synthesize into
// well-formed two-hand poses - 21 finite [x,y,z] landmarks per present hand.
// Cannot verify the WebGL render (that needs a browser); this guards the data.

import { vocabularyList, getSignClip } from '../src/signs.js';
import { fingerspellClip } from '../src/fingerspell.js';
import { resolveText } from '../src/resolve.js';

let failures = 0;
const fail = (msg) => { console.error('  FAIL', msg); failures++; };

function checkHand(hand, where) {
  if (!Array.isArray(hand) || hand.length !== 21) {
    fail(`${where}: expected 21 landmarks, got ${hand && hand.length}`);
    return;
  }
  for (let i = 0; i < 21; i++) {
    const p = hand[i];
    if (!Array.isArray(p) || p.length !== 3 || p.some((n) => !Number.isFinite(n))) {
      fail(`${where}: landmark ${i} is not a finite [x,y,z] (${JSON.stringify(p)})`);
      return;
    }
  }
}

function checkClip(clip, where) {
  if (!clip || !clip.frames || !clip.frames.length) { fail(`${where}: empty clip`); return; }
  if (clip.labels.length !== clip.frames.length) fail(`${where}: labels/frames length mismatch`);
  clip.frames.forEach((f, fi) => {
    if (!f || !f.R) { fail(`${where}: frame ${fi} missing right hand`); return; }
    checkHand(f.R, `${where}#${fi}.R`);
    if (f.L !== null && f.L !== undefined) checkHand(f.L, `${where}#${fi}.L`);
  });
}

console.log('signs:');
for (const name of vocabularyList()) {
  const clip = getSignClip(name);
  const twoHanded = clip.frames.some((f) => f.L);
  checkClip(clip, name);
  console.log(`  ${name.padEnd(11)} ${clip.frames.length} frames  ${twoHanded ? '(2 hands)' : '(1 hand)'}`);
}

console.log('fingerspell:');
const fs = fingerspellClip('QX');
checkClip(fs, 'spell:QX');
console.log(`  QX ${fs.frames.length} frames`);

console.log('sentence:');
const { clip, gloss } = resolveText('hello me name pizza thank you');
checkClip(clip, 'utterance');
console.log('  gloss:', gloss.map((g) => g.token).join(', '));
console.log(`  ${clip.frames.length} frames`);

console.log(failures ? `\nFAILED (${failures})` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
