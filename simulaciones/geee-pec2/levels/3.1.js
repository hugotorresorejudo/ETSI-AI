// Nivel 3.1: construir una cuadrada con sus armónicos impares.
import { kit } from './b3-comun.js';

const ORDENES = [1, 3, 5, 7, 9, 11];
const OBJETIVOS = [0.30, 0.26, 0.23, 0.21]; // error eficaz máximo, en fracción de A
const F = 50, N = 240;

export default {
  id: '3.1',
  montar(cont, ctx) {
    const k = kit(ctx);
    const { fmt, pct } = k;
    const { rng, armonicos } = ctx.motor;
    const r = rng.makeRng(ctx.seed);
    const A = r.pick([1, 2, 5, 10]);
    const objetivo = r.pick(OBJETIVOS);

    // Valores teóricos de la serie (del motor): ef de cada armónico de la cuadrada de amplitud A.
    const serie = armonicos.espectroCuadrada(A, ORDENES[ORDENES.length - 1]);
    const ideal = Object.fromEntries(serie.map((s) => [s.n, s.ef]));
    const efMax = 1.5 * ideal[1];

    // Estado inicial: solo el fundamental, con amplitud equivocada, y el resto apagado.
    const est = Object.fromEntries(ORDENES.map((n) => [n, { activo: n === 1, ef: Math.round(ideal[n] * 0.6 * 100 / A) * A / 100 }]));

    // Cuadrada ideal de amplitud A (misma base de tiempos que la suma).
    const base = armonicos.muestras([{ n: 1, pico: 0, deg: 0 }], F, N);
    const yIdeal = base.t.map((t) => (t * F < 0.5 ? A : -A));

    const metaEl = k.meta(['Objetivo de esta semilla: onda cuadrada de amplitud ', `${fmt(A)} V`, '. Consigue que el error eficaz de la suma respecto a la cuadrada sea como máximo ', pct(objetivo), ' de A.']);

    // Controles por armónico
    const filas = {};
    const ctrlEf = {};
    const chk = {};
    const colArm = k.h('div', {});
    for (const n of ORDENES) {
      chk[n] = k.casilla({ etiqueta: `Armónico ${n}`, marcado: est[n].activo, nombre: n, onCambio: (b) => { est[n].activo = b; refrescar(); } });
      ctrlEf[n] = k.control({ etiqueta: `Vef del armónico ${n}`, unidad: 'V', min: 0, max: efMax, paso: A / 100, valor: est[n].ef, onCambio: (v) => { est[n].ef = v; refrescar(); } });
      filas[n] = k.h('div', { class: 'b3-fila-armo', 'data-n': n, 'data-activo': String(est[n].activo) }, [chk[n].el, ctrlEf[n].el]);
      colArm.append(filas[n]);
    }
    const btnSerie = k.boton44('Aplicar 4A/(nπ) a los activos', () => {
      for (const n of ORDENES) if (est[n].activo) { est[n].ef = ideal[n]; ctrlEf[n].poner(ideal[n]); }
      refrescar();
    });
    const btnLimpiar = k.boton44('Solo el fundamental', () => {
      for (const n of ORDENES) { est[n].activo = n === 1; chk[n].poner(n === 1); }
      refrescar();
    });

    // Gráficas
    const elSpec = k.h('div', {});
    const elOnda = k.h('div', {});
    const lect = k.lecturas([
      { clave: 'vef', etiqueta: 'Vef = √ΣVn² (V)' },
      { clave: 'v1', etiqueta: 'Vef del fundamental (V)' },
      { clave: 'thd', etiqueta: 'THD de la suma' },
      { clave: 'err', etiqueta: 'Error eficaz vs cuadrada', resalte: true },
      { clave: 'obj', etiqueta: 'Error máximo permitido' },
    ]);

    cont.replaceChildren(k.raiz(
      metaEl.el,
      k.h('div', { class: 'b3-grid' }, [
        k.panel('Armónicos y amplitudes', colArm, k.h('div', { class: 'b3-ctl__fila', style: 'margin-top:8px' }, [btnSerie, btnLimpiar]),
          k.h('p', { class: 'b3-sub', texto: 'Activa un armónico con su casilla o pulsando su barra en el espectro. Las amplitudes son valores eficaces.' })),
        k.h('div', { style: 'display:flex;flex-direction:column;gap:16px;min-width:0' }, [
          k.panel('Espectro (valores eficaces)', elSpec),
          k.panel('Suma (trazo grueso) y cuadrada ideal (discontinuo)', elOnda),
        ]),
      ]),
      k.panel('Lecturas en vivo', lect.el, k.h('p', { class: 'b3-sub', texto: 'THD = √(Vef² − Vef,1²) / Vef,1. Sin fundamental no se puede definir.' }))));

    const espectro = ctx.ui.Spectrum(elSpec, { barras: barras(), onToggle: (n) => { est[n].activo = !est[n].activo; chk[n].poner(est[n].activo); refrescar(); } });
    const onda = ctx.ui.Waveform(elOnda, { series: series().concat([]) });

    function barras() { return ORDENES.map((n) => ({ n, valor: est[n].ef, activo: est[n].activo })); }
    function series() {
      const arm = ORDENES.filter((n) => est[n].activo).map((n) => ({ n, pico: est[n].ef * Math.SQRT2, deg: 0 }));
      const suma = armonicos.muestras(arm, F, N);
      return [{ t: base.t, y: yIdeal, estilo: 'ref' }, { t: suma.t, y: suma.y, estilo: 'activa' }];
    }

    function refrescar() {
      const s = series();
      const y = s[1].y;
      const err = Math.sqrt(y.reduce((a, v, i) => a + (v - yIdeal[i]) ** 2, 0) / y.length) / A;
      const act = ORDENES.filter((n) => est[n].activo);
      const efs = act.map((n) => est[n].ef);
      const vef = armonicos.eficaz(efs);
      const conFund = est[1].activo;
      const valThd = conFund ? armonicos.thd([est[1].ef, ...act.filter((n) => n !== 1).map((n) => est[n].ef)]) : NaN;
      for (const n of ORDENES) filas[n].dataset.activo = String(est[n].activo);
      espectro.actualizar({ barras: barras() });
      onda.actualizar({ series: s });
      lect.poner('vef', fmt(vef), vef);
      lect.poner('v1', conFund ? fmt(est[1].ef) : 'sin fundamental', conFund ? est[1].ef : NaN);
      lect.poner('thd', conFund ? `${fmt(valThd)} (${pct(valThd)})` : 'sin fundamental', valThd);
      lect.poner('err', pct(err), err);
      lect.poner('obj', pct(objetivo), objetivo);
      ctx.setParams({ refs: { THD: armonicos.thd([1]) } }); // THD de una senoidal pura (pregunta de la comprobación)
      ctx.onObjetivo(err <= objetivo ? 0 : (err - objetivo) / (1 - objetivo));
    }
    refrescar();

    return { destruir() { k.destruir(); espectro.destruir(); onda.destruir(); cont.replaceChildren(); } };
  },
};
