// GLTF-modellregister: försöker ladda /models/<namn>.glb (Quaternius CC0,
// se `npm run setup:models`). Saknas en modell används de procedurella
// modellerna i vegetation.js/animals.js i stället.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const NAMES = ['gran', 'tall', 'bjork', 'sten', 'radjur', 'hare', 'hona', 'far'];
const models = {};
export const loadedModels = {}; // namn → true/false, för felsökning
for (const n of NAMES) { models[n] = null; loadedModels[n] = false; }

// manifest.json underhålls av `npm run setup:models` och listar vilka
// glb-filer som finns – då slipper vi 404-brus för modeller som saknas.
let available = [];
try {
  const r = await fetch('models/manifest.json');
  if (r.ok) available = await r.json();
} catch { /* inga modeller */ }

const loader = new GLTFLoader();
await Promise.all(available.filter(n => NAMES.includes(n)).map(async name => {
  try {
    const gltf = await loader.loadAsync('models/' + name + '.glb');
    models[name] = gltf.scene;
    loadedModels[name] = true;
  } catch { /* behåll procedurell modell */ }
}));

export function getModel(name) { return models[name]; }

// Klonar en modell normaliserad: basen vid y=0, centrerad i x/z, given höjd.
export function cloneNormalized(name, targetH) {
  const m = models[name];
  if (!m) return null;
  const inner = m.clone(true);
  const box = new THREE.Box3().setFromObject(inner);
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  const s = targetH / (size.y || 1);
  inner.scale.setScalar(s);
  inner.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  const g = new THREE.Group();
  g.add(inner);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
