// Pure interior room specs (no three.js here, so this module is unit-testable).
// Each room lives in its own "slot" far outside the town (see interior.js) and
// is entered from a landmark door or a house front door.
//
// Room local coords: origin at the room centre, x in [-w/2, w/2],
// z in [-d/2, d/2]. The door gap is on the +z wall (DOOR).

export const DOOR = { side: 'z+', w: 1.8, h: 2.3 };

// landmark kinds that have an enterable building
export const ENTERABLE = new Set(['cafe', 'church', 'market', 'bar', 'bakery', 'gas', 'townhall', 'school']);

// furniture item: { x, z, w, d, h, c, shape: 'box'|'cyl', noCollide? }
export const INTERIOR_SPECS = {
  home: {
    w: 10, d: 8, h: 3, wall: 0xe8d5b5, floor: 0x8a6a4a, ceil: 0xf5f0e6, light: 0xffe0b3,
    furniture: [
      { x: -3.4, z: -2.6, w: 2.0, d: 2.2, h: 0.55, c: 0x8a5a3a, shape: 'box' },
      { x: 3.4, z: -3.2, w: 1.6, d: 0.7, h: 2.1, c: 0x6e4a3a, shape: 'box' },
      { x: 0.5, z: -2.8, w: 1.4, d: 0.9, h: 0.75, c: 0x9a7a52, shape: 'box' },
      { x: 0, z: 0.5, w: 3.0, d: 2.0, h: 0.04, c: 0xb03a2e, shape: 'box', noCollide: true },
      { x: 3.0, z: 3.1, w: 1.8, d: 0.5, h: 0.5, c: 0x222831, shape: 'box' },
      { x: -4.2, z: 3.0, w: 0.6, d: 0.6, h: 1.1, c: 0x4a7a3a, shape: 'cyl' },
    ],
  },
  apartment: {
    w: 8, d: 6.5, h: 2.8, wall: 0xb8b0a0, floor: 0x7a6a55, ceil: 0xece6da, light: 0xffd9a0,
    furniture: [
      { x: -2.8, z: -2.0, w: 1.8, d: 2.0, h: 0.5, c: 0x5a6e8a, shape: 'box' },
      { x: 0, z: -2.4, w: 2.4, d: 0.9, h: 1.0, c: 0x8a5a3a, shape: 'box' },
      { x: 2.8, z: 0.5, w: 1.8, d: 1.0, h: 0.8, c: 0x4d6e5a, shape: 'box' },
      { x: -3.2, z: 1.2, w: 0.8, d: 3.0, h: 0.9, c: 0x777d88, shape: 'box' },
    ],
  },
  cafe: {
    w: 12, d: 8, h: 3.2, wall: 0xd9b98a, floor: 0x6e5138, ceil: 0xf0e2c8, light: 0xffd9a8,
    furniture: [
      { x: 0, z: -2.6, w: 5.0, d: 1.2, h: 1.1, c: 0x5a4632, shape: 'box' },
      { x: -1.2, z: -2.6, w: 0.9, d: 0.9, h: 0.9, c: 0x2e2a26, shape: 'box' },
      { x: -3.2, z: 1.2, w: 1.1, d: 1.1, h: 0.75, c: 0x9a7a52, shape: 'cyl' },
      { x: -1.6, z: 1.8, w: 1.1, d: 1.1, h: 0.75, c: 0x9a7a52, shape: 'cyl' },
      { x: 3.2, z: 1.2, w: 1.1, d: 1.1, h: 0.75, c: 0x9a7a52, shape: 'cyl' },
      { x: -3.2, z: -0.6, w: 1.1, d: 1.1, h: 0.75, c: 0x9a7a52, shape: 'cyl' },
      { x: 5.0, z: -2.5, w: 1.2, d: 2.5, h: 2.0, c: 0x7a3b3b, shape: 'box' },
    ],
  },
  market: {
    w: 16, d: 10, h: 3.6, wall: 0xdfe5ea, floor: 0x9aa0a8, ceil: 0xf2f4f6, light: 0xeaf4ff,
    furniture: [
      { x: -4.5, z: -1.0, w: 6.0, d: 1.0, h: 2.0, c: 0xb03a2e, shape: 'box' },
      { x: 2.5, z: -2.0, w: 6.0, d: 1.0, h: 2.0, c: 0x2e6e4d, shape: 'box' },
      { x: -1.0, z: 1.8, w: 5.0, d: 1.0, h: 2.0, c: 0xc9a24d, shape: 'box' },
      { x: -4.5, z: 4.0, w: 5.0, d: 1.2, h: 1.1, c: 0x3a3f4a, shape: 'box' },
      { x: 6.5, z: -3.5, w: 1.4, d: 1.0, h: 2.1, c: 0x8a97a5, shape: 'box' },
      { x: 6.8, z: 3.8, w: 1.4, d: 1.0, h: 2.1, c: 0x8a97a5, shape: 'box' },
    ],
  },
  bar: {
    w: 10, d: 7, h: 3, wall: 0x4a3628, floor: 0x3a2a1e, ceil: 0x2e2018, light: 0xffb066,
    furniture: [
      { x: 0, z: -2.2, w: 5.0, d: 1.3, h: 1.15, c: 0x5a4632, shape: 'box' },
      { x: -3.8, z: -2.8, w: 2.0, d: 0.6, h: 2.0, c: 0x6e4a2a, shape: 'box' },
      { x: 3.8, z: -2.8, w: 2.0, d: 0.6, h: 2.0, c: 0x6e4a2a, shape: 'box' },
      { x: -2.5, z: 1.4, w: 1.1, d: 1.1, h: 0.75, c: 0x7a5a3a, shape: 'cyl' },
      { x: 2.0, z: 2.0, w: 1.1, d: 1.1, h: 0.75, c: 0x7a5a3a, shape: 'cyl' },
      { x: 3.0, z: 0.8, w: 1.1, d: 1.1, h: 0.75, c: 0x7a5a3a, shape: 'cyl' },
    ],
  },
  bakery: {
    w: 10, d: 8, h: 3.2, wall: 0xf0e0c0, floor: 0xc9b090, ceil: 0xf8efdc, light: 0xffd9a8,
    furniture: [
      { x: -3.6, z: -3.0, w: 2.0, d: 1.5, h: 1.2, c: 0x8a8a8a, shape: 'box' },
      { x: 0, z: -2.5, w: 4.0, d: 1.1, h: 1.05, c: 0xb08a4d, shape: 'box' },
      { x: 4.0, z: -2.0, w: 1.2, d: 3.0, h: 2.0, c: 0x9a7a52, shape: 'box' },
      { x: 0, z: 1.5, w: 1.4, d: 1.0, h: 0.75, c: 0x9a7a52, shape: 'box' },
      { x: -3.5, z: 2.5, w: 1.8, d: 0.8, h: 0.9, c: 0xc9a24d, shape: 'box' },
    ],
  },
  gas: {
    w: 9, d: 7, h: 3, wall: 0xe8e4da, floor: 0xb8b4aa, ceil: 0xf4f2ec, light: 0xeaf4ff,
    furniture: [
      { x: 0, z: -1.6, w: 3.0, d: 1.0, h: 1.1, c: 0xc0392b, shape: 'box' },
      { x: -3.2, z: -2.4, w: 1.5, d: 2.0, h: 2.0, c: 0x8a97a5, shape: 'box' },
      { x: 3.2, z: -2.4, w: 1.5, d: 2.0, h: 2.0, c: 0x8a97a5, shape: 'box' },
      { x: -2.5, z: 1.8, w: 1.6, d: 0.7, h: 0.9, c: 0x3a3f4a, shape: 'box' },
    ],
  },
  townhall: {
    w: 12, d: 9, h: 3.4, wall: 0xd8d2c0, floor: 0x8a7a5a, ceil: 0xf0ead8, light: 0xfff0d0,
    furniture: [
      { x: 0, z: -3.4, w: 2.6, d: 1.2, h: 1.1, c: 0x5a4632, shape: 'box' },
      { x: 0, z: -1.6, w: 1.0, d: 0.6, h: 0.85, c: 0x6e4a3a, shape: 'box' },
      { x: 3.6, z: -3.4, w: 0.3, d: 0.3, h: 2.2, c: 0xc9a24d, shape: 'cyl' },
      { x: -4.0, z: 0.5, w: 3.6, d: 1.0, h: 1.05, c: 0x7a6a52, shape: 'box' },
      { x: 4.5, z: 1.5, w: 1.6, d: 1.6, h: 0.9, c: 0x8a5a3a, shape: 'box' },
    ],
  },
  school: {
    w: 14, d: 10, h: 3.2, wall: 0xe4e0d0, floor: 0xa8926a, ceil: 0xf4f0e2, light: 0xf4f8ff,
    furniture: [
      { x: 0, z: -4.6, w: 6.0, d: 0.3, h: 1.4, c: 0x2e4a3a, shape: 'box', noCollide: true },
      { x: -3.0, z: -1.5, w: 1.2, d: 0.8, h: 0.75, c: 0x9a7a52, shape: 'box' },
      { x: -1.0, z: -1.5, w: 1.2, d: 0.8, h: 0.75, c: 0x9a7a52, shape: 'box' },
      { x: -3.0, z: 0.8, w: 1.2, d: 0.8, h: 0.75, c: 0x9a7a52, shape: 'box' },
      { x: -1.0, z: 0.8, w: 1.2, d: 0.8, h: 0.75, c: 0x9a7a52, shape: 'box' },
      { x: 3.0, z: -3.4, w: 1.8, d: 1.0, h: 0.9, c: 0x5a4632, shape: 'box' },
      { x: 6.0, z: -1.0, w: 1.0, d: 3.0, h: 2.0, c: 0xb08a4d, shape: 'box' },
    ],
  },
  church: {
    w: 12, d: 14, h: 5, wall: 0xe8e2d2, floor: 0xb8a88a, ceil: 0xd8d2c0, light: 0xffe8c0,
    furniture: [
      { x: 0, z: -6.0, w: 3.0, d: 1.2, h: 1.2, c: 0xf0ead8, shape: 'box' },
      { x: -0.6, z: -6.1, w: 0.25, d: 0.25, h: 0.5, c: 0xffd479, shape: 'cyl' },
      { x: 0.6, z: -6.1, w: 0.25, d: 0.25, h: 0.5, c: 0xffd479, shape: 'cyl' },
      { x: -2.8, z: -3.0, w: 2.4, d: 0.6, h: 1.0, c: 0x6e4a3a, shape: 'box' },
      { x: 2.8, z: -3.0, w: 2.4, d: 0.6, h: 1.0, c: 0x6e4a3a, shape: 'box' },
      { x: -2.8, z: -0.6, w: 2.4, d: 0.6, h: 1.0, c: 0x6e4a3a, shape: 'box' },
      { x: 2.8, z: -0.6, w: 2.4, d: 0.6, h: 1.0, c: 0x6e4a3a, shape: 'box' },
      { x: -2.8, z: 1.8, w: 2.4, d: 0.6, h: 1.0, c: 0x6e4a3a, shape: 'box' },
      { x: 2.8, z: 1.8, w: 2.4, d: 0.6, h: 1.0, c: 0x6e4a3a, shape: 'box' },
    ],
  },
};

export const INTERIOR_KINDS = Object.keys(INTERIOR_SPECS);

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

// Clamp a room-local position to the walls and push out of furniture.
// Walls are clamped again after the furniture pass so a push can never
// throw the position outside the room.
export function clampInterior(pos, spec, r) {
  const clampWalls = () => {
    pos.x = Math.max(-spec.w / 2 + r, Math.min(spec.w / 2 - r, pos.x));
    pos.z = Math.max(-spec.d / 2 + r, Math.min(spec.d / 2 - r, pos.z));
  };
  clampWalls();
  for (const f of spec.furniture) {
    if (f.noCollide) continue;
    pushOut(pos, r, f.x - f.w / 2, f.z - f.d / 2, f.x + f.w / 2, f.z + f.d / 2);
  }
  clampWalls();
  return pos;
}

// Spawn point just inside the door (local coords).
export function doorInsidePos(spec) {
  return { x: 0, z: spec.d / 2 - 1.5 };
}
