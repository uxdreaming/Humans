// The 6 test NPCs of stage 1: identity, personality, job, home, schedule,
// goals and relationships. Names are generated from the world seed (stable).
// Pure data + schedule helpers; no three.js here.

import { CONFIG } from '../core/config.js';
import { rngFor, pick, int, shuffle } from '../core/rng.js';
import * as NAMES from '../core/names.js';
import { PLACES } from '../world/layout.js';

const TRAITS = ['friendly', 'shy', 'grumpy', 'curious', 'hardworking', 'dreamer', 'calm', 'energetic'];

// idx: role, gender, age, occupation key, home block, work place, goals
const ROLES = [
  { role: 'cafe_owner',      gender: 'f', age: 34, occ: 'cafe_owner',      home: [1, 2],   work: 'cafe',   goals: ['grow_cafe', 'make_friends'] },
  { role: 'market_manager',  gender: 'm', age: 45, occ: 'market_manager',  home: [2, 1],   work: 'market', goals: ['manage_market', 'save_trip'] },
  { role: 'cashier',         gender: 'f', age: 27, occ: 'cashier',         home: [-2, 0],  work: 'market', goals: ['make_friends', 'study'] },
  { role: 'retired',         gender: 'm', age: 68, occ: 'retired',         home: [-1, -1], work: null,     goals: ['rest', 'help_town'] },
  { role: 'student',         gender: 'm', age: 22, occ: 'student',         home: [0, -2],  work: null,     goals: ['study', 'make_friends'] },
  { role: 'baker',           gender: 'f', age: 52, occ: 'baker',           home: [3, 1],   work: 'cafe',   goals: ['learn_baking', 'help_town'] },
  { role: 'villager',        gender: 'm', age: 38, occ: 'villager',        home: [-3, 0],  work: null,     goals: ['make_friends', 'help_town'] },
  { role: 'villager2',       gender: 'f', age: 29, occ: 'villager',        home: [1, 0],   work: null,     goals: ['rest', 'make_friends'] },
  { role: 'villager',        gender: 'f', age: 61, occ: 'villager',        home: [0, 1],   work: null,     goals: ['rest', 'save_trip'] },
  { role: 'villager2',       gender: 'm', age: 19, occ: 'villager',        home: [-1, -2], work: null,     goals: ['make_friends', 'study'] },
  { role: 'villager',        gender: 'm', age: 45, occ: 'villager',        home: [2, -2],  work: null,     goals: ['help_town', 'rest'] },
  { role: 'villager2',       gender: 'f', age: 33, occ: 'villager',        home: [3, 0],   work: null,     goals: ['save_trip', 'make_friends'] },
  { role: 'worker_market',   gender: 'm', age: 31, occ: 'stocker',         home: [-3, 1],  work: 'market', goals: ['save_trip', 'rest'] },
  { role: 'villager',        gender: 'f', age: 24, occ: 'villager',        home: [-3, -1], work: null,     goals: ['make_friends', 'help_town'] },
  { role: 'worker_bar',      gender: 'f', age: 27, occ: 'barkeep',         home: [4, 0],   work: 'bar',    goals: ['make_friends', 'save_trip'] },
  { role: 'villager2',       gender: 'm', age: 55, occ: 'villager',        home: [4, 1],   work: null,     goals: ['rest', 'help_town'] },
  { role: 'villager',        gender: 'f', age: 41, occ: 'villager',        home: [4, -1],  work: null,     goals: ['save_trip', 'rest'] },
  { role: 'worker_market',   gender: 'f', age: 24, occ: 'stocker',         home: [-4, 0],  work: 'market', goals: ['study', 'make_friends'] },
  { role: 'villager2',       gender: 'm', age: 35, occ: 'villager',        home: [-4, 1],  work: null,     goals: ['make_friends', 'rest'] },
  { role: 'villager',        gender: 'f', age: 47, occ: 'villager',        home: [0, 2],   work: null,     goals: ['help_town', 'rest'] },
  { role: 'villager2',       gender: 'm', age: 28, occ: 'villager',        home: [1, 3],   work: null,     goals: ['make_friends', 'study'] },
  { role: 'villager',        gender: 'f', age: 36, occ: 'villager',        home: [-1, 2],  work: null,     goals: ['save_trip', 'help_town'] },
  { role: 'worker_bar',      gender: 'm', age: 30, occ: 'barkeep',         home: [2, 2],   work: 'bar',    goals: ['rest', 'make_friends'] },
  { role: 'villager2',       gender: 'f', age: 52, occ: 'villager',        home: [3, 2],   work: null,     goals: ['rest', 'save_trip'] },
  { role: 'nightowl',        gender: 'm', age: 26, occ: 'nightowl',        home: [5, 0],   work: null,     goals: ['make_friends', 'rest'] },
  { role: 'nightowl',        gender: 'f', age: 31, occ: 'nightowl',        home: [5, 1],   work: null,     goals: ['make_friends', 'study'] },
  { role: 'worker_bar_night', gender: 'm', age: 24, occ: 'barkeep',        home: [-5, 0],  work: 'bar',    goals: ['save_trip', 'rest'] },
];

// Relationships (symmetric): [a, b, type, strength]
const REL_EDGES = [
  [0, 5, 'coworker', 70],
  [1, 2, 'boss', 65],
  [2, 4, 'friend', 60],
  [3, 4, 'mentor', 75],
  [0, 3, 'neighbor', 55],
  [0, 1, 'neighbor', 50],
  [6, 7, 'neighbor', 50],
  [7, 8, 'friend', 55],
  [8, 9, 'neighbor', 45],
  [9, 10, 'friend', 50],
  [10, 11, 'neighbor', 40],
  [6, 0, 'neighbor', 45],
  [8, 2, 'friend', 50],
  [12, 1, 'coworker', 60],
  [12, 2, 'coworker', 55],
  [17, 1, 'coworker', 60],
  [14, 0, 'neighbor', 45],
  [22, 14, 'coworker', 65],
  [13, 19, 'friend', 50],
  [15, 18, 'neighbor', 45],
  [20, 21, 'friend', 55],
  [24, 25, 'friend', 60],
  [24, 14, 'friend', 55],
  [26, 22, 'coworker', 65],
];

function scheduleFor(role) {
  switch (role) {
    case 'cafe_owner':
      return [
        { from: 0, to: 7, act: 'sleep', place: 'home' },
        { from: 7, to: 9, act: 'ready', place: 'home' },
        { from: 9, to: 13, act: 'work', place: 'cafe' },
        { from: 13, to: 14, act: 'lunch', place: 'cafe' },
        { from: 14, to: 18, act: 'work', place: 'cafe' },
        { from: 18, to: 20, act: 'stroll', place: 'plaza' },
        { from: 20, to: 22, act: 'social', place: 'cafe' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'market_manager':
      return [
        { from: 0, to: 7, act: 'sleep', place: 'home' },
        { from: 7, to: 8, act: 'ready', place: 'home' },
        { from: 8, to: 12, act: 'work', place: 'market' },
        { from: 12, to: 13, act: 'lunch', place: 'cafe' },
        { from: 13, to: 17, act: 'work', place: 'market' },
        { from: 17, to: 19, act: 'stroll', place: 'plaza' },
        { from: 19, to: 21, act: 'social', place: 'cafe' },
        { from: 21, to: 22, act: 'shop', place: 'market' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'cashier':
      return [
        { from: 0, to: 8, act: 'sleep', place: 'home' },
        { from: 8, to: 9, act: 'ready', place: 'home' },
        { from: 9, to: 13, act: 'work', place: 'market' },
        { from: 13, to: 14, act: 'lunch', place: 'cafe' },
        { from: 14, to: 18, act: 'work', place: 'market' },
        { from: 18, to: 20, act: 'stroll', place: 'park' },
        { from: 20, to: 22, act: 'social', place: 'plaza' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'retired':
      return [
        { from: 0, to: 8, act: 'sleep', place: 'home' },
        { from: 8, to: 9, act: 'ready', place: 'home' },
        { from: 9, to: 11, act: 'stroll', place: 'park' },
        { from: 11, to: 12, act: 'lunch', place: 'cafe' },
        { from: 12, to: 16, act: 'stroll', place: 'plaza' },
        { from: 16, to: 18, act: 'social', place: 'plaza' },
        { from: 18, to: 20, act: 'shop', place: 'market' },
        { from: 20, to: 22, act: 'ready', place: 'home' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'student':
      return [
        { from: 0, to: 8, act: 'sleep', place: 'home' },
        { from: 8, to: 10, act: 'ready', place: 'home' },
        { from: 10, to: 13, act: 'stroll', place: 'plaza' }, // "class" at the plaza
        { from: 13, to: 14, act: 'lunch', place: 'cafe' },
        { from: 14, to: 17, act: 'stroll', place: 'park' },
        { from: 17, to: 19, act: 'social', place: 'plaza' },
        { from: 19, to: 21, act: 'shop', place: 'market' },
        { from: 21, to: 22, act: 'ready', place: 'home' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'baker':
      return [
        { from: 0, to: 6, act: 'sleep', place: 'home' },
        { from: 6, to: 8, act: 'work', place: 'cafe' },
        { from: 8, to: 12, act: 'work', place: 'cafe' },
        { from: 12, to: 13, act: 'lunch', place: 'cafe' },
        { from: 13, to: 17, act: 'work', place: 'cafe' },
        { from: 17, to: 19, act: 'stroll', place: 'plaza' },
        { from: 19, to: 21, act: 'social', place: 'cafe' },
        { from: 21, to: 22, act: 'shop', place: 'market' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'villager':
      return [
        { from: 0, to: 8, act: 'sleep', place: 'home' },
        { from: 8, to: 9, act: 'ready', place: 'home' },
        { from: 9, to: 12, act: 'stroll', place: 'plaza' },
        { from: 12, to: 13, act: 'lunch', place: 'cafe' },
        { from: 13, to: 16, act: 'shop', place: 'market' },
        { from: 16, to: 18, act: 'stroll', place: 'park' },
        { from: 18, to: 20, act: 'social', place: 'bar' },
        { from: 20, to: 21, act: 'shop', place: 'market' },
        { from: 21, to: 22, act: 'ready', place: 'home' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'villager2':
      return [
        { from: 0, to: 7, act: 'sleep', place: 'home' },
        { from: 7, to: 9, act: 'ready', place: 'home' },
        { from: 9, to: 11, act: 'shop', place: 'market' },
        { from: 11, to: 12, act: 'stroll', place: 'park' },
        { from: 12, to: 13, act: 'lunch', place: 'cafe' },
        { from: 13, to: 17, act: 'stroll', place: 'plaza' },
        { from: 17, to: 19, act: 'social', place: 'cafe' },
        { from: 19, to: 21, act: 'stroll', place: 'park' },
        { from: 21, to: 22, act: 'ready', place: 'home' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'worker_market':
      return [
        { from: 0, to: 7, act: 'sleep', place: 'home' },
        { from: 7, to: 8, act: 'ready', place: 'home' },
        { from: 8, to: 12, act: 'work', place: 'market' },
        { from: 12, to: 13, act: 'lunch', place: 'cafe' },
        { from: 13, to: 17, act: 'work', place: 'market' },
        { from: 17, to: 19, act: 'stroll', place: 'plaza' },
        { from: 19, to: 21, act: 'social', place: 'cafe' },
        { from: 21, to: 22, act: 'ready', place: 'home' },
        { from: 22, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'worker_bar':
      return [
        { from: 0, to: 10, act: 'sleep', place: 'home' },
        { from: 10, to: 12, act: 'ready', place: 'home' },
        { from: 12, to: 20, act: 'work', place: 'bar' },
        { from: 20, to: 21, act: 'stroll', place: 'plaza' },
        { from: 21, to: 24, act: 'sleep', place: 'home' },
      ];
    case 'worker_bar_night':
      return [
        { from: 0, to: 12, act: 'sleep', place: 'home' },
        { from: 12, to: 14, act: 'ready', place: 'home' },
        { from: 14, to: 18, act: 'stroll', place: 'plaza' },
        { from: 18, to: 24, act: 'work', place: 'bar' },
      ];
    case 'nightowl':
      return [
        { from: 0, to: 4, act: 'stroll', place: 'plaza' },
        { from: 4, to: 6, act: 'ready', place: 'home' },
        { from: 6, to: 14, act: 'sleep', place: 'home' },
        { from: 14, to: 16, act: 'ready', place: 'home' },
        { from: 16, to: 18, act: 'stroll', place: 'park' },
        { from: 18, to: 20, act: 'social', place: 'bar' },
        { from: 20, to: 24, act: 'stroll', place: 'plaza' },
      ];
    default:
      return [{ from: 0, to: 24, act: 'stroll', place: 'plaza' }];
  }
}

export const NPC_DEFS = ROLES.map((r, idx) => {
  const rng = rngFor(CONFIG.seed, 'npc', idx);
  const traits = shuffle(rng, TRAITS).slice(0, 3);
  return {
    id: idx,
    name: NAMES.personName(rng, r.gender),
    gender: r.gender,
    age: r.age,
    occupation: r.occ,
    homeBlock: r.home,
    workPlace: r.work,
    traits,
    goals: r.goals,
    schedule: scheduleFor(r.role),
    relationships: [],
    appearance: {
      skin: pick(rng, ['#f2c9a0', '#e0ac7e', '#c98d5e', '#8d5a3b', '#f7d7b5']),
      shirt: pick(rng, ['#c0504d', '#4d79c0', '#5a9e5a', '#c9a24d', '#8a5ac0', '#d97f6a', '#4db3c9', '#e0e0e0']),
      pants: pick(rng, ['#3a3f4a', '#5a4632', '#2e4a6e', '#4a4a4a', '#6e3a4a']),
      hair: pick(rng, ['#2e2018', '#4a2f1d', '#7a5a2e', '#c9c9c9', '#1a1a1a', '#8a4b3a']),
    },
  };
});

for (const [a, b, type, strength] of REL_EDGES) {
  NPC_DEFS[a].relationships.push({ id: b, type, strength });
  NPC_DEFS[b].relationships.push({ id: a, type, strength });
}

// Find the schedule entry for a given hour of day (0-24).
export function scheduleEntryAt(def, hour) {
  const s = def.schedule;
  let entry = s[s.length - 1];
  for (const e of s) {
    if (hour >= e.from && hour < e.to) return e;
    if (hour >= e.from) entry = e;
  }
  return entry;
}

export function isValidDef(def) {
  const s = def.schedule;
  if (s[0].from !== 0) return false;
  for (let i = 0; i < s.length; i++) {
    if (s[i].to <= s[i].from) return false;
    if (i > 0 && s[i].from !== s[i - 1].to) return false;
    if (s[i].place !== 'home' && !PLACES[s[i].place]) return false;
  }
  return s[s.length - 1].to === 24;
}
