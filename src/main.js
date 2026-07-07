// main.js — Milestone 2: speech/text -> fingerspelled letters on the avatar.
//
// The scene + hand renderer are unchanged from M1. New here: a small clip
// player that idles by default and plays a fingerspelling clip once on demand,
// driven by either the Web Speech API or a text input fallback.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HandRenderer } from './handRenderer.js';
import { fingerspellClip, idleClip } from './fingerspell.js';
import { createSpeech } from './speech.js';

const app = document.getElementById('app');

// --- scene ---------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);
scene.fog = new THREE.Fog(0x0b0e14, 6, 14);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.1, 4.2);

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

const hand = new HandRenderer(scene);

// --- clip player ---------------------------------------------------------
// Plays `clip` once, then falls back to the looping idle clip.
const idle = idleClip();
const player = {
  clip: idle,
  loop: true,
  playhead: 0,
  onLetter: () => {},
  play(clip) { this.clip = clip; this.loop = false; this.playhead = 0; },
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
    hand.setFrame(lerpFrame(c.frames[i0], c.frames[i1], t));
    this.onLetter(c.labels ? c.labels[i0] || '' : '');
  },
};

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

// --- HUD wiring ----------------------------------------------------------
const els = {
  heard: document.getElementById('heard'),
  letter: document.getElementById('letter'),
  status: document.getElementById('status'),
  mic: document.getElementById('mic'),
  text: document.getElementById('text'),
  spell: document.getElementById('spell'),
};

player.onLetter = (l) => {
  els.letter.textContent = l && l !== '·' ? l : '';
};

function spell(text) {
  const clean = (text || '').trim();
  if (!clean) return;
  els.heard.textContent = clean;
  player.play(fingerspellClip(clean));
}

els.spell.addEventListener('click', () => spell(els.text.value));
els.text.addEventListener('keydown', (e) => { if (e.key === 'Enter') spell(els.text.value); });

// Speech (mic) — falls back gracefully when unsupported.
const speech = createSpeech({
  onResult: ({ interim, final }) => {
    if (interim) els.heard.textContent = interim + '…';
    if (final) spell(final);
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
