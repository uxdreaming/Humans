// Drivable / buyable cars. buildCarMesh lives here so town.js (traffic) and
// main.js (player cars) share it.

import * as THREE from 'three';
import { CAR_SPECS } from './layout.js';
import { makeTextTexture } from './textures.js';

// shared emissive mats so town.setNight can switch all car lights at once
export const headlightMat = new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xfff2b0, emissiveIntensity: 0 });
export const taillightMat = new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0xff2211, emissiveIntensity: 0 });

export function buildCarMesh(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 4.2), bodyMat);
  body.position.y = 0.55; body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.2, metalness: 0.3 }));
  cabin.position.set(0, 0.95, -0.2); cabin.castShadow = true;
  g.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 });
  for (const [wx, wz] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(wx, 0.32, wz);
    g.add(w);
  }
  // headlights / taillights (glow at night via town.setNight)
  const lightGeo = new THREE.BoxGeometry(0.38, 0.14, 0.06);
  for (const wx of [-0.55, 0.55]) {
    const h = new THREE.Mesh(lightGeo, headlightMat);
    h.position.set(wx, 0.55, 2.12);
    const tl = new THREE.Mesh(lightGeo, taillightMat);
    tl.position.set(wx, 0.55, -2.12);
    g.add(h, tl);
  }
  return g;
}

export class CarEntity {
  constructor(spec) {
    this.spec = spec;
    this.pos = { x: spec.pos.x, z: spec.pos.z };
    this.heading = spec.rotY;
    this.speed = 0;
    this.fuel = 100;
    this.owned = false;
    this.mesh = buildCarMesh(spec.color);
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    // price tag sprite (hidden once bought)
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeTextTexture(`${spec.price}€`, { bg: '#1d4e89', fg: '#ffffff', font: 60, w: 256, h: 96 }),
      transparent: true, depthTest: false,
    }));
    tag.scale.set(2.2, 0.8, 1);
    tag.position.y = 2.6;
    tag.renderOrder = 10;
    this.mesh.add(tag);
    this.tag = tag;
  }

  setNight(night) {
    headlightMat.emissiveIntensity = night * 3;
    taillightMat.emissiveIntensity = night * 1.8;
  }
}

export function createCars(scene) {
  return CAR_SPECS.map((spec) => {
    const car = new CarEntity(spec);
    scene.add(car.mesh);
    return car;
  });
}
