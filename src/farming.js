// Odling: åkerrutor, sådd, vattning och tillväxt.
import * as THREE from 'three';
import { SEED2CROP } from './config.js';
import { seasonIdx } from './state.js';
import { scene } from './scene.js';
import { heightAt } from './terrain.js';
import { player } from './player.js';

export const plots = []; // {x,z,h,mesh,plant,watered,greenhouse}
export const soilMat = new THREE.MeshLambertMaterial({ color: 0x4a3826 });
export const soilWetMat = new THREE.MeshLambertMaterial({ color: 0x33271a });

export function makePlot(x, z, greenhouse = false) {
  const h = heightAt(x, z);
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 1.8), soilMat);
  m.position.set(x, h + 0.09, z);
  m.receiveShadow = true;
  scene.add(m);
  const p = { x, z, h, mesh: m, plant: null, watered: false, greenhouse };
  plots.push(p);
  return p;
}

export function plantSeed(p, seed) {
  const def = SEED2CROP[seed];
  if (!def) return false;
  const g = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 5), new THREE.MeshLambertMaterial({ color: def.col }));
  g.position.set(p.x, p.h + 0.2, p.z);
  g.castShadow = true;
  g.scale.set(0.3, 0.3, 0.3);
  scene.add(g);
  p.plant = { seed, crop: def.crop, days: def.days, growth: 0, mesh: g, ripe: false };
  return true;
}

export function updatePlants(gameDt) { // gameDt i dygn
  for (const p of plots) {
    if (!p.plant) continue;
    const def = SEED2CROP[p.plant.seed];
    if (!p.greenhouse && !def.seasons.includes(seasonIdx())) continue; // växer ej fel årstid
    const mult = p.watered ? 1.7 : 1;
    p.plant.growth = Math.min(1, p.plant.growth + gameDt * mult / p.plant.days);
    const s = 0.3 + p.plant.growth * 0.9;
    p.plant.mesh.scale.set(s, s, s);
    if (p.plant.growth >= 1 && !p.plant.ripe) { p.plant.ripe = true; p.plant.mesh.material.color.offsetHSL(0.06, 0.1, 0.08); }
  }
}

export function nearestPlot() {
  let best = null, bd = 2.6;
  for (const p of plots) {
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
