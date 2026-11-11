// HUMANS - entry point. Stage 1: observation mode over a living village.

import * as THREE from 'three';
import { CONFIG } from './core/config.js';
import { t } from './core/i18n.js';
import { TOWN_NAME } from './world/layout.js';
import { Town } from './world/town.js';
import { Sky } from './world/sky.js';
import { NPC_DEFS } from './npc/data.js';
import { Agent } from './npc/agents.js';
import { buildHumanoid, makeNameSprite, poseCharacter } from './npc/characters.js';
import { ObserverCamera } from './player/camera.js';
import { pickAgent } from './player/picking.js';
import { createHud } from './ui/hud.js';
import { createPanel } from './ui/panel.js';

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

// ------------------------------------------------------------------ agents --
setBoot('waking up the inhabitants…');
const agents = NPC_DEFS.map((def) => {
  const agent = new Agent(def);
  const { group, parts } = buildHumanoid(def.appearance);
  group.traverse((o) => { o.userData.npcId = def.id; });
  group.add(makeNameSprite(def.name));
  group.position.set(agent.pos.x, 0, agent.pos.z);
  scene.add(group);
  return { id: def.id, def, agent, group, parts };
});

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
};

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
  hud.update(hudState());
  if (state.selected) panel.show({ def: state.selected.def, agent: state.selected.agent }, NPC_DEFS, l);
}

const hud = createHud({
  onPauseToggle: () => { state.paused = !state.paused; },
  onSpeed: (s) => { state.speed = s; state.paused = false; },
  onQuality: applyQuality,
  onLangToggle: () => setLang(state.lang === 'es' ? 'en' : 'es'),
  onFullscreen: () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  },
});

const panel = createPanel({
  onFollowToggle: (entry) => {
    if (state.selected !== entry) return;
    observer.toggleFollow(state.selected ? state.selected.agent : null);
    panel.setFollowing(observer.mode === 'follow');
  },
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
  };
}

function select(entry) {
  state.selected = entry;
  if (!entry) {
    panel.hide();
    ring.visible = false;
    observer.stopFollow();
    panel.setFollowing(false);
    return;
  }
  ring.visible = true;
  panel.show(entry, NPC_DEFS, state.lang);
}

const observer = new ObserverCamera(camera, renderer.domElement, {
  onClick: (x, y) => {
    const hit = pickAgent(camera, x, y, agents, renderer);
    if (hit) select(hit);
    else select(null);
  },
  onToggleFollow: () => {
    if (state.selected) {
      observer.toggleFollow(state.selected.agent);
      panel.setFollowing(observer.mode === 'follow');
    }
  },
  onEscape: () => select(null),
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

applyQuality(state.quality);
setLang(state.lang);
setBoot('ready');

// -------------------------------------------------------------------- loop --
let last = performance.now();
let booted = false;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  const dtGameMin = state.paused ? 0 : (dt * CONFIG.timeScale / 60) * state.speed;
  state.gameMinutes += dtGameMin;

  const skyInfo = sky.update(state.gameMinutes, observer.target);
  town.setNight(skyInfo.night);
  town.update(observer.target.x, observer.target.z);

  for (const a of agents) {
    a.agent.update(dtGameMin, state.gameMinutes);
    a.group.position.set(a.agent.pos.x, 0, a.agent.pos.z);
    a.group.rotation.y = a.agent.heading;
    poseCharacter(a.parts, a.agent);
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
window.__HUMANS = { state, agents, scene, town, sky, observer, CONFIG, TOWN_NAME };
