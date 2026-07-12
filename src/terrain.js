// Terräng i chunkar med LOD (högre upplösning nära spelaren), Skärsjöns
// vatten och vassen. Höjdfunktionen heightAt är spelets facit och är
// oförändrad från prototypen.
import * as THREE from 'three';
import { clamp, lerp, rand, sstep } from './utils.js';
import { W, LAKE, WATER_Y, YARD, ROAD_W } from './config.js';
import { baseHeight, roadDist } from './worlddata.js';
import { seasonIdx } from './state.js';
import { scene } from './scene.js';
import { terrainMaterial, setSeasonUniforms } from './terrain-material.js';
import { applyWindSway } from './wind.js';

// Terränghöjd: bas (kartdata eller procedurell, med Skärsjön och gårdstunet)
// + Traneråsvägen som planar ut terrängen längs sin kurva.
export function heightAt(x, z) {
  let h = baseHeight(x, z);
  const rd = roadDist(x, z);
  if (rd.d < ROAD_W + 8) {
    const t = sstep(clamp((ROAD_W + 8 - rd.d) / 8, 0, 1));
    h = lerp(h, baseHeight(rd.px, rd.pz), t * 0.95);
  }
  return h;
}

// Analytisk normal via centraldifferens – ger sömlösa normaler över
// chunkgränser oavsett LOD-nivå.
function normalAt(x, z, out) {
  const e = 0.6;
  const nx = heightAt(x - e, z) - heightAt(x + e, z);
  const nz = heightAt(x, z - e) - heightAt(x, z + e);
  const l = Math.hypot(nx, 2 * e, nz);
  out[0] = nx / l; out[1] = 2 * e / l; out[2] = nz / l;
}

// ===== Chunk/LOD =====
const GRID = Math.round(W / 50);   // ~50 m per chunk
const CHUNK = W / GRID;
const LOD_SEGS = [48, 16, 6];      // segment per chunk-sida, nära → långt
const SKIRT = 4;                   // kjol som döljer springor mellan LOD-nivåer

function chunkLod(gx, gz, pgx, pgz) {
  const d = Math.max(Math.abs(gx - pgx), Math.abs(gz - pgz));
  return d <= 1 ? 0 : d <= 3 ? 1 : 2;
}

function makeChunkGeometry(x0, z0, seg) {
  const n = seg + 3; // +2 kjolrader, +1 stängande vertexrad
  const pos = new Float32Array(n * n * 3);
  const nor = new Float32Array(n * n * 3);
  const surfY = new Float32Array(n * n); // riktig markhöjd, även för kjolvertexar
  const nrm = [0, 0, 0];
  for (let iz = 0; iz < n; iz++) {
    const gz = clamp(iz - 1, 0, seg), skirtZ = iz === 0 || iz === n - 1;
    const z = z0 + gz * CHUNK / seg;
    for (let ix = 0; ix < n; ix++) {
      const gx = clamp(ix - 1, 0, seg), skirtX = ix === 0 || ix === n - 1;
      const x = x0 + gx * CHUNK / seg;
      const i = (iz * n + ix) * 3;
      const h = heightAt(x, z);
      pos[i] = x;
      pos[i + 1] = h - (skirtX || skirtZ ? SKIRT : 0);
      pos[i + 2] = z;
      surfY[iz * n + ix] = h;
      normalAt(x, z, nrm);
      nor[i] = nrm[0]; nor[i + 1] = nrm[1]; nor[i + 2] = nrm[2];
    }
  }
  const idx = [];
  for (let iz = 0; iz < n - 1; iz++) {
    for (let ix = 0; ix < n - 1; ix++) {
      const a = iz * n + ix, b = a + n;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aSurfY', new THREE.BufferAttribute(surfY, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const chunks = [];
const geoCache = new Map();
for (let gz = 0; gz < GRID; gz++) {
  for (let gx = 0; gx < GRID; gx++) {
    const x0 = -W / 2 + gx * CHUNK, z0 = -W / 2 + gz * CHUNK;
    const key = gx + ',' + gz + ',2';
    let geo = geoCache.get(key);
    if (!geo) { geo = makeChunkGeometry(x0, z0, LOD_SEGS[2]); geoCache.set(key, geo); }
    const mesh = new THREE.Mesh(geo, terrainMaterial);
    mesh.receiveShadow = true;
    scene.add(mesh);
    chunks.push({ gx, gz, x0, z0, lod: 2, mesh });
  }
}

export const groundMeshes = chunks.map(c => c.mesh);

// Byter LOD-nivå på chunkar när spelaren rör sig. Geometrier cachas.
export function updateTerrain(px, pz) {
  const pgx = clamp(Math.floor((px + W / 2) / CHUNK), 0, GRID - 1);
  const pgz = clamp(Math.floor((pz + W / 2) / CHUNK), 0, GRID - 1);
  for (const c of chunks) {
    const lod = chunkLod(c.gx, c.gz, pgx, pgz);
    if (lod === c.lod) continue;
    const key = c.gx + ',' + c.gz + ',' + lod;
    let geo = geoCache.get(key);
    if (!geo) { geo = makeChunkGeometry(c.x0, c.z0, LOD_SEGS[lod]); geoCache.set(key, geo); }
    c.mesh.geometry = geo;
    c.lod = lod;
  }
}

// Årstidsfärgning sker numera i terrängshadern (uniforms), inte i geometrin.
export function recolorGround() {
  const si = seasonIdx();
  setSeasonUniforms(si === 2 ? 1 : 0, si === 3 ? 1 : 0);
}

// Vass runt sjön (Skärsjöns vatten bor i water.js)
{
  const g = new THREE.CylinderGeometry(0.02, 0.03, 1.6, 4), m = new THREE.MeshLambertMaterial({ color: 0x8a9a52 });
  applyWindSway(m, -0.8, 0.14); // vasstråna vajar (lokalt y: -0.8..0.8)
  const im = new THREE.InstancedMesh(g, m, 260);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3();
  let n = 0;
  // strandlinjen är oregelbunden – sök i en bred ring och filtrera på höjd
  for (let i = 0; i < 4000 && n < 260; i++) {
    const a = rand(0, Math.PI * 2), rr = rand(LAKE.r * 0.65, LAKE.r * 1.35);
    const x = LAKE.x + Math.cos(a) * rr, z = LAKE.z + Math.sin(a) * rr, h = heightAt(x, z);
    if (h > WATER_Y - 0.7 && h < WATER_Y + 0.4) {
      M.compose(V.set(x, h + 0.7, z), Q.setFromEuler(new THREE.Euler(rand(-.1, .1), rand(0, 6), rand(-.1, .1))), new THREE.Vector3(1, rand(.7, 1.3), 1));
      im.setMatrixAt(n++, M);
    }
  }
  im.count = n;
  scene.add(im);
}
