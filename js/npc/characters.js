// Low-poly humanoid NPC meshes with procedural walk/sit animation.

import * as THREE from 'three';

const skinMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });

function limb(w, h, d, color) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, -h / 2, 0); // pivot at the top (hip / shoulder)
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
  m.castShadow = true;
  return m;
}

export function buildHumanoid(appearance) {
  const group = new THREE.Group();
  const parts = {};

  const legL = limb(0.16, 0.78, 0.18, appearance.pants);
  const legR = limb(0.16, 0.78, 0.18, appearance.pants);
  legL.position.set(-0.11, 0.78, 0);
  legR.position.set(0.11, 0.78, 0);
  parts.legL = legL; parts.legR = legR;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.24, 0.5, 4, 10),
    new THREE.MeshStandardMaterial({ color: appearance.shirt, roughness: 0.85 }),
  );
  body.position.y = 1.08;
  body.castShadow = true;
  parts.body = body;

  const armL = limb(0.11, 0.62, 0.13, appearance.shirt);
  const armR = limb(0.11, 0.62, 0.13, appearance.shirt);
  armL.position.set(-0.33, 1.42, 0);
  armR.position.set(0.33, 1.42, 0);
  parts.armL = armL; parts.armR = armR;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 14, 12),
    new THREE.MeshStandardMaterial({ color: appearance.skin, roughness: 0.7 }),
  );
  head.position.y = 1.68;
  head.castShadow = true;
  parts.head = head;

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: appearance.hair, roughness: 1 }),
  );
  hair.position.set(0, 1.71, -0.02);
  parts.hair = hair;

  group.add(legL, legR, body, armL, armR, head, hair);
  return { group, parts };
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
  sprite.scale.set(3.4, 0.85, 1);
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
  s.scale.set(0.7, 0.7, 1);
  s.position.y = 2.75;
  s.renderOrder = 9;
  return s;
}

// procedural pose; phase in radians, from agent.walkPhase; now = ms timestamp
export function poseCharacter(parts, agent, now = 0) {
  const p = parts;
  const id = agent.def ? agent.def.id : 0;
  if (agent.state === 'sit') {
    p.legL.rotation.x = -1.35; p.legR.rotation.x = -1.35;
    p.legL.position.y = 0.45; p.legR.position.y = 0.45;
    p.body.position.y = 0.78;
    p.armL.rotation.x = -0.5; p.armR.rotation.x = -0.5;
    p.head.position.y = 1.38; p.hair.position.y = 1.41;
    p.head.rotation.y = Math.sin(now / 1600 + id * 2.1) * 0.3;
  } else {
    p.legL.position.y = 0.78; p.legR.position.y = 0.78;
    p.head.position.y = 1.68; p.hair.position.y = 1.71;
    if (agent.state === 'walk') {
      const s = Math.sin(agent.walkPhase) * 0.65;
      p.legL.rotation.x = s; p.legR.rotation.x = -s;
      p.armL.rotation.x = -s * 0.8; p.armR.rotation.x = s * 0.8;
      p.body.position.y = 1.08 + Math.abs(Math.sin(agent.walkPhase)) * 0.04;
      p.head.rotation.y = 0;
    } else {
      // idle: breathing + looking around
      const breath = Math.sin(now / 900 + id * 1.3);
      p.legL.rotation.x = 0; p.legR.rotation.x = 0;
      p.armL.rotation.x = breath * 0.05; p.armR.rotation.x = -breath * 0.05;
      p.body.position.y = 1.08 + breath * 0.015;
      p.head.rotation.y = Math.sin(now / 1700 + id * 2.7) * 0.4;
    }
  }
}
