// Touchkontroller för mobil/surfplatta (t.ex. iPhone): virtuell joystick för
// rörelse (vänster), dra-för-att-titta (höger), knappar för använd verktyg,
// hoppa, interagera, byt frö, inventarie och inställningar. Byggs bara på
// enheter med grov pekare; tangentbord/mus påverkas inte.
import { touch } from './touch-state.js';
import { S } from './state.js';
import { toolAction, interact, cycleSeed } from './interactions.js';
import { togglePanel, uiState } from './ui.js';
import { toggleSettings } from './settings.js';

const R = 52; // joystickens maxutslag i px

function btn(id, label, cls = '') {
  const b = document.createElement('button');
  b.id = id;
  b.className = 'tc-btn ' + cls;
  b.textContent = label;
  return b;
}

export function initTouch() {
  if (!touch.active) return;

  const root = document.createElement('div');
  root.id = 'tc';
  root.innerHTML = `
    <div id="tc-stick"><div id="tc-knob"></div></div>
    <div id="tc-look"></div>
    <div id="tc-rotate">Vrid mobilen till liggande läge</div>`;
  document.body.appendChild(root);

  const right = document.createElement('div');
  right.id = 'tc-buttons';
  const bUse = btn('tc-use', '⛏', 'tc-big');
  const bJump = btn('tc-jump', '⤒');
  const bE = btn('tc-e', 'E');
  const bQ = btn('tc-q', 'Q');
  const bInv = btn('tc-inv', '🎒');
  const bSet = btn('tc-set', '⚙');
  right.append(bSet, bInv, bQ, bE, bJump, bUse);
  root.appendChild(right);

  // Rå touch-events (touchstart/-move/-end) i stället för pointer-events:
  // de bär alltid korrekta koordinater och är den beprövade vägen för
  // mobilspel. Ett finger per zon spåras via touch.identifier.
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
  }, { passive: false });
  const stickEnd = e => {
    if (!findTouch(e, stickId)) return;
    stickId = null;
    knob.style.transform = '';
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

  // Knappar (touchstart ger snabbare respons än click på mobil)
  const on = (el, fn) => el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
  on(bUse, () => { if (!uiState.open) toolAction(); });
  on(bJump, () => { touch.jump = true; });
  on(bE, () => interact());
  on(bQ, () => cycleSeed());
  on(bInv, () => togglePanel('p-inv'));
  on(bSet, () => toggleSettings());

  // Håll inne Använd = upprepade hugg (bekvämare vedhuggning)
  let useHold = null;
  bUse.addEventListener('touchstart', () => {
    clearInterval(useHold);
    useHold = setInterval(() => { if (S.started && !uiState.open) toolAction(); }, 450);
  });
  const useEnd = () => { clearInterval(useHold); useHold = null; };
  bUse.addEventListener('touchend', useEnd);
  bUse.addEventListener('touchcancel', useEnd);
}

// Visas först när spelet startats (döljer överlägget på startskärmen)
export function showTouchControls() {
  const el = document.getElementById('tc');
  if (el) el.classList.add('tc-on');
}
