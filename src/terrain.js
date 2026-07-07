// Terräng, marken med årstidsfärger, Skärsjöns vatten och vassen.
import * as THREE from 'three';
import { clamp, lerp, rand, sstep, vnoise } from './utils.js';
import { W, SEG, LAKE, WATER_Y, YARD, ROAD_Z, ROAD_W } from './config.js';
import { seasonIdx } from './state.js';
import { scene } from './scene.js';

export function heightAt(x, z) {
  let h = 2.5 + vnoise(x * 0.012 + 13, z * 0.012 + 7) * 7 + vnoise(x * 0.05, z * 0.05) * 1.4;
  const d = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (d < LAKE.r + 30) { const t = sstep(clamp((LAKE.r + 30 - d) / 30, 0, 1)); h = lerp(h, -1.6, t); }
  const dy = Math.hypot(x - YARD.x, z - YARD.z);
  if (dy < YARD.r + 14) { const t = sstep(clamp((YARD.r + 14 - dy) / 14, 0, 1)); h = lerp(h, 3.0, t); }
  const dz = Math.abs(z - ROAD_Z);
  if (dz < ROAD_W + 8) { const t = sstep(clamp((ROAD_W + 8 - dz) / 8, 0, 1)); h = lerp(h, 2.9, t); }
  return h;
}

export const groundGeo = new THREE.PlaneGeometry(W, W, SEG, SEG);
groundGeo.rotateX(-Math.PI / 2);
const gpos = groundGeo.attributes.position;
const nVerts = gpos.count;
const baseColors = new Float32Array(nVerts * 3);
{
  const cGrass1 = new THREE.Color(0x4c7a3d), cGrass2 = new THREE.Color(0x628c46),
        cGravel = new THREE.Color(0x8a8377), cSand = new THREE.Color(0xcfc39a),
        cMud = new THREE.Color(0x5c4d38), cYard = new THREE.Color(0x77914e), cRock = new THREE.Color(0x8b8d85);
  for (let i = 0; i < nVerts; i++) {
    const x = gpos.getX(i), z = gpos.getZ(i);
    const h = heightAt(x, z); gpos.setY(i, h);
    let c;
    const dLake = Math.hypot(x - LAKE.x, z - LAKE.z);
    if (Math.abs(z - ROAD_Z) < ROAD_W / 2) c = cGravel.clone();
    else if (h < WATER_Y - 0.6) c = cMud.clone();
    else if (h < WATER_Y + 0.5 && dLake < LAKE.r + 35) c = cSand.clone();
    else if (Math.hypot(x - YARD.x, z - YARD.z) < YARD.r * 0.85) c = cYard.clone();
    else if (h > 9.5) c = cRock.clone().lerp(cGrass1, 0.4);
    else c = cGrass1.clone().lerp(cGrass2, vnoise(x * 0.08, z * 0.08));
    c.offsetHSL(0, 0, rand(-0.02, 0.02));
    baseColors[i * 3] = c.r; baseColors[i * 3 + 1] = c.g; baseColors[i * 3 + 2] = c.b;
  }
}
groundGeo.setAttribute('color', new THREE.BufferAttribute(baseColors.slice(), 3));
groundGeo.computeVertexNormals();

export const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
ground.receiveShadow = true;
scene.add(ground);

export function recolorGround() {
  const col = groundGeo.attributes.color, si = seasonIdx();
  for (let i = 0; i < nVerts; i++) {
    let r = baseColors[i * 3], g = baseColors[i * 3 + 1], b = baseColors[i * 3 + 2];
    const h = gpos.getY(i);
    if (si === 2) { // höst
      r = lerp(r, 0.62, 0.22); g = lerp(g, 0.5, 0.18); b = lerp(b, 0.22, 0.2);
    } else if (si === 3 && h > WATER_Y + 0.15) { // vinter – snö
      r = lerp(r, 0.93, 0.85); g = lerp(g, 0.94, 0.85); b = lerp(b, 0.97, 0.85);
    } else if (si === 3) { r = lerp(r, 0.8, 0.3); g = lerp(g, 0.82, 0.3); b = lerp(b, 0.88, 0.3); }
    col.setXYZ(i, r, g, b);
  }
  col.needsUpdate = true;
}

// Vatten – Skärsjön
export const waterMat = new THREE.MeshPhongMaterial({ color: 0x2e5d6e, transparent: true, opacity: 0.82, shininess: 90, specular: 0x99bbcc });
export const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), waterMat);
water.rotation.x = -Math.PI / 2;
water.position.set(LAKE.x, WATER_Y, LAKE.z);
scene.add(water);

// Vass runt sjön
{
  const g = new THREE.CylinderGeometry(0.02, 0.03, 1.6, 4), m = new THREE.MeshLambertMaterial({ color: 0x8a9a52 });
  const im = new THREE.InstancedMesh(g, m, 260);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < 800 && n < 260; i++) {
    const a = rand(0, Math.PI * 2), rr = LAKE.r + rand(-6, 3);
    const x = LAKE.x + Math.cos(a) * rr, z = LAKE.z + Math.sin(a) * rr, h = heightAt(x, z);
    if (h > WATER_Y - 0.7 && h < WATER_Y + 0.4) {
      M.compose(V.set(x, h + 0.7, z), Q.setFromEuler(new THREE.Euler(rand(-.1, .1), rand(0, 6), rand(-.1, .1))), new THREE.Vector3(1, rand(.7, 1.3), 1));
      im.setMatrixAt(n++, M);
    }
  }
  im.count = n;
  scene.add(im);
}
