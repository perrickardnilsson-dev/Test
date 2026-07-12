// Renderare, scen, kamera, ljus och himlakroppar.
import * as THREE from 'three';
import { rand } from './utils.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.65;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9db4c0, 50, 240);

export const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 600);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

export const hemi = new THREE.HemisphereLight(0xbcd4e6, 0x3a4a2e, 0.55);
scene.add(hemi);

export const sun = new THREE.DirectionalLight(0xfff2d8, 1.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 400;
scene.add(sun);
scene.add(sun.target);

// Stjärnor + måne + solskiva
const starGeo = new THREE.BufferGeometry();
{
  const p = [];
  for (let i = 0; i < 600; i++) {
    const a = rand(0, Math.PI * 2), b = rand(0.05, Math.PI / 2);
    p.push(Math.cos(a) * Math.cos(b) * 420, Math.sin(b) * 420, Math.sin(a) * Math.cos(b) * 420);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
}
export const starMat = new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.4, transparent: true, opacity: 0 });
export const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

export const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 12), new THREE.MeshBasicMaterial({ color: 0xdfe6f0, fog: false }));
scene.add(moon);

// Grafiknivå: skuggor av/på och upplösning på skuggkartan
export function setShadows(enabled, size) {
  renderer.shadowMap.enabled = enabled;
  sun.castShadow = enabled;
  if (size) {
    sun.shadow.mapSize.set(size, size);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  scene.traverse(o => {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; });
  });
}
