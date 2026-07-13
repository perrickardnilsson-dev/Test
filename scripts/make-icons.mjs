#!/usr/bin/env node
// Genererar appikoner (PWA + iOS) till public/icons/: himmelsgradient,
// skogshorisont, faluröd stuga och en gran. Ren pixelritning med pngjs.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

function draw(size) {
  const png = new PNG({ width: size, height: size });
  const px = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
  };
  const rect = (x0, y0, x1, y1, r, g, b) => {
    for (let y = Math.round(y0); y < y1; y++) for (let x = Math.round(x0); x < x1; x++) px(x, y, r, g, b);
  };
  const s = v => Math.round(v * size); // andel → pixlar

  // himmel (gradient) + mark
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = 125 + t * 60, g = 176 + t * 30, b = 216;
    for (let x = 0; x < size; x++) px(x, y, r, g, b);
  }
  rect(0, s(0.62), size, size, 74, 110, 60);          // gräs
  rect(0, s(0.58), size, s(0.63), 52, 82, 48);        // skogsbryn

  // gran (vänster): tre trianglar
  const tree = (cx, top, w, h, shade) => {
    for (let y = 0; y < h; y++) {
      const half = (y / h) * w * 0.5;
      rect(cx - half, top + y, cx + half, top + y + 1, 47 - shade, 82 - shade, 48 - shade);
    }
  };
  tree(s(0.24), s(0.18), s(0.30), s(0.22), 0);
  tree(s(0.24), s(0.30), s(0.40), s(0.24), 6);
  tree(s(0.24), s(0.44), s(0.50), s(0.26), 12);
  rect(s(0.215), s(0.66), s(0.265), s(0.74), 91, 70, 54); // stam

  // faluröd stuga (höger)
  rect(s(0.50), s(0.46), s(0.90), s(0.72), 125, 43, 43);      // stomme
  // sadeltak
  for (let y = 0; y < s(0.12); y++) {
    const t = y / s(0.12);
    rect(s(0.48) + t * s(0.22), s(0.34) + y, s(0.92) - t * 0, s(0.34) + y + 1, 74, 68, 64);
  }
  for (let y = 0; y < s(0.12); y++) {
    const t = y / s(0.12);
    rect(s(0.48) + (1 - t) * 0, s(0.34) + y, s(0.48) + t * s(0.24), s(0.34) + y + 1, 60, 55, 52);
  }
  rect(s(0.78), s(0.24), s(0.84), s(0.36), 138, 131, 119);    // skorsten
  rect(s(0.55), s(0.46), s(0.565), s(0.72), 233, 228, 216);   // vit knut
  rect(s(0.885), s(0.46), s(0.90), s(0.72), 233, 228, 216);
  rect(s(0.66), s(0.56), s(0.74), s(0.72), 63, 47, 34);       // dörr
  rect(s(0.58), s(0.52), s(0.64), s(0.60), 191, 212, 224);    // fönster
  rect(s(0.78), s(0.52), s(0.86), s(0.60), 191, 212, 224);

  return PNG.sync.write(png);
}

await mkdir(OUT, { recursive: true });
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await writeFile(join(OUT, name), draw(size));
  console.log('✓ ' + name);
}
