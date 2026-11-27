// Nivel 3.3: factor de potencia, THD, Kd y Kθ con tensión senoidal y distintas formas de corriente.
import { kit } from './b3-comun.js';

const F = 50, N = 360, VRED = 230;
const FORMAS = [
  { valor: 'seno', etiqueta: 'Senoidal desfasada' },
  { valor: 'cuad', etiqueta: 'Cuadrada' },
  { valor: 'alfa', etiqueta: 'Cuadrada con ángulo α' },
];

export default {
  id: '3.3',
  montar(cont, ctx) {
    const k = kit(ctx);
    const { fmt } = k;
    const { rng, armonicos } = ctx.motor;
    const r = rng.makeRng(ctx.seed);
    const A = r.pick([10, 20, 50]);

    // Cálculo completo de una configuración de corriente (todo con el motor).
    function calcular({ forma, alfa, phi }) {
      const a = forma === 'alfa' ? alfa : 0;
      const I1 = forma === 'seno' ? A / Math.SQRT2 : armonicos.espectroCuadrada(A, 1, a)[0].ef;
      const Ief = forma === 'seno' ? I1 : armonicos.efCuasicuadrada(A, a);
      const resto = Math.sqrt(Math.max(0, Ief * Ief - I1 * I1));
      const THD = armonicos.thd([I1, resto]);
      const P = armonicos.potenciaArmonicos([{ n: 1, ef: VRED, deg: 0 }], [{ n: 1, ef: I1, deg: -phi }]);
      const S = VRED * Ief;
      const Kd = I1 / Ief, Kt = Math.cos(phi * Math.PI / 180);
      return { a, I1, Ief, THD, P, S, Kd, Kt, FP: P / S, FPalt: Kt / Math.sqrt(1 + THD * THD) };
    }

    // Caso oculto: de él sale el FP objetivo, redondeado a dos decimales.
    const oculto = calcular({ forma: r.pick(['cuad', 'alfa']), alfa: r.pick([20, 30, 40, 50]), phi: r.pick([10, 20, 30, 40]) });
    const FPobj = Math.round(oculto.FP * 100) / 100;

    const est = { forma: 'seno', alfa: 30, phi: 0 };
    const metaEl = k.meta(['Objetivo de esta semilla: factor de potencia ', `FP = ${fmt(FPobj)}`, `, con tensión senoidal de ${fmt(VRED)} V y corriente de amplitud ${fmt(A)} A.`]);

    const selector = k.radios({ leyenda: 'Forma de la corriente', opciones: FORMAS, valor: est.forma, nombre: 'forma', onCambio: (f) => { est.forma = f; refrescar(); } });
    const cAlfa = k.control({ etiqueta: 'Ángulo α', unidad: 'grados', min: 0, max: 80, paso: 1, valor: est.alfa, onCambio: (x) => { est.alfa = x; refrescar(); } });
    const cPhi = k.control({ etiqueta: 'Desfase φ del fundamental (retraso)', unidad: 'grados', min: -80, max: 80, paso: 0.5, valor: est.phi, onCambio: (x) => { est.phi = x; refrescar(); } });
    const notaAlfa = k.h('p', { class: 'b3-sub' });

    const mKd = k.medidor({ etiqueta: 'Kd = Ief,1 / Ief' });
    const mKt = k.medidor({ etiqueta: 'Kθ = cos φ' });
    const mFP = k.medidor({ etiqueta: 'FP = Kd × Kθ', activo: true });
    const mTHD = k.medidor({ etiqueta: 'THD de la corriente', max: 1 });
    const lect = k.lecturas([
      { clave: 'I1', etiqueta: 'Ief,1 (A)' }, { clave: 'Ief', etiqueta: 'Ief (A)' },
      { clave: 'P', etiqueta: 'P (W)' }, { clave: 'S', etiqueta: 'S (VA)' },
      { clave: 'FPalt', etiqueta: 'cos φ / √(1 + THD²)' }, { clave: 'FP', etiqueta: 'FP actual', resalte: true },
      { clave: 'obj', etiqueta: 'FP objetivo' },
    ]);
    const elOnda = k.h('div', {});

    cont.replaceChildren(k.raiz(
      metaEl.el,
      k.h('div', { class: 'b3-grid' }, [
        k.panel('Corriente', selector.el, cAlfa.el, cPhi.el, notaAlfa),
        k.panel('Medidores', mKd.el, mKt.el, mTHD.el, mFP.el)]),
      k.h('div', { class: 'b3-grid' }, [
        k.panel('i(t) (trazo grueso) y tensión escalada (discontinuo)', elOnda),
        k.panel('Lecturas en vivo', lect.el, k.h('p', { class: 'b3-sub', texto: 'Con la red senoidal, solo el fundamental de la corriente produce potencia: P = Vef Ief,1 cos φ.' }))])));

    const onda = ctx.ui.Waveform(elOnda, { series: [] });

    function refrescar() {
      const c = calcular(est);
      const alfaOn = est.forma === 'alfa';
      cAlfa.input.disabled = cAlfa.rango.disabled = !alfaOn;
      notaAlfa.textContent = alfaOn ? 'El ángulo α recorta la cuadrada: su eficaz baja a A√((π − 2α)/π).' : 'El ángulo α solo actúa en la cuadrada con ángulo α.';
      const arm = est.forma === 'seno'
        ? [{ n: 1, pico: A, deg: -est.phi }]
        : armonicos.espectroCuadrada(A, 99, c.a).map((s) => ({ n: s.n, pico: s.pico, deg: -s.n * est.phi }));
      const i = armonicos.muestras(arm, F, N);
      const v = armonicos.muestras([{ n: 1, pico: A, deg: 0 }], F, N);
      onda.actualizar({ series: [{ t: v.t, y: v.y, estilo: 'ref' }, { t: i.t, y: i.y, estilo: 'activa' }] });
      mKd.poner(c.Kd, fmt(c.Kd)); mKt.poner(Math.max(0, c.Kt), fmt(c.Kt));
      mFP.poner(Math.max(0, c.FP), fmt(c.FP)); mTHD.poner(c.THD, fmt(c.THD));
      lect.poner('I1', fmt(c.I1), c.I1); lect.poner('Ief', fmt(c.Ief), c.Ief);
      lect.poner('P', fmt(c.P), c.P); lect.poner('S', fmt(c.S), c.S);
      lect.poner('FPalt', fmt(c.FPalt), c.FPalt); lect.poner('FP', fmt(c.FP), c.FP); lect.poner('obj', fmt(FPobj), FPobj);
      ctx.setParams({ refs: { FP: c.FP, THD: c.THD, P: c.P } });
      ctx.onObjetivo(Math.min(1, Math.abs(c.FP - FPobj) / 0.5));
    }
    refrescar();

    return { destruir() { k.destruir(); onda.destruir(); cont.replaceChildren(); } };
  },
};
