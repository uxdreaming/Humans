// HUMANS - entry point.
// Stage 1: observation mode over a living village.
// Stage 2: take control of an NPC (3rd/1st person) + playable supermarket shift.

import * as THREE from 'three';
import { CONFIG, PITCH } from './core/config.js';
import { t } from './core/i18n.js';
import { rngFor } from './core/rng.js';
import { TOWN_NAME, PLACES, STATIONS, stationWorld, randomSpotIn, lotsOf, worldToBlock, nearestStreetName } from './world/layout.js';
import { createChat } from './ui/chat.js';
import { respond } from './ai/dialogue.js';
import { createVoice } from './ai/voice.js';
import { Interiors } from './world/interior.js';
import { ENTERABLE, INTERIOR_SPECS } from './world/interiorSpecs.js';
import { UNLOCKS, newlyUnlocked } from './core/unlocks.js';
import { Town, Traffic } from './world/town.js';
import { createCars } from './world/cars.js';
import { Sky } from './world/sky.js';
import { EffectComposer } from '../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { NPC_DEFS, scheduleEntryAt } from './npc/data.js';
import { Agent } from './npc/agents.js';
import { WorkState, workUpdate, completeTask, isWorkNow } from './npc/work.js';
import { buildHumanoid, makeNameSprite, makeMarkerSprite, makeBubbleSprite, poseCharacter } from './npc/characters.js';
import { ObserverCamera } from './player/camera.js';
import { pickAgent } from './player/picking.js';
import { createHud } from './ui/hud.js';
import { createPanel } from './ui/panel.js';
import { createWorkUi } from './ui/work.js';
import { createToasts } from './ui/toast.js';
import { createStartScreen } from './ui/start.js';

const bootMsg = document.getElementById('boot-msg');
const setBoot = (m) => { if (bootMsg) bootMsg.textContent = m; };

// URL params for debugging / weak machines: ?q=low|medium|high  ?chunks=N
const qs = new URLSearchParams(location.search);
if (qs.get('q')) localStorage.setItem('humans.quality', qs.get('q'));
if (qs.get('chunks')) CONFIG.renderChunkRadius = Math.max(0, Math.min(3, parseInt(qs.get('chunks'), 10) || 1));

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

// bloom post-processing (disabled on low quality)
let composer = null;
let bloomPass = null;
function buildComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.7, 0.82);
  composer.addPass(bloomPass);
}
buildComposer();

setBoot('building town…');
const town = new Town(scene);
const sky = new Sky(scene);
const traffic = new Traffic(scene);
const cars = createCars(scene); // buyable/drivable cars

// ------------------------------------------------------------------ agents --
setBoot('waking up the inhabitants…');
const agents = NPC_DEFS.map((def) => {
  const agent = new Agent(def);
  const { group, parts } = buildHumanoid(def.appearance);
  group.traverse((o) => { o.userData.npcId = def.id; });
  group.add(makeNameSprite(def.name));
  const marker = makeMarkerSprite();
  group.add(marker);
  const bubble = makeBubbleSprite();
  group.add(bubble);
  group.position.set(agent.pos.x, 0, agent.pos.z);
  scene.add(group);
  return { id: def.id, def, agent, group, parts, marker, bubble };
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
  driving: null, // CarEntity being driven
  unlocked: new Set(),
  priceMult: 1,   // car discount unlock
  busPass: false, // bus pass unlock
  interior: null, // { kind, spec, slot, door } while inside a building
  chatWith: null, // agent entry the chat panel is open with
};

const toast = createToasts();
const workUi = createWorkUi();

const voice = createVoice();
const interiors = new Interiors(scene);
// dynamic player<->NPC relationships built through conversation: `${minId}-${maxId}` -> { strength, memory }
const chatRels = new Map();

// start screen: NPC search — picking one starts the game controlling them
// (declared before setLang/applyQuality run at the bottom of the module)
const startScreen = createStartScreen({
  onPick: (a) => {
    startScreen.hide();
    state.paused = false;
    toggleControl(a);
  },
  onObserve: () => {
    startScreen.hide();
    state.paused = false;
  },
});

function applyQuality(q) {
  state.quality = q;
  localStorage.setItem('humans.quality', q);
  const pr = q === 'low' ? 1 : q === 'medium' ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio;
  renderer.setPixelRatio(pr);
  composer?.setPixelRatio(pr);
  renderer.shadowMap.enabled = q !== 'low';
  if (bloomPass) bloomPass.enabled = q !== 'low';
  sky.setQuality(q);
}

function setLang(l) {
  state.lang = l;
  localStorage.setItem('humans.lang', l);
  panel.setLang(l);
  panel.setHint(l);
  chatUi.setLang(l);
  startScreen.setLang(l);
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
    if (state.interior) exitInterior();
    if (state.chatWith) closeChat();
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
  onTalk: (entry) => { if (state.controlling && entry !== state.controlling) openChat(entry); },
  onClose: () => select(null),
});

// ------------------------------------------------------------- chat/voice --
function relFor(aId, bId) {
  const key = `${Math.min(aId, bId)}-${Math.max(aId, bId)}`;
  if (!chatRels.has(key)) {
    const seeded = NPC_DEFS[aId].relationships.find((r) => r.id === bId);
    chatRels.set(key, {
      strength: seeded ? seeded.strength : 30,
      memory: { greeted: false, rng: rngFor(CONFIG.seed, 'chat', key) },
    });
  }
  return chatRels.get(key);
}

function openChat(entry) {
  if (!state.controlling || entry === state.controlling) return;
  state.chatWith = entry;
  const c = state.controlling;
  entry.agent.chatWith = c.agent;
  c.agent.chatWith = entry.agent;
  entry.agent.chatUntil = state.gameMinutes + 60;
  c.agent.chatUntil = state.gameMinutes + 60;
  chatUi.open(entry.def.name, state.lang);
  sendChat('hola'); // opening line starts the conversation
}

function closeChat() {
  if (state.chatWith) state.chatWith.agent.chatWith = null;
  if (state.controlling) state.controlling.agent.chatWith = null;
  state.chatWith = null;
  voice.stop();
  chatUi.setListening(false);
  chatUi.close();
}

function sendChat(text) {
  const o = state.chatWith;
  const c = state.controlling;
  if (!o || !c || !text.trim()) return;
  chatUi.addMsg('you', text);
  const rel = relFor(c.id, o.id);
  const { text: reply, relDelta } = respond({
    def: o.def, agent: o.agent, rel, playerName: c.def.name,
    text, lang: state.lang, memory: rel.memory,
  });
  rel.strength = Math.max(0, Math.min(100, rel.strength + relDelta));
  o.agent.needs.social = Math.min(100, o.agent.needs.social + 8);
  c.agent.needs.social = Math.min(100, c.agent.needs.social + 8);
  o.agent.chatUntil = state.gameMinutes + 20;
  o.agent.chatWith = c.agent;
  chatUi.addMsg('npc', reply);
  if (voice.ttsAvailable) voice.speak(reply, state.lang);
  chatUi.focus();
}

function toggleMic() {
  if (!voice.micAvailable) { toast(t(state.lang, 'chat.micUnavailable')); return; }
  if (voice.listening) { voice.stop(); chatUi.setListening(false); return; }
  const ok = voice.start({
    lang: state.lang,
    onResult: (txt) => sendChat(txt),
    onEnd: () => chatUi.setListening(false),
    onError: () => { chatUi.setListening(false); toast(t(state.lang, 'chat.micUnavailable')); },
  });
  chatUi.setListening(ok);
}

const chatUi = createChat({
  onSend: (txt) => sendChat(txt),
  onMicToggle: toggleMic,
  micAvailable: voice.micAvailable,
});

// -------------------------------------------------------------- interiors --
function nearestTalkable(pos, maxD) {
  let best = null, bd = maxD;
  for (const a of agents) {
    if (state.controlling && a === state.controlling) continue;
    const d = Math.hypot(a.agent.pos.x - pos.x, a.agent.pos.z - pos.z);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

function nearestEnterable(pos) {
  // landmark buildings: the place spot is right in front of the door
  for (const id of Object.keys(PLACES)) {
    const p = PLACES[id];
    if (!ENTERABLE.has(p.kind)) continue;
    if (Math.hypot(pos.x - p.spot.x, pos.z - p.spot.z) < 4.5) {
      return { kind: p.kind, door: { ...p.spot }, label: t(state.lang, `places.${id}`) };
    }
  }
  // houses / apartments: door at the front centre of the lot
  const b = worldToBlock(pos.x, pos.z);
  let best = null, bd = 3.4;
  for (let i = b.i - 1; i <= b.i + 1; i++) {
    for (let j = b.j - 1; j <= b.j + 1; j++) {
      for (const lot of lotsOf(i, j)) {
        if (lot.kind !== 'house' && lot.kind !== 'apartment') continue;
        const cx = i * PITCH + lot.ox, cz = j * PITCH + lot.oz;
        const front = lot.rotY ? -1 : 1;
        const dx = cx, dz = cz + front * (lot.d / 2 + 0.4);
        const d = Math.hypot(pos.x - dx, pos.z - dz);
        if (d < bd) {
          bd = d;
          best = {
            kind: lot.kind === 'apartment' ? 'apartment' : 'home',
            door: { x: dx, z: dz },
            label: nearestStreetName(dx, dz),
          };
        }
      }
    }
  }
  return best;
}

function enterInterior(kind, doorWorld, label) {
  const spec = INTERIOR_SPECS[kind];
  if (!spec || !state.controlling) return;
  const slot = interiors.slotFor(kind);
  interiors.ensure(kind);
  state.interior = { kind, spec, slot, door: doorWorld };
  observer.enterInterior(spec, slot, doorWorld);
  toast(`${t(state.lang, 'enter.inside')} ${label}`);
}

function exitInterior() {
  const cur = state.interior;
  if (!cur) return;
  const c = state.controlling;
  if (c) {
    c.agent.pos.x = cur.door.x;
    c.agent.pos.z = cur.door.z;
    c.agent.moving = false;
    c.agent.state = 'idle';
  }
  state.interior = null;
  observer.exitInterior();
}

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
    money: (state.controlling && workStates.get(state.controlling.id)?.money)
      ?? (state.selected && workStates.get(state.selected.id)?.money) ?? null,
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
  onNearestNpc: () => {
    if (state.controlling) return;
    let best = null, bd = Infinity;
    for (const a of agents) {
      const d = Math.hypot(a.agent.pos.x - observer.target.x, a.agent.pos.z - observer.target.z);
      if (d < bd) { bd = d; best = a; }
    }
    if (best) {
      select(best);
      observer.stopFollow();
      observer.target.set(best.agent.pos.x, 1.4, best.agent.pos.z);
      observer.dist = Math.min(observer.dist, 16);
    }
  },
  onEscape: () => {
    if (state.controlling) toggleControl(state.controlling);
    else select(null);
  },
});

// E key: drive/buy cars, or work task progress when on shift near a station
let taskKey = 'restock';
let taskProgress = 0;
const promptEl = document.getElementById('prompt');
const driveEl = document.getElementById('drive');

function setPrompt(text) {
  if (!text) { promptEl.classList.add('hidden'); return; }
  promptEl.textContent = text;
  promptEl.classList.remove('hidden');
}

function nearestCar(pos, maxD) {
  let best = null, bd = maxD;
  for (const car of cars) {
    const d = Math.hypot(car.pos.x - pos.x, car.pos.z - pos.z);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

function enterDrive(car) {
  if (car.fuel <= 0) { toast(t(state.lang, 'drive.emptyTank')); return; }
  state.driving = car;
  observer.drive(car);
  if (state.controlling) state.controlling.group.visible = false;
  toast(t(state.lang, 'drive.enter'));
}

function exitDrive() {
  const car = state.driving;
  if (!car) return;
  observer.exitDrive(); // back to control mode
  const c = state.controlling;
  if (c) {
    c.group.visible = true;
    const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
    c.agent.pos.x = car.pos.x + side.x * 2.4;
    c.agent.pos.z = car.pos.z + side.z * 2.4;
    c.agent.moving = false;
    c.agent.state = 'idle';
  }
  state.driving = null;
  toast(t(state.lang, 'drive.exit'));
}

function carPrice(car) { return Math.round(car.spec.price * state.priceMult); }

function tryBuyOrEnter(car) {
  const ws = workStates.get(state.controlling.id);
  const price = carPrice(car);
  if (!car.owned) {
    if (!ws || ws.money < price) { toast(t(state.lang, 'drive.noMoney')); return; }
    ws.money -= price;
    car.owned = true;
    car.tag.visible = false;
    toast(`${t(state.lang, 'drive.bought')} (${price}€)`);
  }
  enterDrive(car);
}

function tryRefuel() {
  const c = state.controlling;
  if (!c) return;
  const ws = workStates.get(c.id);
  const gas = PLACES.gas.spot;
  const nearGas = Math.hypot(c.agent.pos.x - gas.x, c.agent.pos.z - gas.z) < 10
    || (state.driving && Math.hypot(state.driving.pos.x - gas.x, state.driving.pos.z - gas.z) < 12);
  if (!nearGas) return;
  const car = state.driving || cars.find((x) => x.owned);
  if (!car || car.fuel >= 99) return;
  if (!ws || ws.money < CONFIG.refuelCost) { toast(t(state.lang, 'drive.noMoney')); return; }
  ws.money -= CONFIG.refuelCost;
  car.fuel = 100;
  toast(`${t(state.lang, 'drive.refueled')} (-${CONFIG.refuelCost}€)`);
}

window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return; // typing in the chat input
  const k = e.key.toLowerCase();
  if (!state.controlling) return;
  if (k === 'e') {
    if (state.driving) { exitDrive(); return; }
    if (state.interior) { exitInterior(); return; }
    const pos = state.controlling.agent.pos;
    const talker = nearestTalkable(pos, 4);
    if (talker) { openChat(talker); return; }
    const ent = nearestEnterable(pos);
    if (ent) { enterInterior(ent.kind, ent.door, ent.label); return; }
    const car = nearestCar(pos, 3.6);
    if (car) { tryBuyOrEnter(car); return; }
    // bus stop: travel to the main plaza with the bus pass unlock
    const bs = PLACES.busstop.spot;
    if (Math.hypot(state.controlling.agent.pos.x - bs.x, state.controlling.agent.pos.z - bs.z) < 4.5) {
      const ws = workStates.get(state.controlling.id);
      if (state.busPass) {
        if (ws && ws.money >= 2) {
          ws.money -= 2;
          const s = randomSpotIn('plaza', Math.random);
          state.controlling.agent.pos.x = s.x;
          state.controlling.agent.pos.z = s.z;
          toast(t(state.lang, 'bus.travel'));
        } else toast(t(state.lang, 'drive.noMoney'));
      } else toast(t(state.lang, 'bus.needPass'));
      return;
    }
    doWorkTask();
  }
  if (k === 'r') tryRefuel();
});

function doWorkTask() {
  const c = state.controlling;
  if (!isWorkNow(c.def, state.gameMinutes)) return;
  const spot = PLACES[c.def.workPlace].spot;
  if (Math.hypot(c.agent.pos.x - spot.x, c.agent.pos.z - spot.z) > 18) return;
  const stations = (STATIONS[c.def.workPlace] || []).filter((s) => s.task === taskKey);
  if (!stations.length) return;
  const st = stations[Math.floor(Math.random() * stations.length)];
  const w = stationWorld(c.def.workPlace, st);
  if (Math.hypot(c.agent.pos.x - w.x, c.agent.pos.z - w.z) > 3.5) return;
  const ws0 = workStates.get(c.id);
  const hungerFactor = ws0 && c.agent.needs.hunger < 30 ? 0.5 : 1; // hungry => slower work
  taskProgress += 0.25 * hungerFactor;
  if (taskProgress >= 1) {
    taskProgress = 0;
    const ws = workStates.get(c.id);
    const ev = completeTask(ws);
    toast(t(state.lang, 'work.taskDone'));
    if (ev.praise) toast(t(state.lang, 'work.praise'));
    const keys = ['restock', 'serve', 'organize', 'clean'];
    taskKey = keys[Math.floor(Math.random() * keys.length)];
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer?.setSize(window.innerWidth, window.innerHeight);
});

applyQuality(state.quality);
setLang(state.lang);
hud.setNpcs(agents.map((a) => ({ id: a.id, name: a.def.name })), state.lang);
panel.setUnlocks(state.unlocked);
setBoot('ready');

// -------------------------------------------------------------------- loop --
let last = performance.now();
let booted = false;
let chatTick = 0;
let customer = null; // visual customer at the counter while the "serve" task is active

function ensureCustomer(c, now) {
  const spot = PLACES[c.def.workPlace].spot;
  const inWorkArea = Math.hypot(c.agent.pos.x - spot.x, c.agent.pos.z - spot.z) < 18;
  const want = isWorkNow(c.def, state.gameMinutes) && inWorkArea && taskKey === 'serve';
  if (want && !customer) {
    const def = NPC_DEFS[(c.id + 7) % NPC_DEFS.length];
    const { group, parts } = buildHumanoid(def.appearance);
    const counter = stationWorld(c.def.workPlace, (STATIONS[c.def.workPlace] || []).find((s) => s.task === 'serve'));
    group.position.set(counter.x, 0, counter.z + 2.5);
    scene.add(group);
    customer = { group, parts, agent: { state: 'idle', walkPhase: 0, def } };
  } else if (!want && customer) {
    scene.remove(customer.group);
    customer = null;
  }
  if (customer) poseCharacter(customer.parts, customer.agent, now);
}

function handleWorkEvents(events, entry) {
  const L = state.lang;
  for (const ev of events) {
    switch (ev.type) {
      case 'shiftStart': toast(`${t(L, 'work.shiftStart')} ${t(L, `places.${ev.place}`)}`); break;
      case 'onTime': toast(t(L, 'work.onTime')); break;
      case 'late': toast(t(L, 'work.late')); break;
      case 'abandon': toast(t(L, 'work.abandon')); break;
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
  for (const c of cars) c.setNight(skyInfo.night);
  town.update(observer.target.x, observer.target.z);
  town.animate(dt);
  traffic.update(dtGameMin);

  // NPCs that end up close together start chatting (face each other + bubble)
  chatTick -= dt;
  if (chatTick <= 0) {
    chatTick = 0.5;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const A = agents[i].agent, B = agents[j].agent;
        if (A.controlled || B.controlled || A.moving || B.moving) continue;
        if (Math.hypot(A.pos.x - B.pos.x, A.pos.z - B.pos.z) < 3.2) {
          A.chatUntil = state.gameMinutes + 4;
          B.chatUntil = state.gameMinutes + 4;
          A.chatWith = B;
          B.chatWith = A;
        }
      }
    }
  }

  for (const a of agents) {
    a.agent.update(a.agent.controlled ? 0 : dtGameMin, state.gameMinutes);
    if (a.agent.chatWith && (a.agent.chatUntil || 0) > state.gameMinutes && !a.agent.controlled && !a.agent.moving) {
      const o = a.agent.chatWith;
      a.agent.heading = Math.atan2(o.pos.x - a.agent.pos.x, o.pos.z - a.agent.pos.z);
    }
    a.group.position.set(a.agent.pos.x, 0, a.agent.pos.z);
    a.group.rotation.y = a.agent.heading;
    poseCharacter(a.parts, a.agent, now);
    a.marker.material.opacity = 0.55 + 0.45 * Math.sin(now / 300 + a.id * 1.7);
    a.bubble.visible = (a.agent.chatUntil || 0) > state.gameMinutes && !a.agent.controlled;
  }

  // while inside a building, render the controlled NPC at the room position
  if (state.interior && state.controlling && observer.roomPos) {
    const c = state.controlling;
    c.group.position.set(state.interior.slot.x + observer.roomPos.x, 0, state.interior.slot.z + observer.roomPos.z);
    c.group.rotation.y = c.agent.heading;
  }

  // driving: fuel consumption + drive HUD + prompt
  if (state.driving) {
    const car = state.driving;
    car.fuel = Math.max(0, car.fuel - Math.abs(car.speed) * dt * CONFIG.carFuelPerMetre);
    if (car.fuel === 0 && !car._warned) { car._warned = true; toast(t(state.lang, 'drive.emptyTank')); }
    if (car.fuel > 0) car._warned = false;
    const kmh = Math.round(Math.abs(car.speed) * 3.6);
    const ws = workStates.get(state.controlling?.id);
    driveEl.innerHTML = `
      <div class="spd">${kmh} <small>${t(state.lang, 'drive.speed')}</small></div>
      <div class="bar"><div style="width:${Math.round(car.fuel)}%"></div></div>
      <div class="lbl">${t(state.lang, 'drive.fuel')} ${Math.round(car.fuel)}% · ${t(state.lang, 'drive.exit')}</div>
      ${ws ? `<div class="money">${Math.floor(ws.money)}€</div>` : ''}
    `;
    driveEl.classList.remove('hidden');
    setPrompt(null);
  } else {
    driveEl.classList.add('hidden');
    // interaction prompt when controlling on foot
    if (state.controlling) {
      if (state.interior) {
        setPrompt(t(state.lang, 'enter.exit'));
      } else {
        const pos = state.controlling.agent.pos;
        const talker = nearestTalkable(pos, 4);
        const ent = talker ? null : nearestEnterable(pos);
        if (talker) setPrompt(t(state.lang, 'chat.talkPrompt').replace('{name}', talker.def.name));
        else if (ent) setPrompt(t(state.lang, 'enter.enter'));
        else {
          const car = nearestCar(pos, 3.6);
          if (car) {
            setPrompt(car.owned ? t(state.lang, 'drive.enter') : `${t(state.lang, 'drive.buy')} ${carPrice(car)}€`);
          } else if (Math.hypot(pos.x - PLACES.busstop.spot.x, pos.z - PLACES.busstop.spot.z) < 4.5) {
            setPrompt(state.busPass ? t(state.lang, 'bus.prompt') : t(state.lang, 'bus.needPass'));
          } else {
            const gas = PLACES.gas.spot;
            if (Math.hypot(pos.x - gas.x, pos.z - gas.z) < 10
              && cars.some((c) => c.owned && c.fuel < 99)) {
              setPrompt(`${t(state.lang, 'drive.refuel')} ${CONFIG.refuelCost}€`);
            } else setPrompt(null);
          }
        }
      }
    } else setPrompt(null);
  }

  // work system for the controlled NPC
  if (state.controlling) {
    const c = state.controlling;
    ensureCustomer(c, now);
    const ws = workStates.get(c.id);
    if (ws) {
      // unlock / achievement checks against money, approval and tasks
      for (const id of newlyUnlocked(ws, state.unlocked)) {
        state.unlocked.add(id);
        toast(`🏆 ${t(state.lang, `unlocks.${id}.name`)} — ${t(state.lang, `unlocks.${id}.desc`)}`);
        if (id === 'promotion') ws.salaryMult = 1.5;
        if (id === 'car_discount') state.priceMult = 0.7;
        if (id === 'bus_pass') state.busPass = true;
      }
    }
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
          salary: Math.round(ws.salaryPerHour * (ws.salaryMult || 1) * 10) / 10,
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
  if (composer) composer.render();
  else renderer.render(scene, camera);

  if (!booted) {
    booted = true;
    document.getElementById('boot').style.display = 'none';
    startScreen.show(agents, state.lang); // clock stays paused until a choice is made
  }
}

// self-test hook: ?selftest=1 picks the first NPC automatically and reports the result
// (runs synchronously at module end so it can be read even if the GPU dies later)
if (qs.get('selftest')) {
  {
    const a = agents[0];
    try {
      startScreen.hide();
      state.paused = false;
      toggleControl(a);
      openChat(agents[1]);
      const chatOk = state.chatWith === agents[1] && chatUi.isOpen();
      enterInterior('market', PLACES.market.spot, 'market');
      const interiorOk = observer.mode === 'interior' && !!state.interior;
      exitInterior();
      window.__SELFTEST = {
        picked: a.def.name,
        controlling: state.controlling ? state.controlling.def.name : null,
        mode: observer.mode,
        controlled: a.agent.controlled,
        startHidden: startScreen.visible === false,
        chatOk,
        interiorOk,
        modeAfterExit: observer.mode,
        error: null,
      };
      console.log('SELFTEST-RESULT', JSON.stringify(window.__SELFTEST));
    } catch (err) {
      window.__SELFTEST = { error: String((err && err.stack) || err) };
      console.log('SELFTEST-RESULT', JSON.stringify(window.__SELFTEST));
    }
  }
}
if (!qs.get('noframe')) requestAnimationFrame(frame); // ?noframe=1 skips the render loop (debug)
else document.getElementById('boot').style.display = 'none';

// debug handle (no secrets, local only)
window.__HUMANS = { state, agents, scene, town, sky, observer, workStates, CONFIG, TOWN_NAME, interiors, voice, chatUi };
