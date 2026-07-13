// Startpunkt: knyter ihop modulerna, kör spel-loopen och startskärmen.
import * as THREE from 'three';
import { rand } from './utils.js';
import { DAY_REAL } from './config.js';
import { S, seasonIdx, isWinter } from './state.js';
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
import { updateWater, setLakeWinter } from './water.js';
import { composer, setSeasonGrade } from './post.js';
import { newDay } from './days.js';
import { initAudio, updateAmbience } from './audio.js';
import { hasSave, loadGame, clearSave } from './save.js';
import { applySettings } from './settings.js';
import { $, msg, drawHotbar } from './ui.js';
import { updateHUD } from './hud.js';
import { initInput } from './input.js';
import { initTouch, showTouchControls } from './touch.js';

initInput();
initTouch();
applySettings();

// PWA: offline-cache i produktionsbygget (installeras från Safari/Chrome)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
}

// fps-mätare under utveckling (prestandakrav: 60 fps)
let stats = null;
if (import.meta.env.DEV) {
  const { default: Stats } = await import('stats.js');
  stats = new Stats();
  // vänster sida, under HUD:en – höger sida är touchknapparnas yta
  stats.dom.style.left = '12px';
  stats.dom.style.top = '170px';
  document.body.appendChild(stats.dom);
}

// Debughandtag i dev-läge, t.ex. för att testa årstider från konsolen:
//   __traneras.S.day = 13; __traneras.newDay();
if (import.meta.env.DEV) {
  const { water, ice } = await import('./water.js');
  const { sky, moonLight } = await import('./sky.js');
  const { setWeather } = await import('./weather.js');
  const { toolAction, interact } = await import('./interactions.js');
  const { plots } = await import('./farming.js');
  const { trees, rocks, treeRayTargets, rockRayTargets, vegFromHit } = await import('./vegetation.js');
  const { wild, livestock, addLivestock } = await import('./animals.js');
  const { loadedModels } = await import('./models.js');
  const { rayHit } = await import('./raycast.js');
  const { saveGame } = await import('./save.js');
  const { makeBuilding, builtThings } = await import('./buildings.js');
  const { settings, applyQuality } = await import('./settings.js');
  const { LAKE, W, WATER_Y } = await import('./config.js');
  const { usingRealMap, TRUCK_SPOT, roadDist } = await import('./worlddata.js');
  window.__traneras = { S, newDay, recolorGround, treeSeasonColors, player, water, ice, sky, moonLight, setWeather, toolAction, interact, plots, trees, rocks, wild, livestock, addLivestock, loadedModels, treeRayTargets, rockRayTargets, vegFromHit, rayHit, camera, composer, renderer, scene, saveGame, makeBuilding, builtThings, settings, applyQuality, LAKE, W, WATER_Y, usingRealMap, TRUCK_SPOT, roadDist, heightAt };
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
  updateWater(dt);
  updateAmbience(dt);
  composer.render();
  stats && stats.end();
}

// Finns en sparning visas Fortsätt-knappen
if (hasSave()) {
  $('continuebtn').style.display = 'inline-block';
  $('startbtn').textContent = 'Börja om från början';
}

$('startbtn').onclick = () => {
  clearSave();
  initAudio();
  showTouchControls();
  $('start').style.display = 'none';
  S.started = true;
  drawHotbar(); recolorGround(); treeSeasonColors(); spawnWild(); rollWeather(); newDay();
  setLakeWinter(isWinter()); setSeasonGrade(seasonIdx());
  S.day = 1; trader.active = true; // handlaren är där dag 1
  msg('Välkommen till Tranerås! Hugg träd, gräv åkrar och överlev.');
  renderer.domElement.requestPointerLock();
};

$('continuebtn').onclick = () => {
  initAudio();
  showTouchControls();
  $('start').style.display = 'none';
  S.started = true;
  drawHotbar(); spawnWild();
  if (loadGame()) {
    msg('Välkommen tillbaka till Tranerås! Dag ' + S.day + '.');
  } else {
    // trasig sparning – starta nytt
    recolorGround(); treeSeasonColors(); rollWeather(); newDay();
    S.day = 1; trader.active = true;
    msg('Sparningen kunde inte läsas – nytt spel startat.');
  }
  drawHotbar();
  renderer.domElement.requestPointerLock();
};

loop();
