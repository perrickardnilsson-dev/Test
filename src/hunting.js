// Jakt med pilbåge: pilar, bågbana och träffar på vilt.
import * as THREE from 'three';
import { S, give } from './state.js';
import { scene, camera } from './scene.js';
import { heightAt } from './terrain.js';
import { wild } from './animals.js';
import { msg } from './ui.js';

const arrows = [];

export function shootArrow() {
  if ((S.inv['pil'] || 0) < 1) { msg('Inga pilar! Köp av handlaren eller gör av trä (Tab).'); return; }
  if (S.energy < 4) { msg('För trött...'); return; }
  S.inv['pil']--;
  S.energy -= 3;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 4), new THREE.MeshLambertMaterial({ color: 0xd8c8a0 }));
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  m.position.copy(camera.position).addScaledVector(dir, 0.8);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  scene.add(m);
  arrows.push({ m, vel: dir.multiplyScalar(38), life: 4 });
}

export function updateArrows(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.vel.y -= 14 * dt;
    a.m.position.addScaledVector(a.vel, dt);
    a.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.vel.clone().normalize());
    a.life -= dt;
    let hit = false;
    for (let j = wild.length - 1; j >= 0; j--) {
      const w = wild[j], r = w.kind === 'rådjur' ? 1.2 : 0.6;
      if (a.m.position.distanceTo(w.g.position.clone().setY(w.g.position.y + 0.8)) < r) {
        w.hp--;
        hit = true;
        if (w.hp <= 0) {
          scene.remove(w.g);
          wild.splice(j, 1);
          if (w.kind === 'rådjur') { give('kött', 2); give('skinn', 1); msg('Rådjur fällt! +2 kött, +1 skinn'); }
          else { give('kött', 1); msg('Hare fälld! +1 kött'); }
        } else msg('Träff!');
        break;
      }
    }
    if (hit || a.life <= 0 || a.m.position.y < heightAt(a.m.position.x, a.m.position.z)) {
      scene.remove(a.m);
      arrows.splice(i, 1);
    }
  }
}
