import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cargar, guardar, marcarNivel, registrarSimulacro, reiniciar, guardarResultado, _olvidarMemoria, CLAVE } from '../state.js';

function almacenFalso() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}
function almacenRoto() {
  const f = () => { throw new Error('SecurityError'); };
  return { getItem: f, setItem: f, removeItem: f };
}
beforeEach(() => { globalThis.localStorage = almacenFalso(); _olvidarMemoria(); });

test('clave de almacenamiento del contrato', () => {
  assert.equal(CLAVE, 'etsiai.geee-pec2.v1');
});

test('cargar sin datos devuelve el estado por defecto', () => {
  const e = cargar();
  assert.deepEqual(e.ajustes, { narrativa: true, cronometro: true });
  assert.equal(e.simulacroEnCurso, null);
  assert.deepEqual(e.niveles, {});
  assert.deepEqual(e.simulacros, []);
});

test('guardar y cargar hacen un viaje de ida y vuelta por el almacén', () => {
  const e = cargar();
  e.ajustes.narrativa = false;
  guardar(e);
  assert.ok(globalThis.localStorage._m.has(CLAVE));
  _olvidarMemoria();
  assert.equal(cargar().ajustes.narrativa, false);
});

test('con localStorage que lanza excepción se sigue funcionando en memoria', () => {
  globalThis.localStorage = almacenRoto();
  _olvidarMemoria();
  const e = cargar();
  e.ajustes.cronometro = false;
  assert.doesNotThrow(() => guardar(e));
  assert.equal(cargar().ajustes.cronometro, false);
  assert.doesNotThrow(() => marcarNivel('1.1', 2));
  assert.equal(cargar().niveles['1.1'].estrellas, 2);
});

test('sin localStorage definido tampoco falla', () => {
  delete globalThis.localStorage;
  _olvidarMemoria();
  assert.doesNotThrow(() => marcarNivel('2.1', 1));
  assert.equal(cargar().niveles['2.1'].estrellas, 1);
});

test('JSON corrupto en el almacén cae al estado por defecto', () => {
  globalThis.localStorage.setItem(CLAVE, '{no es json');
  _olvidarMemoria();
  assert.deepEqual(cargar().niveles, {});
});

test('marcarNivel conserva el máximo de estrellas y cuenta intentos', () => {
  marcarNivel('1.2', 3);
  marcarNivel('1.2', 1);
  const n = cargar().niveles['1.2'];
  assert.equal(n.estrellas, 3);
  assert.equal(n.intentos, 2);
  marcarNivel('1.2', 3);
  assert.equal(cargar().niveles['1.2'].intentos, 3);
});

test('simulacroEnCurso sobrevive a un cargar() nuevo', () => {
  const e = cargar();
  e.simulacroEnCurso = { seeds: ['a', 'b', 'c'], respuestas: { x: 1 }, finEpochMs: 123456 };
  guardar(e);
  _olvidarMemoria();
  assert.deepEqual(cargar().simulacroEnCurso, { seeds: ['a', 'b', 'c'], respuestas: { x: 1 }, finEpochMs: 123456 });
});

test('registrarSimulacro añade la entrada y limpia el simulacro en curso', () => {
  const e = cargar();
  e.simulacroEnCurso = { seeds: ['a'], respuestas: {}, finEpochMs: 1 };
  guardar(e);
  registrarSimulacro({ seeds: ['a', 'b', 'c'], respuestas: {}, nota: 7.5, fecha: '2026-11-27' });
  const s = cargar();
  assert.equal(s.simulacros.length, 1);
  assert.equal(s.simulacros[0].nota, 7.5);
  assert.equal(s.simulacroEnCurso, null);
});

test('reiniciar borra progreso pero conserva los ajustes', () => {
  const e = cargar();
  e.ajustes.narrativa = false;
  guardar(e);
  marcarNivel('3.1', 2);
  reiniciar();
  const s = cargar();
  assert.deepEqual(s.niveles, {});
  assert.equal(s.ajustes.narrativa, false);
});

test('guardarResultado deja el último resultado disponible', () => {
  guardarResultado({ tipo: 'nivel', id: '1.1', estrellas: 2 });
  assert.equal(cargar().ultimoResultado.id, '1.1');
});

test('cargar rellena los campos que falten en datos antiguos', () => {
  globalThis.localStorage.setItem(CLAVE, JSON.stringify({ niveles: { '1.1': { estrellas: 1, intentos: 1 } } }));
  _olvidarMemoria();
  const e = cargar();
  assert.deepEqual(e.ajustes, { narrativa: true, cronometro: true });
  assert.equal(e.niveles['1.1'].estrellas, 1);
});
