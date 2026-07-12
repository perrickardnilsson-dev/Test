// Världens layout, trogen den verkliga platsen Traneråsvägen 201, Trensum
// (56.3078N, 14.9441O). Koordinatsystem: gården i origo, norr = -z, öst = +x.
// Skärsjön ligger ca 400 m mot nordväst (56.3102N, 14.9395O) och
// Traneråsvägen löper i ungefär nord-sydlig riktning förbi gårdens östsida.
//
// Finns verklig kartdata i /map/mapdata.json (skapas av `npm run setup:map`
// från öppna höjddata + OpenStreetMap) används den: höjdgrid, Skärsjöns
// riktiga strandlinje och vägens verkliga sträckning. Annars används en
// procedurell approximation med samma väderstreck och avstånd.
import { clamp, lerp, sstep, vnoise } from './utils.js';

let map = null;
try {
  const r = await fetch('/map/mapdata.json');
  if (r.ok) map = await r.json();
} catch { /* ingen kartdata – procedurell värld */ }

export const usingRealMap = !!map;

export const W = map?.w ?? 720;
export const WATER_Y = map?.waterY ?? 1.1;
export const YARD = { x: 0, z: 0, r: 24 };
// Nominellt sjöcentrum/radie för spellogikens grova avståndskoller;
// den faktiska strandlinjen är oregelbunden.
export const LAKE = map?.lake ?? { x: -283, z: -283, r: 70 };
export const ROAD_W = 7;

// Vägen som polylinje (game-koordinater). Verklig sträckning om kartdata finns.
const ROAD_PTS = map?.road ?? [[95, 360], [50, 140], [32, 18], [48, -150], [85, -360]];
// Handlarens parkeringsplats: på vägen strax öster om gården.
export const TRUCK_SPOT = map?.truck ?? { x: 34, z: 28, ry: 0 };

// ===== Höjdgrid (verklig kartdata) =====
const grid = map ? {
  cols: map.cols, rows: map.rows, step: map.step,
  minX: -map.w / 2, minZ: -map.w / 2,
  h: Float64Array.from(map.heights),
  lake: Float64Array.from(map.lakeMask)
} : null;

function sampleGrid(arr, x, z) {
  const gx = clamp((x - grid.minX) / grid.step, 0, grid.cols - 1.001);
  const gz = clamp((z - grid.minZ) / grid.step, 0, grid.rows - 1.001);
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const i = iz * grid.cols + ix;
  return arr[i] * (1 - fx) * (1 - fz) + arr[i + 1] * fx * (1 - fz)
       + arr[i + grid.cols] * (1 - fx) * fz + arr[i + grid.cols + 1] * fx * fz;
}

// ===== Vägen =====
// Avstånd till närmaste punkt på vägens polylinje + den punkten.
export function roadDist(x, z) {
  let best = Infinity, px = 0, pz = 0;
  for (let i = 0; i < ROAD_PTS.length - 1; i++) {
    const [ax, az] = ROAD_PTS[i], [bx, bz] = ROAD_PTS[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    const qx = ax + dx * t, qz = az + dz * t;
    const d = Math.hypot(x - qx, z - qz);
    if (d < best) { best = d; px = qx; pz = qz; }
  }
  return { d: best, px, pz };
}

// ===== Skärsjön =====
// Procedurell strandlinje: radien varierar med riktningen (oregelbunden
// skogssjö i stället för en cirkel).
function lakeEffR(dx, dz, dc) {
  if (dc < 0.001) return LAKE.r;
  const nx = dx / dc, nz = dz / dc;
  return LAKE.r * (0.78 + 0.5 * vnoise(nx * 1.7 + 9, nz * 1.7 + 3));
}

// Sänker terrängen till sjöbotten. h = terränghöjd före sjön.
export function lakeCarve(x, z, h) {
  if (grid) {
    const m = sampleGrid(grid.lake, x, z);
    return lerp(h, WATER_Y - 2.2, sstep(clamp(m * 1.6, 0, 1)));
  }
  const dx = x - LAKE.x, dz = z - LAKE.z, dc = Math.hypot(dx, dz);
  if (dc > LAKE.r * 1.3 + 30) return h;
  const shore = dc - lakeEffR(dx, dz, dc);
  if (shore >= 30) return h;
  return lerp(h, -1.6, sstep(clamp((30 - shore) / 30, 0, 1)));
}

// 1 nära/i sjön, 0 långt ifrån – för strandsplatten i terrängshadern.
export function lakeNearFactor(x, z) {
  if (grid) return clamp(sampleGrid(grid.lake, x, z) * 2.2, 0, 1);
  const dx = x - LAKE.x, dz = z - LAKE.z, dc = Math.hypot(dx, dz);
  if (dc > LAKE.r * 1.3 + 40) return 0;
  const shore = dc - lakeEffR(dx, dz, dc);
  return clamp(1 - shore / 36, 0, 1);
}

// ===== Höjdfunktionens bas (utan väg) =====
export function baseHeight(x, z) {
  let h;
  if (grid) {
    h = sampleGrid(grid.h, x, z);
  } else {
    // Kuperad Blekinge-skogsmark med berghällar
    h = 3.0 + vnoise(x * 0.008 + 13, z * 0.008 + 7) * 9 + vnoise(x * 0.05, z * 0.05) * 1.4;
    h += sstep(clamp((vnoise(x * 0.028 + 80, z * 0.028 + 21) - 0.62) / 0.38, 0, 1)) * 3.2;
  }
  h = lakeCarve(x, z, h);
  const dy = Math.hypot(x - YARD.x, z - YARD.z);
  if (dy < YARD.r + 14) { const t = sstep(clamp((YARD.r + 14 - dy) / 14, 0, 1)); h = lerp(h, 3.0, t); }
  return h;
}
