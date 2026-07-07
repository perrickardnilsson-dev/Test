// Gemensam strålkastning från siktets mitt.
import * as THREE from 'three';
import { camera } from './scene.js';

const raycaster = new THREE.Raycaster();
const centerV2 = new THREE.Vector2(0, 0);

export function rayHit(objs, far = 5) {
  raycaster.setFromCamera(centerV2, camera);
  raycaster.far = far;
  return raycaster.intersectObjects(objs, true);
}
