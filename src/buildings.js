// Byggsystemet: byggmeny, spökbygge (ghost) och färdiga byggnader.
import * as THREE from 'three';
import { BUILDS } from './config.js';
import { S } from './state.js';
import { scene } from './scene.js';
import { heightAt, groundMeshes } from './terrain.js';
import { box } from './farm.js';
import { makePlot } from './farming.js';
import { player } from './player.js';
import { $, msg, openPanelById, closePanels, drawHotbar } from './ui.js';
import { sfx } from './audio.js';
import { rayHit } from './raycast.js';

export const builtThings = [];
export let buildMode = null;
let ghost = null;

export function costStr(c) { return Object.entries(c).map(([k, v]) => v + ' ' + k).join(', '); }
export function canAfford(c) { return Object.entries(c).every(([k, v]) => (S.inv[k] || 0) >= v); }
export function payCost(c) { for (const k in c) { S.inv[k] -= c[k]; if (S.inv[k] <= 0) delete S.inv[k]; } }

export function makeBuilding(id, x, z, ry) {
  const h = heightAt(x, z), g = new THREE.Group();
  g.position.set(x, h, z);
  g.rotation.y = ry;
  if (id === 'staket') {
    box(2, 0.12, 0.12, 0x8a6f4d, 0, 0.5, 0, g); box(2, 0.12, 0.12, 0x8a6f4d, 0, 0.95, 0, g);
    box(0.14, 1.1, 0.14, 0x6b543a, -0.9, 0.55, 0, g); box(0.14, 1.1, 0.14, 0x6b543a, 0.9, 0.55, 0, g);
  } else if (id === 'honshus') {
    box(2.6, 1.6, 2, 0xa04a35, 0, 0.8, 0, g); box(2.8, 0.2, 2.3, 0x4a4440, 0, 1.75, 0, g);
    box(0.7, 0.9, 0.1, 0x3f2f22, 0, 0.45, 1.02, g);
  } else if (id === 'forrad') {
    box(3.5, 2.4, 3, 0x6b4a33, 0, 1.2, 0, g); box(3.8, 0.25, 3.3, 0x4a4440, 0, 2.5, 0, g);
  } else if (id === 'vaxthus') {
    const glass = new THREE.MeshLambertMaterial({ color: 0xbfe0d8, transparent: true, opacity: 0.35 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 4), glass);
    m.position.y = 1.2;
    g.add(m);
    box(5, 0.15, 0.15, 0xd8d4c8, 0, 2.4, 2, g); box(5, 0.15, 0.15, 0xd8d4c8, 0, 2.4, -2, g);
    makePlot(x - 1.2, z - 0.9, true); makePlot(x + 1.2, z - 0.9, true);
    makePlot(x - 1.2, z + 0.9, true); makePlot(x + 1.2, z + 0.9, true);
  } else if (id === 'rokeri') {
    box(1.4, 2.2, 1.4, 0x7d7f78, 0, 1.1, 0, g); box(0.5, 0.8, 0.5, 0x5a5a55, 0, 2.5, 0, g);
    g.userData.rokeri = true;
  }
  g.traverse(o => { o.userData.buildId = id; });
  scene.add(g);
  builtThings.push({ id, g, x, z });
  return g;
}

export function openBuild() {
  openPanelById('p-build');
  const el = $('buildlist');
  el.innerHTML = '';
  BUILDS.forEach((b, i) => {
    const ok = canAfford(b.cost);
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = '<span>' + b.name + ' <span style="color:#8f8266">(' + costStr(b.cost) + ')</span></span><button data-b="' + i + '" ' + (ok ? '' : 'disabled') + '>Välj</button>';
    el.appendChild(r);
  });
  el.querySelectorAll('[data-b]').forEach(btn => btn.onclick = () => {
    buildMode = BUILDS[+btn.dataset.b];
    closePanels();
    makeGhost();
    msg(buildMode.name + ': sikta på marken och klicka för att placera.');
  });
}

function makeGhost() {
  removeGhost();
  ghost = new THREE.Mesh(
    new THREE.BoxGeometry(buildMode.id === 'vaxthus' ? 5 : buildMode.id === 'staket' ? 2 : 3, 1.5, buildMode.id === 'vaxthus' ? 4 : buildMode.id === 'staket' ? 0.2 : 2.6),
    new THREE.MeshLambertMaterial({ color: 0x7fd08a, transparent: true, opacity: 0.4 })
  );
  scene.add(ghost);
}

function removeGhost() { if (ghost) { scene.remove(ghost); ghost = null; } }

export function cancelBuild() { buildMode = null; removeGhost(); }

export function placeBuild() {
  if (!ghost || !ghost.visible) return;
  if (!canAfford(buildMode.cost)) { msg('Du saknar material: ' + costStr(buildMode.cost)); return; }
  payCost(buildMode.cost);
  const ry = Math.round(player.yaw / (Math.PI / 2)) * (Math.PI / 2);
  makeBuilding(buildMode.id, ghost.position.x, ghost.position.z, ry);
  sfx('bygg');
  msg(buildMode.name + ' byggt!');
  if (buildMode.id !== 'staket') { cancelBuild(); S.tool = 0; drawHotbar(); }
}

export function updateGhost() {
  if (!buildMode || !ghost) return;
  const hits = rayHit(groundMeshes, 16);
  if (hits.length) {
    const p = hits[0].point;
    ghost.visible = true;
    ghost.position.set(p.x, heightAt(p.x, p.z) + 0.75, p.z);
    ghost.rotation.y = Math.round(player.yaw / (Math.PI / 2)) * (Math.PI / 2);
  } else ghost.visible = false;
}
