// Gårdsbebyggelsen: bostadshuset, vedboden och bryggan vid Skärsjön.
import * as THREE from 'three';
import { LAKE, WATER_Y, YARD } from './config.js';
import { scene } from './scene.js';
import { heightAt } from './terrain.js';

export function box(w, h, d, c, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Bostadshuset – falurött med vita knutar
export const house = new THREE.Group();
{
  const gy = heightAt(-6, -8);
  house.position.set(-6, gy, -8);
  box(8, 3.4, 6, 0x7d2b2b, 0, 1.7, 0, house);                    // stomme
  box(0.4, 3.4, 6.1, 0xe9e4d8, -4, 1.7, 0, house); box(0.4, 3.4, 6.1, 0xe9e4d8, 4, 1.7, 0, house); // knutar
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 4), new THREE.MeshLambertMaterial({ color: 0x4a4440 }));
  roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.85); roof.position.y = 4.7; roof.castShadow = true;
  house.add(roof);
  const door = box(1.2, 2.1, 0.15, 0x3f2f22, 0, 1.05, 3.05, house);
  box(1, 1, 0.1, 0xbfd4e0, -2.4, 2, 3.03, house, false); box(1, 1, 0.1, 0xbfd4e0, 2.4, 2, 3.03, house, false); // fönster
  box(0.7, 1.6, 0.7, 0x8a8377, 1.8, 5.6, 0, house); // skorsten
  door.userData.interact = { type: 'dörr', label: 'Sov till morgonen [E]' };
  scene.add(house);
}

// Vedbod
{
  const g = new THREE.Group();
  const gy = heightAt(6, -14);
  g.position.set(6, gy, -14);
  box(3.5, 2.2, 2.5, 0x6b4a33, 0, 1.1, 0, g);
  const r = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 3), new THREE.MeshLambertMaterial({ color: 0x4a4440 }));
  r.position.y = 2.35; r.rotation.z = 0.12; r.castShadow = true;
  g.add(r);
  scene.add(g);
}

// Bryggan vid Skärsjön
{
  const dir = new THREE.Vector2(YARD.x - LAKE.x, YARD.z - LAKE.z).normalize();
  let rr = LAKE.r + 20;
  while (heightAt(LAKE.x + dir.x * rr, LAKE.z + dir.y * rr) > WATER_Y && rr > 10) rr -= 1;
  const sx = LAKE.x + dir.x * (rr + 3), sz = LAKE.z + dir.y * (rr + 3);
  const dock = new THREE.Group();
  dock.position.set(sx, WATER_Y + 0.25, sz);
  dock.rotation.y = Math.atan2(-dir.x, -dir.y);
  box(1.6, 0.15, 9, 0x8a6f4d, 0, 0, -4, dock);
  for (let i = 0; i < 4; i++) {
    box(0.18, 1.6, 0.18, 0x6b543a, -0.7, -0.7, -1.5 - i * 2, dock);
    box(0.18, 1.6, 0.18, 0x6b543a, 0.7, -0.7, -1.5 - i * 2, dock);
  }
  scene.add(dock);
}
