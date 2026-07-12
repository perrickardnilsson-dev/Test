// Skogen (gran, tall, björk) och stenar: instansierade med två LOD-nivåer –
// detaljerad geometri nära spelaren, enkel längre bort. Instanserna
// ombucketeras när spelaren rört sig en bit. Finns GLTF-modeller i /models/
// (Quaternius, `npm run setup:models`) används de i stället för de
// procedurella modellerna. Skördedata (hp, virke) är oförändrad från
// prototypen.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand, vnoise, mulberry32 } from './utils.js';
import { W, WATER_Y, YARD, ROAD_Z, ROAD_W } from './config.js';
import { seasonIdx } from './state.js';
import { scene } from './scene.js';
import { heightAt } from './terrain.js';
import { applyTextureSet } from './textures.js';
import { getModel } from './models.js';
import { applyWindSway } from './wind.js';

let NEAR_R = 70;          // inom detta avstånd används högupplöst geometri
const REBUCKET_DIST = 8;  // ombucketera när spelaren rört sig så här långt

// Grafiknivå: avstånd för högupplöst geometri
export function setVegDetail(dist) { NEAR_R = dist; dirty = true; }

// Deterministisk placering (seedad) – krävs för att sparfilen ska kunna
// referera till träd/stenar via index.
const vrand = (() => { const r = mulberry32(0x5eed7a2); return (a, b) => a + r() * (b - a); })();

// ===== Material =====
const granBarkMat = applyTextureSet(new THREE.MeshStandardMaterial({ color: 0xb0977f, roughness: 1 }), 'bark');
const tallBarkMat = applyTextureSet(new THREE.MeshStandardMaterial({ color: 0xd9a179, roughness: 1 }), 'bark');
const bjorkBarkMat = applyTextureSet(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 'birchbark');
const rockMat = applyTextureSet(new THREE.MeshStandardMaterial({ color: 0xd9dbd4, roughness: 1 }), 'rock');
const granFolMat = new THREE.MeshLambertMaterial({ color: 0x2f5230 });
const tallFolMat = new THREE.MeshLambertMaterial({ color: 0x3c6b3a });
const bjorkFolMat = new THREE.MeshLambertMaterial({ color: 0x67a34c });

// ===== Procedurell geometri (basen vid y=0, skala 1) =====
function moved(geo, x, y, z, rx = 0, rz = 0, sy = 1) {
  const g = geo.clone();
  if (sy !== 1) g.scale(1, sy, 1);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

function granGeos() {
  const high = {
    trunk: moved(new THREE.CylinderGeometry(0.14, 0.32, 2.8, 8), 0, 1.4, 0),
    fol: mergeGeometries([
      moved(new THREE.ConeGeometry(2.0, 2.3, 9), 0, 2.4, 0),
      moved(new THREE.ConeGeometry(1.6, 2.1, 9), 0, 3.7, 0),
      moved(new THREE.ConeGeometry(1.15, 1.9, 9), 0, 5.0, 0),
      moved(new THREE.ConeGeometry(0.7, 1.8, 8), 0, 6.2, 0)
    ])
  };
  const low = {
    trunk: moved(new THREE.CylinderGeometry(0.16, 0.3, 2.4, 6), 0, 1.2, 0),
    fol: moved(new THREE.ConeGeometry(1.7, 5.6, 7), 0, 4.4, 0)
  };
  return { high, low };
}

function tallGeos() {
  const high = {
    trunk: moved(new THREE.CylinderGeometry(0.17, 0.34, 5.9, 8), 0, 2.95, 0),
    fol: mergeGeometries([
      moved(new THREE.ConeGeometry(1.9, 1.6, 9), 0, 6.1, 0),
      moved(new THREE.ConeGeometry(1.5, 1.4, 9), 0, 7.0, 0),
      moved(new THREE.ConeGeometry(0.95, 1.1, 8), 0, 7.8, 0)
    ])
  };
  const low = {
    trunk: moved(new THREE.CylinderGeometry(0.2, 0.3, 5.6, 6), 0, 2.8, 0),
    fol: moved(new THREE.ConeGeometry(2.0, 2.6, 7), 0, 6.6, 0)
  };
  return { high, low };
}

function bjorkGeos() {
  const high = {
    trunk: mergeGeometries([
      moved(new THREE.CylinderGeometry(0.11, 0.2, 4.8, 8), 0, 2.4, 0),
      moved(new THREE.CylinderGeometry(0.045, 0.07, 1.7, 5), 0.55, 3.9, 0.1, 0, -0.65),
      moved(new THREE.CylinderGeometry(0.04, 0.06, 1.5, 5), -0.5, 3.6, -0.15, 0.2, 0.6)
    ]),
    fol: mergeGeometries([
      moved(new THREE.IcosahedronGeometry(1.15, 1), 0.75, 4.9, 0.2, 0, 0, 1.15),
      moved(new THREE.IcosahedronGeometry(0.95, 1), -0.75, 4.5, -0.2, 0, 0, 1.1),
      moved(new THREE.IcosahedronGeometry(1.25, 1), 0, 5.6, 0, 0, 0, 1.25)
    ])
  };
  const low = {
    trunk: moved(new THREE.CylinderGeometry(0.13, 0.18, 4.6, 6), 0, 2.3, 0),
    fol: moved(new THREE.IcosahedronGeometry(1.7, 0), 0, 4.9, 0, 0, 0, 1.2)
  };
  return { high, low };
}

function rockGeos() {
  const high = new THREE.IcosahedronGeometry(0.9, 1);
  const p = high.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (vnoise(p.getX(i) * 3 + 7, p.getZ(i) * 3 + 11) - 0.5) * 0.55;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.75, p.getZ(i) * k);
  }
  high.computeVertexNormals();
  const low = new THREE.DodecahedronGeometry(0.9, 0);
  low.scale(1, 0.75, 1);
  return { high, low };
}

// ===== GLTF → instanslager =====
// Slår ihop modellens meshar per material till geometrier som kan instansieras.
// Normaliseras så basen ligger vid y=0 och höjden blir targetH.
function glbLayers(model, targetH) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  const s = targetH / (size.y || 1);
  const norm = new THREE.Matrix4()
    .makeScale(s, s, s)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
  const byMat = new Map();
  model.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(norm, o.matrixWorld));
    const key = o.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { mat: o.material.clone(), geos: [] });
    byMat.get(key).geos.push(g);
  });
  return [...byMat.values()].map(({ mat, geos }) => {
    const c = mat.color;
    return { geo: geos.length > 1 ? mergeGeometries(geos) : geos[0], mat, isFol: c && c.g > c.r && c.g > c.b };
  });
}

// ===== Arter =====
export const trees = {};   // key → {data, def, ...}  (killTree, skörd)
export const rocks = { data: [] };
export const treeRayTargets = [];
export const rockRayTargets = [];

const speciesList = [];
const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _V = new THREE.Vector3(), _S = new THREE.Vector3(), _E = new THREE.Euler();

function makeLayerMeshes(parts, capacity, rayTargets) {
  return parts.map(p => {
    if (p.isFol) applyWindSway(p.mat); // kronorna gungar i vinden
    const mesh = new THREE.InstancedMesh(p.geo, p.mat, capacity);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.userData.veg = { slot2idx: new Int32Array(capacity) };
    mesh.userData.isFol = !!p.isFol;
    scene.add(mesh);
    rayTargets.push(mesh);
    return mesh;
  });
}

function buildSpecies(key, def, placeList, rayTargets) {
  const glb = getModel(key);
  let nearLayers, farLayers;
  if (glb) {
    nearLayers = makeLayerMeshes(glbLayers(glb, def.glbHeight), placeList.length, rayTargets);
    farLayers = null; // GLTF-modellerna är redan lågpolygon – en nivå räcker
  } else {
    nearLayers = makeLayerMeshes(def.highParts, placeList.length, rayTargets);
    farLayers = makeLayerMeshes(def.lowParts, placeList.length, rayTargets);
  }
  for (const m of [...nearLayers, ...(farLayers || [])]) m.userData.veg.key = key;
  const sp = { key, def, data: placeList, nearLayers, farLayers };
  speciesList.push(sp);
  return sp;
}

function rebucket(sp, px, pz) {
  let n = 0, f = 0;
  const single = !sp.farLayers;
  for (let i = 0; i < sp.data.length; i++) {
    const d = sp.data[i];
    if (!d.alive) continue;
    _M.compose(_V.set(d.x, d.h, d.z), _Q.setFromEuler(_E.set(0, d.ry, 0)), _S.set(d.s, d.s, d.s));
    const near = single || (d.x - px) * (d.x - px) + (d.z - pz) * (d.z - pz) < NEAR_R * NEAR_R;
    const layers = near ? sp.nearLayers : sp.farLayers;
    const slot = near ? n++ : f++;
    for (const m of layers) {
      m.setMatrixAt(slot, _M);
      m.userData.veg.slot2idx[slot] = i;
    }
  }
  // boundingSphere nollställs så raycast inte testar mot en inaktuell sfär
  for (const m of sp.nearLayers) { m.count = n; m.instanceMatrix.needsUpdate = true; m.boundingSphere = null; }
  if (sp.farLayers) for (const m of sp.farLayers) { m.count = f; m.instanceMatrix.needsUpdate = true; m.boundingSphere = null; }
}

// ===== Placering =====
const usedCells = new Set(); // min ~2 m mellan träd
function okTreeSpot(x, z) {
  const h = heightAt(x, z);
  if (h < WATER_Y + 0.6) return false;
  if (Math.hypot(x - YARD.x, z - YARD.z) < YARD.r + 3) return false;
  if (Math.abs(z - ROAD_Z) < ROAD_W + 2) return false;
  if (vnoise(x * 0.02 + 50, z * 0.02 + 50) < 0.3) return false; // gläntor
  const cell = Math.round(x / 2.2) + ':' + Math.round(z / 2.2);
  if (usedCells.has(cell)) return false;
  usedCells.add(cell);
  return true;
}

function placeTrees(count, hp) {
  const list = [];
  let tries = 0;
  while (list.length < count && tries++ < 30000) {
    const x = vrand(-W / 2 + 8, W / 2 - 8), z = vrand(-W / 2 + 8, W / 2 - 8);
    if (!okTreeSpot(x, z)) continue;
    list.push({ x, z, h: heightAt(x, z), s: vrand(0.8, 1.35), ry: vrand(0, Math.PI * 2), hp, alive: true });
  }
  return list;
}

{
  const gran = granGeos(), tall = tallGeos(), bjork = bjorkGeos();
  const defs = {
    gran: { count: 400, wood: 9, glbHeight: 7.2,
            highParts: [{ geo: gran.high.trunk, mat: granBarkMat }, { geo: gran.high.fol, mat: granFolMat, isFol: true }],
            lowParts: [{ geo: gran.low.trunk, mat: granBarkMat }, { geo: gran.low.fol, mat: granFolMat, isFol: true }] },
    tall: { count: 220, wood: 11, glbHeight: 8.2,
            highParts: [{ geo: tall.high.trunk, mat: tallBarkMat }, { geo: tall.high.fol, mat: tallFolMat, isFol: true }],
            lowParts: [{ geo: tall.low.trunk, mat: tallBarkMat }, { geo: tall.low.fol, mat: tallFolMat, isFol: true }] },
    bjork: { count: 180, wood: 7, glbHeight: 6.8,
            highParts: [{ geo: bjork.high.trunk, mat: bjorkBarkMat }, { geo: bjork.high.fol, mat: bjorkFolMat, isFol: true }],
            lowParts: [{ geo: bjork.low.trunk, mat: bjorkBarkMat }, { geo: bjork.low.fol, mat: bjorkFolMat, isFol: true }] }
  };
  for (const key in defs) {
    const def = defs[key];
    const data = placeTrees(def.count, key === 'tall' ? 5 : 4);
    trees[key] = buildSpecies(key, def, data, treeRayTargets);
  }
}

// Stenar
{
  const g = rockGeos();
  let tries = 0;
  while (rocks.data.length < 70 && tries++ < 8000) {
    const x = vrand(-W / 2 + 8, W / 2 - 8), z = vrand(-W / 2 + 8, W / 2 - 8), h = heightAt(x, z);
    if (h < WATER_Y + 0.4 || Math.abs(z - ROAD_Z) < ROAD_W + 1) continue;
    if (Math.hypot(x - YARD.x, z - YARD.z) < 10) continue;
    const s = vrand(0.5, 1.6);
    rocks.data.push({ x, z, h: h + 0.25 * s, s, ry: vrand(0, Math.PI * 2), hp: 4, alive: true });
  }
  rocks.sp = buildSpecies('sten', {
    glbHeight: 1.3,
    highParts: [{ geo: g.high, mat: rockMat }],
    lowParts: [{ geo: g.low, mat: rockMat }]
  }, rocks.data, rockRayTargets);
}

// ===== Uppdatering, skörd, årstider =====
let lastPx = Infinity, lastPz = Infinity, dirty = true;

export function updateVegetation(px, pz) {
  if (!dirty && Math.hypot(px - lastPx, pz - lastPz) < REBUCKET_DIST) return;
  lastPx = px; lastPz = pz; dirty = false;
  for (const sp of speciesList) rebucket(sp, px, pz);
}

// Översätter en raycast-träff till art + index i data-arrayen.
export function vegFromHit(hit) {
  const veg = hit.object.userData.veg;
  if (!veg || hit.instanceId === undefined) return null;
  return { key: veg.key, index: veg.slot2idx[hit.instanceId] };
}

export function killTree(key, i) {
  trees[key].data[i].alive = false;
  dirty = true;
}

export function killRock(i) {
  rocks.data[i].alive = false;
  dirty = true;
}

const SEASON_FOL = {
  gran: { orig: 0x2f5230, winter: 0x5a7060 },
  tall: { orig: 0x3c6b3a, winter: 0x5f7a58 },
  bjork: { orig: 0x67a34c, autumn: 0xd8a832, winter: 0xbfb6a8 }
};
const _c = new THREE.Color();

export function treeSeasonColors() {
  const si = seasonIdx();
  for (const sp of speciesList) {
    const cfg = SEASON_FOL[sp.key];
    if (!cfg) continue;
    const target = si === 3 ? cfg.winter : (si === 2 && cfg.autumn) ? cfg.autumn : cfg.orig;
    for (const m of [...sp.nearLayers, ...(sp.farLayers || [])]) {
      if (!m.userData.isFol) continue;
      if (!m.material.userData.origColor) m.material.userData.origColor = m.material.color.clone();
      m.material.color.copy(m.material.userData.origColor)
        .lerp(_c.set(target), target === cfg.orig ? 0 : 0.9);
      // björkarna fäller löven på vintern
      m.visible = !(sp.key === 'bjork' && si === 3);
    }
  }
}
