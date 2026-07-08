#!/usr/bin/env node
// Hjälper till med GLTF-modeller från Quaternius (CC0). Quaternius distribuerar
// sina packar som zip-filer utan stabila direktlänkar per modell, så det här
// skriptet laddar inte ner något – det talar om vad som ska hämtas, validerar
// det som lagts i public/models/ och uppdaterar manifest.json som spelet läser.
//
// Kör:  npm run setup:models
import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models');

const WANTED = {
  gran: 'gran (Pine/Spruce ur Ultimate Nature Pack)',
  tall: 'tall (Pine, gärna hög stam, ur Ultimate Nature Pack)',
  bjork: 'björk (Birch ur Ultimate Nature Pack)',
  sten: 'sten (Rock ur Ultimate Nature Pack)',
  radjur: 'rådjur (Deer ur Ultimate Animated Animals / Animal Pack)',
  hare: 'hare (Rabbit/Bunny ur Animal Pack)',
  hona: 'höna (Chicken/Hen ur Farm Animals Pack)',
  far: 'får (Sheep ur Farm Animals Pack)'
};

let files = [];
try { files = await readdir(DIR); } catch { /* katalogen saknas */ }
const found = Object.keys(WANTED).filter(n => files.includes(n + '.glb'));
const missing = Object.keys(WANTED).filter(n => !found.includes(n));

await writeFile(join(DIR, 'manifest.json'), JSON.stringify(found) + '\n');

console.log('Modeller i public/models/: ' + (found.length ? found.join(', ') : 'inga'));
if (missing.length) {
  console.log(`
Saknas (spelet använder procedurella modeller för dessa):
${missing.map(n => '  - ' + n + '.glb  →  ' + WANTED[n]).join('\n')}

Så här hämtar du dem (CC0, gratis):
  1. Gå till https://quaternius.com (eller https://poly.pizza/u/Quaternius)
  2. Ladda ner t.ex. "Ultimate Nature Pack" och "Farm Animals Pack"
  3. Kopiera valfria .glb-filer till public/models/ med namnen ovan
  4. Kör  npm run setup:models  igen så uppdateras manifestet
`);
}
console.log('manifest.json uppdaterad.');
