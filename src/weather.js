// Väder, himmel, dygnsljus och nederbördspartiklar.
import * as THREE from 'three';
import { clamp, lerp, rand } from './utils.js';
import { S, seasonIdx } from './state.js';
import { scene, sun, hemi, starMat, moon } from './scene.js';
import { setSkyState, updateMoon, skyFollow, updateClouds } from './sky.js';
import { player } from './player.js';
import { $ } from './ui.js';

const skyDay = new THREE.Color(0x8fb8d8), skyNight = new THREE.Color(0x0a0f1e),
      skyDusk = new THREE.Color(0xd8875a), skyCloud = new THREE.Color(0x9aa3ab),
      tmp = new THREE.Color();
let precip = null;

export function setWeather(w) {
  S.weather = w;
  if (precip) { scene.remove(precip.pts); precip = null; }
  if (w === 'Regn' || w === 'Snö') {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = rand(-30, 30); pos[i * 3 + 1] = rand(0, 25); pos[i * 3 + 2] = rand(-30, 30); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: w === 'Snö' ? 0xffffff : 0x9ab4c8, size: w === 'Snö' ? 0.22 : 0.1, transparent: true, opacity: 0.8 });
    const pts = new THREE.Points(g, m);
    scene.add(pts);
    precip = { pts, speed: w === 'Snö' ? 2.5 : 16 };
  }
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
  scene.fog.color.copy(tmp);
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
  sun.intensity = clamp(elev, 0, 1) * ((S.weather === 'Klart') ? 1.35 : 0.6);
  sun.color.setHSL(0.1, 0.5, lerp(0.55, 0.72, clamp(elev * 3, 0, 1)));
  hemi.intensity = lerp(0.1, 0.65, day);
  moon.position.set(player.x - sx * 2.2, Math.max(-sy * 2.2, 20), player.z - sz * 1.5);
  moon.visible = elev < 0.05;
  updateMoon(player.x, player.z, moon.position, elev);
  starMat.opacity = clamp(-elev * 3, 0, 1) * 0.9;
  if (precip) {
    const pos = precip.pts.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - precip.speed * dt;
      if (y < 0) y = 25;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    precip.pts.position.set(player.x, player.y - 1.7, player.z);
  }
}
