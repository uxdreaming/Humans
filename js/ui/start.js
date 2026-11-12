// Start screen: searchable NPC list. Pick one to start playing that life
// (take control), or choose to just observe the town.

import { t } from '../core/i18n.js';
import { VERSION } from '../core/config.js';
import { TOWN_NAME } from '../world/layout.js';

export function createStartScreen(cb) {
  const root = document.getElementById('start');
  const list = document.getElementById('start-list');
  const search = document.getElementById('start-search');
  let agents = [];
  let lang = 'es';

  function texts() {
    document.getElementById('start-ver').textContent = `v${VERSION}`;
    document.getElementById('start-town').textContent = TOWN_NAME;
    document.getElementById('start-sub').textContent = t(lang, 'start.sub').replace('{town}', TOWN_NAME);
    search.placeholder = `🔍 ${t(lang, 'start.searchPh')}`;
    document.getElementById('start-observe').textContent = t(lang, 'start.observe');
    document.getElementById('start-hint').textContent = t(lang, 'start.controls');
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    list.innerHTML = '';
    for (const a of agents) {
      const d = a.def;
      const occ = t(lang, `occupations.${d.occupation}`);
      const traits = d.traits.map((tr) => t(lang, `traits.${tr}`)).join(' ');
      const hay = `${d.name} ${occ} ${traits} ${d.age}`.toLowerCase();
      if (q && !hay.includes(q)) continue;
      const card = document.createElement('div');
      card.className = 'npc-card';
      card.innerHTML = `
        <div class="nc-name">${d.name}</div>
        <div class="nc-occ">${occ} · ${d.age}</div>
        <div class="nc-traits">${d.traits.map((tr) => `<span class="tag">${t(lang, `traits.${tr}`)}</span>`).join('')}</div>
        <button class="nc-play">${t(lang, 'start.playAs')} ${d.name.split(' ')[0]}</button>
      `;
      card.querySelector('.nc-play').addEventListener('click', (e) => { e.stopPropagation(); cb.onPick(a); });
      card.addEventListener('click', () => cb.onPick(a)); // whole card is clickable
      list.appendChild(card);
    }
    if (!list.children.length) {
      list.innerHTML = `<div class="nc-empty">${t(lang, 'start.noResults')}</div>`;
    }
  }

  search.addEventListener('input', render);
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = list.querySelector('.npc-card');
      if (first) first.click();
    }
  });
  document.getElementById('start-observe').addEventListener('click', () => cb.onObserve());

  return {
    show(ags, l) {
      agents = ags;
      lang = l;
      texts();
      search.value = '';
      render();
      root.classList.remove('hidden');
      setTimeout(() => search.focus(), 50);
    },
    hide() { root.classList.add('hidden'); },
    get visible() { return !root.classList.contains('hidden'); },
    setLang(l) { lang = l; if (this.visible) { texts(); render(); } },
  };
}
