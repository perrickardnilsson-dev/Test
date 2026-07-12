#!/usr/bin/env node
// Hämtar verklig kartdata för Traneråsvägen 201, Trensum (Karlshamn) och
// bygger public/map/mapdata.json som spelet läser automatiskt:
//   - höjddata från AWS öppna terrängtiles (Mapzen terrarium, fri åtkomst)
//   - Skärsjöns strandlinje och Traneråsvägens sträckning från OpenStreetMap
//
// Kör:  npm run setup:map
// Utan filen används en procedurell approximation med samma väderstreck.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'map');
const OUT = join(OUT_DIR, 'mapdata.json');

// Gården: Traneråsvägen 201. Skärsjön ca 400 m NV.
const HOME = { lat: 56.3078, lon: 14.9441 };
const LAKE_LL = { lat: 56.3102, lon: 14.9395 };
const W = 720;            // kartans sida i meter (gården i mitten)
const STEP = 3;           // meter per gridcell
const COLS = Math.round(W / STEP) + 1;
const ZOOM = 15;          // terrängtiles ~2,6 m/px på denna breddgrad

const M_PER_LAT = 111320;
const M_PER_LON = 111320 * Math.cos(HOME.lat * Math.PI / 180);

// game-koordinater: gården i origo, öst = +x, norr = -z
const toGame = (lat, lon) => ({ x: (lon - HOME.lon) * M_PER_LON, z: -(lat - HOME.lat) * M_PER_LAT });
const toLatLon = (x, z) => ({ lat: HOME.lat - z / M_PER_LAT, lon: HOME.lon + x / M_PER_LON });

// Stöd för miljöer bakom HTTPS-proxy; vanliga datorer påverkas ej.
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  try {
    const { EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici');
    setGlobalDispatcher(new EnvHttpProxyAgent());
  } catch { /* testa med vanlig fetch */ }
}

// ===== Höjddata =====
function tileOf(lat, lon, z) {
  const n = 2 ** z;
  const x = (lon + 180) / 360 * n;
  const latR = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n;
  return { x, y };
}

const tiles = new Map();
async function elevationAt(lat, lon) {
  const t = tileOf(lat, lon, ZOOM);
  const tx = Math.floor(t.x), ty = Math.floor(t.y);
  const key = tx + ',' + ty;
  if (!tiles.has(key)) {
    const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${tx}/${ty}.png`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`terrängtile ${key}: HTTP ${r.status}`);
    tiles.set(key, PNG.sync.read(Buffer.from(await r.arrayBuffer())));
  }
  const png = tiles.get(key);
  const px = Math.min(255, Math.floor((t.x - tx) * 256)), py = Math.min(255, Math.floor((t.y - ty) * 256));
  const i = (py * 256 + px) * 4;
  return (png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256) - 32768;
}

// ===== OpenStreetMap (Overpass) =====
async function overpass(query) {
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: 'data=' + encodeURIComponent('[out:json][timeout:30];' + query)
  });
  if (!r.ok) throw new Error(`Overpass: HTTP ${r.status}`);
  return (await r.json()).elements || [];
}

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

console.log('Hämtar höjddata (AWS terrängtiles, zoom ' + ZOOM + ')...');
const heights = new Float64Array(COLS * COLS);
for (let iz = 0; iz < COLS; iz++) {
  for (let ix = 0; ix < COLS; ix++) {
    const { lat, lon } = toLatLon(-W / 2 + ix * STEP, -W / 2 + iz * STEP);
    heights[iz * COLS + ix] = await elevationAt(lat, lon);
  }
}
console.log('  ' + tiles.size + ' tiles, ' + COLS + '×' + COLS + ' celler.');

// Normalisera: gårdens mark = 3,0 (spelets referenshöjd)
const offset = heights[Math.floor(COLS / 2) * COLS + Math.floor(COLS / 2)] - 3.0;
for (let i = 0; i < heights.length; i++) heights[i] -= offset;

// ===== Skärsjön =====
let lakePoly = null, waterY = 1.1;
try {
  console.log('Hämtar Skärsjöns strandlinje (OpenStreetMap)...');
  const ways = (await overpass(`way["natural"="water"](around:350,${LAKE_LL.lat},${LAKE_LL.lon});out geom;`))
    .filter(w => w.geometry && w.geometry.length > 8);
  if (ways.length) {
    const way = ways.sort((a, b) => b.geometry.length - a.geometry.length)[0];
    lakePoly = way.geometry.map(g => { const p = toGame(g.lat, g.lon); return [p.x, p.z]; });
    console.log('  polygon med ' + lakePoly.length + ' punkter.');
  } else console.log('  ingen vattenpolygon hittades – använder cirkulär approximation.');
} catch (e) { console.log('  misslyckades (' + e.message + ') – cirkulär approximation.'); }

const lakeC = toGame(LAKE_LL.lat, LAKE_LL.lon);
let lakeR = 70;
if (lakePoly) {
  let cx = 0, cz = 0;
  for (const [x, z] of lakePoly) { cx += x; cz += z; }
  cx /= lakePoly.length; cz /= lakePoly.length;
  lakeC.x = cx; lakeC.z = cz;
  lakeR = Math.sqrt(lakePoly.reduce((s, [x, z]) => s + ((x - cx) ** 2 + (z - cz) ** 2), 0) / lakePoly.length);
}

// Sjömask: OSM-polygonen om den finns, annars flodfyllning av höjddatat
// från sjöcentrum – sjöytan är spegelplan i höjddatat, så fyllningen ger
// Skärsjöns verkliga strandlinje även utan OSM.
const rawMask = new Float64Array(COLS * COLS);
const cellIdx = (x, z) => {
  const ix = Math.round((x + W / 2) / STEP), iz = Math.round((z + W / 2) / STEP);
  if (ix < 0 || ix >= COLS || iz < 0 || iz >= COLS) return -1;
  return iz * COLS + ix;
};
const lakeElev = heights[cellIdx(lakeC.x, lakeC.z)];
if (lakePoly) {
  for (let iz = 0; iz < COLS; iz++)
    for (let ix = 0; ix < COLS; ix++)
      if (pointInPoly(-W / 2 + ix * STEP, -W / 2 + iz * STEP, lakePoly)) rawMask[iz * COLS + ix] = 1;
} else {
  console.log('Flodfyller sjöytan ur höjddatat (yta ' + lakeElev.toFixed(1) + ')...');
  const TOL = 0.35, MAXC = Math.floor(COLS * COLS * 0.2);
  const start = cellIdx(lakeC.x, lakeC.z);
  const queue = [start];
  rawMask[start] = 1;
  let filled = 1;
  while (queue.length && filled < MAXC) {
    const i = queue.pop();
    for (const j of [i - 1, i + 1, i - COLS, i + COLS]) {
      if (j < 0 || j >= COLS * COLS || rawMask[j]) continue;
      if (Math.abs(i % COLS - j % COLS) > 1) continue; // radbrytning
      if (Math.abs(heights[j] - lakeElev) > TOL) continue;
      rawMask[j] = 1; queue.push(j); filled++;
    }
  }
  console.log('  ' + filled + ' celler (' + (filled * STEP * STEP / 1e4).toFixed(1) + ' ha).');
}
// centroid, effektiv radie (ur arean) och bounding box ur masken
{
  let cx = 0, cz = 0, n = 0, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let i = 0; i < rawMask.length; i++) if (rawMask[i]) {
    const x = -W / 2 + (i % COLS) * STEP, z = -W / 2 + Math.floor(i / COLS) * STEP;
    cx += x; cz += z; n++;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  if (n) {
    lakeC.x = cx / n; lakeC.z = cz / n;
    lakeR = Math.sqrt(n * STEP * STEP / Math.PI);
    // vattenplanet ska täcka hela masken
    lakeC.plane = Math.max(maxX - minX, maxZ - minZ) + 2 * Math.max(
      Math.abs((minX + maxX) / 2 - lakeC.x), Math.abs((minZ + maxZ) / 2 - lakeC.z)) + 50;
  }
}
waterY = lakeElev + 0.12;
const R = 3; // blur ≈ 9 m mjuk strandkant
const lakeMask = new Float64Array(COLS * COLS);
for (let iz = 0; iz < COLS; iz++) {
  for (let ix = 0; ix < COLS; ix++) {
    let s = 0, n = 0;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const jx = ix + dx, jz = iz + dz;
      if (jx >= 0 && jx < COLS && jz >= 0 && jz < COLS) { s += rawMask[jz * COLS + jx]; n++; }
    }
    lakeMask[iz * COLS + ix] = s / n;
  }
}

// ===== Traneråsvägen =====
let road = null;
try {
  console.log('Hämtar Traneråsvägens sträckning (OpenStreetMap)...');
  const ways = (await overpass(`way["highway"]["name"~"Tranerås",i](around:900,${HOME.lat},${HOME.lon});out geom;`))
    .filter(w => w.geometry && w.geometry.length > 1);
  if (ways.length) {
    const pts = [];
    for (const w of ways) for (const g of w.geometry) { const p = toGame(g.lat, g.lon); pts.push([+p.x.toFixed(1), +p.z.toFixed(1)]); }
    road = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1); // glesa ut
    console.log('  ' + road.length + ' vägpunkter.');
  } else console.log('  vägen hittades inte i OSM – använder approximation.');
} catch (e) { console.log('  misslyckades (' + e.message + ') – approximation.'); }

// Handlarens parkering: vägpunkten närmast gården
let truck = null;
if (road) {
  let best = Infinity, bi = 0;
  road.forEach(([x, z], i) => { const d = Math.hypot(x, z); if (d < best) { best = d; bi = i; } });
  const [x, z] = road[bi];
  const [nx, nz] = road[Math.min(bi + 1, road.length - 1)];
  truck = { x: +x.toFixed(1), z: +z.toFixed(1), ry: +Math.atan2(nx - x, nz - z).toFixed(2) };
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, JSON.stringify({
  w: W, cols: COLS, rows: COLS, step: STEP,
  waterY: +waterY.toFixed(2),
  lake: { x: +lakeC.x.toFixed(1), z: +lakeC.z.toFixed(1), r: +lakeR.toFixed(1), plane: +(lakeC.plane || lakeR * 2.9).toFixed(0) },
  road, truck,
  heights: [...heights].map(h => +h.toFixed(2)),
  lakeMask: [...lakeMask].map(m => +m.toFixed(2))
}));
console.log('\nKlart! ' + OUT + ' skriven.');
console.log('Sjön: (' + lakeC.x.toFixed(0) + ', ' + lakeC.z.toFixed(0) + ') r≈' + lakeR.toFixed(0) + ' m · vattenyta y=' + waterY.toFixed(2));
console.log('Starta om npm run dev så används verklig terräng.');
