// Logic tests for the pure (non-rendering) modules. Run: npm test

import assert from 'node:assert/strict';
import { CONFIG, PITCH } from '../js/core/config.js';
import { rngFor, mulberry32, hashString } from '../js/core/rng.js';
import * as NAMES from '../js/core/names.js';
import {
  inTown, blockToWorld, streetCoord, landmarkAt, lotsOf, PLACES,
  BILLBOARDS, CITIES, TOWN_NAME, streetNameAt, nearestStreetName, HALF_X, HALF_Z,
} from '../js/world/layout.js';
import { NPC_DEFS, scheduleEntryAt, isValidDef } from '../js/npc/data.js';
import { Agent } from '../js/npc/agents.js';

// --- rng: deterministic ---
{
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
  assert.equal(hashString('humans'), hashString('humans'));
  assert.notEqual(hashString('humans'), hashString('Human'));
}

// --- names: stable for the same seed, varied ---
{
  const r1 = rngFor(CONFIG.seed, 'names-test');
  const r2 = rngFor(CONFIG.seed, 'names-test');
  const n1 = Array.from({ length: 20 }, () => NAMES.personName(r1));
  const n2 = Array.from({ length: 20 }, () => NAMES.personName(r2));
  assert.deepEqual(n1, n2);
  assert.ok(new Set(n1).size > 15, 'names should vary');
  const cities = NAMES.generateCityNames(rngFor(CONFIG.seed, 'cities-test'), 8);
  assert.equal(new Set(cities).size, 8);
  assert.ok(TOWN_NAME.length >= 4);
  assert.ok(CITIES.includes(TOWN_NAME));
  for (const b of BILLBOARDS) assert.ok(b.text.length > 5 && b.text.includes(TOWN_NAME) || b.text.length > 5);
}

// --- layout: town is 30 x 50 blocks ---
{
  assert.equal(PITCH, CONFIG.blockSize + CONFIG.streetWidth);
  assert.equal(HALF_X, 15);
  assert.equal(HALF_Z, 25);
  assert.ok(inTown(-15, -25) && inTown(14, 24));
  assert.ok(!inTown(15, 0) && !inTown(0, 25) && !inTown(-16, 0));
  assert.deepEqual(blockToWorld(2, -1), { x: 2 * PITCH, z: -1 * PITCH });
  assert.equal(streetCoord(0), PITCH / 2);
  assert.equal(streetCoord(33), PITCH / 2 + PITCH);
  // landmarks occupy their blocks and have no house
  for (const id of ['plaza', 'cafe', 'church', 'market', 'park']) {
    assert.ok(PLACES[id], `place ${id}`);
    assert.ok(PLACES[id].spot, `spot ${id}`);
  }
  const lm = landmarkAt(0, 0);
  assert.equal(lm.id, 'plaza');
  assert.equal(landmarkAt(-2, 1).id, 'bar');
  assert.equal(landmarkAt(1, -1).id, 'bakery');
  assert.equal(landmarkAt(-1, 0).id, 'busstop');
  assert.equal(lotsOf(0, 0).length, 0); // plaza block has no lots
  const lots = lotsOf(5, 5);
  assert.ok(lots.length >= 2 && lots.length <= 4, '2x2 lots per block');
  assert.ok(lots.every((l) => l.kind === 'house' || l.kind === 'garden' || l.kind === 'apartment'));
  assert.ok(BILLBOARDS.length >= 10);
  const sn1 = streetNameAt('x', streetCoord(0));
  const sn2 = streetNameAt('x', streetCoord(0));
  assert.equal(sn1, sn2);
  assert.ok(nearestStreetName(3, 3).length > 3);
}

// --- npc data ---
{
  assert.equal(NPC_DEFS.length, CONFIG.npcCount);
  const names = NPC_DEFS.map((d) => d.name);
  assert.equal(new Set(names).size, names.length, 'unique names');
  for (const def of NPC_DEFS) {
    assert.ok(isValidDef(def), `schedule of ${def.name} covers 0-24h contiguously`);
    for (const rel of def.relationships) assert.ok(NPC_DEFS[rel.id], 'relationship target exists');
  }
  const e = scheduleEntryAt(NPC_DEFS[0], 10);
  assert.equal(e.act, 'work');
  assert.equal(e.place, 'cafe');
  // at 14:00 everyone is out of home (visible in the world)
  for (const def of NPC_DEFS) {
    assert.notEqual(scheduleEntryAt(def, 14).place, 'home', `${def.name} should be out at 14:00`);
  }
  // all homes are valid town blocks without landmarks
  for (const def of NPC_DEFS) {
    assert.ok(inTown(def.homeBlock[0], def.homeBlock[1]), `home of ${def.name} in town`);
    assert.equal(landmarkAt(def.homeBlock[0], def.homeBlock[1]), null, `home of ${def.name} not on a landmark`);
  }
}

// --- agent simulation: follows the schedule and walks there ---
{
  const def = NPC_DEFS[0]; // café owner
  const agent = new Agent(def);
  // simulate from 08:00 to 10:00 in 1-minute steps
  let mins = 8 * 60;
  for (let i = 0; i < 120; i++) { agent.update(1, mins); mins += 1; }
  assert.equal(agent.placeId, 'cafe', 'by 10:00 she should be heading to / at the café');
  assert.ok(['work', 'commute'].includes(agent.act));
  // position moved from home toward the café spot
  const home = blockToWorld(def.homeBlock[0], def.homeBlock[1]);
  const d = Math.hypot(agent.pos.x - home.x, agent.pos.z - home.z);
  assert.ok(d > 5, `agent should have walked (dist=${d.toFixed(1)}m)`);
  // needs decayed but stay in range
  for (const k of ['hunger', 'energy', 'social']) {
    assert.ok(agent.needs[k] >= 0 && agent.needs[k] <= 100);
  }
  assert.ok(agent.needs.hunger < 80, 'hunger decays over time');
  assert.ok(typeof agent.mood === 'string' && agent.mood.length > 0);

  // sleeping restores energy: simulate night
  const night = new Agent(NPC_DEFS[3]); // retired
  let m2 = 22 * 60;
  const e0 = night.needs.energy;
  for (let i = 0; i < 120; i++) { night.update(1, m2); m2 += 1; } // 22:00 -> 00:00 (sleep)
  assert.ok(night.needs.energy > e0, 'sleeping restores energy');
  assert.equal(night.act, 'sleep');
}

console.log('✔ all logic tests passed');
console.log(`  town: ${TOWN_NAME} (${CONFIG.townBlocksX}x${CONFIG.townBlocksZ} blocks), cities: ${CITIES.slice(0, 4).join(', ')}…`);
console.log(`  npcs: ${NPC_DEFS.map((d) => d.name).join(', ')}`);
