import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { rellenar, cargarContenido, cargarNiveles, tituloNivel, NIVELES, VARIANTES, bloqueDeNivel } from '../content.js';

const FIX = fileURLToPath(new URL('./fixtures/', import.meta.url));
const fetchFix = async (ruta) => {
  try {
    const txt = await readFile(FIX + String(ruta).replace(/^.*content\/es\//, ''), 'utf8');
    return { ok: true, json: async () => JSON.parse(txt) };
  } catch { return { ok: false, status: 404, json: async () => { throw new Error('404'); } }; }
};

test('rellenar sustituye huecos de param con coma decimal', () => {
  assert.equal(rellenar('{param.Vbat} V', { param: { Vbat: 4 } }), '4 V');
  assert.equal(rellenar('{param.celda.V} V', { param: { celda: { V: 3.6 } } }), '3,6 V');
});

test('rellenar sustituye huecos de paso', () => {
  assert.equal(rellenar('P = {paso.Pmed} W', { paso: { Pmed: 0.0125 } }), 'P = 0,0125 W');
});

test('un hueco desconocido queda visible como ⟨?⟩', () => {
  assert.equal(rellenar('{param.nada} V', { param: {} }), '⟨?⟩ V');
  assert.equal(rellenar('{paso.X}', {}), '⟨?⟩');
  assert.equal(rellenar('{param.a.b}', { param: { a: 3 } }), '⟨?⟩');
});

test('rellenar admite cadenas, fasores y deja intacto lo que no es hueco', () => {
  assert.equal(rellenar('{param.modos}', { param: { modos: 'A y B' } }), 'A y B');
  assert.equal(rellenar('{paso.I1}', { paso: { I1: { mag: 2.5, deg: -30 } } }), '2,5 ∠ -30°');
  assert.equal(rellenar('x {y} z', {}), 'x {y} z');
  assert.equal(rellenar(undefined, {}), '');
});

test('cargarContenido devuelve null si el archivo falta o falla', async () => {
  assert.equal(await cargarContenido('niveles/b9.json', { fetchFn: fetchFix, cache: new Map() }), null);
  const roto = async () => { throw new Error('red'); };
  assert.equal(await cargarContenido('x.json', { fetchFn: roto, cache: new Map() }), null);
});

test('cargarNiveles lee el JSON y tituloNivel cae al ID si falta', async () => {
  const cache = new Map();
  const b1 = await cargarNiveles('b1', { fetchFn: fetchFix, cache });
  assert.equal(tituloNivel({ b1 }, '1.1'), 'Potencia media del ciclo');
  assert.equal(tituloNivel({ b1 }, '1.2'), '1.2');
  const b2 = await cargarNiveles('b2', { fetchFn: fetchFix, cache });
  assert.equal(b2, null);
  assert.equal(tituloNivel({ b1, b2 }, '2.1'), '2.1');
});

test('lista de niveles y variantes del contrato', () => {
  assert.deepEqual(NIVELES.b1, ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6']);
  assert.deepEqual(NIVELES.b2, ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6']);
  assert.deepEqual(NIVELES.b3, ['3.1', '3.2', '3.3', '3.4', '3.5']);
  assert.deepEqual(VARIANTES.b1.map((v) => v.id), ['directo', 'inverso']);
  assert.deepEqual(VARIANTES.b2.map((v) => v.id), ['convertidor', 'bateria', 'carga_corriente', 'resistencia']);
  assert.deepEqual(VARIANTES.b3.map((v) => v.id), ['cuadrada', 'cuasicuadrada', 'inverso_phi']);
  assert.equal(bloqueDeNivel('2.4'), 'b2');
});
