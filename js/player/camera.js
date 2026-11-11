// Observation camera: free orbit/pan mode + follow mode for the selected NPC.
// WASD pans the focus point, dragging orbits, wheel zooms.

import * as THREE from 'three';
import { PITCH } from '../core/config.js';
import { HALF_X, HALF_Z } from '../world/layout.js';

export class ObserverCamera {
  constructor(camera, dom, cb) {
    this.camera = camera;
    this.cb = cb;
    this.target = new THREE.Vector3(0, 1.2, 0);
    this.yaw = Math.PI * 0.22;
    this.pitch = 0.5;
    this.dist = 34;
    this.mode = 'free';
    this.followAgent = null;
    this.keys = new Set();
    this._down = null;

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === 'f') cb.onToggleFollow();
      if (k === 'escape') cb.onEscape();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));

    dom.addEventListener('mousedown', (e) => {
      this._down = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch };
    });
    window.addEventListener('mousemove', (e) => {
      if (!this._down) return;
      const dx = e.clientX - this._down.x;
      const dy = e.clientY - this._down.y;
      this.yaw = this._down.yaw - dx * 0.005;
      this.pitch = Math.min(1.45, Math.max(0.08, this._down.pitch + dy * 0.004));
    });
    window.addEventListener('mouseup', (e) => {
      if (this._down) {
        const moved = Math.hypot(e.clientX - this._down.x, e.clientY - this._down.y);
        if (moved < 6) cb.onClick(e.clientX, e.clientY);
        this._down = null;
      }
    });
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dist = Math.min(140, Math.max(6, this.dist * (e.deltaY > 0 ? 1.12 : 0.89)));
    }, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  toggleFollow(agent) {
    if (this.followAgent === agent) {
      this.followAgent = null;
      this.mode = 'free';
    } else if (agent) {
      this.followAgent = agent;
      this.mode = 'follow';
    }
  }

  stopFollow() {
    this.followAgent = null;
    this.mode = 'free';
  }

  update(dt) {
    const maxX = HALF_X * PITCH + 40;
    const maxZ = HALF_Z * PITCH + 40;
    if (this.mode === 'follow' && this.followAgent) {
      const p = this.followAgent.pos;
      this.target.set(p.x, 1.4, p.z);
    } else {
      const speed = Math.max(6, this.dist * 0.9) * dt;
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const r = new THREE.Vector3(-f.z, 0, f.x);
      if (this.keys.has('w')) this.target.addScaledVector(f, speed);
      if (this.keys.has('s')) this.target.addScaledVector(f, -speed);
      if (this.keys.has('a')) this.target.addScaledVector(r, -speed);
      if (this.keys.has('d')) this.target.addScaledVector(r, speed);
      this.target.x = Math.min(maxX, Math.max(-maxX, this.target.x));
      this.target.z = Math.min(maxZ, Math.max(-maxZ, this.target.z));
    }
    const cp = Math.cos(this.pitch);
    const desired = new THREE.Vector3(
      this.target.x + this.dist * cp * Math.sin(this.yaw),
      this.target.y + this.dist * Math.sin(this.pitch),
      this.target.z + this.dist * cp * Math.cos(this.yaw),
    );
    const k = 1 - Math.exp(-dt * 10);
    this.camera.position.lerp(desired, k);
    this.camera.lookAt(this.target);
  }
}
