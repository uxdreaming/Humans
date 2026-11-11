// Pure world layout: block grid, streets, landmarks, generated names.
// No three.js here, so this module can be unit-tested in Node.

import { CONFIG, PITCH } from '../core/config.js';
import { rngFor, pick, int, chance } from '../core/rng.js';
import * as NAMES from '../core/names.js';

export const HALF_X = CONFIG.townBlocksX >> 1; // 15  -> i in [-15, 14]
export const HALF_Z = CONFIG.townBlocksZ >> 1; // 25  -> j in [-25, 24]

export const inTown = (i, j) => i >= -HALF_X && i < HALF_X && j >= -HALF_Z && j < HALF_Z;
export const blockToWorld = (i, j) => ({ x: i * PITCH, z: j * PITCH });
export const worldToBlock = (x, z) => ({ i: Math.round(x / PITCH), j: Math.round(z / PITCH) });

// Street centre lines sit halfway between block centres.
export const streetCoord = (v) => (Math.round(v / PITCH - 0.5) + 0.5) * PITCH;

// ---------------------------------------------------------------- cities ---
const cityRng = rngFor(CONFIG.seed, 'cities');
export const CITIES = NAMES.generateCityNames(cityRng, 12);
export const TOWN_NAME = CITIES[0]; // the starting town

// ------------------------------------------------------------- landmarks ---
// Fixed, recognisable places of the starting town (block coords i, j).
export const LANDMARKS = [
  { id: 'plaza',  name: 'Plaza Mayor',             block: [0, 0],   kind: 'plaza'  },
  { id: 'cafe',   name: 'Café La Esquina',         block: [-1, 1],  kind: 'cafe'   },
  { id: 'church', name: 'Iglesia de Santa Vera',   block: [2, 0],   kind: 'church' },
  { id: 'market', name: 'Supermercado El Centro',  block: [3, -1],  kind: 'market' },
  { id: 'park',   name: 'Parque del Nogal',        block: [-2, -2], kind: 'park'   },
];

const landmarkByBlock = new Map(LANDMARKS.map((l) => [`${l.block[0]},${l.block[1]}`, l]));
export const landmarkAt = (i, j) => landmarkByBlock.get(`${i},${j}`) || null;

// Runtime places used by agents / UI: id -> { name, kind, x, z, size }
export const PLACES = {};
for (const l of LANDMARKS) {
  const { x, z } = blockToWorld(l.block[0], l.block[1]);
  PLACES[l.id] = { id: l.id, name: l.name, kind: l.kind, x, z, size: l.kind === 'plaza' || l.kind === 'park' ? PITCH : 0 };
}

// Where an NPC stands when "at" a place (in front of the building, not inside).
const SPOT_OFFSETS = { plaza: [0, 0], cafe: [0, 9], church: [0, 9], market: [0, -11], park: [0, 0] };
for (const id of Object.keys(PLACES)) {
  const [dx, dz] = SPOT_OFFSETS[id] || [0, 0];
  PLACES[id].spot = { x: PLACES[id].x + dx, z: PLACES[id].z + dz };
}

// --------------------------------------------------------------- streets ---
const streetNameCache = new Map();
// axis 'x': street line of constant X (runs along Z). axis 'z': constant Z line.
export function streetNameAt(axis, v) {
  const k = Math.round(v / PITCH - 0.5);
  const key = `${axis}:${k}`;
  if (!streetNameCache.has(key)) {
    streetNameCache.set(key, NAMES.streetName(rngFor(CONFIG.seed, 'street', axis, k), axis));
  }
  return streetNameCache.get(key);
}

export function nearestStreetName(x, z) {
  const dx = Math.abs(x - streetCoord(x));
  const dz = Math.abs(z - streetCoord(z));
  return dx <= dz ? streetNameAt('x', streetCoord(x)) : streetNameAt('z', streetCoord(z));
}

// ------------------------------------------------------------ billboards ---
// Billboards line the two central avenues (x = streetCoord(0) and z = streetCoord(0)).
export const BILLBOARDS = [];
{
  const ax = streetCoord(0);
  for (let j = -HALF_Z; j < HALF_Z; j += 4) {
    BILLBOARDS.push({
      x: ax - CONFIG.streetWidth / 2 - 1.4, z: j * PITCH, ry: Math.PI / 2,
      text: NAMES.billboardText(rngFor(CONFIG.seed, 'ad', 'x', j), TOWN_NAME),
    });
  }
  for (let i = -HALF_X + 1; i < HALF_X; i += 5) {
    BILLBOARDS.push({
      x: i * PITCH, z: ax - CONFIG.streetWidth / 2 - 1.4, ry: 0,
      text: NAMES.billboardText(rngFor(CONFIG.seed, 'ad', 'z', i), TOWN_NAME),
    });
  }
}

// ---------------------------------------------------------------- houses ---
const HOUSE_COLORS = [
  '#e8d5b5', '#d9a066', '#b5c7d9', '#c98f8f', '#a8c686', '#e6c07a',
  '#9d8bc9', '#d97f6a', '#7fb3a0', '#cfc4ae', '#e3b7c6', '#a9b8c9',
];
const ROOF_COLORS = ['#8a4b3a', '#6e4a3a', '#5a4632', '#7a3b3b', '#4a5a6e', '#6b3a4a'];

const houseCache = new Map();
export function houseSpec(i, j) {
  const key = `${i},${j}`;
  if (houseCache.has(key)) return houseCache.get(key);
  let spec = null;
  if (inTown(i, j) && !landmarkAt(i, j)) {
    const rng = rngFor(CONFIG.seed, 'house', i, j);
    spec = {
      w: int(rng, 8, 13),
      d: int(rng, 7, 11),
      h: int(rng, 4, 7),
      wall: pick(rng, HOUSE_COLORS),
      roof: pick(rng, ROOF_COLORS),
      rotY: chance(rng, 0.5) ? 0 : Math.PI,
      trees: int(rng, 0, 2),
    };
  }
  houseCache.set(key, spec);
  return spec;
}

// ------------------------------------------------------------ stroll spots ---
export function randomSpotIn(placeId, rng) {
  const p = PLACES[placeId];
  if (!p) return { x: 0, z: 0 };
  if (p.kind === 'plaza' || p.kind === 'park') {
    const r = p.size / 2 - 4;
    return { x: p.x + (rng() * 2 - 1) * r, z: p.z + (rng() * 2 - 1) * r };
  }
  return { x: p.x, z: p.z };
}
