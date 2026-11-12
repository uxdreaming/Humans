// Observation + player camera.
// Modes:
//  - free:    WASD pans the focus point, drag orbits, wheel zooms
//  - follow:  camera follows the selected NPC
//  - control: the player drives the NPC (WASD/Shift), camera in 3rd person
//             (V toggles first person)

import * as THREE from 'three';
import { PITCH } from '../core/config.js';
import { HALF_X, HALF_Z, PLACES, lotsOf, worldToBlock } from '../world/layout.js';

// collision rectangles of the landmark buildings (world coords)
const LANDMARK_RECTS = [
  { x0: -32 - 7.5, z0: 32 - 5.5, x1: -32 + 7.5, z1: 32 + 5.5 },  // café
  { x0: 64 - 6.5, z0: -8.5, x1: 64 + 6.5, z1: 10.5 },               // church
  { x0: 96 - 12.5, z0: -32 - 7.5, x1: 96 + 12.5, z1: -32 + 7.5 },  // market
  { x0: -64 - 5.5, z0: 32 - 4.5, x1: -64 + 5.5, z1: 32 + 4.5 },    // bar
  { x0: 32 - 6.5, z0: -32 - 5, x1: 32 + 6.5, z1: -32 + 5 },        // bakery
];

function pushOut(pos, r, x0, z0, x1, z1) {
  if (pos.x > x0 - r && pos.x < x1 + r && pos.z > z0 - r && pos.z < z1 + r) {
    const dxl = pos.x - (x0 - r), dxr = (x1 + r) - pos.x;
    const dzl = pos.z - (z0 - r), dzr = (z1 + r) - pos.z;
    const m = Math.min(dxl, dxr, dzl, dzr);
    if (m === dxl) pos.x = x0 - r;
    else if (m === dxr) pos.x = x1 + r;
    else if (m === dzl) pos.z = z0 - r;
    else pos.z = z1 + r;
  }
}

function collide(pos, r) {
  const maxX = HALF_X * PITCH + 20;
  const maxZ = HALF_Z * PITCH + 20;
  pos.x = Math.min(maxX, Math.max(-maxX, pos.x));
  pos.z = Math.min(maxZ, Math.max(-maxZ, pos.z));
  for (const rc of LANDMARK_RECTS) pushOut(pos, r, rc.x0, rc.z0, rc.x1, rc.z1);
  const b = worldToBlock(pos.x, pos.z);
  for (let i = b.i - 1; i <= b.i + 1; i++) {
    for (let j = b.j - 1; j <= b.j + 1; j++) {
      for (const lot of lotsOf(i, j)) {
        if (lot.kind === 'garden') continue;
        const cx = i * PITCH + lot.ox, cz = j * PITCH + lot.oz;
        pushOut(pos, r, cx - lot.w / 2 - 0.15, cz - lot.d / 2 - 0.15, cx + lot.w / 2 + 0.15, cz + lot.d / 2 + 0.15);
      }
    }
  }
}

export class ObserverCamera {
  constructor(camera, dom, cb) {
    this.camera = camera;
    this.cb = cb;
    this.target = new THREE.Vector3(0, 1.2, 0);
    this.yaw = Math.PI * 0.22;
    this.pitch = 0.5;
    this.dist = 34;
    this.mode = 'free'; // free | follow | control
    this.followAgent = null;
    this.firstPerson = false;
    this.keys = new Set();
    this._down = null;

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === 'f') cb.onToggleFollow();
      if (k === 'v') cb.onToggleFP();
      if (k === 'n') cb.onNearestNpc();
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

  control(agentEntry) {
    this.mode = 'control';
    this.followAgent = agentEntry;
    this.dist = 7;
    this.pitch = 0.35;
    this.firstPerson = false;
  }

  releaseControl() {
    if (this.mode === 'control') this.followAgent?.group && (this.followAgent.group.visible = true);
    this.mode = 'free';
    this.followAgent = null;
    this.firstPerson = false;
  }

  toggleFollow(agent) {
    if (this.mode === 'control') return;
    if (this.followAgent === agent) {
      this.followAgent = null;
      this.mode = 'free';
    } else if (agent) {
      this.followAgent = agent;
      this.mode = 'follow';
    }
  }

  stopFollow() {
    if (this.mode !== 'control') {
      this.followAgent = null;
      this.mode = 'free';
    }
  }

  toggleFP() {
    if (this.mode === 'control') {
      this.firstPerson = !this.firstPerson;
      if (this.followAgent) this.followAgent.group.visible = !this.firstPerson;
    }
  }

  update(dt) {
    if (this.mode === 'control' && this.followAgent) {
      const a = this.followAgent.agent;
      const sp = this.keys.has('shift') ? 7 : 4.2; // real m/s
      let mx = 0, mz = 0;
      const f = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
      const r = { x: -f.z, z: f.x };
      if (this.keys.has('w')) { mx += f.x; mz += f.z; }
      if (this.keys.has('s')) { mx -= f.x; mz -= f.z; }
      if (this.keys.has('a')) { mx -= r.x; mz -= r.z; }
      if (this.keys.has('d')) { mx += r.x; mz += r.z; }
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        mx /= len; mz /= len;
        a.pos.x += mx * sp * dt;
        a.pos.z += mz * sp * dt;
        collide(a.pos, 0.45);
        a.heading = Math.atan2(mx, mz);
        a.moving = true;
        a.state = 'walk';
        a.walkPhase += dt * 9;
      } else {
        a.moving = false;
        a.state = 'idle';
      }
      this.target.set(a.pos.x, 1.5, a.pos.z);
      const dist = this.firstPerson ? 0.05 : this.dist;
      const cp = Math.cos(this.pitch);
      const desired = new THREE.Vector3(
        this.target.x + dist * cp * Math.sin(this.yaw),
        this.target.y + dist * Math.sin(this.pitch),
        this.target.z + dist * cp * Math.cos(this.yaw),
      );
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 14));
      this.camera.lookAt(this.target.x, this.firstPerson ? 1.68 : this.target.y, this.target.z);
      return;
    }

    const maxX = HALF_X * PITCH + 40;
    const maxZ = HALF_Z * PITCH + 40;
    if (this.mode === 'follow' && this.followAgent) {
      const p = this.followAgent.agent.pos;
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
