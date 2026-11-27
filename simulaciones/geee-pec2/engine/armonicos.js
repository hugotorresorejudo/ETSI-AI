// Armónicos de ondas cuadradas y potencia con armónicos. Ángulos en grados.
const RAD = Math.PI / 180;
const EPS = 1e-6;

// Solo n impares; los armónicos nulos (cos(nα) ≈ 0) se incluyen con ef = 0.
export function espectroCuadrada(A, nMax, alphaDeg = 0) {
  const out = [];
  for (let n = 1; n <= nMax; n += 2) {
    let c = Math.cos(n * alphaDeg * RAD);
    if (Math.abs(c) < EPS) c = 0;
    const pico = (4 * A) / (n * Math.PI) * c;
    out.push({ n, pico, ef: Math.abs(pico) / Math.SQRT2 });
  }
  return out;
}

export const efCuasicuadrada = (A, alphaDeg) => A * Math.sqrt((Math.PI - 2 * alphaDeg * RAD) / Math.PI);

export const eficaz = (efs) => Math.sqrt(efs.reduce((s, x) => s + x * x, 0));

// efs[0] es el fundamental.
export const thd = (efs) => eficaz(efs.slice(1)) / efs[0];

export function potenciaArmonicos(v, i) {
  let P = 0;
  for (const a of v) {
    const b = i.find((x) => x.n === a.n);
    if (b) P += a.ef * b.ef * Math.cos((a.deg - b.deg) * RAD);
  }
  return P;
}

// N muestras de un periodo de la fundamental de frecuencia f.
export function muestras(arm, f, N) {
  const T = 1 / f;
  const t = [], y = [];
  for (let k = 0; k < N; k++) {
    const tk = (k * T) / N;
    t.push(tk);
    y.push(arm.reduce((s, h) => s + h.pico * Math.sin(h.n * 2 * Math.PI * f * tk + h.deg * RAD), 0));
  }
  return { t, y };
}
