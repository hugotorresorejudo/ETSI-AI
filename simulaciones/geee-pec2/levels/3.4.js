// Nivel 3.4: inversor de onda cuadrada conectado a la red por una bobina.
import { kit } from './b3-comun.js';

const F_RED = 50, VRED = 230, N = 360;

export default {
  id: '3.4',
  montar(cont, ctx) {
    const k = kit(ctx);
    const { fmt } = k;
    const { rng, armonicos, inversor } = ctx.motor;
    const r = rng.makeRng(ctx.seed);

    const VDC0 = r.pick([400, 450, 500]);
    const L0 = r.pick([8, 10, 12, 15]); // mH
    const phiOculto = r.int(8, 28);
    const Pobj = Math.round(inversor.inversorRed({ Vred: VRED, f: F_RED, VDC: VDC0, phiDeg: phiOculto, L: L0 / 1000 }).P / 10) * 10;

    const est = { phi: 35, L: L0, VDC: VDC0 };
    const metaEl = k.meta(['Objetivo de esta semilla: entregar a la red ', `P = ${fmt(Pobj)} W`, ` con Vred = ${fmt(VRED)} V y f = ${fmt(F_RED)} Hz (margen del 2 %).`]);

    const calc = () => inversor.inversorRed({ Vred: VRED, f: F_RED, VDC: est.VDC, phiDeg: est.phi, L: est.L / 1000 });

    const elFasor = k.h('div', {}), elI = k.h('div', {}), elEsp = k.h('div', {});
    const cPhi = k.control({ etiqueta: 'Ángulo φ de V1inv respecto a Vred', unidad: 'grados', min: -90, max: 90, paso: 0.5, valor: est.phi, onCambio: (x) => { est.phi = x; refrescar(); } });
    const cL = k.control({ etiqueta: 'Inductancia L', unidad: 'mH', min: 2, max: 30, paso: 0.5, valor: est.L, onCambio: (x) => { est.L = x; refrescar(); } });
    const cV = k.control({ etiqueta: 'Tensión del bus VDC', unidad: 'V', min: 300, max: 600, paso: 5, valor: est.VDC, onCambio: (x) => { est.VDC = x; refrescar(); } });
    const lect = k.lecturas([
      { clave: 'P', etiqueta: 'P (W)', resalte: true }, { clave: 'Q', etiqueta: 'Q del fundamental (var)' },
      { clave: 'FPinv', etiqueta: 'FP del inversor' }, { clave: 'FPred', etiqueta: 'FP en la red' },
      { clave: 'I1', etiqueta: 'I1 (A)' }, { clave: 'I1a', etiqueta: 'Ángulo de I1 (grados)' },
      { clave: 'I3', etiqueta: 'I3 (A)' }, { clave: 'Ief', etiqueta: 'Ief (A)' },
      { clave: 'V1', etiqueta: 'V1inv ef (V)' }, { clave: 'X1', etiqueta: 'ωL (Ω)' },
      { clave: 'obj', etiqueta: 'P objetivo (W)' },
    ]);

    cont.replaceChildren(k.raiz(
      metaEl.el,
      k.h('div', { class: 'b3-grid' }, [
        k.panel('Diagrama fasorial (arrastra el extremo de V1inv)', elFasor, k.h('p', { class: 'b3-sub', texto: 'jωL I1 = V1inv − Vred: es la tensión que cae en la bobina. Con Vred fijo a 0 grados, solo el ángulo de V1inv cambia.' })),
        k.panel('Controles', cPhi.el, cL.el, cV.el)]),
      k.h('div', { class: 'b3-grid' }, [k.panel('i(t) por la bobina', elI), k.panel('Espectro de corriente (pulsa una barra para ocultarla en i(t))', elEsp)]),
      k.panel('Lecturas en vivo', lect.el, k.h('p', { class: 'b3-sub', texto: 'I1 = (V1inv − Vred) / (jωL), I3 = V3 / (3ωL) y P = Vred Re(I1): el tercer armónico no entrega potencia a una red senoidal.' }))));

    const fasor = ctx.ui.Phasor(elFasor, { fasores: fasores(calc()), onArrastre: (id, deg) => {
      if (id !== 'V1inv') return;
      est.phi = Math.min(90, Math.max(-90, deg)); cPhi.poner(est.phi); refrescar();
    } });
    let barras = [{ n: 1, valor: 0, activo: true }, { n: 3, valor: 0, activo: true }];
    const esp = ctx.ui.Spectrum(elEsp, { barras, onToggle: (n) => { barras = barras.map((b) => (b.n === n ? { ...b, activo: !b.activo } : b)); refrescar(); } });
    const onda = ctx.ui.Waveform(elI, { series: [] });

    function fasores(c) {
      const caida = { mag: c.X[1] * c.I1.mag, deg: c.I1.deg + 90 };
      return [
        { id: 'Vred', mag: VRED, deg: 0, estilo: 'base' },
        { id: 'V1inv', mag: c.V[1], deg: est.phi, estilo: 'activa', arrastrable: true },
        { id: 'jωL·I1', mag: caida.mag, deg: caida.deg, estilo: 'ref' },
      ];
    }

    function refrescar() {
      const c = calc();
      fasor.actualizar({ fasores: fasores(c) });
      // Corriente en el tiempo: fundamental con su ángulo y 3.º armónico (V3∠3φ sobre j3ωL).
      const arm = [];
      const act = (n) => barras.find((b) => b.n === n)?.activo;
      if (act(1)) arm.push({ n: 1, pico: c.I[1] * Math.SQRT2, deg: c.I1.deg });
      if (c.I[3] != null && act(3)) arm.push({ n: 3, pico: c.I[3] * Math.SQRT2, deg: 3 * est.phi - 90 });
      const i = arm.length ? armonicos.muestras(arm, F_RED, N) : { t: [0, 1 / F_RED], y: [0, 0] };
      onda.actualizar({ series: [{ t: i.t, y: i.y, estilo: 'activa' }] });
      barras = barras.map((b) => ({ ...b, valor: c.I[b.n] ?? 0 }));
      esp.actualizar({ barras });
      lect.poner('P', fmt(c.P), c.P); lect.poner('Q', fmt(c.Q1), c.Q1);
      lect.poner('FPinv', fmt(c.FP_inv), c.FP_inv); lect.poner('FPred', fmt(c.FP_red), c.FP_red);
      lect.poner('I1', fmt(c.I1.mag), c.I1.mag); lect.poner('I1a', fmt(c.I1.deg), c.I1.deg);
      lect.poner('I3', fmt(c.I[3] ?? 0), c.I[3] ?? 0); lect.poner('Ief', fmt(c.Ief), c.Ief);
      lect.poner('V1', fmt(c.V[1]), c.V[1]); lect.poner('X1', fmt(c.X[1]), c.X[1]); lect.poner('obj', fmt(Pobj), Pobj);
      ctx.setParams({ refs: { P: c.P } });
      const rel = Math.abs(c.P - Pobj) / Math.abs(Pobj);
      ctx.onObjetivo(rel / (1 + rel)); // sin saturar al pasarse del objetivo
    }
    refrescar();

    return { destruir() { k.destruir(); fasor.destruir(); esp.destruir(); onda.destruir(); cont.replaceChildren(); } };
  },
};
