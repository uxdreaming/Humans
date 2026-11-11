// Top HUD bar: town name, clock, time controls, quality, language, fullscreen.

import { t } from '../core/i18n.js';

export function createHud(cb) {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <span class="brand">HUMANS</span>
    <span class="town" data-k="town"></span>
    <span class="pop" data-k="pop"></span>
    <select id="hud-npcs"></select>
    <span class="spacer"></span>
    <span class="clock" data-k="clock"></span>
    <button data-k="pause" id="hud-pause"></button>
    <button data-k="s1" class="spd">1x</button>
    <button data-k="s2" class="spd">2x</button>
    <button data-k="s4" class="spd">4x</button>
    <select id="hud-quality">
      <option value="low"></option><option value="medium"></option><option value="high"></option>
    </select>
    <button id="hud-lang"></button>
    <button id="hud-fs"></button>
  `;
  const $ = (sel) => root.querySelector(sel);
  const pauseBtn = $('#hud-pause');
  const qualitySel = $('#hud-quality');
  const langBtn = $('#hud-lang');
  const fsBtn = $('#hud-fs');

  pauseBtn.addEventListener('click', () => cb.onPauseToggle());
  root.querySelector('[data-k="s1"]').addEventListener('click', () => cb.onSpeed(1));
  root.querySelector('[data-k="s2"]').addEventListener('click', () => cb.onSpeed(2));
  root.querySelector('[data-k="s4"]').addEventListener('click', () => cb.onSpeed(4));
  qualitySel.addEventListener('change', () => cb.onQuality(qualitySel.value));
  langBtn.addEventListener('click', () => cb.onLangToggle());
  fsBtn.addEventListener('click', () => cb.onFullscreen());
  document.addEventListener('fullscreenchange', () => update(lastState));
  const npcSel = $('#hud-npcs');
  npcSel.addEventListener('change', () => { cb.onSelectNpc(Number(npcSel.value)); npcSel.value = ''; });

  let lastState = null;

  function setNpcs(list, lang) {
    npcSel.innerHTML = `<option value="">${t(lang, 'npcs')}…</option>` +
      list.map((n) => `<option value="${n.id}">${n.name}</option>`).join('');
  }

  function update(s) {
    lastState = s;
    const L = s.lang;
    root.querySelector('[data-k="town"]').textContent = s.townName;
    root.querySelector('[data-k="pop"]').textContent = `${s.pop}/${s.maxPop} ${t(L, 'population')}`;
    root.querySelector('[data-k="clock"]').textContent = `${t(L, 'day')} ${s.day} · ${s.timeStr}`;
    pauseBtn.textContent = s.paused ? t(L, 'resume') : t(L, 'pause');
    for (const b of root.querySelectorAll('.spd')) {
      b.classList.toggle('active', !s.paused && Number(b.textContent) === s.speed);
    }
    qualitySel.value = s.quality;
    qualitySel.previousSibling; // noop
    qualitySel.options[0].textContent = t(L, 'low');
    qualitySel.options[1].textContent = t(L, 'medium');
    qualitySel.options[2].textContent = t(L, 'high');
    langBtn.textContent = t(L, 'langBtn');
    fsBtn.textContent = s.fullscreen ? t(L, 'exitFullscreen') : t(L, 'fullscreen');
  }

  root.classList.remove('hidden');
  return { root, update, setNpcs };
}
