// Tests for the pure roof geometry data + roof layout math. Run: npm test

import assert from 'node:assert/strict';
import { HIP_ROOF, GABLE_ROOF, roofHeight, roofPlan } from '../js/world/roofGeo.js';

// --- geometry sanity: finite vertices, indices in range, apex/ridge at y=1, base at y=0 ---
for (const [name, g] of [['hip', HIP_ROOF], ['gable', GABLE_ROOF]]) {
  const n = g.positions.length / 3;
  assert.ok(n >= 5, `${name}: enough vertices`);
  for (const v of g.positions) assert.ok(Number.isFinite(v), `${name}: finite`);
  for (const i of g.indices) assert.ok(i >= 0 && i < n, `${name}: index in range`);
  const ys = g.positions.filter((_, i) => i % 3 === 1);
  assert.ok(ys.includes(1), `${name}: apex/ridge at y=1`);
  assert.ok(ys.every((y) => y === 0 || y === 1), `${name}: base y=0, top y=1`);
  const xs = g.positions.filter((_, i) => i % 3 === 0);
  const zs = g.positions.filter((_, i) => i % 3 === 2);
  assert.ok(Math.max(...xs.map(Math.abs)) === 1 && Math.max(...zs.map(Math.abs)) === 1, `${name}: unit half-extents`);
}

// --- roofPlan: every plan covers the house footprint (with overhang) ---
const house = { x: 10, z: 20, w: 8, d: 6, h: 5, rotY: 0 };

let p = roofPlan({ ...house, roofType: 'pyramid' });
assert.equal(p.kind, 'hip');
assert.equal(p.pos[1], house.h + 0.01, 'hip base sits on top of the walls');
assert.ok(p.scale[0] > house.w / 2 && p.scale[2] > house.d / 2, 'hip overhangs the footprint');

const deepHouse = { ...house, w: 6, d: 8 }; // deeper than wide: ridge along z, no rotation
p = roofPlan({ ...deepHouse, roofType: 'gable' });
assert.equal(p.kind, 'gable');
assert.equal(p.rotY, 0, 'ridge along z when deeper than wide');
assert.ok(p.scale[0] > deepHouse.w / 2 && p.scale[2] > deepHouse.d / 2, 'gable covers footprint (ridge along z)');

const wide = roofPlan({ ...house, w: 10, d: 5, roofType: 'gable' });
assert.ok(Math.abs(wide.rotY - Math.PI / 2) < 1e-9, 'wider house: ridge rotated along x');
assert.ok(wide.scale[2] > 10 / 2 && wide.scale[0] > 5 / 2, 'rotated gable still covers');

const deep = roofPlan({ ...house, w: 5, d: 10, roofType: 'gable' });
assert.equal(deep.rotY, 0, 'deeper house: ridge along z');
assert.ok(deep.scale[0] > 5 / 2 && deep.scale[2] > 10 / 2, 'deep gable covers');

p = roofPlan({ ...house, apartment: true });
assert.equal(p.kind, 'flat', 'apartments get a flat slab roof');
assert.ok(p.scale[0] > house.w / 2 && p.scale[2] > house.d / 2, 'flat slab overhangs');

// rotated houses keep their yaw
p = roofPlan({ ...house, roofType: 'pyramid', rotY: Math.PI });
assert.equal(p.rotY, Math.PI, 'house yaw preserved on the roof');

// --- roofHeight is proportional and clamped ---
assert.ok(roofHeight(4, 4) >= 1.1, 'min height clamp');
assert.ok(roofHeight(40, 40) <= 3.4, 'max height clamp');
assert.ok(roofHeight(10, 10) > roofHeight(6, 6), 'bigger roof is taller');

console.log('roof.test.mjs: OK');
