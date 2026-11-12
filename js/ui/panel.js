// NPC inspector panel: identity, personality, current activity, location,
// mood, needs, money, boss approval, goals, relationships + actions
// (Follow / Take control).

import { t } from '../core/i18n.js';
import { UNLOCKS } from '../core/unlocks.js';

export function createPanel(cb) {
  const root = document.getElementById('panel');
  const hint = document.getElementById('hint');
  let current = null;   // { def, agent }
  let defs = [];
  let lang = 'es';
  let following = false;
  let controlling = false;
  let ws = null;        // WorkState of the selected NPC (if any)
  let unlocked = new Set();

  function row(k, v, f) {
    return `<div class="row"><span class="k">${k}</span><span class="v" ${f ? `data-f="${f}"` : ''}>${v}</span></div>`;
  }

  function render() {
    if (!current) { root.classList.add('hidden'); return; }
    const { def, agent } = current;
    const L = lang;
    const p = t(L, 'panel');
    const traits = def.traits.map((tr) => `<span class="tag">${t(L, `traits.${tr}`)}</span>`).join('');
    const goals = def.goals.map((g) => `<li>• ${t(L, `goals.${g}`)}</li>`).join('');
    const rels = def.relationships.map((r) => {
      const other = defs.find((d) => d.id === r.id);
      return `<li>• ${other ? other.name : r.id} — ${t(L, `relTypes.${r.type}`)} (${r.strength}%)</li>`;
    }).join('');
    const workRows = def.workPlace && ws ? `
      ${row(p.money, '', 'money')}
      ${row(p.approval, '', 'approval')}` : '';

    root.innerHTML = `
      <button class="close" id="pn-close">✕</button>
      <h2>${def.name}</h2>
      <div class="sub">${t(L, `occupations.${def.occupation}`)}</div>
      ${row(p.age, def.age)}
      ${workRows}
      ${row(p.personality, '')}<div class="tags">${traits}</div>
      <h3>${p.activity}</h3>
      <div class="row"><span class="k">${p.activity}</span><span class="v" data-f="act"></span></div>
      <div class="row"><span class="k">${p.location}</span><span class="v" data-f="loc"></span></div>
      <div class="row"><span class="k">${p.mood}</span><span class="v" data-f="mood"></span></div>
      <h3>${p.needs}</h3>
      <div data-f="needs"></div>
      <h3>${p.goals}</h3>
      <ul>${goals}</ul>
      <h3>${p.relationships}</h3>
      <ul>${rels}</ul>
      <h3>${p.achievements}</h3>
      <ul>${UNLOCKS.map((u) => `<li>${unlocked.has(u.id) ? '✅' : '🔒'} ${u.icon} ${t(L, `unlocks.${u.id}.name`)}</li>`).join('')}</ul>
      <div class="actions">
        <button id="pn-follow">${following ? p.unfollow : p.follow}</button>
        <button id="pn-take" class="secondary">${controlling ? t(L, 'control.release') : t(L, 'control.take')}</button>
        ${controlling ? `<button id="pn-talk" class="secondary">${p.talk}</button>` : ''}
      </div>
    `;
    root.querySelector('#pn-close').addEventListener('click', () => cb.onClose());
    root.querySelector('#pn-follow').addEventListener('click', () => { following = !following; cb.onFollowToggle(current); render(); });
    root.querySelector('#pn-take').addEventListener('click', () => cb.onTakeControl(current));
    const talkBtn = root.querySelector('#pn-talk');
    if (talkBtn) talkBtn.addEventListener('click', () => cb.onTalk && cb.onTalk(current));
    root.classList.remove('hidden');
    renderNeeds();
    updateDynamic();
  }

  function renderNeeds() {
    if (!current) return;
    const L = lang;
    const { agent } = current;
    root.querySelector('[data-f="needs"]').innerHTML = ['hunger', 'energy', 'social'].map((n) => `
      <div class="row"><span class="k">${t(L, `needs.${n}`)}</span><span class="v">${Math.round(agent.needs[n])}</span></div>
      <div class="bar"><div style="width:${Math.round(agent.needs[n])}%"></div></div>`).join('');
  }

  function updateDynamic() {
    if (!current) return;
    const { agent } = current;
    const L = lang;
    const actEl = root.querySelector('[data-f="act"]');
    if (actEl) actEl.textContent = t(L, `activities.${agent.act}`);
    const locEl = root.querySelector('[data-f="loc"]');
    if (locEl) locEl.textContent = agent.placeId === 'home' ? t(L, 'places.home') : (t(L, `places.${agent.placeId}`) || agent.locationName);
    const moodEl = root.querySelector('[data-f="mood"]');
    if (moodEl) moodEl.textContent = t(L, `moods.${agent.mood}`);
    const needsEl = root.querySelector('[data-f="needs"]');
    if (needsEl) {
      const bars = needsEl.querySelectorAll('.bar > div');
      const vals = needsEl.querySelectorAll('.row .v');
      ['hunger', 'energy', 'social'].forEach((n, i) => {
        if (bars[i]) bars[i].style.width = `${Math.round(agent.needs[n])}%`;
        if (vals[i]) vals[i].textContent = Math.round(agent.needs[n]);
      });
    }
    const moneyEl = root.querySelector('[data-f="money"]');
    if (moneyEl && ws) moneyEl.textContent = `${ws.money.toFixed(2)} ${t(L, 'work.money')}`;
    const apprEl = root.querySelector('[data-f="approval"]');
    if (apprEl && ws) apprEl.textContent = `${Math.round(ws.approval)}%`;
  }

  return {
    show(entry, defsArr, l, workState) {
      current = entry; defs = defsArr; lang = l; ws = workState || null;
      following = false; render();
    },
    setLang(l) { lang = l; if (current) render(); },
    setFollowing(v) { following = v; if (current) render(); },
    setControlling(v) { controlling = v; if (current) render(); },
    setWorkState(w) { ws = w; },
    setUnlocks(s) { unlocked = s; if (current) render(); },
    update() { updateDynamic(); },
    hide() { current = null; root.classList.add('hidden'); },
    get current() { return current; },
    setHint(l) { hint.textContent = t(l, 'hint'); hint.classList.remove('hidden'); },
  };
}
