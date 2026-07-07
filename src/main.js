// main.js — Milestone 3: speech/text -> whole-word signs (with fingerspell
// fallback) on a two-hand avatar.
//
// The scene is unchanged from M1/M2. New here: two hand renderers (left +
// right), a pose-based clip player, and the resolver that turns typed/spoken
// words into a signed utterance — known words are signed, everything else is
// fingerspelled.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HandRenderer } from './handRenderer.js';
import { idleClip } from './fingerspell.js';
import { resolveText } from './resolve.js';
import { lerpPose } from './pose.js';
import { createSpeech } from './speech.js';

const app = document.getElementById('app');

// --- scene ---------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);
scene.fog = new THREE.Fog(0x0b0e14, 6, 14);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.1, 4.6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.1, 0);

scene.add(new THREE.HemisphereLight(0x8899ff, 0x202230, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(2, 4, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
rim.position.set(-3, 2, -2);
scene.add(rim);
const grid = new THREE.GridHelper(10, 20, 0x223, 0x151a26);
grid.position.y = -0.2;
scene.add(grid);

// Two hands. The left starts hidden; one-hand clips (fingerspelling, and signs
// that only use the right hand) leave it hidden.
const handR = new HandRenderer(scene);
const handL = new HandRenderer(scene);
handL.setVisible(false);

function setPose(p) {
  handR.setFrame(p.R);
  if (p.L) { handL.setFrame(p.L); handL.setVisible(true); }
  else handL.setVisible(false);
}

// --- clip player ---------------------------------------------------------
// Plays `clip` once (a sequence of two-hand poses), then falls back to the
// looping idle clip.
const idle = idleClip();
const player = {
  clip: idle,
  loop: true,
  playhead: 0,
  onCue: () => {},
  play(clip) { if (!clip) return; this.clip = clip; this.loop = false; this.playhead = 0; },
  toIdle() { this.clip = idle; this.loop = true; this.playhead = 0; },
  advance(dt) {
    const c = this.clip;
    this.playhead += dt * c.fps;
    if (this.playhead >= c.frames.length - 1) {
      if (this.loop) this.playhead %= c.frames.length;
      else { this.toIdle(); return; }
    }
    const i0 = Math.floor(this.playhead);
    const i1 = Math.min(i0 + 1, c.frames.length - 1);
    const t = this.playhead - i0;
    setPose(lerpPose(c.frames[i0], c.frames[i1], t));
    this.onCue(c.labels ? c.labels[i0] || '' : '');
  },
};

// --- HUD wiring ----------------------------------------------------------
const els = {
  heard: document.getElementById('heard'),
  cue: document.getElementById('cue'),
  gloss: document.getElementById('gloss'),
  status: document.getElementById('status'),
  mic: document.getElementById('mic'),
  text: document.getElementById('text'),
  sign: document.getElementById('sign'),
};

// The big corner cue shows the current letter (fingerspelling) or sign name.
// Size shrinks for longer strings so multi-letter sign names still fit.
player.onCue = (label) => {
  const s = label && label !== '·' ? label : '';
  els.cue.textContent = s;
  els.cue.style.fontSize = s.length <= 1
    ? '128px'
    : `${Math.max(30, Math.min(96, Math.round(560 / (s.length + 2))))}px`;
};

function renderGloss(gloss) {
  els.gloss.innerHTML = gloss
    .map((g) => `<span class="tok ${g.mode}">${g.token}${g.mode === 'spell' ? ' ✎' : ''}</span>`)
    .join('<span class="sep">·</span>');
}

function say(text) {
  const clean = (text || '').trim();
  if (!clean) return;
  els.heard.textContent = clean;
  const { clip, gloss } = resolveText(clean);
  renderGloss(gloss);
  player.play(clip);
}

els.sign.addEventListener('click', () => say(els.text.value));
els.text.addEventListener('keydown', (e) => { if (e.key === 'Enter') say(els.text.value); });

// Speech (mic) — falls back gracefully when unsupported.
const speech = createSpeech({
  onResult: ({ interim, final }) => {
    if (interim) els.heard.textContent = interim + '…';
    if (final) say(final);
  },
  onState: (state, detail) => {
    if (state === 'listening') { els.status.textContent = '● listening'; els.mic.classList.add('on'); }
    else if (state === 'error') { els.status.textContent = `mic error: ${detail}`; els.mic.classList.remove('on'); }
    else { els.status.textContent = 'ready'; els.mic.classList.remove('on'); }
  },
});

if (speech.supported) {
  els.mic.addEventListener('click', () => (speech.listening ? speech.stop() : speech.start()));
} else {
  els.mic.disabled = true;
  els.mic.textContent = '🎤 no mic API';
  els.status.textContent = 'speech unsupported — use the text box (Chrome/Edge for mic)';
}

// --- loop ----------------------------------------------------------------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  player.advance(clock.getDelta());
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
