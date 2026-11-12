// Low-poly humanoid NPC meshes with procedural walk/sit animation.

import * as THREE from 'three';

const skinMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });

function limb(r, h, color) {
  const g = new THREE.CapsuleGeometry(r, Math.max(0.05, h - r * 2), 4, 10);
  g.translate(0, -h / 2, 0); // pivot at the top (hip / shoulder)
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  m.castShadow = true;
  return m;
}

// deterministic per-NPC hash from the appearance (stable hats/styles across loads)
function hash01(app) {
  let hsh = 2166136261;
  for (const k of ['skin', 'shirt', 'pants', 'hair']) {
    for (const ch of String(app[k])) { hsh ^= ch.charCodeAt(0); hsh = Math.imul(hsh, 16777619); }
  }
  return (hsh >>> 0) / 4294967296;
}

export function buildHumanoid(appearance) {
  const group = new THREE.Group();
  const parts = {};
  const rnd = hash01(appearance);

  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x241f1a, roughness: 0.9 });
  const legL = limb(0.085, 0.78, appearance.pants);
  const legR = limb(0.085, 0.78, appearance.pants);
  legL.position.set(-0.11, 0.78, 0);
  legR.position.set(0.11, 0.78, 0);
  for (const leg of [legL, legR]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.3), shoeMat);
    shoe.position.set(0, -0.74, 0.06);
    shoe.castShadow = true;
    leg.add(shoe);
  }
  parts.legL = legL; parts.legR = legR;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.5, 4, 12),
    new THREE.MeshStandardMaterial({ color: appearance.shirt, roughness: 0.8 }),
  );
  body.position.y = 1.1;
  body.castShadow = true;
  parts.body = body;

  const armL = limb(0.065, 0.6, appearance.shirt);
  const armR = limb(0.065, 0.6, appearance.shirt);
  armL.position.set(-0.35, 1.46, 0);
  armR.position.set(0.35, 1.46, 0);
  armL.rotation.z = 0.1;
  armR.rotation.z = -0.1;
  parts.armL = armL; parts.armR = armR;

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.085, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: appearance.skin, roughness: 0.7 }),
  );
  neck.position.y = 1.52;
  parts.neck = neck;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 16, 14),
    new THREE.MeshStandardMaterial({ color: appearance.skin, roughness: 0.65 }),
  );
  head.position.y = 1.7;
  head.castShadow = true;
  parts.head = head;

  const hairMat = new THREE.MeshStandardMaterial({ color: appearance.hair, roughness: 1 });
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.185, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  );
  hair.position.set(0, 1.73, -0.02);
  parts.hair = hair;
  const hairBack = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.5),
    hairMat,
  );
  hairBack.position.set(0, 1.68, -0.09);
  hairBack.scale.set(1, 1.15, 0.7);
  parts.hairBack = hairBack;

  // ~50% wear a hat (deterministic per NPC)
  if (rnd < 0.5) {
    const hatColor = [0x2e2018, 0x4a3b6e, 0x7a2e2e, 0x2e5a3a, 0xc9a24d][Math.floor(rnd * 5) % 5];
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.9 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.05, 12), hatMat);
    brim.position.y = 1.84;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.2, 12), hatMat);
    top.position.y = 1.93;
    group.add(brim, top);
    parts.hat = [brim, top];
  }

  group.add(legL, legR, body, armL, armR, neck, head, hair, hairBack);
  return { group, parts };
}

// chat bubble shown when two NPCs are talking
export function makeBubbleSprite() {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 88, 48, 14);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(30, 52); ctx.lineTo(24, 63); ctx.lineTo(44, 52); ctx.fill();
  ctx.fillStyle = '#1c2547';
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('…', 48, 28);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, visible: false }));
  s.scale.set(1.1, 0.75, 1);
  s.position.y = 2.5;
  s.renderOrder = 11;
  return s;
}

// name label sprite above the head
export function makeNameSprite(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 30px "Segoe UI", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = Math.min(250, ctx.measureText(text).width + 30);
  ctx.fillStyle = 'rgba(10,14,31,0.65)';
  ctx.beginPath();
  ctx.roundRect((256 - w) / 2, 6, w, 52, 12);
  ctx.fill();
  ctx.fillStyle = '#ffd479';
  ctx.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(4.4, 1.1, 1);
  sprite.position.y = 2.15;
  sprite.renderOrder = 10;
  return sprite;
}

// small glowing marker above the head so NPCs are easy to spot from far
export function makeMarkerSprite() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(255,212,121,0.35)';
  ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd479';
  ctx.beginPath(); ctx.arc(32, 32, 12, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(1.15, 1.15, 1);
  s.position.y = 2.9;
  s.renderOrder = 9;
  return s;
}

// procedural pose; phase in radians, from agent.walkPhase; now = ms timestamp
export function poseCharacter(parts, agent, now = 0) {
  const p = parts;
  const id = agent.def ? agent.def.id : 0;
  const setHead = (hy, hairY, backY) => {
    p.head.position.y = hy;
    if (p.hair) p.hair.position.y = hairY;
    if (p.hairBack) p.hairBack.position.y = backY;
  };
  if (agent.state === 'sit') {
    p.legL.rotation.x = -1.35; p.legR.rotation.x = -1.35;
    p.legL.position.y = 0.45; p.legR.position.y = 0.45;
    p.body.position.y = 0.8;
    p.body.rotation.x = 0.12;
    p.armL.rotation.x = -0.5; p.armR.rotation.x = -0.5;
    setHead(1.42, 1.45, 1.4);
    p.head.rotation.y = Math.sin(now / 1600 + id * 2.1) * 0.3;
  } else {
    p.legL.position.y = 0.78; p.legR.position.y = 0.78;
    setHead(1.7, 1.73, 1.68);
    if (agent.state === 'walk') {
      const s = Math.sin(agent.walkPhase) * 0.65;
      p.legL.rotation.x = s; p.legR.rotation.x = -s;
      p.armL.rotation.x = -s * 0.8; p.armR.rotation.x = s * 0.8;
      p.body.position.y = 1.1 + Math.abs(Math.sin(agent.walkPhase)) * 0.045;
      p.body.rotation.x = 0.06;
      p.head.rotation.y = 0;
    } else {
      // idle: breathing + looking around
      const breath = Math.sin(now / 900 + id * 1.3);
      p.legL.rotation.x = 0; p.legR.rotation.x = 0;
      p.armL.rotation.x = breath * 0.05; p.armR.rotation.x = -breath * 0.05;
      p.body.position.y = 1.1 + breath * 0.015;
      p.body.rotation.x = 0;
      p.head.rotation.y = Math.sin(now / 1700 + id * 2.7) * 0.4;
    }
  }
}
