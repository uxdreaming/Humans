// Tests for the enterable-interior specs (pure data, no three.js). Run: npm test

import assert from 'node:assert/strict';
import { INTERIOR_SPECS, INTERIOR_KINDS, ENTERABLE, DOOR, clampInterior, doorInsidePos } from '../js/world/interiorSpecs.js';

// every enterable landmark kind has a room, plus homes and apartments
for (const kind of ENTERABLE) assert.ok(INTERIOR_SPECS[kind], `interior spec for ${kind}`);
assert.ok(INTERIOR_SPECS.home, 'home interior');
assert.ok(INTERIOR_SPECS.apartment, 'apartment interior');
assert.equal(INTERIOR_KINDS.length, Object.keys(INTERIOR_SPECS).length);

for (const [kind, spec] of Object.entries(INTERIOR_SPECS)) {
  assert.ok(spec.w >= 6 && spec.d >= 5 && spec.h >= 2.5, `${kind}: sane room size`);
  assert.equal(DOOR.side, 'z+');

  // furniture stays inside the walls
  for (const f of spec.furniture) {
    assert.ok(Math.abs(f.x) + f.w / 2 <= spec.w / 2 + 1e-9, `${kind}: furniture x inside (${f.x})`);
    assert.ok(Math.abs(f.z) + f.d / 2 <= spec.d / 2 + 1e-9, `${kind}: furniture z inside (${f.z})`);
    assert.ok(f.h > 0 && f.h <= spec.h, `${kind}: furniture height sane`);
  }

  // the door corridor (in front of the +z door gap) must stay walkable
  const corridor = { x0: -1.0, z0: spec.d / 2 - 1.8, x1: 1.0, z1: spec.d / 2 };
  for (const f of spec.furniture) {
    if (f.noCollide) continue;
    const overlap = !(f.x + f.w / 2 <= corridor.x0 || f.x - f.w / 2 >= corridor.x1
      || f.z + f.d / 2 <= corridor.z0 || f.z - f.d / 2 >= corridor.z1);
    assert.ok(!overlap, `${kind}: furniture at (${f.x},${f.z}) blocks the door corridor`);
  }

  // clampInterior keeps positions inside the room and out of furniture
  const spawn = doorInsidePos(spec);
  const p = clampInterior({ ...spawn }, spec, 0.4);
  assert.ok(Math.abs(p.x) <= spec.w / 2 - 0.4 + 1e-9, `${kind}: clamp x in bounds`);
  assert.ok(Math.abs(p.z) <= spec.d / 2 - 0.4 + 1e-9, `${kind}: clamp z in bounds`);
  for (let i = 0; i < 200; i++) {
    const q = clampInterior({ x: (Math.random() * 2 - 1) * spec.w, z: (Math.random() * 2 - 1) * spec.d }, spec, 0.4);
    assert.ok(Math.abs(q.x) <= spec.w / 2 - 0.4 + 1e-9, `${kind}: random clamp x`);
    assert.ok(Math.abs(q.z) <= spec.d / 2 - 0.4 + 1e-9, `${kind}: random clamp z`);
    for (const f of spec.furniture) {
      if (f.noCollide) continue;
      const inside = q.x > f.x - f.w / 2 + 0.4 - 1e-9 && q.x < f.x + f.w / 2 - 0.4 + 1e-9
        && q.z > f.z - f.d / 2 + 0.4 - 1e-9 && q.z < f.z + f.d / 2 - 0.4 + 1e-9;
      assert.ok(!inside, `${kind}: clamped point inside furniture at (${f.x},${f.z})`);
    }
  }
}

console.log('interior.test.mjs: OK');
