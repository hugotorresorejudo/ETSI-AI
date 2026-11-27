// Generador pseudoaleatorio determinista: hash cyrb53 de la semilla + mulberry32.
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function makeRng(seed) {
  let a = cyrb53(String(seed)) >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (a0, b0) => a0 + Math.floor(next() * (b0 - a0 + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  // Valor a + k·paso con k entero, dentro de [a, b].
  const step = (a0, b0, paso) => {
    const k = Math.floor((b0 - a0) / paso + 1e-9);
    const v = a0 + Math.floor(next() * (k + 1)) * paso;
    return Math.round(v / paso * 1e9) / 1e9 * paso;
  };
  return { next, int, pick, step };
}

export function nuevaSemilla() {
  let s = '';
  while (s.length < 8) s += Math.floor(Math.random() * 36).toString(36);
  return s;
}
