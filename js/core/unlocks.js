// Unlock / achievement system (pure logic, unit-testable).
// Unlocks are checked against the player's WorkState (money, approval, tasks)
// and fire once. Effects are applied by main.js when an unlock fires.

export const UNLOCKS = [
  { id: 'promotion', icon: '⭐', req: (ws) => ws.approval >= 80 },
  { id: 'car_discount', icon: '🚗', req: (ws) => ws.tasksDone >= 15 },
  { id: 'bus_pass', icon: '🚌', req: (ws) => ws.money >= 100 },
];

export function newlyUnlocked(ws, unlockedSet) {
  return UNLOCKS.filter((u) => !unlockedSet.has(u.id) && u.req(ws)).map((u) => u.id);
}
