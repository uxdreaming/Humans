// Enterable interiors: one room per kind, built lazily in "slots" far outside
// the town (x >= 6000) so the town chunk streaming is never disturbed.
// The camera's interior mode keeps the stream anchor at the door (main.js).

import * as THREE from 'three';
import { INTERIOR_SPECS, DOOR } from './interiorSpecs.js';
import { makeNoiseTexture } from './textures.js';

const SLOT_X0 = 6000;
const SLOT_DX = 80;
const WALL_T = 0.3;

let baseFloorTex = null;
let baseWallTex = null;

function noiseTex(base, vary, blotch) {
  return makeNoiseTexture({ base, vary, blotches: blotch ? 26 : 0, blotchColor: '#000000', blotchAlpha: 0.06 });
}

export class Interiors {
  constructor(scene) {
    this.scene = scene;
    this.rooms = new Map(); // kind -> { group, slot, spec }
    if (!baseFloorTex) {
      baseFloorTex = noiseTex('#8a6a4a', 18, true);
      baseWallTex = noiseTex('#e8dcc8', 12, true);
    }
  }

  slotFor(kind) {
    const idx = Math.max(0, Object.keys(INTERIOR_SPECS).indexOf(kind));
    return { x: SLOT_X0 + idx * SLOT_DX, z: 0 };
  }

  ensure(kind) {
    if (this.rooms.has(kind)) return this.rooms.get(kind);
    const spec = INTERIOR_SPECS[kind];
    if (!spec) return null;
    const slot = this.slotFor(kind);
    const g = new THREE.Group();
    g.position.set(slot.x, 0, slot.z);

    const { w, d, h } = spec;

    // floor + ceiling
    const floorTex = baseFloorTex.clone();
    floorTex.needsUpdate = true;
    floorTex.repeat.set(w / 3, d / 3);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ map: floorTex, color: spec.floor, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: spec.ceil, roughness: 1 }),
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = h;
    g.add(ceil);

    // walls (door gap on the +z wall)
    const wallTex = baseWallTex.clone();
    wallTex.needsUpdate = true;
    wallTex.repeat.set(Math.max(w, d) / 4, h / 4);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, color: spec.wall, roughness: 0.95 });
    const mkWall = (ww, dd, x, z, y = h / 2) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat);
      m.position.set(x, y, z);
      m.castShadow = false;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    mkWall(w + WALL_T * 2, WALL_T, 0, -d / 2 - WALL_T / 2); // back (-z)
    mkWall(WALL_T, d, -w / 2 - WALL_T / 2, 0); // left (-x)
    mkWall(WALL_T, d, w / 2 + WALL_T / 2, 0);  // right (+x)
    // front (+z) wall: two segments + lintel over the door gap
    const segW = w / 2 - DOOR.w / 2;
    mkWall(segW, WALL_T, -(DOOR.w / 2 + segW / 2), d / 2 + WALL_T / 2);
    mkWall(segW, WALL_T, (DOOR.w / 2 + segW / 2), d / 2 + WALL_T / 2);
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR.w, h - DOOR.h, WALL_T),
      wallMat,
    );
    lintel.position.set(0, DOOR.h + (h - DOOR.h) / 2, d / 2 + WALL_T / 2);
    g.add(lintel);

    // window on the back wall (glows at night thanks to bloom)
    const window = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xbdd7ff }),
    );
    window.position.set(-w / 4, 1.9, -d / 2 + 0.02);
    g.add(window);

    // furniture
    for (const f of spec.furniture) {
      const mat = new THREE.MeshStandardMaterial({ color: f.c, roughness: 0.75 });
      let mesh;
      if (f.shape === 'cyl') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(f.w / 2, f.w / 2, f.h, 14), mat);
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(f.w, f.h, f.d), mat);
      }
      mesh.position.set(f.x, f.h / 2, f.z);
      mesh.castShadow = !f.noCollide;
      mesh.receiveShadow = true;
      g.add(mesh);
    }

    // warm ceiling light + visible bulb (rooms are lit day and night)
    const light = new THREE.PointLight(spec.light || 0xffe6c0, 60, 0, 1.6);
    light.position.set(0, h - 0.25, 0);
    g.add(light);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff2cc }),
    );
    bulb.position.copy(light.position);
    g.add(bulb);

    this.scene.add(g);
    const room = { group: g, slot, spec };
    this.rooms.set(kind, room);
    return room;
  }

  // world position of a room-local point
  worldPos(kind, lx, lz) {
    const slot = this.slotFor(kind);
    return { x: slot.x + lx, z: slot.z + lz };
  }
}
