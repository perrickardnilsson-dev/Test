// Sparfunktion med localStorage. Världen genereras deterministiskt (seedad
// slump), så fällda träd/stenar kan sparas som index. Autosparning sker
// varje ny morgon (days.js) och manuellt via inställningsmenyn.
import { S } from './state.js';
import { player } from './player.js';
import { trees, rocks, killTree, killRock } from './vegetation.js';
import { plots, makePlot, plantSeed, soilMat, soilWetMat } from './farming.js';
import { builtThings, makeBuilding } from './buildings.js';
import { livestock, addLivestock } from './animals.js';
import { trader, truck } from './economy.js';
import { setWeather } from './weather.js';
import { recolorGround } from './terrain.js';
import { treeSeasonColors } from './vegetation.js';
import { setLakeWinter } from './water.js';
import { setSeasonGrade } from './post.js';
import { seasonIdx, isWinter } from './state.js';

// v3: världen lades om efter verklighetens geografi (sjön 400 m NV m.m.)
// – äldre sparningar har ogiltiga träd-index och ignoreras.
const KEY = 'traneras-save-v3';

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* privat läge */ }
}

export function saveGame() {
  const deadIdx = data => data.map((d, i) => d.alive ? -1 : i).filter(i => i >= 0);
  const save = {
    v: 1,
    S: { ...S, dead: false, started: undefined },
    player: { x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch },
    deadTrees: { gran: deadIdx(trees.gran.data), tall: deadIdx(trees.tall.data), bjork: deadIdx(trees.bjork.data) },
    deadRocks: deadIdx(rocks.data),
    buildings: builtThings.map(b => ({ id: b.id, x: b.x, z: b.z, ry: b.g.rotation.y })),
    plots: plots.map(p => ({
      x: p.x, z: p.z, greenhouse: p.greenhouse, watered: p.watered,
      plant: p.plant ? { seed: p.plant.seed, growth: p.plant.growth, ripe: p.plant.ripe } : null
    })),
    livestock: livestock.map(a => ({ kind: a.kind, wool: a.wool }))
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  let save;
  try { save = JSON.parse(localStorage.getItem(KEY)); } catch { return false; }
  if (!save || save.v !== 1) return false;

  Object.assign(S, save.S, { dead: false, started: true });

  // Byggnader först (växthus skapar sina egna odlingsrutor)
  for (const b of save.buildings) makeBuilding(b.id, b.x, b.z, b.ry);

  // Odlingsrutor: växthusens rutor finns redan – matcha på koordinater,
  // fristående rutor återskapas.
  for (const sp of save.plots) {
    let p = sp.greenhouse
      ? plots.find(q => q.greenhouse && Math.abs(q.x - sp.x) < 0.01 && Math.abs(q.z - sp.z) < 0.01)
      : makePlot(sp.x, sp.z);
    if (!p) continue;
    p.watered = sp.watered;
    p.mesh.material = sp.watered ? soilWetMat : soilMat;
    if (sp.plant) {
      plantSeed(p, sp.plant.seed);
      p.plant.growth = sp.plant.growth;
      const s = 0.3 + p.plant.growth * 0.9;
      p.plant.mesh.scale.set(s, s, s);
      if (sp.plant.ripe) { p.plant.ripe = true; p.plant.mesh.material.color.offsetHSL(0.06, 0.1, 0.08); }
    }
  }

  for (const a of save.livestock) {
    addLivestock(a.kind);
    livestock[livestock.length - 1].wool = a.wool;
  }

  for (const key in save.deadTrees) for (const i of save.deadTrees[key]) killTree(key, i);
  for (const i of save.deadRocks) killRock(i);

  player.x = save.player.x; player.z = save.player.z;
  player.yaw = save.player.yaw; player.pitch = save.player.pitch;

  // Årstids- och vädervisualer
  setWeather(S.weather);
  recolorGround();
  treeSeasonColors();
  setLakeWinter(isWinter());
  setSeasonGrade(seasonIdx());
  trader.active = (S.day % 3 === 1);
  truck.visible = false;
  return true;
}
