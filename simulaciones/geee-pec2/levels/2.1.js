// Nivel 2.1 La curva I-V: arrastrar Isc, codo y Voc, irradiancia, curvas I-V y P-V a la vez.
import { h, fmt, clamp, raiz, caja, lectura, deslizador, curvaIV, curvaPV, recortar, redondear, err, aDist } from './b2-comun.js';
import { panelDeSemilla } from './b2-comun.js';

export default {
  id: '2.1',
  montar(cont, ctx) {
    const { panel: P } = ctx.motor;
    const ac = new AbortController(), sg = ac.signal;
    const { rng, panel: base } = panelDeSemilla(ctx.motor, ctx.seed, '2.1');
    // Estado de partida: un panel más pequeño que el de la semilla; el objetivo queda lejos de él.
    let pb = { Isc: redondear(base.Isc * 0.7, 1), I1: redondear(base.I1 * 0.65, 1), V1: Math.round(base.V1 * 0.75), Voc: Math.round(base.Voc * 0.85) };
    let G = 1;
    const Pini = pb.V1 * pb.I1;
    const Pobj = Math.round(Pini * rng.pick([0.55, 0.65, 1.45, 1.7, 2]));
    const xmax = Math.ceil(base.Voc * 1.6 / 5) * 5, ymax = Math.ceil(base.Isc * 1.6);
    const epsI = 0.2, epsV = 1;

    const eff = () => P.irradiar(pb, G);
    const nice = (x) => Math.ceil(x / 50) * 50;
    const pmax = () => nice(Math.max(Pobj * 1.4, eff().V1 * eff().I1 * 1.25, 100));

    const raizEl = raiz(cont);
    const elIV = h('div'), elPV = h('div');
    const col1 = h('div', { class: 'b2__col' }, [caja('Curva I-V', elIV), caja('Curva P-V', elPV)]);
    const lect = lectura([]);
    const reto = h('p', { class: 'b2__reto' });
    const regla = h('p', { class: 'b2__regla' });
    const dg = deslizador({ etiqueta: 'Irradiancia relativa G', unidad: '', min: 0.2, max: 1.2, paso: 0.05, valor: G,
      onCambio: (v) => { G = v; refrescar(true); } }, sg);
    const col2 = h('div', { class: 'b2__col' }, [
      caja('Reto', reto, h('p', { class: 'b2__nota', texto: 'Arrastra los puntos o escribe sus valores en los campos bajo la gráfica. Con la irradiancia, Isc e I1 escalan y V1 y Voc no cambian.' })),
      caja('Lecturas', lect.el, regla),
      caja('Irradiancia', dg.el),
    ]);
    raizEl.append(col1, col2);

    const ejesIV = { x: { min: 0, max: xmax, etiqueta: 'V (V)' }, y: { min: 0, max: ymax, etiqueta: 'I (A)' } };
    const curvasIV = (e) => {
      const seg = (a, b, id) => ({ id, estilo: 'activa', puntos: recortar(a, b, xmax, ymax) });
      return [seg([0, e.Isc], [e.V1, e.I1], 'iv1'), seg([e.V1, e.I1], [e.Voc, 0], 'iv2')];
    };
    const puntos = (e) => [
      { id: 'Isc', x: 0, y: e.Isc, eje: 'y' },
      { id: 'Codo', x: e.V1, y: e.I1, eje: 'xy' },
      { id: 'Voc', x: e.Voc, y: 0, eje: 'x' },
    ];
    const ejesPV = () => ({ x: { min: 0, max: xmax, etiqueta: 'V (V)' }, y: { min: 0, max: pmax(), etiqueta: 'P (W)' } });
    const curvasPV = (e) => {
      const m = P.modeloPanel(e);
      return [
        { id: 'obj', estilo: 'ref', puntos: [[0, Pobj], [xmax, Pobj]] },
        { id: 'codo', estilo: 'ref', puntos: [[m.mpp.v, 0], [m.mpp.v, m.mpp.P]] },
        curvaPV(ctx.motor, e, 'pv', 'activa'),
      ];
    };

    const e0 = eff();
    const plotIV = ctx.ui.CurvePlot(elIV, { ejes: ejesIV, curvas: curvasIV(e0), arrastrables: puntos(e0), onArrastre });
    const plotPV = ctx.ui.CurvePlot(elPV, { ejes: ejesPV(), curvas: curvasPV(e0), arrastrables: [] });

    function onArrastre(id, x, y) {
      const e = eff();
      if (id === 'Isc') e.Isc = Math.max(y, e.I1 + epsI);
      else if (id === 'Voc') e.Voc = Math.max(x, e.V1 + epsV);
      else { e.V1 = clamp(x, epsV, e.Voc - epsV); e.I1 = clamp(y, epsI, e.Isc - epsI); }
      pb = { Isc: e.Isc / G, I1: e.I1 / G, V1: e.V1, Voc: e.Voc };
      refrescar(false);
    }

    function refrescar(desdeG) {
      const e = eff(), m = P.modeloPanel(e), Pm = m.mpp.P;
      plotIV.actualizar({ curvas: curvasIV(e), arrastrables: puntos(e) });
      plotPV.actualizar({ ejes: ejesPV(), curvas: curvasPV(e) });
      lect.poner([
        ['Isc', `${fmt(e.Isc)} A`], ['I1 (codo)', `${fmt(e.I1)} A`], ['V1 (codo)', `${fmt(e.V1)} V`], ['Voc', `${fmt(e.Voc)} V`],
        ['Irradiancia G', fmt(G)], ['P en el codo', `${fmt(Pm)} W`],
      ]);
      regla.textContent = `Potencia máxima en el codo: P = V1 · I1 = ${fmt(e.V1)} V · ${fmt(e.I1)} A = ${fmt(Pm)} W.`;
      reto.textContent = `Deja el punto de máxima potencia en ${fmt(Pobj)} W. Ahora mismo está en ${fmt(Pm)} W.`;
      ctx.setParams({ V1: redondear(e.V1, 2), I1: redondear(e.I1, 2), Isc: redondear(e.Isc, 2), refs: { P_mpp: Pm } });
      ctx.onObjetivo(aDist(err(Pm, Pobj)));
      if (desdeG) dg.poner(G);
    }
    refrescar(false);

    return { destruir() { ac.abort(); plotIV.destruir(); plotPV.destruir(); raizEl.remove(); } };
  },
};
