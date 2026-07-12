// Ekonomi: handlaren med sin bil, köp och sälj.
import { BUY, SELL, ROAD_Z } from './config.js';
import { S, give } from './state.js';
import { scene } from './scene.js';
import { heightAt } from './terrain.js';
import { box } from './farm.js';
import { addLivestock } from './animals.js';
import { $, msg, openPanelById } from './ui.js';
import { sfx } from './audio.js';
import * as THREE from 'three';

// Handlarens bil
export const truck = new THREE.Group();
{
  box(3.4, 1.1, 1.8, 0x9a4030, 0, 1.0, 0, truck);
  box(1.5, 1.0, 1.7, 0xb8b0a0, -0.8, 2.0, 0, truck);
  box(1.6, 0.9, 1.6, 0x6b5a40, 0.8, 1.9, 0, truck);
  const wg = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), wm = new THREE.MeshLambertMaterial({ color: 0x222222 });
  [[-1.1, 1], [1.1, 1], [-1.1, -1], [1.1, -1]].forEach(p => {
    const w = new THREE.Mesh(wg, wm);
    w.rotation.x = Math.PI / 2;
    w.position.set(p[0], 0.42, p[1] * 0.95);
    truck.add(w);
  });
  truck.position.set(26, heightAt(26, ROAD_Z), ROAD_Z);
  truck.rotation.y = Math.PI / 2;
  truck.visible = false;
  scene.add(truck);
}

export const trader = { active: false };

export function openShop() {
  openPanelById('p-shop');
  const el = $('shoplist');
  el.innerHTML = '<div class="row" style="color:#cfae72">— Köp —</div>';
  BUY.forEach((b, i) => {
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = '<span>' + b.item + ' · ' + b.price + ' kr</span><button data-buy="' + i + '" ' + (S.money < b.price ? 'disabled' : '') + '>Köp</button>';
    el.appendChild(r);
  });
  const sold = Object.keys(S.inv).filter(k => SELL[k] && S.inv[k] > 0);
  el.insertAdjacentHTML('beforeend', '<div class="row" style="color:#cfae72">— Sälj —</div>');
  if (!sold.length) el.insertAdjacentHTML('beforeend', '<div class="row">Inget att sälja ännu.</div>');
  for (const it of sold) {
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = '<span>' + it + ' × ' + S.inv[it] + ' · ' + SELL[it] + ' kr/st</span><span><button data-sell1="' + it + '">Sälj 1</button> <button data-sellall="' + it + '">Alla</button></span>';
    el.appendChild(r);
  }
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
    const d = BUY[+b.dataset.buy];
    if (S.money < d.price) return;
    S.money -= d.price;
    if (d.live) addLivestock(d.item); else give(d.item, d.item === 'pil' ? 5 : 1);
    sfx('kop');
    msg('Köpte ' + d.item + (d.item === 'pil' ? ' ×5' : ''));
    openShop();
  });
  el.querySelectorAll('[data-sell1]').forEach(b => b.onclick = () => { sellItem(b.dataset.sell1, 1); openShop(); });
  el.querySelectorAll('[data-sellall]').forEach(b => b.onclick = () => { sellItem(b.dataset.sellall, S.inv[b.dataset.sellall]); openShop(); });
}

export function sellItem(it, n) {
  n = Math.min(n, S.inv[it] || 0);
  if (n <= 0) return;
  S.inv[it] -= n;
  if (S.inv[it] <= 0) delete S.inv[it];
  S.money += SELL[it] * n;
  sfx('kop');
  msg('Sålde ' + n + ' ' + it + ' för ' + SELL[it] * n + ' kr');
}
