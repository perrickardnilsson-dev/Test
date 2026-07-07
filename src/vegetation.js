// Skogen (gran, tall, björk) och stenar – instansierade med skörddata.
import * as THREE from 'three';
import { rand, vnoise } from './utils.js';
import { W, WATER_Y, YARD, ROAD_Z, ROAD_W } from './config.js';
import { seasonIdx } from './state.js';
import { scene } from './scene.js';
import { heightAt } from './terrain.js';

export const trees = {};
const treeDefs = {
  gran: { count: 150, trunkG: new THREE.CylinderGeometry(0.16, 0.3, 2.4, 6), trunkC: 0x5b4632,
          folG: new THREE.ConeGeometry(1.7, 5.6, 7), folC: 0x2f5230, folY: 4.4, wood: 9 },
  tall: { count: 90, trunkG: new THREE.CylinderGeometry(0.2, 0.3, 5.6, 6), trunkC: 0x9a6a4a,
          folG: new THREE.ConeGeometry(2.0, 2.6, 7), folC: 0x3c6b3a, folY: 6.6, wood: 11 },
  bjork: { count: 70, trunkG: new THREE.CylinderGeometry(0.13, 0.18, 4.6, 6), trunkC: 0xe8e4da,
          folG: new THREE.IcosahedronGeometry(1.7, 0), folC: 0x67a34c, folY: 4.9, wood: 7 }
};

const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _V = new THREE.Vector3(), _S = new THREE.Vector3(), _E = new THREE.Euler();

function okTreeSpot(x, z) {
  const h = heightAt(x, z);
  if (h < WATER_Y + 0.6) return false;
  if (Math.hypot(x - YARD.x, z - YARD.z) < YARD.r + 3) return false;
  if (Math.abs(z - ROAD_Z) < ROAD_W + 2) return false;
  if (vnoise(x * 0.02 + 50, z * 0.02 + 50) < 0.3) return false; // gläntor
  return true;
}

for (const key in treeDefs) {
  const d = treeDefs[key];
  const trunk = new THREE.InstancedMesh(d.trunkG, new THREE.MeshLambertMaterial({ color: d.trunkC }), d.count);
  const fol = new THREE.InstancedMesh(d.folG, new THREE.MeshLambertMaterial({ color: d.folC }), d.count);
  trunk.castShadow = true; fol.castShadow = true;
  trunk.userData = { tree: key }; fol.userData = { tree: key };
  const data = [];
  let n = 0, tries = 0;
  while (n < d.count && tries++ < 8000) {
    const x = rand(-W / 2 + 8, W / 2 - 8), z = rand(-W / 2 + 8, W / 2 - 8);
    if (!okTreeSpot(x, z)) continue;
    const h = heightAt(x, z), s = rand(0.8, 1.35), ry = rand(0, Math.PI * 2);
    _M.compose(_V.set(x, h + 1.1 * s, z), _Q.setFromEuler(_E.set(0, ry, 0)), _S.set(s, s, s));
    trunk.setMatrixAt(n, _M);
    _M.compose(_V.set(x, h + d.folY * s, z), _Q.setFromEuler(_E.set(0, ry, 0)), _S.set(s, key === 'bjork' ? s * 1.2 : s, s));
    fol.setMatrixAt(n, _M);
    data.push({ x, z, h, s, hp: key === 'tall' ? 5 : 4, alive: true });
    n++;
  }
  trunk.count = n; fol.count = n;
  scene.add(trunk); scene.add(fol);
  trees[key] = { trunk, fol, data, def: d };
}

export function killTree(key, i) {
  const t = trees[key];
  t.data[i].alive = false;
  _M.compose(_V.set(0, -50, 0), _Q.identity(), _S.set(0.001, 0.001, 0.001));
  t.trunk.setMatrixAt(i, _M); t.fol.setMatrixAt(i, _M);
  t.trunk.instanceMatrix.needsUpdate = true; t.fol.instanceMatrix.needsUpdate = true;
}

export function treeSeasonColors() {
  const si = seasonIdx();
  trees.bjork.fol.material.color.set(si === 2 ? 0xd8a832 : si === 3 ? 0xbfb6a8 : 0x67a34c);
  trees.bjork.fol.visible = (si !== 3);
  trees.gran.fol.material.color.set(si === 3 ? 0x5a7060 : 0x2f5230);
  trees.tall.fol.material.color.set(si === 3 ? 0x5f7a58 : 0x3c6b3a);
}

// Stenar
export const rocks = { data: [] };
{
  const g = new THREE.DodecahedronGeometry(0.9, 0), m = new THREE.MeshLambertMaterial({ color: 0x7d7f78 });
  const im = new THREE.InstancedMesh(g, m, 70);
  im.castShadow = true; im.userData = { rock: true };
  let n = 0, tries = 0;
  while (n < 70 && tries++ < 4000) {
    const x = rand(-W / 2 + 8, W / 2 - 8), z = rand(-W / 2 + 8, W / 2 - 8), h = heightAt(x, z);
    if (h < WATER_Y + 0.4 || Math.abs(z - ROAD_Z) < ROAD_W + 1) continue;
    if (Math.hypot(x - YARD.x, z - YARD.z) < 10) continue;
    const s = rand(0.5, 1.6);
    _M.compose(_V.set(x, h + 0.3 * s, z), _Q.setFromEuler(_E.set(rand(0, 3), rand(0, 3), rand(0, 3))), _S.set(s, s * rand(.6, 1), s));
    im.setMatrixAt(n, _M);
    rocks.data.push({ x, z, hp: 4, alive: true });
    n++;
  }
  im.count = n;
  rocks.im = im;
  scene.add(im);
}

export function killRock(i) {
  rocks.data[i].alive = false;
  _M.compose(_V.set(0, -50, 0), _Q.identity(), _S.set(0.001, 0.001, 0.001));
  rocks.im.setMatrixAt(i, _M);
  rocks.im.instanceMatrix.needsUpdate = true;
}
