// Inställningsmeny (Esc): grafiknivå låg/mellan/hög, ljudvolym och manuell
// sparning. Valen sparas i localStorage och tillämpas vid start.
import { renderer, setShadows } from './scene.js';
import { bloomPass } from './post.js';
import { setWaterQuality } from './water.js';
import { setVegDetail } from './vegetation.js';
import { setVolume, getVolume } from './audio.js';
import { saveGame } from './save.js';
import { S } from './state.js';
import { $, msg, openPanelById, uiState, closePanels } from './ui.js';

import { touch } from './touch-state.js';

const KEY = 'traneras-settings-v1';
// mobiler får Mellan som standard – Hög är kalibrerad för laptop-GPU
export const settings = { quality: touch.active ? 'mellan' : 'hog', volume: 0.7 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { /* privat läge */ }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* privat läge */ }
}

const QUALITIES = {
  lag:    { label: 'Låg',    pixelRatio: 1,   shadows: false, shadowSize: 1024, bloom: false, water: 128, vegDetail: 40 },
  mellan: { label: 'Mellan', pixelRatio: 1.5, shadows: true,  shadowSize: 1024, bloom: true,  water: 256, vegDetail: 55 },
  hog:    { label: 'Hög',    pixelRatio: Math.min(devicePixelRatio, 2), shadows: true, shadowSize: 2048, bloom: true, water: 512, vegDetail: 70 }
};

export function applyQuality(q) {
  const c = QUALITIES[q] || QUALITIES.hog;
  settings.quality = q;
  renderer.setPixelRatio(c.pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  setShadows(c.shadows, c.shadowSize);
  bloomPass.enabled = c.bloom;
  setWaterQuality(c.water);
  setVegDetail(c.vegDetail);
  persist();
}

export function applyVolume(v) {
  settings.volume = v;
  setVolume(v);
  persist();
}

export function applySettings() {
  applyQuality(settings.quality);
  setVolume(settings.volume);
}

const VOLUMES = [['Av', 0], ['Lagom', 0.4], ['Full', 0.8]];

export function openSettings() {
  openPanelById('p-settings');
  const el = $('setlist');
  el.innerHTML = '';

  const qRow = document.createElement('div');
  qRow.className = 'row';
  qRow.innerHTML = '<span>Grafik</span><span>' + Object.entries(QUALITIES).map(([id, c]) =>
    `<button data-q="${id}" ${settings.quality === id ? 'disabled' : ''}>${c.label}</button> `).join('') + '</span>';
  el.appendChild(qRow);

  const vRow = document.createElement('div');
  vRow.className = 'row';
  vRow.innerHTML = '<span>Ljud</span><span>' + VOLUMES.map(([label, v]) =>
    `<button data-v="${v}" ${Math.abs(settings.volume - v) < 0.01 ? 'disabled' : ''}>${label}</button> `).join('') + '</span>';
  el.appendChild(vRow);

  const sRow = document.createElement('div');
  sRow.className = 'row';
  sRow.innerHTML = '<span>Spelet autosparas varje morgon</span><button data-save="1">Spara nu</button>';
  el.appendChild(sRow);

  el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { applyQuality(b.dataset.q); openSettings(); });
  el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { applyVolume(+b.dataset.v); openSettings(); });
  el.querySelector('[data-save]').onclick = () => {
    if (!S.started) { msg('Starta spelet först.'); return; }
    msg(saveGame() ? 'Spelet sparat.' : 'Kunde inte spara (localStorage blockerat?).');
    closePanels();
  };
}

// Esc växlar inställningspanelen när ingen annan panel är öppen
export function toggleSettings() {
  if (uiState.open === 'p-settings') closePanels();
  else openSettings();
}
