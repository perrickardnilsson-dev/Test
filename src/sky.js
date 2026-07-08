// Fysisk himmel (three:s Sky) med atmosfärisk spridning, samt månljus.
// Sol-/månriktning och väderparametrar styrs från weather.js.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { scene } from './scene.js';

export const sky = new Sky();
// Standard-boxens enorma trianglar klipps trasigt mot kameraplanet
// (z=w-tricket) och ger en vit kil över himlen – en sfär har små trianglar
// och renderas korrekt.
sky.geometry.dispose();
sky.geometry = new THREE.SphereGeometry(1, 32, 16);
sky.scale.setScalar(450);
const u = sky.material.uniforms;
u.turbidity.value = 4;
u.rayleigh.value = 2;
u.mieCoefficient.value = 0.005;
u.mieDirectionalG.value = 0.8;
scene.add(sky);

// Svagt blåaktigt månljus när solen är nere
export const moonLight = new THREE.DirectionalLight(0xa8c0e8, 0);
scene.add(moonLight);
scene.add(moonLight.target);

// elev: solens höjd (-1..1), az: azimutvinkel, weather: aktuellt väder
export function setSkyState(elev, az, weather) {
  u.sunPosition.value.set(Math.cos(az), Math.sin(az), 0.4).normalize();
  const overcast = weather === 'Mulet' || weather === 'Regn' || weather === 'Snö';
  // låg rayleigh/turbiditet vid klart väder ger djupblå himmel utan vit horisontdis
  u.turbidity.value = overcast ? 14 : weather === 'Dimma' ? 9 : 3;
  u.rayleigh.value = overcast ? 0.6 : 1.1;
  u.mieCoefficient.value = overcast ? 0.002 : 0.0035;
  // procedurella moln: täckning efter väder
  u.cloudCoverage.value = overcast ? 0.85 : weather === 'Dimma' ? 0.55 : 0.2;
  u.cloudDensity.value = overcast ? 0.65 : 0.4;
}

// Molnen driver sakta med tiden
export function updateClouds(dt) {
  u.time.value += dt;
}

// Himlakupolen följer spelaren så kameran aldrig lämnar den
export function skyFollow(px, pz) {
  sky.position.set(px, 0, pz);
}

export function updateMoon(px, pz, moonPos, elev) {
  moonLight.position.copy(moonPos);
  moonLight.target.position.set(px, 0, pz);
  moonLight.intensity = Math.max(0, Math.min(1, -elev * 2.5)) * 0.14;
}
