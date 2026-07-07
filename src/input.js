// Inmatning: tangentbord, mus och pekarlås.
import { S } from './state.js';
import { renderer } from './scene.js';
import { player, keys } from './player.js';
import { cancelBuild, openBuild } from './buildings.js';
import { interact, toolAction, cycleSeed } from './interactions.js';
import { clamp } from './utils.js';
import { togglePanel, closePanels, drawHotbar, onToolSelect, uiState } from './ui.js';

let locked = false;
const cv = renderer.domElement;

export function selectTool(i) {
  S.tool = i;
  cancelBuild();
  if (i === 6) openBuild();
  drawHotbar();
}
onToolSelect(selectTool);

export function initInput() {
  cv.addEventListener('click', () => { if (!uiState.open && !S.dead && S.started) cv.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === cv; });
  document.addEventListener('mousemove', e => {
    if (!locked) return;
    player.yaw -= e.movementX * 0.0023;
    player.pitch = clamp(player.pitch - e.movementY * 0.0023, -1.45, 1.45);
  });
  addEventListener('keydown', e => {
    if (!S.started) return;
    if (e.code === 'Tab') { e.preventDefault(); togglePanel('p-inv'); return; }
    if (e.code === 'Escape' && uiState.open) { closePanels(); return; }
    keys[e.code] = true;
    if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); if (n >= 1 && n <= 7) selectTool(n - 1); }
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyQ') cycleSeed();
  });
  addEventListener('keyup', e => keys[e.code] = false);
  cv.addEventListener('mousedown', e => { if (locked && e.button === 0) toolAction(); });
}
