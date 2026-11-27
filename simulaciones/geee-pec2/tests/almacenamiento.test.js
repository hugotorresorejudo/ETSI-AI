import { test } from 'node:test';
import assert from 'node:assert/strict';
import { potenciaMedia, capacidadBateria, autonomiaBateria, packBateria, energiaSC, bancoSC, packSC } from '../engine/almacenamiento.js';

const ap = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test('PEC2 2025 Ej. 1', () => {
  const p = potenciaMedia([{ P: 2, t: 2 }, { P: 0.125, t: 8 }]);
  ap(p.Pmed, 0.5); ap(p.T, 10);
  const c = capacidadBateria({ Pmed: 0.5, Vbat: 4, horas: 16 });
  ap(c.C_Ah, 2); ap(c.E_Wh, 8); ap(c.E_J, 28800);
  const b = bancoSC({ E_J: 28800, Vmax: 5, Vmin: 2.5, celda: { V: 2.5, C: 5, Imax: 3.4, m_g: 1 } });
  ap(b.C_T, 3072); assert.equal(b.ns, 2); assert.equal(b.np, 1229);
  assert.equal(b.n, 2458); ap(b.peso_g, 2458); ap(b.Imax, 4178.6, 1e-6);
});
test('Enero 2026 Ej. 1', () => {
  const p = potenciaMedia([{ P: 0.5, t: 1 }, { P: 0, t: 1 }]);
  ap(p.Pmed, 0.25);
  const c = capacidadBateria({ Pmed: 0.25, Vbat: 4, horas: 30 });
  ap(c.C_Ah, 1.875);
  const b = bancoSC({ E_J: c.E_J, Vmax: 5, Vmin: 2.5, celda: { V: 2.5, C: 10, Imax: 3, m_g: 1 } });
  ap(b.C_T, 2880); assert.equal(b.ns, 2); assert.equal(b.np, 576);
  assert.equal(b.n, 1152); ap(b.peso_g, 1152); ap(b.Imax, 1728);
});
test('autonomía inversa de capacidad', () => {
  ap(autonomiaBateria({ C_Ah: 2, Vbat: 4, Pmed: 0.5 }), 16);
});
test('packBateria', () => {
  const r = packBateria({ ns: 2, np: 4, celda: { V: 3.6, C_Ah: 2, Rs: 0.1, Imax: 5 } });
  ap(r.V, 7.2); ap(r.C_Ah, 8); ap(r.Rs, 0.05); ap(r.Imax, 20); ap(r.E_Wh, 7.2 * 8);
});
test('energiaSC y packSC', () => {
  ap(energiaSC({ C: 3072, Vmax: 5, Vmin: 2.5 }), 28800);
  const r = packSC({ ns: 2, np: 1229, celda: { V: 2.5, C: 5, Imax: 3.4, m_g: 1 } });
  ap(r.C_T, 1229 * 5 / 2); ap(r.Vmax, 5); ap(r.Imax, 4178.6); ap(r.peso_g, 2458);
});
