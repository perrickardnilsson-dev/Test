// Dygnsväxling: sömn, ny dag, årstidsbyte, djurproduktion och handlarens schema.
import { SEASON_DAYS } from './config.js';
import { S, give, seasonName, seasonIdx, isWinter } from './state.js';
import { scene } from './scene.js';
import { recolorGround, waterMat } from './terrain.js';
import { treeSeasonColors } from './vegetation.js';
import { plots, soilMat } from './farming.js';
import { livestock, wild, addWild } from './animals.js';
import { trader, truck } from './economy.js';
import { rollWeather } from './weather.js';
import { msg } from './ui.js';

export function sleep() {
  S.day++;
  S.time = 6;
  S.energy = 100;
  S.hunger = Math.max(0, S.hunger - 15);
  newDay();
  msg('En ny morgon på Tranerås. Dag ' + S.day + ' · ' + seasonName());
}

export function newDay() {
  rollWeather();
  // vattnat nollställs
  for (const p of plots) { p.watered = false; p.mesh.material = soilMat; }
  // vinter dödar grödor utomhus
  if (isWinter()) {
    let died = 0;
    for (const p of plots) if (p.plant && !p.greenhouse) { scene.remove(p.plant.mesh); p.plant = null; died++; }
    if (died) msg('Frosten tog ' + died + ' grödor! Bygg växthus.');
  }
  // djurproduktion
  const hens = livestock.filter(a => a.kind === 'höna').length;
  if (hens > 0) {
    const feed = Math.min(hens, S.inv['korn'] || 0);
    if (feed > 0) { S.inv['korn'] -= feed; if (S.inv['korn'] <= 0) delete S.inv['korn']; give('ägg', feed); msg('Hönsen värpte ' + feed + ' ägg.'); }
    else msg('Hönsen är hungriga – de behöver korn för att värpa.');
  }
  for (const a of livestock) if (a.kind === 'får') a.wool = Math.min(1, a.wool + 0.34);
  // årstidsbyte
  if ((S.day - 1) % SEASON_DAYS === 0 && S.day > 1) {
    recolorGround();
    treeSeasonColors();
    waterMat.color.set(isWinter() ? 0xc8d8e0 : 0x2e5d6e);
    waterMat.opacity = isWinter() ? 0.95 : 0.82;
    msg('Ny årstid: ' + seasonName() + (isWinter() ? ' – sjön fryser, isfiske möjligt!' : ''));
  }
  // handlare var tredje dag
  trader.active = (S.day % 3 === 1);
  truck.visible = false;
  if (trader.active) msg('Handlaren kommer till Traneråsvägen i dag (09–17).');
  // vilt fylls på
  if (wild.length < 8) addWild(Math.random() < 0.5 ? 'rådjur' : 'hare');
}
