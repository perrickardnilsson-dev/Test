// Verktygsanvändning (vänsterklick) och interaktion (E): hugga, bryta sten,
// gräva åker, vattna, så, skörda, sova, handla, röka och klippa får.
import * as THREE from 'three';
import { YARD, SEED2CROP } from './config.js';
import { S, give, seasonIdx, seasonName } from './state.js';
import { camera } from './scene.js';
import { groundMeshes } from './terrain.js';
import { trees, killTree, rocks, killRock, treeRayTargets, rockRayTargets, vegFromHit } from './vegetation.js';
import { house } from './farm.js';
import { plots, makePlot, plantSeed, nearestPlot, soilWetMat } from './farming.js';
import { buildMode, placeBuild, builtThings } from './buildings.js';
import { player } from './player.js';
import { shootArrow } from './hunting.js';
import { doFish } from './fishing.js';
import { trader, truck, openShop } from './economy.js';
import { sleep } from './days.js';
import { livestock } from './animals.js';
import { msg, uiState } from './ui.js';
import { sfx } from './audio.js';
import { rayHit } from './raycast.js';

export function toolAction() {
  if (S.dead) return;
  const t = S.tool;
  if (buildMode) { placeBuild(); return; }
  if (t === 4) { shootArrow(); return; }
  if (t === 5) { doFish(); return; }
  if (S.energy < 3) { msg('För trött – vila eller ät.'); return; }
  if (t === 0) { // Yxa
    const hits = rayHit(treeRayTargets, 4.5);
    if (hits.length) {
      const ref = vegFromHit(hits[0]);
      const rec = ref && trees[ref.key].data[ref.index];
      if (rec && rec.alive) {
        rec.hp--; S.energy -= 2;
        sfx('hugg');
        if (rec.hp <= 0) { killTree(ref.key, ref.index); const w = Math.round(trees[ref.key].def.wood * rec.s); give('trä', w); sfx('falla'); msg('Trädet föll! +' + w + ' trä'); }
        else msg('Hugger... (' + rec.hp + ')');
      }
    }
  } else if (t === 1) { // Korp
    const hits = rayHit(rockRayTargets, 4.5);
    if (hits.length) {
      const ref = vegFromHit(hits[0]);
      const rec = ref && rocks.data[ref.index];
      if (rec && rec.alive) {
        rec.hp--; S.energy -= 2.5;
        sfx('sten');
        if (rec.hp <= 0) { killRock(ref.index); const q = 4 + Math.floor(Math.random() * 3); give('sten', q); sfx('grav'); msg('Stenen krossad! +' + q + ' sten'); }
        else msg('Bryter sten... (' + rec.hp + ')');
      }
    }
  } else if (t === 2) { // Jordhacka
    const hits = rayHit(groundMeshes, 5);
    if (hits.length) {
      const p = hits[0].point;
      if (Math.hypot(p.x - YARD.x, p.z - YARD.z) > YARD.r) { msg('Marken är för hård – odla på gårdstomten.'); return; }
      for (const pl of plots) if (Math.hypot(pl.x - p.x, pl.z - p.z) < 1.9) { msg('Redan uppgrävt här.'); return; }
      makePlot(Math.round(p.x / 2) * 2, Math.round(p.z / 2) * 2);
      S.energy -= 4;
      sfx('grav');
      msg('Åkerruta uppgrävd. Tryck E för att så.');
    }
  } else if (t === 3) { // Vattenkanna
    const p = nearestPlot();
    if (p) { p.watered = true; p.mesh.material = soilWetMat; sfx('vatten'); msg('Vattnat.'); S.energy -= 1; }
  }
}

export function interact() {
  if (S.dead || uiState.open) return;
  // Handlare
  if (trader.active && camera.position.distanceTo(truck.position) < 6) { openShop(); return; }
  // Dörr – sova
  const dh = camera.position.distanceTo(new THREE.Vector3(house.position.x, house.position.y + 1, house.position.z + 3));
  if (dh < 3.5) {
    if (S.time >= 20 || S.time < 5 || S.energy < 25) sleep();
    else msg('Det är mitt på dagen – arbeta först.');
    return;
  }
  // Rökeri
  for (const b of builtThings) if (b.id === 'rokeri' && Math.hypot(b.x - player.x, b.z - player.z) < 3.5) { smoke(); return; }
  // Tamdjur – klipp får
  for (const a of livestock) {
    if (a.kind === 'får' && a.wool >= 1 && camera.position.distanceTo(a.g.position) < 3) { a.wool = 0; give('ull', 1); sfx('klipp'); msg('Fåret klippt! +1 ull'); return; }
  }
  // Åkerruta
  const p = nearestPlot();
  if (p) {
    if (p.plant && p.plant.ripe) {
      const crop = p.plant.crop, n = 2 + (Math.random() < 0.4 ? 1 : 0);
      give(crop, n);
      p.plant.mesh.removeFromParent();
      p.plant = null;
      sfx('skorda');
      msg('Skördat! +' + n + ' ' + crop);
      return;
    }
    if (!p.plant) {
      const seed = S.selSeed;
      if (!(S.inv[seed] > 0)) { msg('Inga ' + seed + '. Köp av handlaren. (Q byter frö)'); return; }
      const def = SEED2CROP[seed];
      if (!p.greenhouse && !def.seasons.includes(seasonIdx())) { msg(def.crop + ' kan inte sås på ' + seasonName().toLowerCase() + 'en.'); return; }
      S.inv[seed]--;
      if (S.inv[seed] <= 0) delete S.inv[seed];
      plantSeed(p, seed);
      sfx('sa');
      msg('Sått ' + def.crop + '. Vattna för snabbare växt!');
      return;
    }
    msg('Växer... ' + Math.round(p.plant.growth * 100) + '%' + (p.watered ? ' (vattnat)' : ''));
  }
}

export function smoke() {
  let n = 0;
  const conv = [['kött', 'rökt kött'], ['abborre', 'rökt fisk'], ['gädda', 'rökt fisk']];
  for (const [a, b] of conv) { const q = S.inv[a] || 0; if (q > 0) { give(b, q); delete S.inv[a]; n += q; } }
  msg(n > 0 ? 'Rökte ' + n + ' råvaror i rökeriet.' : 'Inget att röka – jaga eller fiska först.');
}

export function cycleSeed() {
  const seeds = Object.keys(SEED2CROP).filter(s => S.inv[s] > 0);
  if (!seeds.length) { msg('Du har inga fröer.'); return; }
  const i = seeds.indexOf(S.selSeed);
  S.selSeed = seeds[(i + 1) % seeds.length];
  msg('Valt frö: ' + S.selSeed);
}
