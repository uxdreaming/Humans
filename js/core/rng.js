// Deterministic seeded RNG utilities.
// The whole world (names, houses, billboards...) is derived from CONFIG.seed,
// so every player sees the same fictional town.

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A dedicated RNG stream for any labelled entity (street, house, npc...).
export function rngFor(...parts) {
  return mulberry32(hashString(parts.join(':')));
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export const int = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
export const chance = (rng, p) => rng() < p;
export const shuffle = (rng, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
