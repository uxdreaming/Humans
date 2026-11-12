// Pure world layout: block grid, streets, landmarks, generated names.
// No three.js here, so this module can be unit-tested in Node.

import { CONFIG, PITCH } from '../core/config.js';
import { rngFor, pick, int, chance } from '../core/rng.js';
import * as NAMES from '../core/names.js';

// Neon downtown core: blocks with |i|,|j| <= DOWNTOWN get towers and denser ads.
export const DOWNTOWN = 6;
export const inDowntown = (i, j) => Math.abs(i) <= DOWNTOWN && Math.abs(j) <= DOWNTOWN;

// Generated fictional name of the downtown district (shown in the HUD).
export const DISTRICT_NAME = NAMES.neonCityName(rngFor(CONFIG.seed, 'district'));

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
  { id: 'gas',     name: 'Gasolinera',             block: [4, -2],  kind: 'gas' },
  { id: 'townhall', name: 'Ayuntamiento',          block: [5, 2],   kind: 'townhall' },
  { id: 'school',  name: 'Escuela',                block: [-5, 2],  kind: 'school' },
  { id: 'plaza2',  name: 'Plaza del Mercado',      block: [-4, -3], kind: 'plaza2' },
];

// building footprint half-sizes for collision (plazas/park/busstop are walkable)
export const LANDMARK_SIZES = {
  cafe: [7.5, 5.5], church: [6.5, 9], market: [12.5, 7.5], bar: [5.5, 4.5],
  bakery: [6.5, 5], gas: [8.5, 5.5], townhall: [7.5, 6], school: [9.5, 6.5],
};
export function landmarkRects() {
  const out = [];
  for (const l of LANDMARKS) {
    const s = LANDMARK_SIZES[l.id];
    if (!s) continue;
    const p = PLACES[l.id];
    out.push({ x0: p.x - s[0], z0: p.z - s[1], x1: p.x + s[0], z1: p.z + s[1] });
  }
  return out;
}

const landmarkByBlock = new Map(LANDMARKS.map((l) => [`${l.block[0]},${l.block[1]}`, l]));
export const landmarkAt = (i, j) => landmarkByBlock.get(`${i},${j}`) || null;

// Runtime places used by agents / UI: id -> { name, kind, x, z, size }
export const PLACES = {};
for (const l of LANDMARKS) {
  const { x, z } = blockToWorld(l.block[0], l.block[1]);
  PLACES[l.id] = { id: l.id, name: l.name, kind: l.kind, x, z, size: (l.kind === 'plaza' || l.kind === 'park' || l.kind === 'plaza2') ? PITCH : 0 };
}

// Where an NPC stands when "at" a place (in front of the building, not inside).
const SPOT_OFFSETS = { plaza: [0, 0], cafe: [0, 9], church: [0, 9], market: [0, -11], park: [0, 0], bar: [0, 8], bakery: [0, 8], busstop: [0, 7], gas: [0, 11], townhall: [0, 8], school: [0, 10], plaza2: [0, 0] };
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
  for (let j = -HALF_Z; j < HALF_Z; j += (Math.abs(j) <= 12 ? 2 : 4)) {
    BILLBOARDS.push({
      x: ax - CONFIG.streetWidth / 2 - 1.4, z: j * PITCH, ry: Math.PI / 2,
      text: NAMES.billboardText(rngFor(CONFIG.seed, 'ad', 'x', j), TOWN_NAME),
    });
  }
  for (let i = -HALF_X + 1; i < HALF_X; i += (Math.abs(i) <= 12 ? 2 : 5)) {
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
  '#e0b7b0', '#b7d9c9', '#d9c98f', '#a8b8e0', '#c9a8b8', '#8fc9c0',
];
const ROOF_COLORS = ['#8a4b3a', '#6e4a3a', '#5a4632', '#7a3b3b', '#4a5a6e', '#6b3a4a', '#3a5a4a', '#7a5a2e', '#54334f', '#2e4a5a'];
const APARTMENT_COLORS = ['#9aa0a8', '#b8b0a0', '#8a97a5', '#a8a29a', '#7d8a99', '#6e7d8a', '#a89a8a', '#8a8fa8'];
const LOT_OFFSETS = [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]];

const lotsCache = new Map();
export function lotsOf(i, j) {
  const key = `${i},${j}`;
  if (lotsCache.has(key)) return lotsCache.get(key);
  let lots = [];
  if (inTown(i, j) && !landmarkAt(i, j)) {
    const rng = rngFor(CONFIG.seed, 'block', i, j);
    const dt = inDowntown(i, j);
    for (const [ox, oz] of LOT_OFFSETS) {
      const roll = rng();
      if (dt && roll < 0.30) {
        // downtown: tall apartment towers
        lots.push({
          kind: 'apartment', ox, oz,
          w: int(rng, 9, 10.5), d: int(rng, 8, 10), h: int(rng, 10, 26),
          wall: pick(rng, APARTMENT_COLORS), roof: pick(rng, ROOF_COLORS), rotY: 0, chimney: false, fence: chance(rng, 0.3),
        });
      } else if (dt && roll < 0.93) {
        // downtown: smaller, denser houses between the towers
        lots.push({
          kind: 'house', ox, oz,
          w: int(rng, 6, 8.5), d: int(rng, 5.5, 8), h: int(rng, 3.6, 6),
          wall: pick(rng, HOUSE_COLORS), roof: pick(rng, ROOF_COLORS),
          roofType: pick(rng, ['pyramid', 'gable']),
          rotY: chance(rng, 0.5) ? 0 : Math.PI, chimney: chance(rng, 0.5),
          fence: chance(rng, 0.4),
        });
      } else if (dt) {
        lots.push({ kind: 'garden', ox, oz, trees: int(rng, 1, 3), bushes: int(rng, 1, 2), fence: true });
      } else if (roll < 0.06) {
        lots.push({
          kind: 'apartment', ox, oz,
          w: int(rng, 9, 12), d: int(rng, 8, 11), h: int(rng, 8, 15),
          wall: pick(rng, APARTMENT_COLORS), roof: pick(rng, ROOF_COLORS), rotY: 0, chimney: false, fence: true,
        });
      } else if (roll < 0.90) {
        // house smaller than its lot so neighbouring houses read as separate
        lots.push({
          kind: 'house', ox, oz,
          w: int(rng, 6.5, 10), d: int(rng, 6, 9.5), h: int(rng, 3.6, 8.5),
          wall: pick(rng, HOUSE_COLORS), roof: pick(rng, ROOF_COLORS),
          roofType: pick(rng, ['pyramid', 'gable']),
          rotY: chance(rng, 0.5) ? 0 : Math.PI, chimney: chance(rng, 0.7),
          fence: chance(rng, 0.6),
        });
      } else if (roll < 0.96) {
        lots.push({ kind: 'garden', ox, oz, trees: int(rng, 1, 3), bushes: int(rng, 1, 2), fence: true });
      } else {
        lots.push({ kind: 'empty', ox, oz });
      }
    }
  }
  lotsCache.set(key, lots);
  return lots;
}

// ---------------------------------------------------------------- benches ---
// World positions of sit spots (match the 3D builders in town.js).
export const BENCHES = {
  plaza: [0, 1, 2, 3].map((k) => {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    return { x: Math.cos(a) * 6.5, z: Math.sin(a) * 6.5 };
  }),
  plaza2: [0, 1, 2, 3].map((k) => {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    return { x: PLACES.plaza2.x + Math.cos(a) * 6.5, z: PLACES.plaza2.z + Math.sin(a) * 6.5 };
  }),
  park: [{ x: PLACES.park.x + 5, z: PLACES.park.z - 6 }],
};

// ------------------------------------------------------------- cars for sale ---
// Parked at the gas station and the supermarket parking lot.
export const CAR_SPECS = [
  { id: 'car_red', price: 150, color: '#b03a2e', pos: { x: 4 * PITCH + 7, z: -2 * PITCH + 7 }, rotY: Math.PI / 2 },
  { id: 'car_blue', price: 260, color: '#2e4a6e', pos: { x: 4 * PITCH + 11, z: -2 * PITCH + 8 }, rotY: Math.PI / 2 },
  { id: 'car_gold', price: 420, color: '#c9a24d', pos: { x: 96 - 8, z: -32 - 15 }, rotY: 0 },
];

// --------------------------------------------------------- work stations ---
// Interactive spots at the supermarket (stage 2 work tasks).
export const STATIONS = {
  market: [
    { id: 'shelvesA', task: 'restock', off: [-8, -7] },
    { id: 'shelvesB', task: 'restock', off: [8, -7] },
    { id: 'counter', task: 'serve', off: [0, 11] },
    { id: 'storage', task: 'organize', off: [0, -14] },
    { id: 'parking', task: 'clean', off: [-6, -16] },
  ],
};
export function stationWorld(placeId, st) {
  const p = PLACES[placeId];
  return { x: p.x + st.off[0], z: p.z + st.off[1] };
}

// ------------------------------------------------------------ stroll spots ---
export function randomSpotIn(placeId, rng) {
  const p = PLACES[placeId];
  if (!p) return { x: 0, z: 0 };
  if (p.kind === 'plaza' || p.kind === 'park' || p.kind === 'plaza2') {
    const r = p.size / 2 - 4;
    return { x: p.x + (rng() * 2 - 1) * r, z: p.z + (rng() * 2 - 1) * r };
  }
  return { x: p.x, z: p.z };
}
