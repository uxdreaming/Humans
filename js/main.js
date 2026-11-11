// HUMANS - entry point.
// Stage 1: observation mode over a living village.
// Stage 2: take control of an NPC (3rd/1st person) + playable supermarket shift.

import * as THREE from 'three';
import { CONFIG } from './core/config.js';
import { t } from './core/i18n.js';
import { TOWN_NAME, PLACES, STATIONS, stationWorld } from './world/layout.js';
import { Town, Traffic } from './world/town.js';
import { Sky } from './world/sky.js';
import { NPC_DEFS, scheduleEntryAt } from './npc/data.js';
import { Agent } from './npc/agents.js';
import { WorkState, workUpdate, completeTask, isWorkNow } from './npc/work.js';
import { buildHumanoid, makeNameSprite, makeMarkerSprite, poseCharacter } from './npc/characters.js';
import { ObserverCamera } from './player/camera.js';
import { pickAgent } from './player/picking.js';
import { createHud } from './ui/hud.js';
import { createPanel } from './ui/panel.js';
import { createWorkUi } from './ui/work.js';
import { createToasts } from './ui/toast.js';

const bootMsg = document.getElementById('boot-msg');
const setBoot = (m) => { if (bootMsg) bootMsg.textContent = m; };

// ---------------------------------------------------------------- renderer --
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 2000);

setBoot('building town…');
const town = new Town(scene);
const sky = new Sky(scene);
const traffic = new Traffic(scene);

// ------------------------------------------------------------------ agents --
setBoot('waking up the inhabitants…');
const agents = NPC_DEFS.map((def) => {
  const agent = new Agent(def);
  const { group, parts } = buildHumanoid(def.appearance);
  group.traverse((o) => { o.userData.npcId = def.id; });
  group.add(makeNameSprite(def.name));
  const marker = makeMarkerSprite();
  group.add(marker);
  group.position.set(agent.pos.x, 0, agent.pos.z);
  scene.add(group);
  return { id: def.id, def, agent, group, parts, marker };
});

// work state per employed NPC
const workStates = new Map(
  NPC_DEFS.filter((d) => d.workPlace).map((d) => [d.id, new WorkState(d)]),
);

// selection ring under the selected NPC
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.75, 0.95, 32),
  new THREE.MeshBasicMaterial({ color: 0xffd479, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.06;
ring.visible = false;
scene.add(ring);

// --------------------------------------------------------------------- UI ---
const state = {
  lang: localStorage.getItem('humans.lang') || 'es',
  quality: localStorage.getItem('humans.quality') || 'high',
  paused: false,
  speed: 1,
  gameMinutes: CONFIG.startHour * 60,
  selected: null,
  controlling: null,
};

const toast = createToasts();
const workUi = createWorkUi();

function applyQuality(q) {
  state.quality = q;
  localStorage.setItem('humans.quality', q);
  const pr = q === 'low' ? 1 : q === 'medium' ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio;
  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = q !== 'low';
  sky.setQuality(q);
}

function setLang(l) {
  state.lang = l;
  localStorage.setItem('humans.lang', l);
  panel.setLang(l);
  panel.setHint(l);
  hud.setNpcs(agents.map((a) => ({ id: a.id, name: a.def.name })), l);
  if (state.selected) panel.show(state.selected, NPC_DEFS, l, workStates.get(state.selected.id));
  hud.update(hudState());
}

const hud = createHud({
  onPauseToggle: () => { state.paused = !state.paused; },
  onSpeed: (s) => { state.speed = s; state.paused = false; },
  onQuality: applyQuality,
  onLangToggle: () => setLang(state.lang === 'es' ? 'en' : 'es'),
  onSelectNpc: (id) => {
    const a = agents.find((x) => x.id === id);
    if (!a) return;
    select(a);
    observer.stopFollow();
    observer.target.set(a.agent.pos.x, 1.4, a.agent.pos.z);
    observer.dist = Math.min(observer.dist, 20);
  },
  onFullscreen: () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  },
});

function select(entry) {
  state.selected = entry;
  if (!entry) {
    panel.hide();
    ring.visible = false;
    if (!state.controlling) observer.stopFollow();
    panel.setFollowing(false);
    return;
  }
  ring.visible = true;
  panel.show(entry, NPC_DEFS, state.lang, workStates.get(entry.id));
}

function toggleControl(entry) {
  if (!entry) return;
  if (state.controlling === entry) {
    entry.agent.controlled = false;
    state.controlling = null;
    observer.releaseControl();
    panel.setControlling(false);
    toast(`${t(state.lang, 'control.release')}: ${entry.def.name}`);
    return;
  }
  if (state.controlling) state.controlling.agent.controlled = false;
  state.controlling = entry;
  entry.agent.controlled = true;
  select(entry);
  observer.control(entry);
  panel.setControlling(true);
  toast(`${t(state.lang, 'controlling')} ${entry.def.name}`);
}

const panel = createPanel({
  onFollowToggle: (entry) => {
    if (state.selected !== entry || state.controlling) return;
    observer.toggleFollow(state.selected ? state.selected.agent : null);
    panel.setFollowing(observer.mode === 'follow');
  },
  onTakeControl: (entry) => toggleControl(entry),
  onClose: () => select(null),
});

function hudState() {
  const day = Math.floor(state.gameMinutes / 1440) + 1;
  const mins = state.gameMinutes % 1440;
  const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
  return {
    lang: state.lang,
    townName: TOWN_NAME,
    day,
    timeStr: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    pop: NPC_DEFS.length,
    maxPop: CONFIG.maxPopulation,
    paused: state.paused,
    speed: state.speed,
    quality: state.quality,
    fullscreen: !!document.fullscreenElement,
    controllingName: state.controlling ? state.controlling.def.name : null,
  };
}

const observer = new ObserverCamera(camera, renderer.domElement, {
  onClick: (x, y) => {
    if (state.controlling) return;
    const hit = pickAgent(camera, x, y, agents, renderer);
    select(hit);
  },
  onToggleFollow: () => {
    if (state.selected && !state.controlling) {
      observer.toggleFollow(state.selected.agent);
      panel.setFollowing(observer.mode === 'follow');
    }
  },
  onToggleFP: () => observer.toggleFP(),
  onEscape: () => {
    if (state.controlling) toggleControl(state.controlling);
    else select(null);
  },
});

// E key: work task progress when on shift near a station
let taskKey = 'restock';
let taskProgress = 0;
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'e' || !state.controlling) return;
  const c = state.controlling;
  if (!isWorkNow(c.def, state.gameMinutes)) return;
  const spot = PLACES[c.def.workPlace].spot;
  if (Math.hypot(c.agent.pos.x - spot.x, c.agent.pos.z - spot.z) > 18) return;
  const stations = (STATIONS[c.def.workPlace] || []).filter((s) => s.task === taskKey);
  if (!stations.length) return;
  const st = stations[Math.floor(Math.random() * stations.length)];
  const w = stationWorld(c.def.workPlace, st);
  if (Math.hypot(c.agent.pos.x - w.x, c.agent.pos.z - w.z) > 3.5) return;
  taskProgress += 0.25;
  if (taskProgress >= 1) {
    taskProgress = 0;
    const ws = workStates.get(c.id);
    const ev = completeTask(ws);
    toast(t(state.lang, 'work.taskDone'));
    if (ev.praise) toast(t(state.lang, 'work.praise'));
    const keys = ['restock', 'serve', 'organize'];
    taskKey = keys[Math.floor(Math.random() * keys.length)];
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

applyQuality(state.quality);
setLang(state.lang);
hud.setNpcs(agents.map((a) => ({ id: a.id, name: a.def.name })), state.lang);
setBoot('ready');

// -------------------------------------------------------------------- loop --
let last = performance.now();
let booted = false;

function handleWorkEvents(events, entry) {
  const L = state.lang;
  for (const ev of events) {
    switch (ev.type) {
      case 'shiftStart': toast(`${t(L, 'work.shiftStart')} ${t(L, `places.${ev.place}`)}`); break;
      case 'onTime': toast(t(L, 'work.onTime')); break;
      case 'late': toast(t(L, 'work.late')); break;
      case 'paid': toast(`${t(L, 'work.paid')} ${ev.amount.toFixed(2)} ${t(L, 'work.money')}`); break;
    }
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  const dtGameMin = state.paused ? 0 : (dt * CONFIG.timeScale / 60) * state.speed;
  state.gameMinutes += dtGameMin;

  const skyInfo = sky.update(state.gameMinutes, observer.target);
  town.setNight(skyInfo.night);
  town.update(observer.target.x, observer.target.z);
  traffic.update(dtGameMin);

  for (const a of agents) {
    a.agent.update(a.agent.controlled ? 0 : dtGameMin, state.gameMinutes);
    a.group.position.set(a.agent.pos.x, 0, a.agent.pos.z);
    a.group.rotation.y = a.agent.heading;
    poseCharacter(a.parts, a.agent);
    a.marker.material.opacity = 0.55 + 0.45 * Math.sin(now / 300 + a.id * 1.7);
  }

  // work system for the controlled NPC
  if (state.controlling) {
    const c = state.controlling;
    const ws = workStates.get(c.id);
    if (ws) {
      const spot = PLACES[c.def.workPlace].spot;
      const atWork = isWorkNow(c.def, state.gameMinutes) &&
        Math.hypot(c.agent.pos.x - spot.x, c.agent.pos.z - spot.z) < 18;
      const events = workUpdate(ws, state.gameMinutes, atWork, dtGameMin);
      if (events.length) handleWorkEvents(events, c);
      if (isWorkNow(c.def, state.gameMinutes)) {
        const stations = (STATIONS[c.def.workPlace] || []).filter((s) => s.task === taskKey);
        let near = false;
        if (stations.length) {
          const w = stationWorld(c.def.workPlace, stations[0]);
          near = Math.hypot(c.agent.pos.x - w.x, c.agent.pos.z - w.z) < 3.5;
        }
        workUi.update({
          lang: state.lang,
          placeName: t(state.lang, `places.${c.def.workPlace}`),
          taskKey, progress: taskProgress, near,
          money: ws.money, approval: ws.approval,
        });
      } else {
        workUi.update(null);
      }
    } else {
      workUi.update(null);
    }
  } else {
    workUi.update(null);
  }

  if (state.selected) {
    ring.position.x = state.selected.agent.pos.x;
    ring.position.z = state.selected.agent.pos.z;
    panel.update();
  }

  observer.update(dt);
  hud.update(hudState());
  renderer.render(scene, camera);

  if (!booted) {
    booted = true;
    document.getElementById('boot').style.display = 'none';
  }
}
requestAnimationFrame(frame);

// debug handle (no secrets, local only)
window.__HUMANS = { state, agents, scene, town, sky, observer, workStates, CONFIG, TOWN_NAME };
