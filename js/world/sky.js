// Day/night cycle: sun + moon directional lights, hemisphere ambient, sky/fog
// colour keyframes, stars and sun/moon discs on a dome around the camera.

import * as THREE from 'three';

// [hour, hex colour]
const SKY_KEYS = [
  [0, '#0a0e1f'], [4, '#0a0e1f'], [6, '#2c3160'], [7, '#ff9e64'], [8.5, '#8ec9ff'],
  [12, '#87ceeb'], [16, '#8ec9ff'], [18, '#ff8c5a'], [19.5, '#3a3470'], [21, '#0a0e1f'], [24, '#0a0e1f'],
];

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

function skyColorAt(hour) {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && hour > SKY_KEYS[i + 1][0]) i++;
  const [h0, c0] = SKY_KEYS[i];
  const [h1, c1] = SKY_KEYS[i + 1];
  const f = Math.min(1, Math.max(0, (hour - h0) / (h1 - h0)));
  tmpA.set(c0); tmpB.set(c1);
  return tmpA.lerp(tmpB, f);
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class Sky {
  constructor(scene) {
    this.scene = scene;
    scene.background = new THREE.Color('#87ceeb');
    scene.fog = new THREE.Fog('#87ceeb', 180, 1000);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -320;
    this.sun.shadow.camera.right = 320;
    this.sun.shadow.camera.top = 320;
    this.sun.shadow.camera.bottom = -320;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 1200;
    this.sun.shadow.bias = -0.0006;
    scene.add(this.sun, this.sun.target);

    this.moon = new THREE.DirectionalLight(0x9db4ff, 0);
    scene.add(this.moon, this.moon.target);

    this.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x51683f, 0.6);
    scene.add(this.hemi);

    // stars
    const starCount = 700;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const y = Math.random() * 0.95 + 0.05;
      const r = Math.sqrt(1 - y * y) * 780;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y * 780;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false,
    }));
    scene.add(this.stars);

    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }));
    this.moonDisc = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, fog: false }));
    scene.add(this.sunDisc, this.moonDisc);
  }

  setQuality(q) {
    const size = q === 'high' ? 2048 : q === 'medium' ? 1024 : 512;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    this.sun.castShadow = q !== 'low';
  }

  // gameMinutes: absolute game time in minutes; target: camera focus Vector3
  update(gameMinutes, target) {
    const hour = (gameMinutes / 60) % 24;
    const elev = Math.sin(((hour - 6) / 12) * Math.PI); // -1 .. 1
    const day = smoothstep(-0.08, 0.3, elev);
    const night = 1 - day;

    const col = skyColorAt(hour);
    this.scene.background.copy(col);
    this.scene.fog.color.copy(col).lerp(tmpB.set(0xffffff), 0.1);

    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const sd = new THREE.Vector3(Math.cos(sunAngle), Math.sin(sunAngle), 0.35).normalize();
    this.sun.position.copy(target).addScaledVector(sd, 400);
    this.sun.target.position.copy(target);
    this.sun.intensity = day * 2.6;
    this.sun.color.setHSL(0.1, 1 - day * 0.75, 0.6 + day * 0.05);

    const md = sd.clone().negate();
    this.moon.position.copy(target).addScaledVector(md, 400);
    this.moon.target.position.copy(target);
    this.moon.intensity = night * 0.35;

    this.hemi.intensity = 0.16 + day * 0.55;
    this.hemi.color.copy(col).lerp(tmpB.set(0xbfd9ff), 0.4 + day * 0.6);

    this.stars.material.opacity = Math.min(1, Math.max(0, -elev * 3)) * 0.9;
    this.stars.position.set(target.x, 0, target.z);

    this.sunDisc.position.copy(target).addScaledVector(sd, 720);
    this.sunDisc.visible = day > 0.02;
    this.moonDisc.position.copy(target).addScaledVector(md, 720);
    this.moonDisc.visible = night > 0.3;

    return { day, night, hour };
  }
}
