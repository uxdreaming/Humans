// NPC runtime agents: schedule-driven routines, street movement, needs, mood.
// Pure logic (no three.js): main.js syncs the visual mesh from agent state.

import { CONFIG } from '../core/config.js';
import { PLACES, blockToWorld, streetCoord, randomSpotIn, nearestStreetName } from '../world/layout.js';
import { scheduleEntryAt } from './data.js';
import { rngFor } from '../core/rng.js';

const SIT_ACTS = new Set(['sleep', 'lunch', 'social']);

function computePath(from, to) {
  const sx = streetCoord(from.x), sz = streetCoord(from.z);
  const tx = streetCoord(to.x), tz = streetCoord(to.z);
  const cand = [
    { x: sx, z: from.z }, { x: sx, z: sz }, { x: tx, z: sz }, { x: tx, z: to.z },
    { x: to.x, z: to.z },
  ];
  const pts = [];
  for (const p of cand) {
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.z - p.z) > 0.01) pts.push(p);
  }
  return pts;
}

export class Agent {
  constructor(def) {
    this.def = def;
    this.rng = rngFor(CONFIG.seed, 'agent', def.id);
    const home = blockToWorld(def.homeBlock[0], def.homeBlock[1]);
    this.pos = { x: home.x, z: home.z };
    this.heading = 0;
    this.state = 'idle';           // idle | walk | sit
    this.act = 'ready';
    this.placeId = 'home';
    this.waypoints = [];
    this.strollTarget = null;
    this.walkPhase = 0;
    this.moving = false;
    this.needs = { hunger: 80, energy: 85, social: 70 };
    this.mood = 'ok';
    this.locationName = '';
    this.controlled = false; // true while the player drives this NPC
  }

  placePos(placeId) {
    if (placeId === 'home') {
      const h = blockToWorld(this.def.homeBlock[0], this.def.homeBlock[1]);
      return { x: h.x, z: h.z + 10.5 }; // in front of the house, on the sidewalk
    }
    const p = PLACES[placeId];
    return p ? (p.spot || { x: p.x, z: p.z }) : { x: 0, z: 0 };
  }

  locationLabel() {
    if (this.placeId === 'home') return nearestStreetName(this.pos.x, this.pos.z);
    return PLACES[this.placeId]?.name || this.placeId;
  }

  // dtMin: elapsed game minutes. gameMinutes: absolute game time in minutes.
  update(dtMin, gameMinutes) {
    const hour = (gameMinutes / 60) % 24;
    const entry = scheduleEntryAt(this.def, hour);
    this.act = (!this.controlled && this.moving) ? 'commute' : entry.act;

    if (!this.controlled) {
      // autonomous routine: head to the scheduled place and walk there
      if (!this.moving && entry.place !== this.placeId) {
        this.placeId = entry.place;
        const target = this.placePos(entry.place);
        if (entry.act === 'stroll') {
          this.strollTarget = randomSpotIn(entry.place, this.rng);
        } else {
          this.strollTarget = target;
        }
        this.waypoints = computePath(this.pos, this.strollTarget);
        if (this.waypoints.length > 0) {
          this.moving = true;
          this.state = 'walk';
        }
      }

      // Movement along waypoints (speed in metres per game-minute).
      const speed = CONFIG.walkSpeed * 60; // m per game-minute
      let step = speed * dtMin;
      while (step > 0 && this.waypoints.length > 0) {
        const wp = this.waypoints[0];
        const dx = wp.x - this.pos.x, dz = wp.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= step) {
          this.pos.x = wp.x; this.pos.z = wp.z;
          this.waypoints.shift();
          step -= dist;
        } else {
          this.pos.x += (dx / dist) * step;
          this.pos.z += (dz / dist) * step;
          step = 0;
        }
        if (dist > 0.001) this.heading = Math.atan2(dx, dz);
      }
      if (this.waypoints.length === 0 && this.moving) {
        this.moving = false;
        this.state = SIT_ACTS.has(this.act) ? 'sit' : 'idle';
        if (this.act === 'stroll') {
          this.strollTarget = randomSpotIn(this.placeId, this.rng);
          this.waypoints = computePath(this.pos, this.strollTarget);
          if (this.waypoints.length > 1) { this.moving = true; this.state = 'walk'; }
        }
      }
      if (!this.moving) this.state = SIT_ACTS.has(this.act) ? 'sit' : 'idle';
    }
    // when controlled, the player controller sets pos/heading/state directly

    // Needs decay per game hour.
    const hours = dtMin / 60;
    this.needs.hunger = clamp(this.needs.hunger - 1.6 * hours + (this.act === 'lunch' ? 12 * hours : 0), 0, 100);
    const energyDelta = this.act === 'sleep' ? 9 : -2.2;
    this.needs.energy = clamp(this.needs.energy + energyDelta * hours, 0, 100);
    this.needs.social = clamp(this.needs.social - 1.0 * hours + (this.act === 'social' ? 6 * hours : 0), 0, 100);

    const avg = (this.needs.hunger + this.needs.energy + this.needs.social) / 3;
    this.mood = this.act === 'sleep' ? 'sleeping'
      : avg >= 80 ? 'great' : avg >= 60 ? 'good' : avg >= 40 ? 'ok' : avg >= 20 ? 'low' : 'bad';

    this.locationName = this.locationLabel();
    this.walkPhase += (this.moving ? 1 : 0) * dtMin * 6;
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
