// reference.js — a faint, static head + shoulders behind the signing hands.
//
// Why this exists: the hands render in normalized landmark space scaled by
// 2.2 (handRenderer SCALE), so the wrist sits near world-y 0 and fingertips
// near world-y ~2.2. Many ASL signs are distinguished ONLY by where on the
// body the hand goes — forehead (KNOW, FATHER) vs chin (THANK-YOU, MOTHER) vs
// chest (PLEASE). With nothing but floating hands there is no anchor, so those
// signs look identical. This adds a minimal, recessed body reference purely as
// a spatial guide. It is deliberately dim and set back in z so it reads as a
// reference, not a character, and never occludes the hands.
//
// Everything is tunable in REF below — nudge these against the live render.

import * as THREE from 'three';

export const REF = {
  headCenterY: 2.55,     // vertical center of the head
  headRadius: 1.15,      // ~ matches a hand-length so proportions read human
  headZ: -1.0,           // set back behind the hands (hands sign near z=0)
  shoulderY: 1.20,       // height of the shoulder line
  shoulderHalfWidth: 2.10,
  neckBottomRadius: 0.45,
  neckTopRadius: 0.35,
  color: 0x2a3350,       // cool, dim slate so it recedes from the bright hands
  opacity: 0.55,
};

export function addBodyReference(scene) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: REF.color,
    roughness: 0.85,
    metalness: 0.0,
    transparent: true,
    opacity: REF.opacity,
    depthWrite: false, // don't fight the hands for the depth buffer
  });

  // Head.
  const head = new THREE.Mesh(new THREE.SphereGeometry(REF.headRadius, 32, 24), mat);
  head.position.set(0, REF.headCenterY, REF.headZ);
  group.add(head);

  // Neck — from the shoulder line up to the bottom of the head.
  const headBottom = REF.headCenterY - REF.headRadius;
  const neckH = Math.max(0.05, headBottom - REF.shoulderY);
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(REF.neckTopRadius, REF.neckBottomRadius, neckH, 20),
    mat,
  );
  neck.position.set(0, REF.shoulderY + neckH / 2, REF.headZ);
  group.add(neck);

  // Shoulders — a wide horizontal bar with rounded ends.
  const shoulders = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, REF.shoulderHalfWidth * 2, 8, 16),
    mat,
  );
  shoulders.rotation.z = Math.PI / 2; // lay it along X
  shoulders.position.set(0, REF.shoulderY, REF.headZ);
  group.add(shoulders);

  scene.add(group);
  return group;
}
