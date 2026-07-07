#!/usr/bin/env node
// Laddar ner CC0-licensierade PBR-texturer från Poly Haven (polyhaven.com)
// till public/textures/. Kör:  npm run setup
//
// Saknas filerna faller spelet tillbaka på procedurella texturer, så det går
// att spela även utan att köra detta – men Poly Haven-texturerna ser bättre ut.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'textures');
const RES = '1k'; // byt till '2k' för skarpare texturer (större nedladdning)

// Markuppsättningar: nyckel → Poly Haven asset-id
const SETS = {
  grass: 'aerial_grass_rock',       // gräs med inslag av sten
  forest: 'forrest_ground_01',      // skogsmark med barr och mossa
  rock: 'rocky_terrain_02',         // berghällar/granit
  gravel: 'gravelly_sand'           // grus till väg och strand
};

// map-suffix i filnamnet → kandidatnycklar i Poly Havens files-API
const MAPS = {
  diff: ['Diffuse', 'diff', 'diffuse'],
  nor: ['nor_gl'],
  arm: ['arm']
};

// Stöd för miljöer bakom HTTPS-proxy (t.ex. CI); vanliga datorer påverkas ej.
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  try {
    const { EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici');
    setGlobalDispatcher(new EnvHttpProxyAgent());
  } catch { /* undici saknas – testa med vanlig fetch */ }
}

function pickUrl(files, candidates) {
  for (const key of candidates) {
    const entry = files[key];
    if (!entry) continue;
    const res = entry[RES] || entry[Object.keys(entry)[0]];
    if (!res) continue;
    const fmt = res.jpg || res.png || res[Object.keys(res)[0]];
    if (fmt && fmt.url) return fmt.url;
  }
  return null;
}

await mkdir(OUT, { recursive: true });
let ok = 0, skipped = 0, failed = 0;

for (const [setName, assetId] of Object.entries(SETS)) {
  let files;
  try {
    const r = await fetch(`https://api.polyhaven.com/files/${assetId}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    files = await r.json();
  } catch (e) {
    console.error(`✗ ${setName}: kunde inte hämta metadata för "${assetId}" (${e.message})`);
    failed++;
    continue;
  }
  for (const [suffix, candidates] of Object.entries(MAPS)) {
    const dest = join(OUT, `${setName}_${suffix}.jpg`);
    try {
      await access(dest);
      skipped++;
      continue; // redan nedladdad
    } catch { /* saknas – ladda ner */ }
    const url = pickUrl(files, candidates);
    if (!url) {
      console.error(`✗ ${setName}_${suffix}: ingen ${RES}-jpg hittades för "${assetId}"`);
      failed++;
      continue;
    }
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await writeFile(dest, Buffer.from(await r.arrayBuffer()));
      console.log(`✓ ${setName}_${suffix}.jpg  (${assetId}, ${RES})`);
      ok++;
    } catch (e) {
      console.error(`✗ ${setName}_${suffix}: nedladdning misslyckades (${e.message})`);
      failed++;
    }
  }
}

console.log(`\nKlart: ${ok} nedladdade, ${skipped} fanns redan, ${failed} misslyckades.`);
if (failed) {
  console.log('Spelet fungerar ändå – procedurella reservtexturer används för det som saknas.');
  process.exitCode = 1;
}
