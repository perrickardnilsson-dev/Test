// Generellt gränssnitt: meddelanden, paneler, hotbar och inventarie.
import { TOOLS, FOOD, SEED2CROP } from './config.js';
import { S, give } from './state.js';
import { renderer } from './scene.js';
import { sfx } from './audio.js';
import { touch } from './touch-state.js';

export const $ = id => document.getElementById(id);
export const uiState = { open: null }; // vilken bigpanel som är öppen

export function msg(t) {
  const d = document.createElement('div');
  d.className = 'msg';
  d.textContent = t;
  $('msgs').appendChild(d);
  while ($('msgs').children.length > 3) $('msgs').removeChild($('msgs').firstChild);
  setTimeout(() => d.remove(), 3500);
}

// Hotbaren behöver kunna byta verktyg (vilket rör byggläget) utan att ui.js
// importerar buildings.js – hanteraren registreras från input.js.
let toolSelectHandler = i => { S.tool = i; drawHotbar(); };
export function onToolSelect(fn) { toolSelectHandler = fn; }

export function drawHotbar() {
  const hb = $('hotbar');
  hb.innerHTML = '';
  TOOLS.forEach((t, i) => {
    const s = document.createElement('div');
    s.className = 'slot' + (i === S.tool ? ' sel' : '');
    s.innerHTML = '<div class="ico">' + t.ico + '</div><div class="k">' + (i + 1) + ' ' + t.name + '</div>';
    s.onclick = () => toolSelectHandler(i);
    hb.appendChild(s);
  });
}

export function togglePanel(id) { if (uiState.open === id) { closePanels(); } else openPanelById(id); }

export function openPanelById(id) {
  closePanels();
  uiState.open = id;
  $(id).style.display = 'block';
  document.exitPointerLock && document.exitPointerLock();
  if (id === 'p-inv') refreshInv();
}

export function closePanels() {
  ['p-inv', 'p-shop', 'p-build', 'p-settings'].forEach(i => $(i).style.display = 'none');
  uiState.open = null;
  if (S.started && !S.dead && !touch.active) renderer.domElement.requestPointerLock();
}

export function refreshInv() {
  const el = $('invlist');
  el.innerHTML = '';
  const items = Object.keys(S.inv).sort();
  if (!items.length) { el.innerHTML = '<div class="row">Tomt.</div>'; }
  for (const it of items) {
    const r = document.createElement('div');
    r.className = 'row';
    let btns = '';
    if (FOOD[it]) btns += '<button data-eat="' + it + '">Ät (+' + FOOD[it] + ')</button> ';
    if (it === 'trä') btns += '<button data-craft="1">→ 3 pilar</button> ';
    if (SEED2CROP[it]) btns += '<button data-seed="' + it + '">' + (S.selSeed === it ? '✓ Valt frö' : 'Välj frö') + '</button>';
    r.innerHTML = '<span>' + it + ' × ' + S.inv[it] + '</span><span>' + btns + '</span>';
    el.appendChild(r);
  }
  el.querySelectorAll('[data-eat]').forEach(b => b.onclick = () => { eat(b.dataset.eat); refreshInv(); });
  el.querySelectorAll('[data-craft]').forEach(b => b.onclick = () => {
    if ((S.inv['trä'] || 0) >= 1) { S.inv['trä']--; if (S.inv['trä'] <= 0) delete S.inv['trä']; give('pil', 3); msg('+3 pilar'); refreshInv(); }
  });
  el.querySelectorAll('[data-seed]').forEach(b => b.onclick = () => { S.selSeed = b.dataset.seed; msg('Valt frö: ' + S.selSeed); refreshInv(); });
}

export function eat(it) {
  if (!(S.inv[it] > 0)) return;
  S.inv[it]--;
  if (S.inv[it] <= 0) delete S.inv[it];
  S.hunger = Math.min(100, S.hunger + FOOD[it]);
  S.energy = Math.min(100, S.energy + FOOD[it] * 0.5);
  sfx('at');
  msg('Åt ' + it + '.');
}
