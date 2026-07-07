// Djur: vilt (rådjur och harar) samt tamdjur (höns och får).
import * as THREE from 'three';
import { clamp, rand } from './utils.js';
import { W, WATER_Y } from './config.js';
import { scene } from './scene.js';
import { heightAt } from './terrain.js';
import { box } from './farm.js';
import { player } from './player.js';

export const wild = []; // rådjur & harar

function makeDeer() {
  const g = new THREE.Group();
  box(1.3, 0.7, 0.55, 0x8a6a48, 0, 1.0, 0, g);
  box(0.35, 0.6, 0.3, 0x8a6a48, 0.75, 1.5, 0, g);
  box(0.3, 0.32, 0.28, 0x94724e, 0.95, 1.95, 0, g);
  for (const p of [[-0.45, 0.2], [0.45, 0.2], [-0.45, -0.2], [0.45, -0.2]]) box(0.13, 0.7, 0.13, 0x7a5c3e, p[0], 0.35, p[1], g);
  return g;
}

function makeHare() {
  const g = new THREE.Group();
  box(0.45, 0.3, 0.28, 0x9a8a70, 0, 0.22, 0, g);
  box(0.2, 0.2, 0.2, 0xa89878, 0.28, 0.4, 0, g);
  box(0.05, 0.25, 0.1, 0xa89878, 0.32, 0.62, 0, g);
  return g;
}

export function spawnWild() {
  for (const a of wild) scene.remove(a.g);
  wild.length = 0;
  for (let i = 0; i < 6; i++) addWild('rådjur');
  for (let i = 0; i < 8; i++) addWild('hare');
}

export function addWild(kind) {
  let x, z, t = 0;
  do { x = rand(-W / 2 + 15, W / 2 - 15); z = rand(-W / 2 + 15, W / 2 - 15); t++; }
  while ((heightAt(x, z) < WATER_Y + 0.5 || Math.hypot(x, z) < 35) && t < 200);
  const g = kind === 'rådjur' ? makeDeer() : makeHare();
  g.position.set(x, heightAt(x, z), z);
  g.traverse(o => o.castShadow = true);
  scene.add(g);
  wild.push({ kind, g, hp: kind === 'rådjur' ? 2 : 1, tx: x, tz: z, speed: kind === 'rådjur' ? 1.6 : 1.9, flee: kind === 'rådjur' ? 6 : 7, cool: 0 });
}

export function updateWild(dt) {
  for (let i = wild.length - 1; i >= 0; i--) {
    const a = wild[i], p = a.g.position;
    const dp = Math.hypot(p.x - player.x, p.z - player.z);
    let sp = a.speed;
    if (dp < 14) { // fly från spelaren
      const dx = p.x - player.x, dz = p.z - player.z, l = Math.hypot(dx, dz) || 1;
      a.tx = clamp(p.x + dx / l * 30, -W / 2 + 10, W / 2 - 10);
      a.tz = clamp(p.z + dz / l * 30, -W / 2 + 10, W / 2 - 10);
      sp = a.flee;
    } else if (a.cool <= 0) {
      a.tx = clamp(p.x + rand(-25, 25), -W / 2 + 10, W / 2 - 10);
      a.tz = clamp(p.z + rand(-25, 25), -W / 2 + 10, W / 2 - 10);
      a.cool = rand(4, 9);
    }
    a.cool -= dt;
    const dx = a.tx - p.x, dz = a.tz - p.z, l = Math.hypot(dx, dz);
    if (l > 1) { p.x += dx / l * sp * dt; p.z += dz / l * sp * dt; a.g.rotation.y = Math.atan2(dx, dz) + Math.PI / 2; }
    const h = heightAt(p.x, p.z);
    if (h < WATER_Y + 0.3) { a.tx = p.x - dx; a.tz = p.z - dz; }
    p.y = Math.max(h, WATER_Y);
  }
}

// Tamdjur
export const livestock = []; // {kind,g,wool}

export function addLivestock(kind) {
  const g = new THREE.Group();
  if (kind === 'höna') {
    box(0.35, 0.3, 0.28, 0xd8cfc0, 0, 0.3, 0, g);
    box(0.14, 0.16, 0.14, 0xc04030, 0.2, 0.5, 0, g);
  } else {
    box(1.0, 0.7, 0.6, 0xe4ded2, 0, 0.75, 0, g);
    box(0.3, 0.3, 0.25, 0x3a3530, 0.6, 1.0, 0, g);
    for (const p of [[-0.3, 0.2], [0.3, 0.2], [-0.3, -0.2], [0.3, -0.2]]) box(0.1, 0.45, 0.1, 0x3a3530, p[0], 0.22, p[1], g);
  }
  const x = rand(4, 14), z = rand(2, 12);
  g.position.set(x, heightAt(x, z), z);
  g.traverse(o => o.castShadow = true);
  scene.add(g);
  livestock.push({ kind, g, wool: 0, cool: rand(2, 6) });
}

export function updateLivestock(dt) {
  for (const a of livestock) {
    a.cool -= dt;
    if (a.cool <= 0) { a.tx = clamp(a.g.position.x + rand(-5, 5), 2, 18); a.tz = clamp(a.g.position.z + rand(-5, 5), -2, 16); a.cool = rand(3, 8); }
    if (a.tx !== undefined) {
      const dx = a.tx - a.g.position.x, dz = a.tz - a.g.position.z, l = Math.hypot(dx, dz);
      if (l > 0.3) { a.g.position.x += dx / l * 0.7 * dt; a.g.position.z += dz / l * 0.7 * dt; a.g.rotation.y = Math.atan2(dx, dz) + Math.PI / 2; }
    }
    a.g.position.y = heightAt(a.g.position.x, a.g.position.z);
  }
}
