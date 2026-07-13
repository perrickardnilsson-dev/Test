// Touchkontroller för mobil/surfplatta – egen layout, inte en översättning
// av tangentbordet. Vänster: virtuell joystick. Höger: stor Använd-knapp som
// visar aktuellt verktyg, hoppknapp, verktygsväljare (helskärmspanel med
// stora namngivna knappar + fröbyte) samt en kontextknapp som bara visas när
// något finns att göra och säger vad ("Skörda potatis", "Sov", "Handla").
// Uppe till höger: inventarie och inställningar. Hotbaren och [E]-prompten
// döljs (ersätts av väljaren respektive kontextknappen). Byggs bara på
// enheter med grov pekare; dator med tangentbord/mus påverkas inte.
import { touch } from './touch-state.js';
import { S } from './state.js';
import { TOOLS, SEED2CROP } from './config.js';
import { toolAction, interact, cycleSeed } from './interactions.js';
import { selectTool } from './input.js';
import { togglePanel, uiState } from './ui.js';
import { toggleSettings } from './settings.js';

const R = 56; // joystickens maxutslag i px
let root = null, useBtn = null, ctxBtn = null, toolPanel = null, seedBtn = null;
let lastCtx = null, lastIco = null;

function el(tag, id, cls, text) {
  const e = document.createElement(tag);
  if (id) e.id = id;
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// touchstart ger snabbare respons än click på mobil
const on = (elem, fn) => elem.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });

function buildToolPanel() {
  toolPanel = el('div', 'tc-toolpanel', 'panel');
  toolPanel.appendChild(el('div', null, 'tc-tp-title', 'Verktyg'));
  const grid = el('div', null, 'tc-tp-grid');
  TOOLS.forEach((t, i) => {
    const b = el('button', null, 'tc-tp-btn');
    b.dataset.tool = i;
    b.innerHTML = `<span class="tc-tp-ico">${t.ico}</span><span>${t.name}</span>`;
    on(b, () => { selectTool(i); hideToolPanel(); });
    grid.appendChild(b);
  });
  toolPanel.appendChild(grid);
  seedBtn = el('button', 'tc-seed', 'tc-tp-btn tc-tp-wide');
  on(seedBtn, () => { cycleSeed(); refreshSeed(); });
  toolPanel.appendChild(seedBtn);
  const close = el('button', null, 'tc-tp-btn tc-tp-wide', 'Stäng');
  on(close, hideToolPanel);
  toolPanel.appendChild(close);
  root.appendChild(toolPanel);
}

function refreshSeed() {
  const def = SEED2CROP[S.selSeed];
  seedBtn.innerHTML = `<span class="tc-tp-ico">🌾</span><span>Frö: ${def ? def.crop : S.selSeed} · byt</span>`;
}

function showToolPanel() { refreshSeed(); markSelectedTool(); toolPanel.classList.add('tc-open'); }
function hideToolPanel() { toolPanel.classList.remove('tc-open'); }
function markSelectedTool() {
  toolPanel.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('tc-sel', +b.dataset.tool === S.tool));
}

export function initTouch() {
  if (!touch.active) return;
  document.body.classList.add('touch'); // döljer hotbar + [E]-prompt via CSS

  root = el('div', 'tc');
  root.innerHTML = `
    <div id="tc-look"></div>
    <div id="tc-stick"><div id="tc-knob"></div></div>
    <div id="tc-rotate">Vrid mobilen till liggande läge</div>`;
  document.body.appendChild(root);

  // Höger knappkluster
  useBtn = el('button', 'tc-use', 'tc-btn tc-big', TOOLS[0].ico);
  const jumpBtn = el('button', 'tc-jump', 'tc-btn', '⤒');
  const toolsBtn = el('button', 'tc-tools', 'tc-btn', '🧰');
  const cluster = el('div', 'tc-buttons');
  cluster.append(toolsBtn, jumpBtn, useBtn);
  root.appendChild(cluster);

  // Kontextknappen: visas bara när något finns att göra
  ctxBtn = el('button', 'tc-ctx', 'tc-pill');
  ctxBtn.style.display = 'none';
  on(ctxBtn, () => interact());
  root.appendChild(ctxBtn);

  // Uppe till höger: inventarie + inställningar
  const top = el('div', 'tc-top');
  const invBtn = el('button', 'tc-inv', 'tc-btn tc-small', '🎒');
  const setBtn = el('button', 'tc-set', 'tc-btn tc-small', '⚙');
  top.append(invBtn, setBtn);
  root.appendChild(top);

  buildToolPanel();

  // Rå touch-events: de bär alltid korrekta koordinater (pointer-events
  // syntetiserade från touch gav nollade koordinater).
  const findTouch = (e, id) => [...e.changedTouches].find(t => t.identifier === id);

  // Joystick
  const stick = root.querySelector('#tc-stick');
  const knob = root.querySelector('#tc-knob');
  let stickId = null;
  stick.addEventListener('touchstart', e => {
    e.preventDefault();
    if (stickId === null) stickId = e.changedTouches[0].identifier;
  }, { passive: false });
  stick.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = findTouch(e, stickId);
    if (!t) return;
    const rect = stick.getBoundingClientRect();
    let dx = t.clientX - (rect.left + rect.width / 2);
    let dy = t.clientY - (rect.top + rect.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > R) { dx = dx / l * R; dy = dy / l * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touch.move.x = dx / R;
    touch.move.z = dy / R; // upp på skärmen = framåt (-z lokalt)
    touch.run = Math.hypot(touch.move.x, touch.move.z) > 0.88;
    knob.classList.toggle('tc-run', touch.run);
  }, { passive: false });
  const stickEnd = e => {
    if (!findTouch(e, stickId)) return;
    stickId = null;
    knob.style.transform = '';
    knob.classList.remove('tc-run');
    touch.move.x = 0; touch.move.z = 0; touch.run = false;
  };
  stick.addEventListener('touchend', stickEnd);
  stick.addEventListener('touchcancel', stickEnd);

  // Titta: dra på högra halvan
  const look = root.querySelector('#tc-look');
  let lookId = null, lx = 0, ly = 0;
  look.addEventListener('touchstart', e => {
    e.preventDefault();
    if (lookId !== null) return;
    const t = e.changedTouches[0];
    lookId = t.identifier; lx = t.clientX; ly = t.clientY;
  }, { passive: false });
  look.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = findTouch(e, lookId);
    if (!t) return;
    touch.lookDX += t.clientX - lx;
    touch.lookDY += t.clientY - ly;
    lx = t.clientX; ly = t.clientY;
  }, { passive: false });
  const lookEnd = e => { if (findTouch(e, lookId)) lookId = null; };
  look.addEventListener('touchend', lookEnd);
  look.addEventListener('touchcancel', lookEnd);

  // Knappar
  on(jumpBtn, () => { touch.jump = true; });
  on(toolsBtn, showToolPanel);
  on(invBtn, () => togglePanel('p-inv'));
  on(setBtn, () => toggleSettings());
  on(useBtn, () => { if (!uiState.open) toolAction(); });
  // Håll inne Använd = upprepade hugg
  let useHold = null;
  useBtn.addEventListener('touchstart', () => {
    clearInterval(useHold);
    useHold = setInterval(() => { if (S.started && !uiState.open) toolAction(); }, 450);
  });
  const useEnd = () => { clearInterval(useHold); useHold = null; };
  useBtn.addEventListener('touchend', useEnd);
  useBtn.addEventListener('touchcancel', useEnd);
}

// Anropas från hud.js varje frame: speglar kontextprompten på kontextknappen
// och aktuellt verktyg på Använd-knappen.
export function updateTouchHud(pr) {
  if (!root) return;
  const label = pr ? pr.replace('[E] ', '').replace(' (Q byter)', '') : '';
  if (label !== lastCtx) {
    lastCtx = label;
    ctxBtn.textContent = label;
    ctxBtn.style.display = label ? 'block' : 'none';
  }
  const ico = TOOLS[S.tool].ico;
  if (ico !== lastIco) { lastIco = ico; useBtn.textContent = ico; }
}

// Visas först när spelet startats (döljer överlägget på startskärmen)
export function showTouchControls() {
  if (root) root.classList.add('tc-on');
}
