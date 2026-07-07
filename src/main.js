// main.js — Milestone 1 render spike.
//
// Set up a Three.js scene, build the hand skeleton, and play a hardcoded
// landmark clip on a loop with frame interpolation for smoothness. No mic,
// no gloss, no dictionary yet — this proves the render path end to end.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HandRenderer } from './handRenderer.js';
import { waveClip } from './hand.js';

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

// --- lights --------------------------------------------------------------
scene.add(new THREE.HemisphereLight(0x8899ff, 0x202230, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(2, 4, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
rim.position.set(-3, 2, -2);
scene.add(rim);

// subtle ground grid for spatial reference
const grid = new THREE.GridHelper(10, 20, 0x223, 0x151a26);
grid.position.y = -0.2;
scene.add(grid);

// --- hand + clip ---------------------------------------------------------
const hand = new HandRenderer(scene);
const clip = waveClip();
document.getElementById('clip-name').textContent = clip.name;

// Linear interpolation between two frames of landmarks.
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

// --- playback loop -------------------------------------------------------
const clock = new THREE.Clock();
let playhead = 0; // in frames (float)

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  playhead = (playhead + dt * clip.fps) % clip.frames.length;

  const i0 = Math.floor(playhead);
  const i1 = (i0 + 1) % clip.frames.length;
  const t = playhead - i0;
  hand.setFrame(lerpFrame(clip.frames[i0], clip.frames[i1], t));

  controls.update();
  renderer.render(scene, camera);
}
animate();

// --- resize --------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
