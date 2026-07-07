// Matematiska hjälpfunktioner och värdesbrus för terrängen.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const sstep = t => t * t * (3 - 2 * t);

export function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = sstep(xf), v = sstep(yf);
  return hash(xi, yi) * (1 - u) * (1 - v) + hash(xi + 1, yi) * u * (1 - v)
       + hash(xi, yi + 1) * (1 - u) * v + hash(xi + 1, yi + 1) * u * v;
}
