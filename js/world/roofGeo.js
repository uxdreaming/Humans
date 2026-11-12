// Pure roof geometry data + roof layout math (no three.js) so it is unit-testable.
// Unit shapes: base sits on y=0, apex/ridge at y=1, footprint half-extents = 1.
// town.js turns these into BufferGeometry and scales/rotates them per house.

// Rectangular hip roof: base corners (+-1, 0, +-1), apex (0, 1, 0).
export const HIP_ROOF = {
  positions: [
    -1, 0, -1,  1, 0, -1,  1, 0, 1,  -1, 0, 1,   0, 1, 0,
  ],
  indices: [
    0, 1, 4,  1, 2, 4,  2, 3, 4,  3, 0, 4, // 4 slopes
    0, 2, 1,  0, 3, 2,                     // base
  ],
};

// Gable roof: triangular prism, ridge along z.
// Cross-section in xy: (-1,0), (1,0), (0,1); extruded z in [-1, 1].
export const GABLE_ROOF = {
  positions: [
    -1, 0, -1,  1, 0, -1,  0, 1, -1, // z = -1 end
    -1, 0, 1,   1, 0, 1,   0, 1, 1,  // z = +1 end
  ],
  indices: [
    0, 2, 5,  0, 5, 3, // left slope
    1, 4, 5,  1, 5, 2, // right slope
    0, 1, 2,           // gable triangle at z = -1
    3, 5, 4,           // gable triangle at z = +1
    0, 3, 4,  0, 4, 1, // base
  ],
};

// Roof height from the footprint (kept proportional, clamped).
export function roofHeight(w, d) {
  const m = Math.min(w, d);
  return Math.max(1.1, Math.min(3.4, m * 0.38));
}

// Plan for one house: { kind: 'hip'|'gable'|'flat', pos, rotY, scale }.
// Scales include a small overhang so the roof always covers the walls.
export function roofPlan(h) {
  const rh = roofHeight(h.w, h.d);
  if (h.apartment) {
    return { kind: 'flat', pos: [h.x, h.h + 0.17, h.z], rotY: h.rotY || 0, scale: [h.w * 1.05, 0.34, h.d * 1.05], height: 0.34 };
  }
  if (h.roofType === 'gable') {
    const alongX = h.w > h.d; // ridge runs along the longer side
    return {
      kind: 'gable',
      pos: [h.x, h.h + 0.01, h.z],
      rotY: (h.rotY || 0) + (alongX ? Math.PI / 2 : 0),
      scale: alongX ? [h.d * 0.55, rh * 0.8, h.w * 0.54] : [h.w * 0.55, rh * 0.8, h.d * 0.54],
      height: rh * 0.8,
    };
  }
  return { kind: 'hip', pos: [h.x, h.h + 0.01, h.z], rotY: h.rotY || 0, scale: [h.w * 0.55, rh, h.d * 0.55], height: rh };
}
