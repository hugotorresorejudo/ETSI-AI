import { test } from 'node:test';
import assert from 'node:assert/strict';
import { C, polar, add, sub, mul, div, abs, argDeg } from '../engine/complex.js';
import { espectroCuadrada, efCuasicuadrada, eficaz, thd, potenciaArmonicos, muestras } from '../engine/armonicos.js';
import { inversorRed, phiParaP } from '../engine/inversor.js';

const aprox = (x, ref, rel = 0.02) => assert.ok(Math.abs(x - ref) <= rel * Math.abs(ref), `${x} no es ≈ ${ref}`);
const SQ2 = Math.SQRT2;

test('complex: operaciones básicas', () => {
  const z = mul(C(1, 2), C(3, 4));
  assert.deepEqual([z.re, z.im], [-5, 10]);
  const p = polar(2, 90);
  aprox(p.im, 2); assert.ok(Math.abs(p.re) < 1e-12);
  aprox(abs(C(3, 4)), 5); aprox(argDeg(C(0, 1)), 90);
  const q = div(C(-5, 10), C(3, 4));
  aprox(q.re, 1); aprox(q.im, 2);
  assert.deepEqual([add(C(1, 1), C(2, 3)).re, sub(C(1, 1), C(2, 3)).im], [3, -2]);
});

test('espectroCuadrada y efCuasicuadrada', () => {
  const e = espectroCuadrada(250, 5);
  assert.deepEqual(e.map(x => x.n), [1, 3, 5]);
  aprox(e[0].pico, 4 * 250 / Math.PI);
  aprox(e[0].ef, 4 * 250 / (Math.PI * SQ2));
  const e30 = espectroCuadrada(250, 5, 30);
  assert.equal(e30[1].n, 3);
  assert.ok(Math.abs(e30[1].ef) < 1e-6 || e30[1].ef === 0 || Math.abs(e30[1].pico) < 1e-9);
  aprox(efCuasicuadrada(250, 0), 250);
  aprox(efCuasicuadrada(250, 30), 250 * Math.sqrt(2 / 3));
});

test('eficaz y thd', () => {
  aprox(eficaz([3, 4]), 5);
  aprox(thd([1, 1 / 3, 1 / 5]), 0.3887, 0.001);
});

test('potenciaArmonicos: ejemplo del CEI', () => {
  const v = [{ n: 1, ef: 1.2 / SQ2, deg: 0 }, { n: 3, ef: 0.33 / SQ2, deg: 0 }, { n: 5, ef: 0.2 / SQ2, deg: 0 }];
  const i = [{ n: 1, ef: 0.6 / SQ2, deg: -30 }, { n: 5, ef: 0.1 / SQ2, deg: -45 }, { n: 7, ef: 0.1 / SQ2, deg: -60 }];
  aprox(potenciaArmonicos(v, i), 0.32, 0.03);
});

test('muestras', () => {
  const m = muestras([{ n: 1, pico: 2, deg: 0 }], 50, 100);
  assert.equal(m.t.length, 100); assert.equal(m.y.length, 100);
  assert.ok(Math.abs(m.y[0]) < 1e-12);
  aprox(m.y[25], 2);
});

test('inversorRed: PEC2 2025', () => {
  const r = inversorRed({ Vred: 220, f: 50, VDC: 250, phiDeg: 12.1, L: 3e-3 });
  aprox(r.V[1], 225.1, 0.005); aprox(r.V[3], 75.0, 0.005);
  aprox(r.I1.mag, 50); aprox(r.I[3], 26.5, 0.005);
  aprox(r.Ief, 56.6, 0.01); aprox(r.P, 11000);
  aprox(r.FP_inv, 0.777, 0.01); aprox(r.FP_red, 0.883, 0.01);
  assert.deepEqual(r.nz, [1, 3]);
});

test('inversorRed: enero 2026', () => {
  const r = inversorRed({ Vred: 200, f: 50, VDC: 250, phiDeg: 10, L: 2e-3 });
  aprox(r.I1.mag, 71.2, 0.01); aprox(r.I1.deg, -29, 0.03);
  aprox(r.I[3], 39.8, 0.01); aprox(r.P, 12450, 0.01); aprox(r.FP_red, 0.764, 0.01);
});

test('inversorRed: alpha 30 da nz [1,5]', () => {
  const r = inversorRed({ Vred: 220, f: 50, VDC: 250, phiDeg: 12, L: 3e-3, alphaDeg: 30 });
  assert.deepEqual(r.nz, [1, 5]);
  aprox(r.Vinv_ef, efCuasicuadrada(250, 30));
});

test('phiParaP invierte inversorRed', () => {
  const base = { Vred: 220, f: 50, VDC: 250, L: 3e-3, alphaDeg: 0 };
  for (const phi of [5, 12.1, 30, 45]) {
    const { P } = inversorRed({ ...base, phiDeg: phi });
    assert.ok(Math.abs(phiParaP({ ...base, P }) - phi) < 0.01);
  }
});

test('inversorRed: alpha 30, valores a mano', () => {
  // Vred 200, VDC 250, phi 10°, L 2 mH, f 50 Hz, alpha 30°.
  // Armónicos: cos(1·30°) = √3/2; cos(3·30°) = 0 (nulo); cos(5·30°) = cos150° = -√3/2.
  const Vred = 200, VDC = 250, L = 2e-3, phi = 10 * Math.PI / 180, w = 2 * Math.PI * 50;
  const V1 = 4 * VDC / (Math.PI * SQ2) * (Math.sqrt(3) / 2);       // ≈ 195,0 V
  const V5 = 4 * VDC / (5 * Math.PI * SQ2) * (Math.sqrt(3) / 2);   // ≈ 39,0 V (ef = |pico|/√2)
  // I1 = (V1∠φ − Vred)/(jωL) = (V1 sinφ)/(ωL) − j (V1 cosφ − Vred)/(ωL)
  const I1re = V1 * Math.sin(phi) / (w * L);
  const I1im = -(V1 * Math.cos(phi) - Vred) / (w * L);
  const I1mag = Math.hypot(I1re, I1im);
  const I5 = V5 / (5 * w * L);
  const Ief = Math.hypot(I1mag, I5);
  const P = Vred * I1re;
  const Vinv = VDC * Math.sqrt((Math.PI - 2 * Math.PI / 6) / Math.PI);  // 250·√(2/3)
  const r = inversorRed({ Vred, f: 50, VDC, phiDeg: 10, L, alphaDeg: 30 });
  assert.deepEqual(r.nz, [1, 5]);
  aprox(r.V[1], V1, 1e-9); aprox(r.V[5], V5, 1e-9);
  assert.ok(r.V[5] > 0);
  aprox(r.I[5], I5, 1e-9); aprox(r.I1.mag, I1mag, 1e-9);
  aprox(r.I1.deg, Math.atan2(I1im, I1re) * 180 / Math.PI, 1e-9);
  aprox(r.Ief, Ief, 1e-9); aprox(r.P, P, 1e-9);
  aprox(r.FP_red, P / (Vred * Ief), 1e-9);
  aprox(r.FP_inv, P / (Vinv * Ief), 1e-9);
});

test('phiParaP fuera de rango devuelve NaN', () => {
  const base = { Vred: 220, f: 50, VDC: 250, L: 3e-3, alphaDeg: 0 };
  assert.ok(Number.isNaN(phiParaP({ ...base, P: 1e9 })));
  assert.ok(Number.isNaN(phiParaP({ ...base, P: -1 })));
});
