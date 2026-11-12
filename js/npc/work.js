// Work / economy logic for stage 2 (pure, unit-testable).
// - shift detection from the NPC schedule
// - lateness: if the worker is not at the workplace 25 min after shift start
// - salary paid per worked hour when the work block ends
// - task completion: money + boss approval

import { scheduleEntryAt } from './data.js';

const SALARY = { market: 8, cafe: 10, bar: 9, school: 9, townhall: 12 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class WorkState {
  constructor(def) {
    this.def = def;
    this.money = def.startMoney ?? 120;
    this.approval = 60; // boss approval 0-100
    this.lateCount = 0;
    this.tasksDone = 0;
    this.salaryPerHour = SALARY[def.workPlace] || 8;
    this.salaryMult = 1; // raised by the 'promotion' unlock
    this._shiftKey = null;
    this._lateChecked = false;
    this._workedMin = 0;
    this._awayMin = 0;
    this._abandoned = false;
  }
}

// Returns a list of events: shiftStart | onTime | late | paid
export function workUpdate(ws, gameMinutes, atWorkPlace, dtMin) {
  const events = [];
  const def = ws.def;
  if (!def.workPlace) return events;
  const day = Math.floor(gameMinutes / 1440);
  const entry = scheduleEntryAt(def, (gameMinutes / 60) % 24);
  const isWork = entry.act === 'work' && entry.place === def.workPlace;
  const shiftKey = `${day}:${entry.from}`;

  if (isWork && ws._shiftKey !== shiftKey) {
    ws._shiftKey = shiftKey;
    ws._lateChecked = false;
    ws._workedMin = 0;
    ws._awayMin = 0;
    ws._abandoned = false;
    events.push({ type: 'shiftStart', place: entry.place });
  }

  if (isWork && ws._shiftKey === shiftKey) {
    if (atWorkPlace) {
      ws._workedMin += dtMin;
      ws._awayMin = 0;
    } else {
      // away from the workplace during the shift
      ws._awayMin += dtMin;
      if (ws._awayMin > 10 && !ws._abandoned) {
        ws._abandoned = true;
        ws.approval = clamp(ws.approval - 10, 0, 100);
        events.push({ type: 'abandon' });
      }
    }
    const lateAfter = entry.from * 60 + 25; // minutes since midnight
    if (!ws._lateChecked && (gameMinutes % 1440) >= lateAfter) {
      ws._lateChecked = true;
      if (atWorkPlace) {
        events.push({ type: 'onTime' });
      } else {
        ws.approval = clamp(ws.approval - 15, 0, 100);
        ws.lateCount++;
        events.push({ type: 'late' });
      }
    }
  }

  if (!isWork && ws._shiftKey !== null && ws._workedMin > 0) {
    const pay = Math.round((ws._workedMin / 60) * ws.salaryPerHour * (ws.salaryMult || 1) * 100) / 100;
    ws.money += pay;
    events.push({ type: 'paid', amount: pay });
    ws._workedMin = 0;
  }

  return events;
}

// One completed task: small money + approval; every 5th task = boss praise.
export function completeTask(ws) {
  ws.tasksDone++;
  ws.money += 2;
  const ev = { type: 'taskDone', tasksDone: ws.tasksDone };
  if (ws.tasksDone % 5 === 0) {
    ws.approval = clamp(ws.approval + 10, 0, 100);
    ev.praise = true;
  } else {
    ws.approval = clamp(ws.approval + 3, 0, 100);
  }
  return ev;
}

export function isWorkNow(def, gameMinutes) {
  const entry = scheduleEntryAt(def, (gameMinutes / 60) % 24);
  return entry.act === 'work' && entry.place === def.workPlace;
}
