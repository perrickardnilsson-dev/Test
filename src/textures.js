// Texturregister: varje uppsättning (diff/nor/arm) börjar som procedurell
// reservtextur och byts ut mot Poly Haven-filer från /textures/ när de finns
// (`npm run setup`). Slots ({value}) kan användas direkt som shader-uniforms;
// material som behöver veta när en fil laddats prenumererar med onUpdate.
import * as THREE from 'three';
import { makeFallbackSet, FALLBACK_DEFS } from './fallback-textures.js';

const loader = new THREE.TextureLoader();
const sets = new Map();

export function getTextureSet(name) {
  let s = sets.get(name);
  if (s) return s;
  const fb = makeFallbackSet(FALLBACK_DEFS[name]);
  const subs = [];
  s = {
    diff: { value: fb.diff }, nor: { value: fb.nor }, arm: { value: fb.arm },
    onUpdate(cb) { subs.push(cb); }
  };
  for (const map of ['diff', 'nor', 'arm']) {
    loader.load('textures/' + name + '_' + map + '.jpg', tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 4;
      if (map === 'diff') tex.colorSpace = THREE.SRGBColorSpace;
      s[map].value = tex;
      for (const cb of subs) cb(map, tex);
    }, undefined, () => { /* behåll reservtexturen */ });
  }
  sets.set(name, s);
  return s;
}

// Kopplar en uppsättning till ett MeshStandardMaterial (map/normalMap/
// roughnessMap+aoMap ur arm-texturen) och håller det uppdaterat.
export function applyTextureSet(mat, name) {
  const s = getTextureSet(name);
  const assign = () => {
    mat.map = s.diff.value;
    mat.normalMap = s.nor.value;
    mat.roughnessMap = s.arm.value; // roughness läses ur G-kanalen
    mat.aoMap = s.arm.value;        // AO ur R-kanalen
    mat.needsUpdate = true;
  };
  assign();
  s.onUpdate(assign);
  return mat;
}
