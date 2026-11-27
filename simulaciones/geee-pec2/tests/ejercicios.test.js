import test from 'node:test';
import assert from 'node:assert/strict';
import { GENERADORES, corregir, VARIANTES } from '../engine/ejercicios.js';
import { puntoPotencia } from '../engine/panel.js';
import { inversorRed } from '../engine/inversor.js';

const N = 1000;
const seeds = Array.from({ length: N }, (_, i) => `semilla${i}`);
const paso = (ej, id) => ej.pasos.find((p) => p.id === id);
const exactas = (ej) => Object.fromEntries(ej.pasos.map((p) => [p.id, p.valor]));
const finito = (v) => (typeof v === 'object' ? Object.values(v).every(Number.isFinite) : Number.isFinite(v));

for (const bloque of ['b1', 'b2', 'b3']) {
  for (const variante of VARIANTES[bloque]) {
    test(`propiedades ${bloque}/${variante} (${N} semillas)`, () => {
      for (const s of seeds) {
        const ej = GENERADORES[bloque](s, { variante });
        assert.equal(ej.bloque, bloque);
        assert.equal(ej.variante, variante);
        assert.equal(ej.seed, s);
        for (const p of ej.pasos) {
          assert.ok(finito(p.valor), `${s} ${p.id} no finito`);
          for (const e of p.errores) assert.ok(finito(e.valor), `${s} ${p.id}/${e.id} no finito`);
        }
        const pm = ej.params;
        if (bloque === 'b2' && variante === 'convertidor') {
          const fc = paso(ej, 'v_fc').valor, ft = paso(ej, 'v_ft').valor;
          assert.ok(fc > 0 && fc < pm.V1, `${s} fc`);
          assert.ok(ft > pm.V1 && ft < pm.Voc, `${s} ft`);
          assert.ok(paso(ej, 'Pin').valor < pm.V1 * pm.I1, `${s} Pin`);
        }
        if (bloque === 'b3') {
          const I1 = paso(ej, 'I1').valor, fp = paso(ej, 'FP_red').valor;
          assert.ok(I1 >= 10 && I1 <= 100, `${s} I1=${I1}`);
          assert.ok(fp >= 0.6 && fp <= 0.95, `${s} FP=${fp}`);
        }
        if (bloque === 'b1') {
          const np = paso(ej, 'np').valor;
          assert.ok(np >= 10 && np <= 5000, `${s} np=${np}`);
        }
        const r = corregir(ej, exactas(ej));
        assert.ok(Math.abs(r.nota - ej.puntos) < 1e-9, `${s} nota ${r.nota}`);
      }
    });
  }
}

test('puntos por bloque y pesos', () => {
  for (const [b, pts] of [['b1', 3], ['b2', 3], ['b3', 4]]) {
    const ej = GENERADORES[b]('x1');
    assert.equal(ej.puntos, pts);
    const suma = ej.pasos.reduce((s, p) => s + p.peso, 0);
    assert.ok(Math.abs(suma - pts) < 1e-9);
  }
});

test('misma semilla, mismo ejercicio; otra, distinto', () => {
  for (const b of ['b1', 'b2', 'b3']) {
    const a = JSON.stringify(GENERADORES[b]('abc'));
    assert.equal(a, JSON.stringify(GENERADORES[b]('abc')));
    assert.notEqual(a, JSON.stringify(GENERADORES[b]('abd')));
  }
});

test('params: formato para los textos', () => {
  const b1 = GENERADORES.b1('p1', { variante: 'directo' });
  assert.equal(typeof b1.params.modos, 'string');
  assert.ok(Array.isArray(b1.params.modosLista) && b1.params.modosLista.length >= 2);
  assert.ok(b1.params.celda.V > 0 && b1.params.horas > 0);
  assert.equal(GENERADORES.b1('p1', { variante: 'inverso' }).params.horas, undefined);
  assert.ok(paso(GENERADORES.b1('p1', { variante: 'inverso' }), 'horas'));
  const b2 = GENERADORES.b2('p2', { variante: 'convertidor' });
  assert.ok(b2.params.eta >= 80 && b2.params.eta <= 100, 'eta en porcentaje');
  const b3 = GENERADORES.b3('p3', { variante: 'cuadrada' });
  assert.ok(Number.isInteger(b3.params.L_mH));
  assert.equal(Math.round(b3.params.phi * 10) / 10, b3.params.phi);
  assert.equal(b3.params.k, 3);
  const inv = GENERADORES.b3('p3', { variante: 'inverso_phi' });
  assert.equal(inv.pasos[0].id, 'phi');
  assert.ok(inv.params.P > 0);
  const cq = GENERADORES.b3('p3', { variante: 'cuasicuadrada' });
  assert.ok(cq.params.alpha > 0);
});

test('b2 no convertidor: pasos v, i, modo', () => {
  for (const v of ['bateria', 'carga_corriente', 'resistencia']) {
    const ej = GENERADORES.b2('q', { variante: v });
    assert.deepEqual(ej.pasos.map((p) => p.id), ['v', 'i', 'modo']);
    assert.equal(paso(ej, 'modo').tipo, 'int');
  }
});

test('peso mal con el resto bien: fallo y nota menor', () => {
  const ej = GENERADORES.b1('w1', { variante: 'directo' });
  const r = { ...exactas(ej), peso: 2 * paso(ej, 'peso').valor };
  const c = corregir(ej, r);
  assert.equal(c.pasos.peso.estado, 'fallo');
  assert.ok(c.nota < ej.puntos);
  assert.equal(c.pasos.Imax.estado, 'ok');
});

test('arrastre en b1: C_T mal y np con ese C_T', () => {
  const ej = GENERADORES.b1('a1', { variante: 'directo' });
  const ns = paso(ej, 'ns').valor, cT = paso(ej, 'C_T').valor * 1.5;
  const np = Math.ceil((cT * ns) / ej.params.celda.C - 1e-9);
  const c = corregir(ej, { ...exactas(ej), C_T: cT, np, n: ns * np, peso: ns * np * ej.params.celda.m_g, Imax: np * ej.params.celda.Imax });
  assert.equal(c.pasos.C_T.estado, 'fallo');
  assert.equal(c.pasos.np.estado, 'ok');
  assert.equal(c.pasos.np.arrastre, true);
  assert.equal(c.pasos.n.estado, 'ok');
  assert.equal(c.pasos.peso.estado, 'ok');
  assert.equal(c.pasos.Imax.estado, 'ok');
  assert.equal(c.pasos.E_J.arrastre, false);
});

test('diagnostico b2: raiz fuera de tramo', () => {
  const ej = GENERADORES.b2('d1', { variante: 'convertidor' });
  const { Isc, I1, V1, Voc } = ej.params;
  const pp = puntoPotencia({ Isc, I1, V1, Voc }, paso(ej, 'Pin').valor);
  const c = corregir(ej, { ...exactas(ej), v_fc: pp.fc.descartada });
  assert.equal(c.pasos.v_fc.estado, 'fallo');
  assert.equal(c.pasos.v_fc.errorId, 'b2.raiz_fuera');
});

test('diagnostico b2: sin eta y tramo equivocado', () => {
  let ej = GENERADORES.b2('d2', { variante: 'convertidor' });
  if (ej.params.eta === 100) ej = GENERADORES.b2('d3', { variante: 'convertidor' });
  const c = corregir(ej, { ...exactas(ej), Pin: paso(ej, 'Pout').valor });
  assert.equal(c.pasos.Pin.errorId, 'b2.sin_eta');
  const err = paso(ej, 'v_fc').errores.find((e) => e.id === 'b2.tramo_equivocado');
  assert.equal(corregir(ej, { ...exactas(ej), v_fc: err.valor }).pasos.v_fc.errorId, 'b2.tramo_equivocado');
});

test('diagnostico b3: XL sin n', () => {
  const ej = GENERADORES.b3('d4', { variante: 'cuadrada' });
  const { f, L_mH } = ej.params;
  const Ik = paso(ej, 'Vk').valor / (2 * Math.PI * f * L_mH / 1000);
  const c = corregir(ej, { ...exactas(ej), Ik });
  assert.equal(c.pasos.Ik.errorId, 'b3.xl_sin_n');
});

test('diagnostico b3: resto de errores', () => {
  const ej = GENERADORES.b3('d5', { variante: 'cuadrada' });
  const v1 = paso(ej, 'V1').valor;
  assert.equal(corregir(ej, { ...exactas(ej), V1: v1 * Math.SQRT2 }).pasos.V1.errorId, 'b3.pico_por_eficaz');
  const P = paso(ej, 'P').valor;
  const Vk = paso(ej, 'Vk').valor, Ik = paso(ej, 'Ik').valor;
  assert.equal(corregir(ej, { ...exactas(ej), P: P + Vk * Ik }).pasos.P.errorId, 'b3.p_con_armonico');
  const I1 = paso(ej, 'I1').valor;
  assert.equal(corregir(ej, { ...exactas(ej), FP_red: P / (ej.params.Vred * I1) }).pasos.FP_red.errorId, 'b3.fp_con_i1');
  assert.equal(corregir(ej, { ...exactas(ej), FP_inv: P / (v1 * Math.hypot(I1, Ik)) }).pasos.FP_inv.errorId, 'b3.vinv_v1');
});

test('diagnostico b1: sin Vmin, energia en Wh, Imax con ns', () => {
  const ej = GENERADORES.b1('d6', { variante: 'directo' });
  const { Vmax } = ej.params;
  const E = paso(ej, 'E_J').valor;
  let c = corregir(ej, { ...exactas(ej), C_T: (2 * E) / (Vmax * Vmax) });
  assert.equal(c.pasos.C_T.errorId, 'b1.sin_vmin');
  c = corregir(ej, { ...exactas(ej), E_J: E / 3600 });
  assert.equal(c.pasos.E_J.errorId, 'b1.energia_en_wh');
  c = corregir(ej, { ...exactas(ej), Imax: paso(ej, 'ns').valor * ej.params.celda.Imax });
  assert.equal(c.pasos.Imax.estado === 'ok' ? 'b1.imax_con_ns' : c.pasos.Imax.errorId, 'b1.imax_con_ns');
});

test('np sin redondear', () => {
  const ej = GENERADORES.b1('d7', { variante: 'directo' });
  const v = paso(ej, 'np').errores.find((e) => e.id === 'b1.np_sin_redondear').valor;
  assert.equal(corregir(ej, { ...exactas(ej), np: v }).pasos.np.errorId, 'b1.np_sin_redondear');
});

test('respuesta vacia', () => {
  const ej = GENERADORES.b1('v1');
  const c = corregir(ej, { Pmed: '', C_Ah: undefined, np: NaN });
  for (const id of ['Pmed', 'np', 'peso']) {
    assert.equal(c.pasos[id].estado, 'vacio');
    assert.equal(c.pasos[id].errorId, null);
  }
  assert.equal(c.nota, 0);
});

test('correct prevalece sobre error', () => {
  const ej = GENERADORES.b2('e1', { variante: 'convertidor' });
  const c = corregir(ej, { ...exactas(ej) });
  for (const p of Object.values(c.pasos)) assert.equal(p.errorId, null);
});

test('inverso_phi coincide con el motor', () => {
  const ej = GENERADORES.b3('i1', { variante: 'inverso_phi' });
  const { Vred, f, VDC, L_mH, alpha, P } = ej.params;
  const r = inversorRed({ Vred, f, VDC, phiDeg: paso(ej, 'phi').valor, L: L_mH / 1000, alphaDeg: alpha });
  assert.ok(Math.abs(r.P - P) < 1e-3);
});

// Alumno coherente: encadena sus propios valores redondeados a `cifras` cifras.
function alumno(ej, cifras, cambios = {}) {
  const usados = Object.fromEntries(ej.pasos.map((p) => [p.id, p.valor]));
  const resp = {};
  for (const p of ej.pasos) {
    let v = p.recalc && p.depende.length ? p.recalc(usados) : p.valor;
    if (p.id in cambios) v = cambios[p.id](usados, p);
    if (p.tipo === 'num') v = Number(v.toPrecision(cifras));
    usados[p.id] = v; resp[p.id] = v;
  }
  return resp;
}

test('redondeo a 3 cifras en cadena: sin fallos (b1, b2, b3)', () => {
  for (const [b, vs] of Object.entries(VARIANTES)) {
    for (const variante of vs) {
      for (const s of seeds) {
        const ej = GENERADORES[b](s, { variante });
        for (const cifras of [3, 4]) {
          const c = corregir(ej, alumno(ej, cifras));
          const malos = Object.entries(c.pasos).filter(([, r]) => r.estado !== 'ok').map(([id]) => id);
          assert.deepEqual(malos, [], `${b}/${variante} ${s} (${cifras} cifras)`);
        }
      }
    }
  }
});

test('b2 con Pin = Pout y resto coherente: solo Pin falla', () => {
  let n = 0;
  for (const s of seeds) {
    const ej = GENERADORES.b2(s, { variante: 'convertidor' });
    if (ej.params.eta === 100) continue;
    const c = corregir(ej, alumno(ej, 3, { Pin: (u) => u.Pout }));
    assert.equal(c.pasos.Pin.errorId, 'b2.sin_eta', s);
    for (const id of ['Pout', 'v_fc', 'i_fc', 'i_ft', 'v_ft']) assert.equal(c.pasos[id].estado, 'ok', `${s} ${id}`);
    n++;
  }
  assert.ok(n > 500);
});

test('b1: np del alumno con C_T redondeado a 3 cifras da ok', () => {
  const ej = GENERADORES.b1('r3', { variante: 'directo' });
  const c = corregir(ej, alumno(ej, 3));
  assert.equal(c.pasos.np.estado, 'ok');
  assert.equal(c.pasos.np.arrastre, false);
});

test('separacion minima del 3 % entre error tipico y valor correcto', () => {
  for (const [b, vs] of Object.entries(VARIANTES)) {
    for (const variante of vs) {
      for (const s of seeds) {
        const ej = GENERADORES[b](s, { variante });
        for (const p of ej.pasos) {
          if (p.tipo !== 'num') continue;
          for (const e of p.errores) {
            const d = Math.abs(e.valor - p.valor) / Math.abs(p.valor);
            assert.ok(d < 1e-9 || d >= 0.03, `${b}/${variante} ${s} ${p.id}/${e.id} d=${d}`);
          }
        }
      }
    }
  }
});

test('b2 convertidor: i_ft antes de v_ft; raiz fuera en i_ft acredita v_ft por arrastre', () => {
  const ej = GENERADORES.b2('o1', { variante: 'convertidor' });
  assert.deepEqual(ej.pasos.map((p) => p.id), ['Pout', 'Pin', 'v_fc', 'i_fc', 'i_ft', 'v_ft']);
  const { Voc } = ej.params;
  const e = paso(ej, 'i_ft').errores.find((x) => x.id === 'b2.raiz_fuera').valor;
  const Rth = (Voc - ej.params.V1) / ej.params.I1;
  const c = corregir(ej, { ...exactas(ej), i_ft: e, v_ft: Voc - Rth * e });
  assert.equal(c.pasos.i_ft.errorId, 'b2.raiz_fuera');
  assert.equal(c.pasos.v_ft.estado, 'ok');
  assert.equal(c.pasos.v_ft.arrastre, true);
});

test('b1: las potencias de los modos del ciclo son todas distintas (1000 semillas)', () => {
  for (const variante of VARIANTES.b1) {
    for (const s of seeds) {
      const P = GENERADORES.b1(s, { variante }).params.modosLista.map((m) => m.P);
      assert.equal(new Set(P).size, P.length, `${s}/${variante}: potencias repetidas ${P.join(', ')}`);
    }
  }
});

test('b3: inverso_phi nunca genera alpha = 0 (el enunciado habla de un tramo nulo)', () => {
  for (const s of seeds) assert.ok(GENERADORES.b3(s, { variante: 'inverso_phi' }).params.alpha > 0, s);
});
