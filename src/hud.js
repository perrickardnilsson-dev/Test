// HUD: mätare, klocka, pengar och den kontextkänsliga [E]-prompten.
import * as THREE from 'three';
import { SEED2CROP } from './config.js';
import { S, seasonName } from './state.js';
import { camera } from './scene.js';
import { house } from './farm.js';
import { nearestPlot } from './farming.js';
import { builtThings } from './buildings.js';
import { player } from './player.js';
import { trader, truck } from './economy.js';
import { livestock } from './animals.js';
import { $ } from './ui.js';
import { updateTouchHud } from './touch.js';

export function updateHUD() {
  $('bhp').firstElementChild.style.width = S.hp + '%';
  $('bhu').firstElementChild.style.width = S.hunger + '%';
  $('ben').firstElementChild.style.width = S.energy + '%';
  const h = Math.floor(S.time), m = Math.floor((S.time - h) * 60);
  $('clock').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  $('daytxt').textContent = 'Dag ' + S.day + ' · ' + seasonName();
  $('money').textContent = S.money + ' kr';
  // prompt
  let pr = '';
  if (trader.active && truck.visible && camera.position.distanceTo(truck.position) < 6) pr = '[E] Handla';
  else {
    const dh = camera.position.distanceTo(new THREE.Vector3(house.position.x, house.position.y + 1, house.position.z + 3));
    if (dh < 3.5) pr = '[E] Sov (kväll/natt)';
    else {
      const p = nearestPlot();
      if (p && p.plant && p.plant.ripe) pr = '[E] Skörda ' + p.plant.crop;
      else if (p && !p.plant) pr = '[E] Så ' + (SEED2CROP[S.selSeed] ? SEED2CROP[S.selSeed].crop : '') + ' (Q byter)';
      for (const b of builtThings) if (b.id === 'rokeri' && Math.hypot(b.x - player.x, b.z - player.z) < 3.5) pr = '[E] Rök kött & fisk';
      for (const a of livestock) if (a.kind === 'får' && a.wool >= 1 && camera.position.distanceTo(a.g.position) < 3) pr = '[E] Klipp fåret';
    }
  }
  $('prompt').style.display = pr ? 'block' : 'none';
  $('prompt').textContent = pr;
  updateTouchHud(pr); // mobilens kontextknapp + verktygsikon
}
