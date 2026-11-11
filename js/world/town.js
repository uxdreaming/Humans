// Town renderer: streams 8x8-block chunks around the camera.
// Houses/trees/lamps are InstancedMeshes per chunk; landmarks (plaza, café,
// church, supermarket, park) are unique hand-built groups; billboards get
// generated ad text on canvas textures.

import * as THREE from 'three';
import { CONFIG, PITCH } from '../core/config.js';
import { rngFor, pick, chance } from '../core/rng.js';
import {
  inTown, blockToWorld, landmarkAt, lotsOf, streetCoord, BILLBOARDS, PLACES, HALF_X, HALF_Z,
} from './layout.js';

// Shared (never disposed) assets -------------------------------------------------
const shared = {
  wallGeo: new THREE.BoxGeometry(1, 1, 1),
  roofGeo: new THREE.ConeGeometry(1, 1, 4),
  trunkGeo: new THREE.CylinderGeometry(0.12, 0.17, 1.7, 6),
  foliageGeo: new THREE.IcosahedronGeometry(1, 0),
  poleGeo: new THREE.CylinderGeometry(0.07, 0.1, 4.4, 6),
  headGeo: new THREE.SphereGeometry(0.24, 10, 8),
  sidewalkGeo: new THREE.PlaneGeometry(CONFIG.blockSize, CONFIG.blockSize),
  roadGeoV: new THREE.PlaneGeometry(CONFIG.streetWidth, CONFIG.chunkBlocks * PITCH + CONFIG.streetWidth),
  roadGeoH: new THREE.PlaneGeometry(CONFIG.chunkBlocks * PITCH + CONFIG.streetWidth, CONFIG.streetWidth),
  sidewalkMat: new THREE.MeshStandardMaterial({ color: 0xb9b3a6, roughness: 1 }),
  roadMat: new THREE.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.95 }),
  trunkMat: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }),
  foliageMat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
  poleMat: new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.6, metalness: 0.4 }),
  carBodyGeo: new THREE.BoxGeometry(1.8, 0.5, 4.2),
  carCabinGeo: new THREE.BoxGeometry(1.6, 0.45, 2.1),
  wheelGeo: new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10),
  chimneyGeo: new THREE.BoxGeometry(0.5, 1.2, 0.5),
  carCabinMat: new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.2, metalness: 0.3 }),
  wheelMat: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 }),
  chimneyMat: new THREE.MeshStandardMaterial({ color: 0x8a5a4a, roughness: 0.9 }),
};
shared.wheelGeo.rotateZ(Math.PI / 2); // wheel axis across the car

export function makeTextTexture(text, { w = 512, h = 128, bg = '#1c2547', fg = '#ffd479', font = 40 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg; ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const parts = text.split('·');
  if (parts.length > 1 && text.length > 26) {
    ctx.font = `bold ${font - 8}px "Segoe UI", Arial`;
    ctx.fillText(parts[0].trim(), w / 2, h / 2 - font / 2 - 4);
    ctx.fillText(parts.slice(1).join('·').trim(), w / 2, h / 2 + font / 2 + 4);
  } else {
    let size = font;
    ctx.font = `bold ${size}px "Segoe UI", Arial`;
    while (ctx.measureText(text).width > w - 40 && size > 16) {
      size -= 4;
      ctx.font = `bold ${size}px "Segoe UI", Arial`;
    }
    ctx.fillText(text, w / 2, h / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class Town {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map(); // "cx,cz" -> Group
    this.lampMat = new THREE.MeshStandardMaterial({ color: 0x555a60, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: 0.4 });
    this.windowMat = new THREE.MeshStandardMaterial({ color: 0x2a3550, emissive: 0xffe6a8, emissiveIntensity: 0, roughness: 0.3 });
    this.texCache = new Map();
  }

  setNight(nightFactor) {
    this.lampMat.emissiveIntensity = nightFactor * 2.4;
    this.windowMat.emissiveIntensity = nightFactor * 1.6;
  }

  update(camX, camZ) {
    const CH = CONFIG.chunkBlocks;
    const ccx = Math.floor((camX + PITCH / 2) / (CH * PITCH));
    const ccz = Math.floor((camZ + PITCH / 2) / (CH * PITCH));
    const R = CONFIG.renderChunkRadius;
    const needed = new Set();
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) needed.add(`${ccx + dx},${ccz + dz}`);
    }
    for (const key of needed) {
      if (!this.chunks.has(key)) {
        const [cx, cz] = key.split(',').map(Number);
        const g = this.buildChunk(cx, cz);
        this.chunks.set(key, g);
        this.scene.add(g);
      }
    }
    for (const [key, g] of this.chunks) {
      if (!needed.has(key)) {
        this.scene.remove(g);
        g.traverse((o) => {
          if (o.geometry && !Object.values(shared).includes(o.geometry)) o.geometry.dispose();
          if (o.material?.map && !o.material.userData?.shared) o.material.map.dispose();
        });
        this.chunks.delete(key);
      }
    }
  }

  instanced(geo, mat, list) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const p = new THREE.Vector3(), s = new THREE.Vector3();
    const col = new THREE.Color();
    list.forEach((it, idx) => {
      e.set(0, it.rotY || 0, 0);
      q.setFromEuler(e);
      p.set(it.pos[0], it.pos[1], it.pos[2]);
      s.set(it.scale[0], it.scale[1], it.scale[2]);
      m.compose(p, q, s);
      im.setMatrixAt(idx, m);
      if (it.color) { col.set(it.color); im.setColorAt(idx, col); }
    });
    im.castShadow = true;
    im.receiveShadow = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    return im;
  }

  buildChunk(cx, cz) {
    const CH = CONFIG.chunkBlocks;
    const group = new THREE.Group();
    const i0 = cx * CH, j0 = cz * CH;
    const x0 = i0 * PITCH - PITCH / 2, z0 = j0 * PITCH - PITCH / 2;
    const span = CH * PITCH;
    const mx = x0 + span / 2, mz = z0 + span / 2;
    const rng = rngFor(CONFIG.seed, 'chunk', cx, cz);

    const grass = new THREE.Color(0x5d8a4a).offsetHSL(0, 0, (rng() - 0.5) * 0.06);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(span, span),
      new THREE.MeshStandardMaterial({ color: grass, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(mx, 0, mz);
    ground.receiveShadow = true;
    group.add(ground);

    // roads along every street line crossing the chunk
    for (let i = i0 - 1; i <= i0 + CH; i++) {
      const x = streetCoord(i * PITCH);
      if (x >= x0 - 0.1 && x <= x0 + span + 0.1) {
        const r = new THREE.Mesh(shared.roadGeoV, shared.roadMat);
        r.rotation.x = -Math.PI / 2;
        r.position.set(x, 0.03, mz);
        r.receiveShadow = true;
        group.add(r);
      }
      const z = streetCoord(i * PITCH);
      if (z >= z0 - 0.1 && z <= z0 + span + 0.1) {
        const r = new THREE.Mesh(shared.roadGeoH, shared.roadMat);
        r.rotation.x = -Math.PI / 2;
        r.position.set(mx, 0.03, z);
        r.receiveShadow = true;
        group.add(r);
      }
    }

    const houses = [], trees = [], lamps = [];
    for (let i = i0; i < i0 + CH; i++) {
      for (let j = j0; j < j0 + CH; j++) {
        if (!inTown(i, j)) continue;
        const { x, z } = blockToWorld(i, j);
        const lm = landmarkAt(i, j);
        if (lm) { group.add(this.buildLandmark(lm, x, z)); continue; }
        const sw = new THREE.Mesh(shared.sidewalkGeo, shared.sidewalkMat);
        sw.rotation.x = -Math.PI / 2;
        sw.position.set(x, 0.02, z);
        sw.receiveShadow = true;
        group.add(sw);
        for (const lot of lotsOf(i, j)) {
          const lx = x + lot.ox, lz = z + lot.oz;
          if (lot.kind === 'house') {
            houses.push({ x: lx, z: lz, w: lot.w, d: lot.d, h: lot.h, wall: lot.wall, roof: lot.roof, rotY: lot.rotY, chimney: lot.chimney });
          } else {
            for (let t = 0; t < lot.trees; t++) {
              trees.push({
                pos: [lx + (rng() * 2 - 1) * 3.2, 0.85, lz + (rng() * 2 - 1) * 3.2],
                scale: [1, 1, 1], s: 0.7 + rng() * 0.7,
                color: new THREE.Color(0x3f7a35).offsetHSL((rng() - 0.5) * 0.05, 0, (rng() - 0.5) * 0.08).getHex(),
              });
            }
          }
        }
      }
    }

    // street lamps at every other intersection
    for (let i = i0 - 1; i <= i0 + CH; i++) {
      for (let j = j0 - 1; j <= j0 + CH; j++) {
        if ((i + j) % 2 !== 0) continue;
        const x = streetCoord(i * PITCH), z = streetCoord(j * PITCH);
        if (x < x0 || x > x0 + span || z < z0 || z > z0 + span) continue;
        lamps.push({ pos: [x + CONFIG.streetWidth / 2 + 0.7, 0, z + CONFIG.streetWidth / 2 + 0.7], scale: [1, 1, 1] });
      }
    }

    // billboards inside the chunk
    for (const b of BILLBOARDS) {
      if (b.x >= x0 && b.x <= x0 + span && b.z >= z0 && b.z <= z0 + span) group.add(this.buildBillboard(b));
    }

    // parked cars along the streets of the chunk
    const cars = [];
    const carColors = ['#b03a2e', '#2e4a6e', '#7d8a97', '#c9a24d', '#3a3f4a', '#5a9e5a', '#8a5ac0', '#d97f6a'];
    for (let i = i0 - 1; i <= i0 + CH; i++) {
      const lx = streetCoord(i * PITCH);
      if (lx >= x0 - 0.1 && lx <= x0 + span + 0.1) {
        for (let j = j0; j < j0 + CH; j++) {
          const cr = rngFor(CONFIG.seed, 'car', 'v', i, j);
          if (chance(cr, 0.28)) cars.push({ x: lx - CONFIG.streetWidth / 2 + 1.8, z: j * PITCH + (cr() * 2 - 1) * 8, rotY: 0, color: pick(cr, carColors) });
        }
      }
      const lz = streetCoord(i * PITCH);
      if (lz >= z0 - 0.1 && lz <= z0 + span + 0.1) {
        for (let k = i0; k < i0 + CH; k++) {
          const cr = rngFor(CONFIG.seed, 'car', 'h', i, k);
          if (chance(cr, 0.28)) cars.push({ x: k * PITCH + (cr() * 2 - 1) * 8, z: lz + CONFIG.streetWidth / 2 - 1.8, rotY: Math.PI / 2, color: pick(cr, carColors) });
        }
      }
    }

    const walls = this.instanced(shared.wallGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
      houses.map((h) => ({ pos: [h.x, h.h / 2, h.z], rotY: h.rotY, scale: [h.w, h.h, h.d], color: h.wall })));
    if (walls) group.add(walls);
    const roofs = this.instanced(shared.roofGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }),
      houses.map((h) => ({ pos: [h.x, h.h + 0.01, h.z], rotY: h.rotY + Math.PI / 4, scale: [h.w * 0.78, h.h * 0.55 + 1.2, h.d * 0.78], color: h.roof })));
    if (roofs) group.add(roofs);
    const trunks = this.instanced(shared.trunkGeo, shared.trunkMat,
      trees.map((t) => ({ pos: [t.pos[0], 0, t.pos[2]], scale: [t.s, t.s, t.s] })));
    if (trunks) group.add(trunks);
    const fol = this.instanced(shared.foliageGeo, shared.foliageMat,
      trees.map((t) => ({ pos: [t.pos[0], 1.7 * t.s + 0.6, t.pos[2]], scale: [1.5 * t.s, 1.3 * t.s, 1.5 * t.s], color: t.color })));
    if (fol) group.add(fol);
    const poles = this.instanced(shared.poleGeo, shared.poleMat,
      lamps.map((l) => ({ pos: [l.pos[0], 2.2, l.pos[2]], scale: [1, 1, 1] })));
    if (poles) group.add(poles);
    const heads = this.instanced(shared.headGeo, this.lampMat,
      lamps.map((l) => ({ pos: [l.pos[0], 4.45, l.pos[2]], scale: [1, 1, 1] })));
    if (heads) { heads.castShadow = false; group.add(heads); }

    // chimneys on some roofs
    const chimneys = this.instanced(shared.chimneyGeo, shared.chimneyMat,
      houses.filter((h) => h.chimney).map((h) => ({
        pos: [h.x + h.w * 0.25 * Math.cos(h.rotY), h.h + 0.7, h.z - h.w * 0.25 * Math.sin(h.rotY)],
        rotY: h.rotY, scale: [1, 1, 1],
      })));
    if (chimneys) group.add(chimneys);

    // parked cars: body (colored), cabin, 4 wheels
    const carBodies = this.instanced(shared.carBodyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.5 }),
      cars.map((c) => ({ pos: [c.x, 0.55, c.z], rotY: c.rotY, scale: [1, 1, 1], color: c.color })));
    if (carBodies) group.add(carBodies);
    const carCabins = this.instanced(shared.carCabinGeo, shared.carCabinMat,
      cars.map((c) => ({ pos: [c.x, 0.95, c.z], rotY: c.rotY, scale: [1, 1, 1] })));
    if (carCabins) group.add(carCabins);
    const wheelPts = [];
    for (const c of cars) {
      const cos = Math.cos(c.rotY), sin = Math.sin(c.rotY);
      for (const [wx, wz] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) {
        wheelPts.push({ pos: [c.x + wx * cos + wz * sin, 0.32, c.z - wx * sin + wz * cos], rotY: c.rotY, scale: [1, 1, 1] });
      }
    }
    const wheels = this.instanced(shared.wheelGeo, shared.wheelMat, wheelPts);
    if (wheels) group.add(wheels);

    return group;
  }

  buildBillboard(b) {
    const g = new THREE.Group();
    let tex = this.texCache.get(b.text);
    if (!tex) { tex = makeTextTexture(b.text, { bg: '#233058', fg: '#ffe9b0', font: 42 }); this.texCache.set(b.text, tex); }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.2, 6), shared.poleMat);
    post.position.y = 1.6; post.castShadow = true;
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 1.6),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
    );
    board.position.y = 3.6;
    board.castShadow = true;
    g.add(post, board);
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.ry;
    return g;
  }

  // ------------------------------------------------------------ landmarks ---
  buildLandmark(lm, x, z) {
    switch (lm.kind) {
      case 'plaza': return this.buildPlaza(x, z);
      case 'cafe': return this.buildCafe(x, z);
      case 'church': return this.buildChurch(x, z);
      case 'market': return this.buildMarket(x, z);
      case 'park': return this.buildPark(x, z);
      case 'bar': return this.buildBar(x, z);
      case 'bakery': return this.buildBakery(x, z);
      default: return new THREE.Group();
    }
  }

  makeStripedAwning(colorA, colorB, w, h) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 32;
    const ctx = c.getContext('2d');
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? colorA : colorB; ctx.fillRect(i * 16, 0, 16, 32); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  }

  stoneMat() { return new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.9 }); }

  buildPlaza(x, z) {
    const g = new THREE.Group();
    const pave = new THREE.Mesh(
      new THREE.CircleGeometry(PITCH / 2 - 1, 40),
      new THREE.MeshStandardMaterial({ color: 0xb8b2a4, roughness: 1 }),
    );
    pave.rotation.x = -Math.PI / 2; pave.position.y = 0.04; pave.receiveShadow = true;
    g.add(pave);

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.3, 0.7, 20), this.stoneMat());
    basin.position.y = 0.35; basin.castShadow = true; basin.receiveShadow = true;
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(2.7, 20),
      new THREE.MeshStandardMaterial({ color: 0x3f8fd2, roughness: 0.2, metalness: 0.1, emissive: 0x0a2a4a, emissiveIntensity: 0.4 }),
    );
    water.rotation.x = -Math.PI / 2; water.position.y = 0.72;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 10), this.stoneMat());
    column.position.y = 1.8; column.castShadow = true;
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), this.stoneMat());
    top.position.y = 3; top.castShadow = true;
    g.add(basin, water, column, top);

    const benchGeo = new THREE.BoxGeometry(2, 0.12, 0.6);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x7a5a36, roughness: 0.9 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const b = new THREE.Mesh(benchGeo, benchMat);
      b.position.set(x + Math.cos(a) * 6.5 - x, 0.45, z + Math.sin(a) * 6.5 - z);
      b.position.set(Math.cos(a) * 6.5, 0.45, Math.sin(a) * 6.5);
      b.rotation.y = -a;
      b.castShadow = true;
      g.add(b);
    }
    g.position.set(x, 0, z);
    return g;
  }

  buildCafe(x, z) {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.9 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 10), wall);
    box.position.y = 2.5; box.castShadow = true; box.receiveShadow = true;
    g.add(box);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.9, 2.4, 4), new THREE.MeshStandardMaterial({ color: 0x8a4b3a, roughness: 0.85 }));
    roof.position.y = 6.2; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.8); roof.castShadow = true;
    g.add(roof);

    // striped awning
    const awnTex = makeTextTexture('· · ·', { bg: '#c0504d' }); // placeholder replaced below
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const ctx = c.getContext('2d');
    for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#c0504d' : '#f2e6d8'; ctx.fillRect(i * 16, 0, 16, 32); }
    awnTex.image = c; awnTex.needsUpdate = true;
    const awn = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), new THREE.MeshStandardMaterial({ map: awnTex, roughness: 0.9 }));
    awn.position.set(0, 3.1, 5.9); awn.rotation.x = -0.5;
    g.add(awn);

    // sign + windows + door
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6),
      new THREE.MeshStandardMaterial({ map: makeTextTexture('CAFÉ LA ESQUINA', { bg: '#2e2018', fg: '#ffd479' }) }));
    sign.position.set(0, 4.2, 5.06);
    g.add(sign);
    for (const wx of [-4, 0, 4]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), this.windowMat);
      win.position.set(wx, 2.2, 5.06);
      g.add(win);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x4a2f1d }));
    door.position.set(0, 1.3, 5.05);
    g.add(door);

    // terrace tables (toward the street / plaza)
    const tableTop = new THREE.CylinderGeometry(0.75, 0.75, 0.06, 14);
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.75, 6);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.7 });
    for (let k = 0; k < 3; k++) {
      const tx = -4 + k * 4, tz = 8.5;
      const top = new THREE.Mesh(tableTop, tableMat);
      top.position.set(tx, 0.78, tz); top.castShadow = true;
      const leg = new THREE.Mesh(legGeo, shared.poleMat);
      leg.position.set(tx, 0.38, tz);
      g.add(top, leg);
      for (const s of [-0.9, 0.9]) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x7a5a36 }));
        chair.position.set(tx + s, 0.25, tz + 1.1);
        g.add(chair);
      }
    }
    g.position.set(x, 0, z);
    return g;
  }

  buildChurch(x, z) {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 });
    const nave = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 16), wall);
    nave.position.y = 4; nave.castShadow = true; nave.receiveShadow = true;
    g.add(nave);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 3.5, 4), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.85 }));
    roof.position.y = 9.7; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 1.35); roof.castShadow = true;
    g.add(roof);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4.5, 13, 4.5), wall);
    tower.position.set(0, 6.5, 9.5); tower.castShadow = true;
    g.add(tower);
    const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 3, 4), new THREE.MeshStandardMaterial({ color: 0x5a4632 }));
    towerRoof.position.set(0, 14.5, 9.5); towerRoof.rotation.y = Math.PI / 4; towerRoof.castShadow = true;
    g.add(towerRoof);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 0.18), shared.poleMat);
    crossV.position.set(0, 16.6, 9.5);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.18), shared.poleMat);
    crossH.position.set(0, 16.8, 9.5);
    g.add(crossV, crossH);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.4), new THREE.MeshStandardMaterial({ color: 0x4a2f1d }));
    door.position.set(0, 1.7, 11.51);
    g.add(door);
    for (const wx of [-3.5, 3.5]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.6), this.windowMat);
      win.position.set(wx, 4.5, 8.01);
      g.add(win);
    }
    g.position.set(x, 0, z);
    return g;
  }

  buildMarket(x, z) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(24, 7, 14), new THREE.MeshStandardMaterial({ color: 0x7fb3d9, roughness: 0.8 }));
    box.position.y = 3.5; box.castShadow = true; box.receiveShadow = true;
    g.add(box);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(25, 0.6, 15), new THREE.MeshStandardMaterial({ color: 0x4a6a8a, roughness: 0.7 }));
    roof.position.y = 7.3; roof.castShadow = true;
    g.add(roof);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 2),
      new THREE.MeshStandardMaterial({ map: makeTextTexture('SUPERMERCADO EL CENTRO', { bg: '#1d4e89', fg: '#ffffff', font: 46 }) }));
    sign.position.set(0, 5.6, 7.06);
    g.add(sign);
    for (let k = -2; k <= 2; k++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), this.windowMat);
      win.position.set(k * 4.5, 3, 7.06);
      g.add(win);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.2), new THREE.MeshStandardMaterial({ color: 0x2e3a4a }));
    door.position.set(0, 1.6, 7.05);
    g.add(door);
    // parking lines in front (toward -z)
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 1 });
    for (let k = 0; k < 6; k++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 5), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(-10 + k * 4, 0.045, -11);
      g.add(line);
    }
    g.position.set(x, 0, z);
    return g;
  }

  buildPark(x, z) {
    const g = new THREE.Group();
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(PITCH, PITCH), new THREE.MeshStandardMaterial({ color: 0x4f7d3e, roughness: 1 }));
    grass.rotation.x = -Math.PI / 2; grass.position.y = 0.05; grass.receiveShadow = true;
    g.add(grass);
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x6e5638, roughness: 1 });
    const r = PITCH / 2 - 0.6;
    for (const [w, d, px, pz, ry] of [
      [PITCH, 0.3, 0, -r, 0], [PITCH, 0.3, 0, r, 0], [0.3, PITCH, -r, 0, 0], [0.3, PITCH, r, 0, 0],
    ]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), fenceMat);
      rail.position.set(px, 0.45, pz);
      rail.castShadow = true;
      g.add(rail);
    }
    const rng = rngFor(CONFIG.seed, 'park', x, z);
    for (let k = 0; k < 7; k++) {
      const tx = (rng() * 2 - 1) * (r - 3), tz = (rng() * 2 - 1) * (r - 3);
      const trunk = new THREE.Mesh(shared.trunkGeo, shared.trunkMat);
      trunk.position.set(tx, 0.85, tz); trunk.castShadow = true;
      const fol = new THREE.Mesh(shared.foliageGeo, new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 0.9 }));
      fol.position.set(tx, 2.4, tz); fol.scale.setScalar(1.4 + rng() * 0.8); fol.castShadow = true;
      g.add(trunk, fol);
    }
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3, 20),
      new THREE.MeshStandardMaterial({ color: 0x3f8fd2, roughness: 0.2, emissive: 0x0a2a4a, emissiveIntensity: 0.3 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(-6, 0.07, 6);
    g.add(pond);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.6), new THREE.MeshStandardMaterial({ color: 0x7a5a36 }));
    bench.position.set(5, 0.45, -6); bench.rotation.y = 0.6; bench.castShadow = true;
    g.add(bench);
    g.position.set(x, 0, z);
    return g;
  }

  buildBar(x, z) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 8), new THREE.MeshStandardMaterial({ color: 0x3e5c46, roughness: 0.9 }));
    box.position.y = 2; box.castShadow = true; box.receiveShadow = true;
    g.add(box);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.5, 8.6), new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.8 }));
    roof.position.y = 4.25; roof.castShadow = true;
    g.add(roof);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.4),
      new THREE.MeshStandardMaterial({ map: makeTextTexture('BAR EL FARO', { bg: '#1d2b1f', fg: '#ffd479', font: 44 }) }));
    sign.position.set(0, 3.2, 4.06);
    g.add(sign);
    const awn = this.makeStripedAwning('#3e5c46', '#e8e0d0', 7, 1.6);
    awn.position.set(0, 2.4, 4.9); awn.rotation.x = -0.5;
    g.add(awn);
    for (const wx of [-3, 3]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), this.windowMat);
      win.position.set(wx, 1.8, 4.06);
      g.add(win);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshStandardMaterial({ color: 0x2c2018 }));
    door.position.set(0, 1.1, 4.05);
    g.add(door);
    g.position.set(x, 0, z);
    return g;
  }

  buildBakery(x, z) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 9), new THREE.MeshStandardMaterial({ color: 0xd9b98a, roughness: 0.9 }));
    box.position.y = 2.25; box.castShadow = true; box.receiveShadow = true;
    g.add(box);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 2, 4), new THREE.MeshStandardMaterial({ color: 0x8a4b3a, roughness: 0.85 }));
    roof.position.y = 5.5; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.85); roof.castShadow = true;
    g.add(roof);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4),
      new THREE.MeshStandardMaterial({ map: makeTextTexture('PANADERÍA LA ESPIGA', { bg: '#5a3a1d', fg: '#ffe9b0', font: 34 }) }));
    sign.position.set(0, 3.6, 4.56);
    g.add(sign);
    const awn = this.makeStripedAwning('#c9842e', '#f2e6d8', 8, 1.6);
    awn.position.set(0, 2.6, 5.3); awn.rotation.x = -0.5;
    g.add(awn);
    for (const wx of [-3.5, 0, 3.5]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), this.windowMat);
      win.position.set(wx, 1.9, 4.56);
      g.add(win);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.4), new THREE.MeshStandardMaterial({ color: 0x4a2f1d }));
    door.position.set(0, 1.2, 4.55);
    g.add(door);
    g.position.set(x, 0, z);
    return g;
  }
}

// ------------------------------------------------------------- traffic ---
// A few cars driving loops on the central avenues so the town feels alive.
function buildCarMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(shared.carBodyGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 }));
  body.position.y = 0.55; body.castShadow = true;
  const cabin = new THREE.Mesh(shared.carCabinGeo, shared.carCabinMat);
  cabin.position.set(0, 0.95, -0.2); cabin.castShadow = true;
  g.add(body, cabin);
  for (const [wx, wz] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) {
    const w = new THREE.Mesh(shared.wheelGeo, shared.wheelMat);
    w.position.set(wx, 0.32, wz);
    g.add(w);
  }
  return g;
}

export class Traffic {
  constructor(scene) {
    this.cars = [];
    const colors = ['#b03a2e', '#2e4a6e', '#c9a24d'];
    const ax = streetCoord(0); // central avenue (constant X line)
    const routes = [
      { axis: 'z', fixed: ax - 3, from: -HALF_Z * PITCH, to: HALF_Z * PITCH, dir: 1 },
      { axis: 'z', fixed: ax + 3, from: HALF_Z * PITCH, to: -HALF_Z * PITCH, dir: -1 },
      { axis: 'x', fixed: ax + 3, from: -HALF_X * PITCH, to: HALF_X * PITCH, dir: 1 },
    ];
    routes.forEach((r, idx) => {
      const mesh = buildCarMesh(colors[idx % colors.length]);
      scene.add(mesh);
      this.cars.push({ mesh, route: r, dist: (idx * 337) % Math.abs(r.to - r.from), speed: 5 + idx });
    });
  }

  update(dtMin) {
    for (const c of this.cars) {
      const r = c.route;
      const len = Math.abs(r.to - r.from);
      c.dist = (c.dist + c.speed * dtMin) % len;
      const along = r.from + (r.dir === 1 ? c.dist : len - c.dist);
      if (r.axis === 'z') {
        c.mesh.position.set(r.fixed, 0, along);
        c.mesh.rotation.y = r.dir === 1 ? 0 : Math.PI;
      } else {
        c.mesh.position.set(along, 0, r.fixed);
        c.mesh.rotation.y = r.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
  }
}

export { HALF_X, HALF_Z };
