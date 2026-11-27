import test from 'node:test';
import assert from 'node:assert/strict';
import {
  modeloPanel, asociar, irradiar,
  puntoBateria, puntoCargaCorriente, puntoResistencia, puntoPotencia,
} from '../engine/panel.js';

// Helper local de aproximacion (no se importa num.js)
const casi = (x, ref, rel = 1e-3, abs = 1e-9) =>
  Math.abs(x - ref) <= Math.max(abs, rel * Math.abs(ref));
const aprox = (x, ref, msg, rel) => assert.ok(casi(x, ref, rel), `${msg ?? ''} esperado ${ref}, obtenido ${x}`);

const PEC25 = { Isc: 32, I1: 27, V1: 25, Voc: 33 };
const ENE26 = { Isc: 15, I1: 10, V1: 20, Voc: 30 };
const PEC2324 = { Isc: 10.12, I1: 10, V1: 12, Voc: 12.1 };

test('puntoPotencia PEC2 2025', () => {
  const r = puntoPotencia(PEC25, 300);
  aprox(r.fc.v, 10, 'fc.v', 0.01);
  aprox(r.fc.i, 30, 'fc.i', 0.01);
  aprox(r.fc.descartada, 150, 'fc.descartada', 0.01);
  aprox(r.ft.v, 30, 'ft.v', 0.01);
  aprox(r.ft.i, 10, 'ft.i', 0.01);
  aprox(r.ft.descartada, 101.375, 'ft.descartada', 0.01);
});

test('puntoPotencia enero 2026', () => {
  const r = puntoPotencia(ENE26, 120);
  aprox(r.fc.v, 9.5, 'fc.v', 0.01);
  aprox(r.fc.i, 12.625, 'fc.i', 0.01);
  aprox(r.ft.v, 25.25, 'ft.v', 0.01);
  aprox(r.ft.i, 4.75, 'ft.i', 0.01);
});

test('puntoPotencia: las soluciones cumplen v*i = Pin', () => {
  const r = puntoPotencia(ENE26, 120);
  aprox(r.fc.v * r.fc.i, 120, 'fc P', 1e-9);
  aprox(r.ft.v * r.ft.i, 120, 'ft P', 1e-9);
});

test('puntoPotencia sin solucion en el tramo devuelve null', () => {
  const r = puntoPotencia(ENE26, 1e6);
  assert.equal(r.fc.v, null);
  assert.equal(r.fc.i, null);
  assert.equal(r.fc.descartada, null);
  assert.equal(r.ft.descartada, null);
});

test('modeloPanel PEC2 23/24: RN = 100 y Rth = 0.01', () => {
  const m = modeloPanel(PEC2324);
  aprox(m.RN, 100, 'RN', 1e-9);
  aprox(m.Rth, 0.01, 'Rth', 1e-9);
  aprox(m.mpp.v, 12, 'mpp.v');
  aprox(m.mpp.i, 10, 'mpp.i');
  aprox(m.mpp.P, 120, 'mpp.P');
});

test('modeloPanel i(v) y v(i) lineales a tramos', () => {
  const m = modeloPanel(PEC25); // RN = 5, Rth = 8/27
  aprox(m.i(0), 32);
  aprox(m.i(10), 30);
  aprox(m.i(25), 27);
  aprox(m.i(33), 0, 'i(Voc)', 1e-9);
  assert.equal(m.i(40), 0);
  aprox(m.i(29), 27 * 4 / 8, 'tramo tension');
  aprox(m.v(30), 10);
  aprox(m.v(27), 25);
  aprox(m.v(0), 33);
  // consistencia i(v(i)) = i
  for (const i of [0, 5, 20, 27, 30, 32]) aprox(m.i(m.v(i)), i, `i(v(${i}))`, 1e-9);
});

test('asociar', () => {
  const p = asociar(PEC25, 2, 3);
  assert.equal(p.Voc, 2 * PEC25.Voc);
  assert.equal(p.V1, 2 * PEC25.V1);
  assert.equal(p.Isc, 3 * PEC25.Isc);
  assert.equal(p.I1, 3 * PEC25.I1);
});

test('irradiar escala corrientes y mantiene tensiones', () => {
  const p = irradiar(PEC25, 0.5);
  assert.equal(p.Isc, 16);
  assert.equal(p.I1, 13.5);
  assert.equal(p.V1, 25);
  assert.equal(p.Voc, 33);
});

test('puntoBateria', () => {
  assert.equal(puntoBateria(PEC25, PEC25.Voc + 1).modo, 'sin_suministro');
  const a = puntoBateria(PEC25, 10);
  assert.equal(a.modo, 'corriente');
  aprox(a.v, 10); aprox(a.i, 30);
  const b = puntoBateria(PEC25, 29);
  assert.equal(b.modo, 'tension');
  aprox(b.v, 29); aprox(b.i, modeloPanel(PEC25).i(29));
});

test('puntoCargaCorriente', () => {
  const a = puntoCargaCorriente(PEC25, 30);
  assert.equal(a.modo, 'corriente');
  aprox(a.i, 30); aprox(a.v, 10);
  const b = puntoCargaCorriente(PEC25, 10);
  assert.equal(b.modo, 'tension');
  aprox(b.i, 10); aprox(b.v, modeloPanel(PEC25).v(10));
  assert.equal(puntoCargaCorriente(PEC25, 40).modo, 'sin_suministro');
});

test('puntoResistencia es interseccion con v = RL*i', () => {
  const m = modeloPanel(PEC25);
  for (const RL of [0.1, 1, 5, 20, 100]) {
    const r = puntoResistencia(PEC25, RL);
    aprox(r.v, RL * r.i, `v=RL i (RL=${RL})`, 1e-9);
    aprox(r.i, m.i(r.v), `i=i(v) (RL=${RL})`, 1e-9);
  }
  assert.equal(puntoResistencia(PEC25, 0.1).modo, 'corriente');
  assert.equal(puntoResistencia(PEC25, 20).modo, 'tension');
});
