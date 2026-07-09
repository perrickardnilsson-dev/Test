// Väder: himmel, dygnsljus, nederbörd (regnstrimmor/snö), dimbankar över
// Skärsjön på morgonen, fallande höstlöv och vindstyrka.
import * as THREE from 'three';
import { clamp, lerp, rand } from './utils.js';
import { LAKE, WATER_Y } from './config.js';
import { S, seasonIdx } from './state.js';
import { scene, sun, hemi, starMat, moon } from './scene.js';
import { setSkyState, updateMoon, skyFollow, updateClouds } from './sky.js';
import { setWindStrength, updateWind } from './wind.js';
import { player } from './player.js';
import { $ } from './ui.js';

const skyDay = new THREE.Color(0x8fb8d8), skyNight = new THREE.Color(0x0a0f1e),
      skyDusk = new THREE.Color(0xd8875a), skyCloud = new THREE.Color(0x9aa3ab),
      tmp = new THREE.Color();

// ===== Nederbörd =====
// Regn: linjesegment lutade med vinden. Snö: punkter som driver i sidled.
const BOX = { w: 34, h: 26 };
let precip = null;

// Mjuk rund partikelsprite så att flingor och löv inte blir fyrkanter
function makeDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
const dotTex = makeDotTexture();

function makeRain() {
  const n = 900, pos = new Float32Array(n * 2 * 3), drops = [];
  const tilt = new THREE.Vector3(2.4, -20, 0.8).normalize().multiplyScalar(0.5);
  for (let i = 0; i < n; i++) drops.push({ x: rand(-BOX.w / 2, BOX.w / 2), y: rand(0, BOX.h), z: rand(-BOX.w / 2, BOX.w / 2), v: rand(16, 22) });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineBasicMaterial({ color: 0x9ab4c8, transparent: true, opacity: 0.45 });
  const mesh = new THREE.LineSegments(g, m);
  mesh.frustumCulled = false;
  return { mesh, drops, tilt, type: 'Regn' };
}

function makeSnow() {
  const n = 1300, pos = new Float32Array(n * 3), drops = [];
  for (let i = 0; i < n; i++) drops.push({ x: rand(-BOX.w / 2, BOX.w / 2), y: rand(0, BOX.h), z: rand(-BOX.w / 2, BOX.w / 2), v: rand(0.9, 1.8), ph: rand(0, 6.28) });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 0.17, map: dotTex, transparent: true, opacity: 0.85, depthWrite: false });
  const mesh = new THREE.Points(g, m);
  mesh.frustumCulled = false;
  return { mesh, drops, type: 'Snö' };
}

function updatePrecip(dt) {
  if (!precip) return;
  const pos = precip.mesh.geometry.attributes.position;
  const t = performance.now() * 0.001;
  for (let i = 0; i < precip.drops.length; i++) {
    const d = precip.drops[i];
    d.y -= d.v * dt;
    if (precip.type === 'Snö') { d.x += Math.sin(t * 0.8 + d.ph) * 0.6 * dt; d.z += Math.cos(t * 0.6 + d.ph) * 0.4 * dt; }
    else d.x += 2.2 * dt;
    if (d.y < 0) { d.y = BOX.h; d.x = rand(-BOX.w / 2, BOX.w / 2); d.z = rand(-BOX.w / 2, BOX.w / 2); }
    if (precip.type === 'Regn') {
      pos.setXYZ(i * 2, d.x, d.y, d.z);
      pos.setXYZ(i * 2 + 1, d.x + precip.tilt.x, d.y + precip.tilt.y, d.z + precip.tilt.z);
    } else {
      pos.setXYZ(i, d.x, d.y, d.z);
    }
  }
  pos.needsUpdate = true;
  precip.mesh.position.set(player.x, player.y - 1.7, player.z);
}

// ===== Dimbankar över Skärsjön =====
function makeMistTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(235,240,245,0.5)');
  grad.addColorStop(0.7, 'rgba(235,240,245,0.22)');
  grad.addColorStop(1, 'rgba(235,240,245,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const mists = [];
{
  const tex = makeMistTexture();
  for (let i = 0; i < 12; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
    const a = rand(0, Math.PI * 2), r = rand(5, LAKE.r + 6);
    sp.position.set(LAKE.x + Math.cos(a) * r, WATER_Y + rand(1.5, 3), LAKE.z + Math.sin(a) * r);
    sp.scale.set(rand(22, 38), rand(4.5, 8), 1);
    sp.userData = { drift: rand(0.15, 0.4), ph: rand(0, 6.28), max: rand(0.2, 0.38) };
    scene.add(sp);
    mists.push(sp);
  }
}

function updateMist(dt) {
  // starkast i gryningen (04–10), hela dagen vid Dimma
  let f = clamp(1 - Math.abs(S.time - 6.5) / 3.5, 0, 1);
  if (S.weather === 'Dimma') f = Math.max(f, 0.8);
  if (S.weather === 'Regn') f *= 0.3;
  for (const sp of mists) {
    sp.material.opacity = lerp(sp.material.opacity, sp.userData.max * f, 0.02);
    sp.position.x += Math.sin(performance.now() * 0.0001 + sp.userData.ph) * sp.userData.drift * dt;
  }
}

// ===== Fallande höstlöv =====
const leaves = (() => {
  const n = 160, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), drops = [];
  const palette = [new THREE.Color(0xd8a832), new THREE.Color(0xc07830), new THREE.Color(0xa85a28)];
  for (let i = 0; i < n; i++) {
    drops.push({ x: rand(-14, 14), y: rand(0, 9), z: rand(-14, 14), v: rand(0.5, 0.9), ph: rand(0, 6.28) });
    const c = palette[i % 3];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 0.14, map: dotTex, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const mesh = new THREE.Points(g, m);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, drops };
})();

function updateLeaves(dt) {
  const active = seasonIdx() === 2;
  leaves.mesh.visible = active;
  if (!active) return;
  const pos = leaves.mesh.geometry.attributes.position;
  const t = performance.now() * 0.001;
  for (let i = 0; i < leaves.drops.length; i++) {
    const d = leaves.drops[i];
    d.y -= d.v * dt;
    d.x += Math.sin(t + d.ph) * 0.8 * dt;
    if (d.y < 0) { d.y = rand(5, 9); d.x = rand(-14, 14); d.z = rand(-14, 14); }
    pos.setXYZ(i, d.x, d.y, d.z);
  }
  pos.needsUpdate = true;
  leaves.mesh.position.set(player.x, player.y - 1.7, player.z);
}

// ===== Väderval =====
export function setWeather(w) {
  S.weather = w;
  if (precip) { scene.remove(precip.mesh); precip.mesh.geometry.dispose(); precip = null; }
  if (w === 'Regn') precip = makeRain();
  else if (w === 'Snö') precip = makeSnow();
  if (precip) scene.add(precip.mesh);
  setWindStrength(w === 'Regn' || w === 'Snö' ? 1.3 : w === 'Mulet' ? 0.9 : w === 'Dimma' ? 0.25 : 0.5);
  $('weathertxt').textContent = w;
}

export function rollWeather() {
  const r = Math.random(), si = seasonIdx();
  if (si === 3) setWeather(r < 0.4 ? 'Snö' : r < 0.6 ? 'Mulet' : r < 0.75 ? 'Dimma' : 'Klart');
  else if (si === 2) setWeather(r < 0.3 ? 'Regn' : r < 0.55 ? 'Mulet' : r < 0.7 ? 'Dimma' : 'Klart');
  else setWeather(r < 0.18 ? 'Regn' : r < 0.38 ? 'Mulet' : 'Klart');
}

export function updateSky(dt) {
  const elev = Math.sin(Math.PI * (S.time - 5.5) / 15); // sol uppe ca 05:30–20:30
  const day = clamp(elev * 2.4, 0, 1);
  const dusk = clamp(1 - Math.abs(elev) * 5, 0, 1) * (S.time > 3 && S.time < 23 ? 1 : 0);
  // dimfärgen approximerar himlens horisont (himlen ritas av Sky-shadern)
  tmp.copy(skyNight).lerp(skyDay, day).lerp(skyDusk, dusk * 0.55);
  if (S.weather === 'Mulet' || S.weather === 'Regn' || S.weather === 'Snö') tmp.lerp(skyCloud, 0.6 * day);
  scene.fog.color.lerp(tmp, 0.05);
  const far = S.weather === 'Dimma' ? 70 : (S.weather === 'Regn' || S.weather === 'Snö') ? 130 : S.weather === 'Mulet' ? 240 : 320;
  scene.fog.far = lerp(scene.fog.far, lerp(far * 0.5, far, day * 0.7 + 0.3), 0.02);
  scene.fog.near = scene.fog.far * (S.weather === 'Klart' ? 0.3 : 0.18);
  const az = Math.PI * (S.time - 5.5) / 15;
  const sx = Math.cos(az) * 150, sy = Math.sin(az) * 150, sz = 60;
  setSkyState(elev, az, S.weather);
  skyFollow(player.x, player.z);
  updateClouds(dt);
  sun.position.set(player.x + sx, Math.max(sy, -30), player.z + sz);
  sun.target.position.set(player.x, 0, player.z);
  sun.intensity = lerp(sun.intensity, clamp(elev, 0, 1) * ((S.weather === 'Klart') ? 1.35 : 0.6), 0.05);
  sun.color.setHSL(0.1, 0.5, lerp(0.55, 0.72, clamp(elev * 3, 0, 1)));
  hemi.intensity = lerp(0.1, 0.65, day);
  moon.position.set(player.x - sx * 2.2, Math.max(-sy * 2.2, 20), player.z - sz * 1.5);
  moon.visible = elev < 0.05;
  updateMoon(player.x, player.z, moon.position, elev);
  starMat.opacity = clamp(-elev * 3, 0, 1) * 0.9;
  updateWind(dt);
  updatePrecip(dt);
  updateMist(dt);
  updateLeaves(dt);
}
