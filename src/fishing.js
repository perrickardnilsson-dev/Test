// Fiske i Skärsjön, inklusive isfiske på vintern.
import * as THREE from 'three';
import { rand } from './utils.js';
import { LAKE, WATER_Y } from './config.js';
import { S, give, isWinter } from './state.js';
import { scene, camera } from './scene.js';
import { heightAt } from './terrain.js';
import { player } from './player.js';
import { $, msg } from './ui.js';
import { sfx } from './audio.js';

let fishing = null; // {state,bobber,t,window}

export function doFish() {
  const dLake = Math.hypot(player.x - LAKE.x, player.z - LAKE.z);
  if (!fishing) {
    if (dLake > LAKE.r * 1.3 + 15) { msg('Gå till Skärsjön för att fiska.'); return; }
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pt = camera.position.clone().addScaledVector(dir, 8);
    pt.y = WATER_Y + 0.05;
    // strandlinjen är oregelbunden – kolla att punkten faktiskt är över vatten
    if (heightAt(pt.x, pt.z) > WATER_Y - 0.1) { msg('Sikta ut över vattnet.'); return; }
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshLambertMaterial({ color: 0xc03828 }));
    b.position.copy(pt);
    scene.add(b);
    fishing = { state: 'wait', bobber: b, t: rand(2.5, 7), window: 0 };
    sfx('plask');
    msg(isWinter() ? 'Pilkar genom isen...' : 'Kastat. Vänta på napp...');
  } else if (fishing.state === 'bite') {
    scene.remove(fishing.bobber);
    const fisk = Math.random() < 0.7 ? 'abborre' : 'gädda';
    give(fisk, 1);
    sfx('skorda');
    msg('Fångst! +1 ' + fisk);
    fishing = null;
    $('napp').style.display = 'none';
  } else {
    scene.remove(fishing.bobber);
    fishing = null;
    msg('Drog upp reven.');
  }
}

export function updateFishing(dt) {
  if (!fishing) return;
  if (fishing.state === 'wait') {
    fishing.bobber.position.y = WATER_Y + 0.05 + Math.sin(performance.now() * 0.004) * 0.04;
    fishing.t -= dt;
    if (fishing.t <= 0) { fishing.state = 'bite'; fishing.window = 1.0; $('napp').style.display = 'block'; fishing.bobber.position.y = WATER_Y - 0.15; sfx('napp'); }
  } else if (fishing.state === 'bite') {
    fishing.window -= dt;
    if (fishing.window <= 0) { $('napp').style.display = 'none'; scene.remove(fishing.bobber); fishing = null; msg('Fisken slank iväg...'); }
  }
  if (fishing && Math.hypot(player.x - LAKE.x, player.z - LAKE.z) > LAKE.r * 1.3 + 25) {
    scene.remove(fishing.bobber);
    fishing = null;
    $('napp').style.display = 'none';
  }
}
