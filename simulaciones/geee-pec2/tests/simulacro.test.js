import test from 'node:test';
import assert from 'node:assert/strict';
import { PESOS, DURACION_MS, notaSobre10, tiempoRestanteMs, formatoTiempo, semillasNuevas, finDesdeInicio, notaTexto } from '../screens/simulacro.js';

test('nota sobre 10 con pesos 3/3/4', () => {
  assert.deepEqual(PESOS, { b1: 3, b2: 3, b3: 4 });
  assert.equal(notaSobre10({ b1: 3, b2: 3, b3: 4 }), 10);
  assert.equal(notaSobre10({ b1: 0, b2: 0, b3: 0 }), 0);
  assert.ok(Math.abs(notaSobre10({ b1: 1.5, b2: 3, b3: 0 }) - 4.5) < 1e-12);
  assert.ok(Math.abs(notaSobre10({ b1: 0, b2: 0, b3: 2 }) - 2 * 4 / 4) < 1e-12);
});

test('la nota se acota a 0..10 y tolera huecos', () => {
  assert.equal(notaSobre10({ b1: 9, b2: 9, b3: 9 }), 10);
  assert.equal(notaSobre10({ b1: 3 }), 3);
  assert.equal(notaSobre10({ b1: NaN, b2: -1, b3: 4 }), 4);
});

test('tiempo restante a partir de finEpochMs', () => {
  assert.equal(tiempoRestanteMs(10_000, 4_000), 6_000);
  assert.equal(tiempoRestanteMs(10_000, 10_000), 0);
  assert.equal(tiempoRestanteMs(10_000, 12_000), 0);
  assert.equal(tiempoRestanteMs(null, 5), Infinity);
  assert.equal(finDesdeInicio(1000), 1000 + 90 * 60 * 1000);
  assert.equal(DURACION_MS, 5_400_000);
});

test('formato de tiempo mm:ss y h:mm:ss', () => {
  assert.equal(formatoTiempo(5_400_000), '1:30:00');
  assert.equal(formatoTiempo(59_001), '01:00');
  assert.equal(formatoTiempo(0), '00:00');
  assert.equal(formatoTiempo(61_000), '01:01');
});

test('semillas nuevas: una por bloque, distintas y deterministas por rng inyectado', () => {
  const s = semillasNuevas();
  assert.deepEqual(Object.keys(s), ['b1', 'b2', 'b3']);
  assert.equal(new Set(Object.values(s)).size, 3);
});

test('la nota se muestra con una cifra decimal y coma', () => {
  assert.equal(notaTexto(10), '10,0');
  assert.equal(notaTexto(6.25), '6,3');
});
