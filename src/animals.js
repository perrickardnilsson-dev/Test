// Djur: vilt (rådjur och harar) samt tamdjur (höns och får). Procedurella
// modeller med enkel gång-/hoppanimation; finns GLTF-modeller i /models/
// används de i stället. All jakt- och produktionsmekanik är oförändrad.
import * as THREE from 'three';
import { clamp, rand } from './utils.js';
import { W, WATER_Y } from './config.js';
import { scene } from './scene.js';
import { heightAt } from './terrain.js';
import { box } from './farm.js';
import { player } from './player.js';
import { cloneNormalized } from './models.js';

export const wild = []; // rådjur & harar

// Ben med pivot i höften så det kan pendla; registreras i g.userData.legs.
function leg(w, h, c, x, hipY, z, g) {
  const pivot = new THREE.Group();
  pivot.position.set(x, hipY, z);
  box(w, h, w, c, 0, -h / 2, 0, pivot);
  g.add(pivot);
  (g.userData.legs = g.userData.legs || []).push(pivot);
  return pivot;
}

function makeDeer() {
  const glb = cloneNormalized('radjur', 1.9);
  if (glb) { glb.userData.anim = 'bob'; return glb; }
  const g = new THREE.Group();
  box(1.3, 0.65, 0.5, 0x8a6a48, 0, 1.05, 0, g);                    // kropp
  const neck = box(0.26, 0.75, 0.26, 0x8a6a48, 0.62, 1.55, 0, g);  // hals
  neck.rotation.z = -0.45;
  box(0.34, 0.28, 0.24, 0x94724e, 0.88, 1.92, 0, g);               // huvud
  box(0.2, 0.15, 0.17, 0x7a5c3e, 1.07, 1.86, 0, g);                // nos
  for (const side of [-1, 1]) {
    const ear = box(0.05, 0.2, 0.11, 0x94724e, 0.8, 2.12, side * 0.13, g);
    ear.rotation.x = side * 0.35;
    // horn
    const a1 = box(0.045, 0.4, 0.045, 0xcbb894, 0.84, 2.28, side * 0.09, g);
    a1.rotation.x = side * 0.35; a1.rotation.z = 0.25;
    const a2 = box(0.035, 0.25, 0.035, 0xcbb894, 0.78, 2.42, side * 0.16, g);
    a2.rotation.x = side * 0.55; a2.rotation.z = -0.3;
  }
  box(0.1, 0.2, 0.1, 0xd8cfc0, -0.68, 1.18, 0, g);                 // svans
  for (const p of [[-0.45, 0.18], [0.45, 0.18], [-0.45, -0.18], [0.45, -0.18]])
    leg(0.12, 0.78, 0x7a5c3e, p[0], 0.78, p[1], g);
  g.userData.anim = 'legs';
  return g;
}

function makeHare() {
  const glb = cloneNormalized('hare', 0.6);
  if (glb) { glb.userData.anim = 'hop'; return glb; }
  const g = new THREE.Group();
  box(0.45, 0.3, 0.28, 0x9a8a70, 0, 0.24, 0, g);                   // kropp
  box(0.2, 0.2, 0.2, 0xa89878, 0.28, 0.42, 0, g);                  // huvud
  for (const side of [-1, 1]) {
    const ear = box(0.05, 0.3, 0.09, 0xa89878, 0.3, 0.66, side * 0.06, g);
    ear.rotation.z = -0.15; ear.rotation.x = side * 0.12;
  }
  box(0.1, 0.1, 0.1, 0xe8e2d4, -0.26, 0.3, 0, g);                  // svans
  g.userData.anim = 'hop';
  return g;
}

function makeHen() {
  const glb = cloneNormalized('hona', 0.55);
  if (glb) { glb.userData.anim = 'bob'; return glb; }
  const g = new THREE.Group();
  box(0.36, 0.3, 0.28, 0xd8cfc0, 0, 0.34, 0, g);                   // kropp
  const tail = box(0.16, 0.22, 0.18, 0xc4b8a4, -0.24, 0.46, 0, g); // stjärt
  tail.rotation.z = 0.5;
  box(0.14, 0.17, 0.14, 0xd8cfc0, 0.21, 0.55, 0, g);               // huvud
  box(0.09, 0.07, 0.04, 0xc04030, 0.21, 0.66, 0, g);               // kam
  box(0.08, 0.05, 0.05, 0xd8892f, 0.31, 0.55, 0, g);               // näbb
  box(0.03, 0.14, 0.03, 0xd8892f, 0.07, 0.12, 0.07, g);            // ben
  box(0.03, 0.14, 0.03, 0xd8892f, 0.07, 0.12, -0.07, g);
  g.userData.anim = 'bob';
  return g;
}

function makeSheep(a) {
  const glb = cloneNormalized('far', 1.15);
  if (glb) { glb.userData.anim = 'bob'; return glb; }
  const g = new THREE.Group();
  const fleece = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), new THREE.MeshLambertMaterial({ color: 0xe4ded2 }));
  fleece.scale.set(1.05, 0.78, 0.7);
  fleece.position.y = 0.85;
  fleece.castShadow = true;
  g.add(fleece);
  if (a) a.fleece = fleece; // ullen växer synligt
  box(0.3, 0.3, 0.24, 0x3a3530, 0.62, 1.0, 0, g);                  // huvud
  for (const side of [-1, 1]) {
    const ear = box(0.04, 0.08, 0.14, 0x3a3530, 0.62, 1.08, side * 0.16, g);
    ear.rotation.x = side * 0.5;
  }
  for (const p of [[-0.3, 0.17], [0.3, 0.17], [-0.3, -0.17], [0.3, -0.17]])
    leg(0.09, 0.5, 0x3a3530, p[0], 0.5, p[1], g);
  g.userData.anim = 'legs';
  return g;
}

// Gång-/hoppanimation utifrån hur långt djuret faktiskt rört sig.
function animate(a, dist, groundY, dt) {
  const g = a.g, mode = g.userData.anim;
  a.phase = (a.phase || 0) + dist * 6;
  if (mode === 'legs' && g.userData.legs) {
    const amp = Math.min(0.5, dist / dt * 0.12 || 0);
    g.userData.legs.forEach((l, i) => { l.rotation.z = Math.sin(a.phase + (i % 2) * Math.PI) * amp; });
    g.position.y = groundY;
  } else if (mode === 'hop') {
    g.position.y = groundY + Math.abs(Math.sin(a.phase * 0.9)) * (dist > 0.001 ? 0.16 : 0);
  } else { // bob
    g.position.y = groundY + Math.abs(Math.sin(a.phase * 0.5)) * (dist > 0.001 ? 0.04 : 0);
  }
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
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
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
    let moved = 0;
    if (l > 1) {
      moved = sp * dt;
      p.x += dx / l * moved; p.z += dz / l * moved;
      a.g.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
    }
    const h = heightAt(p.x, p.z);
    if (h < WATER_Y + 0.3) { a.tx = p.x - dx; a.tz = p.z - dz; }
    animate(a, moved, Math.max(h, WATER_Y), dt);
  }
}

// Tamdjur
export const livestock = []; // {kind,g,wool}

export function addLivestock(kind) {
  const a = { kind, wool: 0, cool: rand(2, 6) };
  a.g = kind === 'höna' ? makeHen() : makeSheep(a);
  const x = rand(4, 14), z = rand(2, 12);
  a.g.position.set(x, heightAt(x, z), z);
  a.g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(a.g);
  livestock.push(a);
}

export function updateLivestock(dt) {
  for (const a of livestock) {
    a.cool -= dt;
    if (a.cool <= 0) { a.tx = clamp(a.g.position.x + rand(-5, 5), 2, 18); a.tz = clamp(a.g.position.z + rand(-5, 5), -2, 16); a.cool = rand(3, 8); }
    let moved = 0;
    if (a.tx !== undefined) {
      const dx = a.tx - a.g.position.x, dz = a.tz - a.g.position.z, l = Math.hypot(dx, dz);
      if (l > 0.3) {
        moved = 0.7 * dt;
        a.g.position.x += dx / l * moved; a.g.position.z += dz / l * moved;
        a.g.rotation.y = Math.atan2(dx, dz) + Math.PI / 2;
      }
    }
    if (a.fleece) { const k = 1 + a.wool * 0.22; a.fleece.scale.set(1.05 * k, 0.78 * k, 0.7 * k); }
    animate(a, moved, heightAt(a.g.position.x, a.g.position.z), dt);
  }
}
