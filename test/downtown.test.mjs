// Tests for the neon downtown core (v0.8.0). Run: npm test

import assert from 'node:assert/strict';
import { inDowntown, DOWNTOWN, DISTRICT_NAME, lotsOf, BILLBOARDS, landmarkAt } from '../js/world/layout.js';
import { neonCityName } from '../js/core/names.js';
import { rngFor } from '../js/core/rng.js';
import { CONFIG, PITCH } from '../js/core/config.js';

// --- downtown bounds ---
assert.ok(inDowntown(0, 0));
assert.ok(inDowntown(DOWNTOWN, -DOWNTOWN));
assert.ok(!inDowntown(DOWNTOWN + 1, 0));
assert.ok(!inDowntown(0, DOWNTOWN + 1));

// --- district name is generated, fictional and deterministic ---
assert.ok(DISTRICT_NAME.length >= 4, 'district name exists');
assert.equal(DISTRICT_NAME, neonCityName(rngFor(CONFIG.seed, 'district')), 'district name is seeded');
assert.ok(!['Tokyo', 'Osaka', 'Kyoto'].includes(DISTRICT_NAME), 'never a real city name');

// --- downtown blocks: valid lots, towers present, no empty lots ---
{
  let apartments = 0;
  const kinds = new Set();
  for (let i = -DOWNTOWN; i <= DOWNTOWN; i++) {
    for (let j = -DOWNTOWN; j <= DOWNTOWN; j++) {
      if (landmarkAt(i, j)) continue;
      const lots = lotsOf(i, j);
      assert.ok(lots.length >= 2 && lots.length <= 4, `block ${i},${j}: 2-4 lots`);
      for (const l of lots) {
        kinds.add(l.kind);
        assert.ok(['house', 'apartment', 'garden'].includes(l.kind), `downtown lot kind ${l.kind}`);
        assert.ok(!('empty' === l.kind), 'no empty lots downtown');
        // built lots must fit inside the block (sidewalk starts at blockSize/2 = 11)
        if (l.w != null) {
          assert.ok(Math.abs(l.ox) + l.w / 2 <= CONFIG.blockSize / 2 + 1e-9, `lot w fits block (${i},${j})`);
          assert.ok(Math.abs(l.oz) + l.d / 2 <= CONFIG.blockSize / 2 + 1e-9, `lot d fits block (${i},${j})`);
        }
        if (l.kind === 'apartment') apartments++;
      }
    }
  }
  assert.ok(apartments > 10, `downtown has towers (apartments: ${apartments})`);
  assert.ok(kinds.has('apartment') && kinds.has('house'), 'downtown mixes towers and houses');
}

// --- outskirts unchanged: still houses/gardens, may include empty ---
{
  const lots = lotsOf(20, 20);
  assert.ok(lots.length >= 2 && lots.length <= 4);
  for (const l of lots) assert.ok(['house', 'apartment', 'garden', 'empty'].includes(l.kind));
}

// --- denser billboards around the centre ---
{
  const central = BILLBOARDS.filter((b) => Math.abs(b.x) <= 12 * PITCH || Math.abs(b.z) <= 12 * PITCH);
  assert.ok(central.length >= 10, `dense central ads (got ${central.length})`);
  assert.ok(BILLBOARDS.length >= 10);
  for (const b of BILLBOARDS) assert.ok(b.text.length > 5, 'ad text generated');
}

console.log('downtown.test.mjs: OK');
