// handRenderer.js — turns a single frame (21 landmarks) into 3D geometry.
//
// Joints are spheres, bones are tube-ish lines. setFrame(landmarks) is the
// only thing the animation loop calls; it repositions everything in place so
// there is no per-frame allocation.

import * as THREE from 'three';
import { HAND_CONNECTIONS, LANDMARK_COUNT } from './hand.js';

const SCALE = 2.2; // normalized hand (~1 unit) -> world units

export class HandRenderer {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // Joints
    const jointGeo = new THREE.SphereGeometry(0.055, 16, 16);
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x9fb4ff, roughness: 0.35, metalness: 0.1,
      emissive: 0x223066, emissiveIntensity: 0.4,
    });
    this.joints = [];
    for (let i = 0; i < LANDMARK_COUNT; i++) {
      const m = new THREE.Mesh(jointGeo, jointMat);
      this.group.add(m);
      this.joints.push(m);
    }
    // Fingertips a touch bigger + warmer so the hand reads clearly.
    const tips = [4, 8, 12, 16, 20];
    const tipMat = jointMat.clone();
    tipMat.color.set(0xffd27f);
    tipMat.emissive.set(0x5a3a10);
    for (const t of tips) this.joints[t].material = tipMat;

    // Bones — one thin cylinder per connection, oriented each frame.
    const boneGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 8);
    boneGeo.translate(0, 0.5, 0); // origin at one end so we can scale to length
    this.boneMat = new THREE.MeshStandardMaterial({
      color: 0x5566aa, roughness: 0.5, metalness: 0.1,
    });
    this.bones = HAND_CONNECTIONS.map(() => {
      const m = new THREE.Mesh(boneGeo, this.boneMat);
      this.group.add(m);
      return m;
    });

    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this._q = new THREE.Quaternion();
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  setFrame(landmarks) {
    // Position joints.
    for (let i = 0; i < LANDMARK_COUNT; i++) {
      const p = landmarks[i];
      this.joints[i].position.set(p[0] * SCALE, p[1] * SCALE, p[2] * SCALE);
    }
    // Orient + stretch bones between their two joints.
    for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
      const [ai, bi] = HAND_CONNECTIONS[i];
      this._a.copy(this.joints[ai].position);
      this._b.copy(this.joints[bi].position);
      this._dir.subVectors(this._b, this._a);
      const len = this._dir.length();
      const bone = this.bones[i];
      bone.position.copy(this._a);
      this._q.setFromUnitVectors(this._up, this._dir.normalize());
      bone.quaternion.copy(this._q);
      bone.scale.set(1, len, 1);
    }
  }
}
