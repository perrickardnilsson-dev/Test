// Ljud: procedurellt syntetiserat med WebAudio (fritt per definition, funkar
// offline). Ambiens: vind vars styrka följer vädret, fågelkvitter dagtid
// (ej vinter), regnbrus. Effekter: yxhugg, stenbrytning, pilbåge, plask m.m.
// AudioContext skapas först vid användargest (startknappen).
import { rand } from './utils.js';
import { S, seasonIdx } from './state.js';
import { windUniforms } from './wind.js';

let ctx = null, master = null, windGain = null, rainGain = null, noiseBuf = null;
let volume = 0.7;
let birdTimer = 3;

export function setVolume(v) {
  volume = v;
  if (master) master.gain.value = v;
}

export function getVolume() { return volume; }

function makeNoiseBuffer() {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function initAudio() {
  if (ctx) { ctx.resume && ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  noiseBuf = makeNoiseBuffer();

  // Vind: loopat brus genom lågpass
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = noiseBuf; windSrc.loop = true;
  const windLp = ctx.createBiquadFilter();
  windLp.type = 'lowpass'; windLp.frequency.value = 320; windLp.Q.value = 0.4;
  windGain = ctx.createGain(); windGain.gain.value = 0;
  windSrc.connect(windLp).connect(windGain).connect(master);
  windSrc.start();

  // Regn: loopat brus genom högpass
  const rainSrc = ctx.createBufferSource();
  rainSrc.buffer = noiseBuf; rainSrc.loop = true; rainSrc.playbackRate.value = 1.7;
  const rainHp = ctx.createBiquadFilter();
  rainHp.type = 'highpass'; rainHp.frequency.value = 1800;
  rainGain = ctx.createGain(); rainGain.gain.value = 0;
  rainSrc.connect(rainHp).connect(rainGain).connect(master);
  rainSrc.start();
}

// Kort brusstöt genom filter – bas för slag/skrap/plask
function burst(dur, filterType, freq, gain, rate = 1, freqEnd = null) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = rate;
  const f = ctx.createBiquadFilter();
  f.type = filterType; f.frequency.value = freq;
  if (freqEnd !== null) f.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(f).connect(g).connect(master);
  src.start(ctx.currentTime, rand(0, 1), dur + 0.05);
}

// Tonstöt (oscillator med glidande frekvens)
function blip(type, f0, f1, dur, gain, delay = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  const t = ctx.currentTime + delay;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

const SFX = {
  hugg: () => { burst(0.09, 'lowpass', 900, 0.5); blip('sine', 110, 60, 0.08, 0.3); },
  falla: () => { burst(0.5, 'lowpass', 400, 0.5, 0.6); blip('sine', 80, 40, 0.4, 0.4); },
  sten: () => { burst(0.07, 'highpass', 1400, 0.45, 1.4); blip('square', 220, 140, 0.04, 0.12); },
  grav: () => burst(0.16, 'lowpass', 500, 0.4, 0.8),
  vatten: () => burst(0.25, 'bandpass', 1400, 0.3, 1.2, 500),
  sa: () => burst(0.1, 'lowpass', 700, 0.25, 0.9),
  skorda: () => { blip('triangle', 500, 700, 0.09, 0.2); burst(0.08, 'lowpass', 900, 0.2); },
  pilbage: () => { blip('sawtooth', 180, 70, 0.1, 0.15); burst(0.15, 'highpass', 2500, 0.2, 1.6); },
  traff: () => { burst(0.09, 'lowpass', 600, 0.4); blip('sine', 140, 70, 0.09, 0.25); },
  plask: () => { burst(0.3, 'bandpass', 900, 0.45, 1.1, 350); blip('sine', 260, 90, 0.12, 0.15); },
  napp: () => { blip('sine', 350, 160, 0.1, 0.35); burst(0.12, 'bandpass', 1100, 0.25, 1, 400); },
  at: () => { burst(0.07, 'lowpass', 1100, 0.3, 1.2); burst(0.07, 'lowpass', 900, 0.25, 1.1); },
  bygg: () => { blip('square', 130, 90, 0.05, 0.25); blip('square', 150, 100, 0.05, 0.25, 0.12); },
  kop: () => { blip('sine', 1150, 1150, 0.07, 0.2); blip('sine', 1550, 1550, 0.1, 0.2, 0.07); },
  somn: () => { blip('sine', 660, 440, 0.25, 0.18); blip('sine', 440, 300, 0.3, 0.15, 0.2); },
  klipp: () => { burst(0.06, 'highpass', 3000, 0.3, 1.8); burst(0.06, 'highpass', 3200, 0.3, 1.8); }
};

export function sfx(name) {
  if (!ctx || volume <= 0) return;
  const fn = SFX[name];
  if (fn) fn();
}

function birdChirp() {
  const base = rand(2200, 4200), n = 2 + Math.floor(rand(0, 3));
  for (let i = 0; i < n; i++) {
    blip('sine', base * rand(0.9, 1.1), base * rand(1.15, 1.4), rand(0.05, 0.1), 0.045, i * rand(0.1, 0.16));
  }
}

export function updateAmbience(dt) {
  if (!ctx) return;
  const day = S.time > 5 && S.time < 21;
  windGain.gain.value = 0.04 + windUniforms.uWindS.value * 0.13;
  rainGain.gain.value = S.weather === 'Regn' ? 0.22 : 0;
  // fågelkvitter: dagtid, ej vinter, ej i regn
  if (day && seasonIdx() !== 3 && S.weather !== 'Regn') {
    birdTimer -= dt;
    if (birdTimer <= 0) { birdChirp(); birdTimer = rand(2, 9); }
  }
}
