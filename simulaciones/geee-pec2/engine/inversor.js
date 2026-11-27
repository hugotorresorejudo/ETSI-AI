// Inversor conectado a red a través de una inductancia. Fasores eficaces.
import { C, polar, sub, div, abs, argDeg } from './complex.js';
import { espectroCuadrada, efCuasicuadrada } from './armonicos.js';

export function inversorRed({ Vred, f, VDC, phiDeg, L, alphaDeg = 0 }) {
  const w = 2 * Math.PI * f;
  const espectro = espectroCuadrada(VDC, 99, alphaDeg);
  const nz = espectro.filter((h) => Math.abs(Math.cos(h.n * alphaDeg * Math.PI / 180)) > 1e-6)
    .slice(0, 2).map((h) => h.n);
  const V = {}, X = {}, I = {};
  for (const n of nz) {
    V[n] = espectro.find((h) => h.n === n).ef;
    X[n] = n * w * L;
  }
  // Fundamental: I1 = (V1∠φ − Vred∠0)/(jωL), referida a Vred∠0.
  const I1c = div(sub(polar(V[1], phiDeg), C(Vred, 0)), C(0, X[1]));
  const I1 = { mag: abs(I1c), deg: argDeg(I1c) };
  I[1] = I1.mag;
  // Resto: la red es senoidal pura, In = Vn/(nωL).
  for (const n of nz) if (n !== 1) I[n] = V[n] / X[n];
  const Ief = Math.sqrt(nz.reduce((s, n) => s + I[n] * I[n], 0));
  const P = Vred * I1c.re;
  const Q1 = -Vred * I1c.im;
  const Vinv_ef = efCuasicuadrada(VDC, alphaDeg);
  return { w, nz, V, X, I1, I, Ief, P, Q1, Vinv_ef, FP_inv: P / (Vinv_ef * Ief), FP_red: P / (Vred * Ief) };
}

// Problema inverso: φ que da la potencia P (bisección en [0°, 60°], P crece con φ).
export function phiParaP({ Vred, f, VDC, L, alphaDeg = 0, P }) {
  let lo = 0, hi = 60;
  const p = (phiDeg) => inversorRed({ Vred, f, VDC, phiDeg, L, alphaDeg }).P;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (p(mid) < P) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
