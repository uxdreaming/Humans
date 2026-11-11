// NPC inspector panel: identity, personality, current activity, location,
// mood, needs, goals, relationships + Follow / Take-control actions.

import { t } from '../core/i18n.js';

export function createPanel(cb) {
  const root = document.getElementById('panel');
  const hint = document.getElementById('hint');
  let current = null;   // { def, agent }
  let defs = [];
  let lang = 'es';
  let following = false;

  function row(k, v) {
    return `<div class="row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
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
    const needs = ['hunger', 'energy', 'social'].map((n) => `
      <div class="row"><span class="k">${t(L, `needs.${n}`)}</span><span class="v">${Math.round(agent.needs[n])}</span></div>
      <div class="bar"><div style="width:${Math.round(agent.needs[n])}%"></div></div>`).join('');

    root.innerHTML = `
      <button class="close" id="pn-close">✕</button>
      <h2>${def.name}</h2>
      <div class="sub">${t(L, `occupations.${def.occupation}`)}</div>
      ${row(p.age, def.age)}
      ${row(p.personality, '')}<div class="tags">${traits}</div>
      <h3>${p.activity}</h3>
      <div class="row"><span class="k">${p.activity}</span><span class="v" data-f="act"></span></div>
      <div class="row"><span class="k">${p.location}</span><span class="v" data-f="loc"></span></div>
      <div class="row"><span class="k">${p.mood}</span><span class="v" data-f="mood"></span></div>
      <h3>${p.needs}</h3>
      <div data-f="needs">${needs}</div>
      <h3>${p.goals}</h3>
      <ul>${goals}</ul>
      <h3>${p.relationships}</h3>
      <ul>${rels}</ul>
      <div class="actions">
        <button id="pn-follow">${following ? p.unfollow : p.follow}</button>
        <button id="pn-take" class="secondary" disabled title="${p.stage2}">${p.takeControl}</button>
      </div>
    `;
    root.querySelector('#pn-close').addEventListener('click', () => { cb.onClose(); });
    root.querySelector('#pn-follow').addEventListener('click', () => { following = !following; cb.onFollowToggle(current); render(); });
    root.classList.remove('hidden');
    updateDynamic();
  }

  function updateDynamic() {
    if (!current) return;
    const { agent } = current;
    const L = lang;
    const actEl = root.querySelector('[data-f="act"]');
    if (actEl) actEl.textContent = t(L, `activities.${agent.act}`);
    const locEl = root.querySelector('[data-f="loc"]');
    if (locEl) locEl.textContent = agent.placeId === 'home' ? t(L, 'places.home') : (t(L, `places.${agent.placeId}`) || agent.locationName) + (agent.moving ? '' : '');
    const moodEl = root.querySelector('[data-f="mood"]');
    if (moodEl) moodEl.textContent = t(L, `moods.${agent.mood}`);
    const needsEl = root.querySelector('[data-f="needs"]');
    if (needsEl) {
      const bars = needsEl.querySelectorAll('.bar > div');
      ['hunger', 'energy', 'social'].forEach((n, i) => { if (bars[i]) bars[i].style.width = `${Math.round(agent.needs[n])}%`; });
      const vals = needsEl.querySelectorAll('.row .v');
      ['hunger', 'energy', 'social'].forEach((n, i) => { if (vals[i]) vals[i].textContent = Math.round(agent.needs[n]); });
    }
  }

  return {
    show(entry, defsArr, l) { current = entry; defs = defsArr; lang = l; following = false; render(); },
    setLang(l) { lang = l; if (current) render(); },
    setFollowing(v) { following = v; if (current) render(); },
    update() { updateDynamic(); },
    hide() { current = null; root.classList.add('hidden'); },
    get current() { return current; },
    setHint(l) { hint.textContent = t(l, 'hint'); hint.classList.remove('hidden'); },
  };
}
