// Startpunkt: knyter ihop modulerna, kör spel-loopen och startskärmen.
import * as THREE from 'three';
import { rand } from './utils.js';
import { DAY_REAL } from './config.js';
import { S } from './state.js';
import { renderer, scene, camera } from './scene.js';
import { heightAt, recolorGround, updateTerrain } from './terrain.js';
import { treeSeasonColors, updateVegetation } from './vegetation.js';
import './farm.js';
import { updatePlants } from './farming.js';
import { updateGhost } from './buildings.js';
import { player, keys, updatePlayer } from './player.js';
import { spawnWild, updateWild, updateLivestock } from './animals.js';
import { updateArrows } from './hunting.js';
import { updateFishing } from './fishing.js';
import { trader, truck } from './economy.js';
import { rollWeather, updateSky } from './weather.js';
import { newDay } from './days.js';
import { $, msg, drawHotbar } from './ui.js';
import { updateHUD } from './hud.js';
import { initInput } from './input.js';

initInput();

// fps-mätare under utveckling (prestandakrav: 60 fps)
let stats = null;
if (import.meta.env.DEV) {
  const { default: Stats } = await import('stats.js');
  stats = new Stats();
  stats.dom.style.left = 'auto';
  stats.dom.style.right = '12px';
  stats.dom.style.top = '160px';
  document.body.appendChild(stats.dom);
}

// Debughandtag i dev-läge, t.ex. för att testa årstider från konsolen:
//   __traneras.S.day = 13; __traneras.newDay();
if (import.meta.env.DEV) {
  const { water } = await import('./terrain.js');
  const { setWeather } = await import('./weather.js');
  const { toolAction, interact } = await import('./interactions.js');
  const { plots } = await import('./farming.js');
  const { trees, rocks, treeRayTargets, rockRayTargets, vegFromHit } = await import('./vegetation.js');
  const { wild, livestock, addLivestock } = await import('./animals.js');
  const { loadedModels } = await import('./models.js');
  const { rayHit } = await import('./raycast.js');
  window.__traneras = { S, newDay, recolorGround, treeSeasonColors, player, water, setWeather, toolAction, interact, plots, trees, rocks, wild, livestock, addLivestock, loadedModels, treeRayTargets, rockRayTargets, vegFromHit, rayHit, camera };
}

function die() {
  S.dead = true;
  document.exitPointerLock && document.exitPointerLock();
  msg('Du svimmade av svält... Du vaknar hemma. Halva kassan borta.');
  setTimeout(() => {
    S.money = Math.floor(S.money / 2);
    S.hp = 60; S.hunger = 50; S.energy = 60;
    player.x = 2; player.z = 8; player.y = heightAt(2, 8) + 1.7;
    S.dead = false;
    if (S.started) renderer.domElement.requestPointerLock();
  }, 1800);
}

let nextWeatherT = 2;
const clock = new THREE.Clock();

function loop() {
  requestAnimationFrame(loop);
  stats && stats.begin();
  const dt = Math.min(clock.getDelta(), 0.05);
  if (S.started && !S.dead) {
    // tid
    S.time += dt * 24 / DAY_REAL;
    if (S.time >= 24) { S.time -= 24; S.day++; newDay(); }
    nextWeatherT -= dt * 24 / DAY_REAL;
    if (nextWeatherT <= 0) { rollWeather(); nextWeatherT = rand(3, 7); }
    // handlarbil synlig 09–17
    truck.visible = trader.active && S.time >= 9 && S.time <= 17;
    // behov
    S.hunger = Math.max(0, S.hunger - 0.075 * dt);
    if (!keys['ShiftLeft']) S.energy = Math.min(100, S.energy + 1.1 * dt);
    if (S.hunger <= 0) S.hp = Math.max(0, S.hp - 0.8 * dt);
    else if (S.hunger > 65) S.hp = Math.min(100, S.hp + 0.6 * dt);
    if (S.hp <= 0) { die(); }
    updatePlayer(dt);
    updateWild(dt);
    updateLivestock(dt);
    updateArrows(dt);
    updateFishing(dt);
    updatePlants(dt / DAY_REAL); // dt sek → andel av dygn
    updateGhost();
    updateSky(dt);
    updateHUD();
  }
  updateTerrain(player.x, player.z);
  updateVegetation(player.x, player.z);
  renderer.render(scene, camera);
  stats && stats.end();
}

$('startbtn').onclick = () => {
  $('start').style.display = 'none';
  S.started = true;
  drawHotbar(); recolorGround(); treeSeasonColors(); spawnWild(); rollWeather(); newDay();
  S.day = 1; trader.active = true; // handlaren är där dag 1
  msg('Välkommen till Tranerås! Hugg träd, gräv åkrar och överlev.');
  renderer.domElement.requestPointerLock();
};

loop();
