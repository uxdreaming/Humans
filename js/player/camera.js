// Observation + player camera.
// Modes:
//  - free:    WASD pans the focus point, drag orbits, wheel zooms
//  - follow:  camera follows the selected NPC
//  - control: the player drives the NPC (WASD/Shift), camera in 3rd person
//             (V toggles first person)

import * as THREE from 'three';
import { PITCH } from '../core/config.js';
import { HALF_X, HALF_Z, lotsOf, worldToBlock, landmarkRects } from '../world/layout.js';
import { clampInterior, doorInsidePos } from '../world/interiorSpecs.js';

// collision rectangles of the landmark buildings (computed from the layout)
const LANDMARK_RECTS = landmarkRects();

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
    this.mode = 'free'; // free | follow | control | drive | interior
    this.followAgent = null;
    this.car = null;
    this.roomSpec = null; // interior mode: room spec + slot + local pos
    this.roomSlot = null;
    this.roomPos = null;
    this.roomDoor = null; // world door pos: keeps town streaming anchored outside
    this.vel = { x: 0, z: 0 };
    this.firstPerson = false;
    this.keys = new Set();
    this._down = null;
    this.baseFov = camera.fov;

    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return; // typing in chat: no game keys
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
    this.vel = { x: 0, z: 0 };
  }

  releaseControl() {
    if (this.mode === 'control' || this.mode === 'interior') this.followAgent?.group && (this.followAgent.group.visible = true);
    this.mode = 'free';
    this.followAgent = null;
    this.firstPerson = false;
    this.roomSpec = null;
    this.roomSlot = null;
    this.roomPos = null;
    this.roomDoor = null;
  }

  drive(car) {
    this.mode = 'drive';
    this.car = car;
    this.followAgent = null;
    this.dist = 9.5;
    this.pitch = 0.42;
  }

  exitDrive() {
    this.mode = 'control';
    this.car = null;
  }

  enterInterior(spec, slot, doorWorld) {
    this.mode = 'interior';
    this.roomSpec = spec;
    this.roomSlot = slot;
    this.roomDoor = doorWorld;
    this.roomPos = doorInsidePos(spec);
    this.yaw = 0; // face into the room (-z)
    this.pitch = 0.3;
    this.dist = 6;
    this.vel = { x: 0, z: 0 };
    this.firstPerson = false;
  }

  exitInterior() {
    if (this.mode === 'interior') this.mode = 'control';
    this.roomSpec = null;
    this.roomSlot = null;
    this.roomPos = null;
    this.roomDoor = null;
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
    if (this.mode === 'control' || this.mode === 'interior') {
      this.firstPerson = !this.firstPerson;
      if (this.followAgent) this.followAgent.group.visible = !this.firstPerson;
    }
  }

  update(dt) {
    // ---- drive mode: arcade car ----
    if (this.mode === 'drive' && this.car) {
      const car = this.car;
      const f = { x: Math.sin(car.heading), z: Math.cos(car.heading) };
      const throttle = this.keys.has('w') ? 1 : this.keys.has('s') ? -0.55 : 0;
      const steer = this.keys.has('a') ? 1 : this.keys.has('d') ? -1 : 0;
      const engineOn = car.fuel > 0;
      if (engineOn) {
        car.speed += (throttle * 16 - car.speed * 0.9) * dt;
      } else {
        car.speed -= car.speed * 3 * dt; // engine off: coast to a stop
      }
      car.speed = Math.max(-6, Math.min(19, car.speed));
      if (Math.abs(car.speed) < 0.05 && throttle === 0) car.speed = 0;
      car.heading += steer * 2.1 * dt * Math.max(-1, Math.min(1, car.speed / 6));
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      collide(car.pos, 1.25);
      car.mesh.position.set(car.pos.x, 0, car.pos.z);
      car.mesh.rotation.y = car.heading;
      this.target.set(car.pos.x, 1.2, car.pos.z);
      const cp = Math.cos(this.pitch);
      const back = this.firstPerson ? 0.3 : this.dist;
      const desired = new THREE.Vector3(
        car.pos.x - Math.sin(car.heading) * back * cp + this.dist * 0 * cp,
        1.2 + back * Math.sin(this.pitch),
        car.pos.z - Math.cos(car.heading) * back * cp,
      );
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 7));
      this.camera.lookAt(car.pos.x + Math.sin(car.heading) * 4, 1.2, car.pos.z + Math.cos(car.heading) * 4);
      return;
    }

    // ---- interior mode: walk inside a room, camera orbits the player ----
    if (this.mode === 'interior' && this.roomSpec && this.roomPos) {
      const a = this.followAgent ? this.followAgent.agent : null;
      const running = this.keys.has('shift');
      const maxSp = running ? 5.5 : 3.2;
      const f = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
      const r = { x: -f.z, z: f.x };
      let ix = 0, iz = 0;
      if (this.keys.has('w')) { ix += f.x; iz += f.z; }
      if (this.keys.has('s')) { ix -= f.x; iz -= f.z; }
      if (this.keys.has('a')) { ix -= r.x; iz -= r.z; }
      if (this.keys.has('d')) { ix += r.x; iz += r.z; }
      const ilen = Math.hypot(ix, iz);
      if (ilen > 0) {
        ix /= ilen; iz /= ilen;
        this.vel.x += ix * 30 * dt;
        this.vel.z += iz * 30 * dt;
      }
      const fr = Math.exp(-(ilen > 0 ? 1.2 : 9) * dt);
      this.vel.x *= fr; this.vel.z *= fr;
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > maxSp) { this.vel.x *= maxSp / sp; this.vel.z *= maxSp / sp; }
      this.roomPos.x += this.vel.x * dt;
      this.roomPos.z += this.vel.z * dt;
      clampInterior(this.roomPos, this.roomSpec, 0.4);
      if (a) {
        if (sp > 0.4) {
          a.heading = Math.atan2(this.vel.x, this.vel.z);
          a.moving = true;
          a.state = 'walk';
          a.walkPhase += dt * (4 + sp * 1.3);
        } else {
          a.moving = false;
          a.state = 'idle';
        }
      }
      const fx = this.roomSlot.x + this.roomPos.x;
      const fz = this.roomSlot.z + this.roomPos.z;
      const back = this.firstPerson ? 0.05 : this.dist;
      const cp = Math.cos(this.pitch);
      const desired = new THREE.Vector3(
        fx + back * cp * Math.sin(this.yaw),
        1.5 + back * Math.sin(this.pitch),
        fz + back * cp * Math.cos(this.yaw),
      );
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
      this.camera.lookAt(fx, this.firstPerson ? 1.68 : 1.5, fz);
      // keep world streaming anchored at the outside door
      if (this.roomDoor) this.target.set(this.roomDoor.x, 1.5, this.roomDoor.z);
      return;
    }

    // ---- control mode: smooth accelerated movement (GTA/Minecraft feel) ----
    if (this.mode === 'control' && this.followAgent) {
      const a = this.followAgent.agent;
      const running = this.keys.has('shift');
      const maxSp = running ? 7.5 : 4.5;
      const f = { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
      const r = { x: -f.z, z: f.x };
      let ix = 0, iz = 0;
      if (this.keys.has('w')) { ix += f.x; iz += f.z; }
      if (this.keys.has('s')) { ix -= f.x; iz -= f.z; }
      if (this.keys.has('a')) { ix -= r.x; iz -= r.z; }
      if (this.keys.has('d')) { ix += r.x; iz += r.z; }
      const ilen = Math.hypot(ix, iz);
      if (ilen > 0) {
        ix /= ilen; iz /= ilen;
        this.vel.x += ix * 30 * dt;
        this.vel.z += iz * 30 * dt;
      }
      // friction
      const fr = Math.exp(-(ilen > 0 ? 1.2 : 9) * dt);
      this.vel.x *= fr; this.vel.z *= fr;
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > maxSp) { this.vel.x *= maxSp / sp; this.vel.z *= maxSp / sp; }
      a.pos.x += this.vel.x * dt;
      a.pos.z += this.vel.z * dt;
      collide(a.pos, 0.45);
      if (sp > 0.4) {
        a.heading = Math.atan2(this.vel.x, this.vel.z);
        a.moving = true;
        a.state = 'walk';
        a.walkPhase += dt * (4 + sp * 1.3);
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
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
      this.camera.lookAt(this.target.x, this.firstPerson ? 1.68 : this.target.y, this.target.z);
      // FOV widens when running
      const wantFov = running && sp > 5 ? this.baseFov + 10 : this.baseFov;
      if (Math.abs(this.camera.fov - wantFov) > 0.1) {
        this.camera.fov += (wantFov - this.camera.fov) * Math.min(1, dt * 6);
        this.camera.updateProjectionMatrix();
      }
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
