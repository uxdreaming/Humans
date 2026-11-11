// Work HUD (bottom centre): visible while the controlled NPC is on shift
// at their workplace. Shows the current task, station prompt and progress.

import { t } from '../core/i18n.js';

export function createWorkUi() {
  const root = document.getElementById('work');
  let lastKey = '';

  // s: null | { lang, placeName, taskKey, progress, near, money, approval }
  function update(s) {
    if (!s) { root.classList.add('hidden'); lastKey = ''; return; }
    const key = `${s.lang}|${s.placeName}|${s.taskKey}|${s.near}|${Math.floor(s.progress * 20)}|${Math.round(s.money)}|${Math.round(s.approval)}`;
    if (key === lastKey) return;
    lastKey = key;
    const L = s.lang;
    const taskName = t(L, `work.tasks.${s.taskKey}`);
    const prompt = s.near ? `${t(L, 'work.prompt')}: ${taskName}` : taskName;
    root.innerHTML = `
      <div class="work-title">${t(L, 'work.bar')} ${s.placeName}</div>
      <div class="work-task ${s.near ? 'near' : ''}">${prompt}</div>
      <div class="bar big"><div style="width:${Math.round(s.progress * 100)}%"></div></div>
      <div class="work-meta">${Math.round(s.money)} ${t(L, 'work.money')} · ${t(L, 'panel.approval')}: ${Math.round(s.approval)}%</div>
    `;
    root.classList.remove('hidden');
  }

  return { update };
}
