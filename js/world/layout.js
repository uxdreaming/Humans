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
  { id: 'bar',    name: 'Bar El Faro',             block: [-2, 1],  kind: 'bar'    },
  { id: 'bakery', name: 'Panadería La Espiga',     block: [1, -1],  kind: 'bakery' },
  { id: 'busstop', name: 'Parada de Autobús',      block: [-1, 0],  kind: 'busstop' },
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
const SPOT_OFFSETS = { plaza: [0, 0], cafe: [0, 9], church: [0, 9], market: [0, -11], park: [0, 0], bar: [0, 8], bakery: [0, 8], busstop: [0, 7] };
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

// ---------------------------------------------------------------- lots ---
// Each block is divided into a 2x2 grid of lots: most get a house, some a garden.
const HOUSE_COLORS = [
  '#e8d5b5', '#d9a066', '#b5c7d9', '#c98f8f', '#a8c686', '#e6c07a',
  '#9d8bc9', '#d97f6a', '#7fb3a0', '#cfc4ae', '#e3b7c6', '#a9b8c9',
];
const ROOF_COLORS = ['#8a4b3a', '#6e4a3a', '#5a4632', '#7a3b3b', '#4a5a6e', '#6b3a4a'];
const APARTMENT_COLORS = ['#9aa0a8', '#b8b0a0', '#8a97a5', '#a8a29a', '#7d8a99'];
const LOT_OFFSETS = [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]];

const lotsCache = new Map();
export function lotsOf(i, j) {
  const key = `${i},${j}`;
  if (lotsCache.has(key)) return lotsCache.get(key);
  let lots = [];
  if (inTown(i, j) && !landmarkAt(i, j)) {
    const rng = rngFor(CONFIG.seed, 'block', i, j);
    for (const [ox, oz] of LOT_OFFSETS) {
      const roll = rng();
      if (roll < 0.08) {
        lots.push({
          kind: 'apartment', ox, oz,
          w: int(rng, 9, 10.5), d: int(rng, 8, 9.5), h: int(rng, 8, 10.5),
          wall: pick(rng, APARTMENT_COLORS), roof: pick(rng, ROOF_COLORS), rotY: 0, chimney: false,
        });
      } else if (roll < 0.95) {
        lots.push({
          kind: 'house', ox, oz,
          w: int(rng, 8, 10.4), d: int(rng, 7, 9.4), h: int(rng, 4, 7),
          wall: pick(rng, HOUSE_COLORS), roof: pick(rng, ROOF_COLORS),
          roofType: pick(rng, ['pyramid', 'gable']),
          rotY: chance(rng, 0.5) ? 0 : Math.PI, chimney: chance(rng, 0.5),
          fence: chance(rng, 0.35),
        });
      } else {
        lots.push({ kind: 'garden', ox, oz, trees: int(rng, 1, 2), bushes: int(rng, 1, 2), fence: true });
      }
    }
  }
  lotsCache.set(key, lots);
  return lots;
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
