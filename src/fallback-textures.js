// Procedurellt genererade reservtexturer (diffuse/normal/arm) som används när
// Poly Haven-texturerna inte laddats ner (kör `npm run setup`). Sömlösa via
// periodiskt värdesbrus, deterministiska via hash.
import * as THREE from 'three';

const SIZE = 512;

function phash(x, y, P) {
  const xi = ((x % P) + P) % P, yi = ((y % P) + P) % P;
  const s = Math.sin(xi * 127.1 + yi * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function pnoise(x, y, P) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return phash(xi, yi, P) * (1 - u) * (1 - v) + phash(xi + 1, yi, P) * u * (1 - v)
       + phash(xi, yi + 1, P) * (1 - u) * v + phash(xi + 1, yi + 1, P) * u * v;
}

// Periodiskt fraktalbrus i [0,1], sömlöst över texturkanten.
function fbm(px, py, oct, baseFreq) {
  let a = 0, amp = 0.5, f = baseFreq;
  for (let o = 0; o < oct; o++) {
    a += pnoise(px * f, py * f, f) * amp;
    amp *= 0.5; f *= 2;
  }
  return a;
}

function makeTexture(data, srgb) {
  const t = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

// Skapar {diff, nor, arm} för ett markmaterial.
// c1/c2: grundfärger [r,g,b] 0-255, spots: {col, freq, tröskel} valfria fläckar,
// rough: grundråhet 0-1, bump: normalstyrka.
export function makeFallbackSet({ c1, c2, spots, rough, bump }) {
  const n = SIZE * SIZE;
  const diff = new Uint8Array(n * 4), nor = new Uint8Array(n * 4), arm = new Uint8Array(n * 4);
  const height = new Float32Array(n);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const px = x / SIZE, py = y / SIZE;
      height[y * SIZE + x] = fbm(px, py, 5, 8);
    }
  }
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x, px = x / SIZE, py = y / SIZE;
      const h = height[i];
      const m = fbm(px + 0.37, py + 0.71, 3, 4); // storskalig variation
      let r = c1[0] + (c2[0] - c1[0]) * m, g = c1[1] + (c2[1] - c1[1]) * m, b = c1[2] + (c2[2] - c1[2]) * m;
      const shade = 0.78 + h * 0.44; // småskalig ljushet från höjden
      r *= shade; g *= shade; b *= shade;
      if (spots) {
        const s = fbm(px + 0.13, py + 0.29, 4, spots.freq);
        if (s > spots.t) { const k = Math.min(1, (s - spots.t) * 6); r += (spots.col[0] - r) * k; g += (spots.col[1] - g) * k; b += (spots.col[2] - b) * k; }
      }
      diff[i * 4] = Math.min(255, r); diff[i * 4 + 1] = Math.min(255, g); diff[i * 4 + 2] = Math.min(255, b); diff[i * 4 + 3] = 255;
      // normal ur höjdfältet
      const xl = height[y * SIZE + ((x - 1 + SIZE) % SIZE)], xr = height[y * SIZE + ((x + 1) % SIZE)];
      const yu = height[((y - 1 + SIZE) % SIZE) * SIZE + x], yd = height[((y + 1) % SIZE) * SIZE + x];
      let nx = (xl - xr) * bump, ny = (yu - yd) * bump, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nor[i * 4] = (nx / l * 0.5 + 0.5) * 255; nor[i * 4 + 1] = (ny / l * 0.5 + 0.5) * 255; nor[i * 4 + 2] = (nz / l * 0.5 + 0.5) * 255; nor[i * 4 + 3] = 255;
      // arm: r=AO, g=roughness, b=metalness
      arm[i * 4] = (0.72 + h * 0.28) * 255;
      arm[i * 4 + 1] = Math.max(0, Math.min(255, (rough + (h - 0.5) * 0.2) * 255));
      arm[i * 4 + 2] = 0; arm[i * 4 + 3] = 255;
    }
  }
  return { diff: makeTexture(diff, true), nor: makeTexture(nor, false), arm: makeTexture(arm, false) };
}

export const FALLBACK_DEFS = {
  grass:  { c1: [66, 112, 52], c2: [104, 140, 66], spots: { col: [140, 150, 80], freq: 6, t: 0.62 }, rough: 0.88, bump: 5 },
  forest: { c1: [78, 64, 42],  c2: [102, 88, 58],  spots: { col: [80, 102, 50], freq: 5, t: 0.58 }, rough: 0.92, bump: 7 },
  rock:   { c1: [110, 112, 105], c2: [148, 150, 140], spots: null,                                   rough: 0.78, bump: 10 },
  gravel: { c1: [116, 110, 100], c2: [146, 138, 122], spots: { col: [88, 84, 76], freq: 12, t: 0.6 }, rough: 0.95, bump: 8 }
};
