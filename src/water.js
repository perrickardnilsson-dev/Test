// Skärsjöns vatten: three:s Water-shader med planar reflektion, vågnormalkarta
// och solglitter. På vintern byts vattnet mot en ismesh. Vattenytans höjd
// (WATER_Y) och all fiske-/is-mekanik är oförändrad.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { LAKE, WATER_Y } from './config.js';
import { scene, sun } from './scene.js';
import { makeNormalNoiseTexture } from './fallback-textures.js';

const geo = new THREE.PlaneGeometry(220, 220);

export const water = new Water(geo, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: makeNormalNoiseTexture(10, 8),
  sunDirection: new THREE.Vector3(0, 1, 0),
  sunColor: 0xfff2d8,
  waterColor: 0x1e4d5e,
  distortionScale: 2.2,
  fog: true
});
water.rotation.x = -Math.PI / 2;
water.position.set(LAKE.x, WATER_Y, LAKE.z);
water.material.uniforms.size.value = 6; // tätare vågmönster för en liten skogssjö
scene.add(water);

// Is på vintern
const iceMat = new THREE.MeshStandardMaterial({
  color: 0xdde8ee,
  roughness: 0.22,
  metalness: 0.05,
  normalMap: makeNormalNoiseTexture(3, 10)
});
iceMat.normalMap.repeat.set(14, 14);
export const ice = new THREE.Mesh(geo, iceMat);
ice.rotation.x = -Math.PI / 2;
ice.position.set(LAKE.x, WATER_Y + 0.02, LAKE.z);
ice.receiveShadow = true;
ice.visible = false;
scene.add(ice);

export function setLakeWinter(frozen) {
  water.visible = !frozen;
  ice.visible = frozen;
}

export function updateWater(dt) {
  if (!water.visible) return;
  water.material.uniforms.time.value += dt * 0.6;
  water.material.uniforms.sunDirection.value.copy(sun.position).normalize();
  water.material.uniforms.sunColor.value.copy(sun.color).multiplyScalar(Math.max(sun.intensity, 0.05));
}
