// Tests for the stage-2 work/economy logic. Run: npm test

import assert from 'node:assert/strict';
import { NPC_DEFS, scheduleEntryAt } from '../js/npc/data.js';
import { WorkState, workUpdate, completeTask, isWorkNow } from '../js/npc/work.js';

const manager = NPC_DEFS.find((d) => d.occupation === 'market_manager');
assert.ok(manager && manager.workPlace === 'market');

// --- on-time shift pays salary ---
{
  const ws = new WorkState(manager);
  const start = 8 * 60; // shift starts 08:00
  let events = [];
  // simulate 08:00 -> 12:00 (4 worked hours), at work the whole time
  for (let m = start; m < 12 * 60; m++) events = events.concat(workUpdate(ws, m, true, 1));
  assert.ok(events.some((e) => e.type === 'shiftStart'), 'shiftStart event');
  assert.ok(events.some((e) => e.type === 'onTime'), 'onTime event (arrived before 08:25)');
  assert.ok(!events.some((e) => e.type === 'late'), 'no late event when at work');
  // lunch 12:00-13:00 => paid event at 12:00
  events = events.concat(workUpdate(ws, 12 * 60, false, 1));
  const paid = events.find((e) => e.type === 'paid');
  assert.ok(paid, 'paid event when leaving work block');
  assert.ok(Math.abs(paid.amount - 4 * ws.salaryPerHour) < 0.01, `paid 4h * ${ws.salaryPerHour} = ${paid.amount}`);
  assert.ok(ws.money > manager.startMoney, 'money increased');
  assert.ok(ws.approval === 60, 'approval unchanged when on time');
}

// --- late arrival ---
{
  const ws = new WorkState(manager);
  const start = 8 * 60;
  let events = [];
  for (let m = start; m < start + 30; m++) events = events.concat(workUpdate(ws, m, false, 1)); // not at work
  const late = events.find((e) => e.type === 'late');
  assert.ok(late, 'late event after 08:25 away from work');
  assert.equal(ws.lateCount, 1);
  assert.equal(ws.approval, 45, 'approval -15');
}

// --- tasks: money + approval, praise every 5 ---
{
  const ws = new WorkState(manager);
  const money0 = ws.money;
  for (let i = 0; i < 5; i++) {
    const ev = completeTask(ws);
    if (i < 4) assert.ok(!ev.praise);
    else assert.ok(ev.praise, '5th task triggers praise');
  }
  assert.equal(ws.tasksDone, 5);
  assert.equal(ws.money, money0 + 5 * 2, '+2 per task');
  assert.equal(ws.approval, 60 + 4 * 3 + 10, 'approval up');
}

// --- isWorkNow matches schedule ---
{
  assert.ok(isWorkNow(manager, 9 * 60), 'manager works at 09:00');
  assert.ok(!isWorkNow(manager, 12.5 * 60), 'manager at lunch at 12:30');
  assert.equal(scheduleEntryAt(manager, 12.5).act, 'lunch');
}

console.log('✔ all work tests passed');
