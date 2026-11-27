import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recogerRespuestas, estrellasPorPistas, estrellasEjercicio, resumenResultado, evaluarPregunta } from '../exam-view.js';
import { GENERADORES, corregir } from '../engine/ejercicios.js';

const coma = (x) => String(x).replace('.', ',');
const crudoExacto = (ej) => Object.fromEntries(ej.pasos.map((p) => [p.id, p.tipo === 'fasor' ? { mag: coma(p.valor.mag), deg: coma(p.valor.deg) } : coma(p.valor)]));

test('recogerRespuestas acepta coma decimal, espacios y notación científica', () => {
  const ej = GENERADORES.b1('sem-1', { variante: 'directo' });
  const { respuestas, invalidos } = recogerRespuestas(ej, { Pmed: ' 1,2e3 ', E_J: '172 800', np: '738' });
  assert.deepEqual(respuestas, { Pmed: 1200, E_J: 172800, np: 738 });
  assert.deepEqual(invalidos, []);
});

test('un texto vacío no cuenta y un texto no numérico se marca como inválido sin entrar en las respuestas', () => {
  const ej = GENERADORES.b1('sem-1', { variante: 'directo' });
  const { respuestas, invalidos } = recogerRespuestas(ej, { Pmed: '', C_Ah: '   ', E_J: 'abc', np: '3,4,5' });
  assert.deepEqual(respuestas, {});
  assert.deepEqual(invalidos, ['E_J', 'np']);
});

test('un fasor necesita módulo y ángulo; si falta uno no cuenta', () => {
  const ej = { pasos: [{ id: 'F', tipo: 'fasor' }, { id: 'G', tipo: 'fasor' }, { id: 'H', tipo: 'fasor' }] };
  const { respuestas, invalidos } = recogerRespuestas(ej, { F: { mag: '10', deg: '' }, G: { mag: '10,5', deg: '-30' }, H: { mag: 'x', deg: '3' } });
  assert.deepEqual(respuestas, { G: { mag: 10.5, deg: -30 } });
  assert.deepEqual(invalidos, ['H']);
});

test('las respuestas exactas escritas con coma dan la nota máxima en cada variante', () => {
  for (const [b, vs] of [['b1', ['directo', 'inverso']], ['b2', ['convertidor', 'bateria', 'carga_corriente', 'resistencia']], ['b3', ['cuadrada', 'cuasicuadrada', 'inverso_phi']]]) {
    for (const v of vs) {
      const ej = GENERADORES[b]('sem-cadena', { variante: v });
      const { respuestas } = recogerRespuestas(ej, crudoExacto(ej));
      assert.equal(corregir(ej, respuestas).nota, ej.puntos, `${b}/${v}`);
    }
  }
});

test('respuestas en cadena: corregir recibe números ya parseados y un paso vacío queda vacio, no fallo', () => {
  const ej = GENERADORES.b1('sem-1', { variante: 'directo' });
  const crudo = crudoExacto(ej);
  crudo.C_T = '';
  const { respuestas } = recogerRespuestas(ej, crudo);
  for (const v of Object.values(respuestas)) assert.equal(typeof v, 'number');
  const r = corregir(ej, respuestas);
  assert.equal(r.pasos.C_T.estado, 'vacio');
  assert.equal(r.pasos.Pmed.estado, 'ok');
});

test('un error de arrastre en un paso anterior no se castiga en cascada', () => {
  const ej = GENERADORES.b1('sem-1', { variante: 'directo' });
  const crudo = crudoExacto(ej);
  crudo.Pmed = coma(ej.pasos.find((p) => p.id === 'Pmed').valor * 2);
  const { respuestas } = recogerRespuestas(ej, crudo);
  const r = corregir(ej, respuestas);
  assert.equal(r.pasos.Pmed.estado, 'fallo');
  assert.ok(r.pasos.E_J.estado === 'fallo' || r.pasos.E_J.arrastre === false);
});

test('estrellasPorPistas: 3 sin pistas, 2 con una, 1 con más o con resolución', () => {
  assert.equal(estrellasPorPistas(0, false), 3);
  assert.equal(estrellasPorPistas(1, false), 2);
  assert.equal(estrellasPorPistas(2, false), 1);
  assert.equal(estrellasPorPistas(5, false), 1);
  assert.equal(estrellasPorPistas(0, true), 1);
});

test('estrellasEjercicio depende además de la nota', () => {
  assert.equal(estrellasEjercicio({ nota: 3, puntos: 3, pistas: 0, resolucion: false }), 3);
  assert.equal(estrellasEjercicio({ nota: 3, puntos: 3, pistas: 1, resolucion: false }), 2);
  assert.equal(estrellasEjercicio({ nota: 2, puntos: 3, pistas: 0, resolucion: false }), 2);
  assert.equal(estrellasEjercicio({ nota: 1, puntos: 3, pistas: 0, resolucion: false }), 1);
  assert.equal(estrellasEjercicio({ nota: 0, puntos: 3, pistas: 0, resolucion: false }), 0);
  assert.equal(estrellasEjercicio({ nota: 3, puntos: 3, pistas: 0, resolucion: true }), 1);
});

test('resumenResultado lista estados y errores típicos sin repetir', () => {
  const corr = { pasos: { a: { estado: 'ok', errorId: null }, b: { estado: 'fallo', errorId: 'b1.sin_vmin' }, c: { estado: 'fallo', errorId: 'b1.sin_vmin' }, d: { estado: 'vacio', errorId: null } }, nota: 1 };
  assert.deepEqual(resumenResultado(corr), { pasos: { a: 'ok', b: 'fallo', c: 'fallo', d: 'vacio' }, errores: ['b1.sin_vmin'] });
});

test('evaluarPregunta: opción por índice, numérica con ref al 2 %, sin ref y entradas vacías o no numéricas', () => {
  const op = { tipo: 'opcion', correcta: 1 };
  assert.equal(evaluarPregunta(op, 1), 'ok');
  assert.equal(evaluarPregunta(op, 0), 'fallo');
  assert.equal(evaluarPregunta(op, null), 'vacio');
  const nu = { tipo: 'num', ref: 'C_Ah' };
  assert.equal(evaluarPregunta(nu, '2,01', { C_Ah: 2 }), 'ok');
  assert.equal(evaluarPregunta(nu, '2,2', { C_Ah: 2 }), 'fallo');
  assert.equal(evaluarPregunta(nu, '', { C_Ah: 2 }), 'vacio');
  assert.equal(evaluarPregunta(nu, 'dos', { C_Ah: 2 }), 'invalido');
  assert.equal(evaluarPregunta(nu, '2', {}), 'sin_ref');
});
