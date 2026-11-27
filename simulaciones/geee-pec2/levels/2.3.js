// Nivel 2.3 Equivalentes Norton y Thevenin: elegir tramo, colocar la fuente y la resistencia.
import { h, fmt, clamp, raiz, caja, lectura, deslizador, opciones, curvaIV, recortar, redondear, err, aDist, panelDeSemilla } from './b2-comun.js';

export default {
  id: '2.3',
  montar(cont, ctx) {
    const { panel: P } = ctx.motor;
    const ac = new AbortController(), sg = ac.signal;
    const { panel: p } = panelDeSemilla(ctx.motor, ctx.seed, '2.3');
    const m = P.modeloPanel(p);
    const xmax = Math.ceil(p.Voc * 1.5 / 5) * 5, ymax = Math.ceil(p.Isc * 1.5);
    // Objetivo: Norton (Isc, RN) en el tramo de corriente; Thevenin (Voc, Rth) en el de tensión.
    const eq = {
      N: { S: redondear(p.Isc * 0.6, 1), R: redondear(m.RN * 1.8, 1), S0: p.Isc, R0: m.RN },
      T: { S: redondear(p.Voc * 0.7, 1), R: redondear(m.Rth * 2.4, 2), S0: p.Voc, R0: m.Rth },
    };
    let tramo = 'N';

    const raizEl = raiz(cont);
    const elPlot = h('div');
    const lect = lectura([]);
    const chips = h('p', { class: 'b2__regla' });
    const formula = h('p', { class: 'b2__regla' });
    const reto = h('p', { class: 'b2__reto', texto: 'Construye los dos equivalentes: elige el tramo, coloca la fuente en su eje y ajusta la resistencia hasta que la recta equivalente cubra el tramo de la curva.' });
    const datos = lectura([['Isc', `${fmt(p.Isc)} A`], ['I1 (codo)', `${fmt(p.I1)} A`], ['V1 (codo)', `${fmt(p.V1)} V`], ['Voc', `${fmt(p.Voc)} V`]]);

    const sel = opciones({ nombre: 'b23-tramo', leyenda: 'Tramo de la curva', valor: tramo,
      items: [['N', 'Tramo de corriente (Norton)'], ['T', 'Tramo de tensión (Thevenin)']],
      onCambio: (v) => { tramo = v; mostrar(); refrescar(); } }, sg);
    const rangoR = (k) => { const R0 = eq[k].R0; return { min: redondear(R0 * 0.1, 2) || 0.01, max: redondear(R0 * 3, 1), paso: redondear(R0 * 0.005, 3) || 0.001 }; };
    const dN = deslizador({ etiqueta: 'Resistencia RN', unidad: 'Ω', ...rangoR('N'), valor: eq.N.R, onCambio: (v) => { eq.N.R = v; refrescar(); } }, sg);
    const dT = deslizador({ etiqueta: 'Resistencia Rth', unidad: 'Ω', ...rangoR('T'), valor: eq.T.R, onCambio: (v) => { eq.T.R = v; refrescar(); } }, sg);
    raizEl.append(
      h('div', { class: 'b2__col' }, [caja('Curva I-V del panel y equivalente', elPlot)]),
      h('div', { class: 'b2__col' }, [caja('Reto', reto), caja('Datos del panel', datos.el), caja('Equivalente', sel.el, dN.el, dT.el, formula, lect.el), caja('Progreso', chips)]));

    const ejes = { x: { min: 0, max: xmax, etiqueta: 'V (V)' }, y: { min: 0, max: ymax, etiqueta: 'I (A)' } };
    const recta = () => {
      const { S, R } = eq[tramo];
      const pts = tramo === 'N' ? recortar([0, S], [R * S, 0], xmax, ymax) : recortar([S, 0], [0, S / R], xmax, ymax);
      return { id: 'eq', estilo: 'activa', puntos: pts };
    };
    const curvas = () => [
      { id: 'V1', estilo: 'ref', puntos: [[p.V1, 0], [p.V1, ymax]] },
      curvaIV(p, 'panel', 'base'),
      recta(),
    ];
    const handle = () => tramo === 'N' ? [{ id: 'Is', x: 0, y: eq.N.S, eje: 'y' }] : [{ id: 'Vs', x: eq.T.S, y: 0, eje: 'x' }];
    const plot = ctx.ui.CurvePlot(elPlot, { ejes, curvas: curvas(), arrastrables: handle(),
      onArrastre(id, x, y) { if (id === 'Is') eq.N.S = Math.max(y, 0.05); else eq.T.S = Math.max(x, 0.5); refrescar(); } });

    function mostrar() { dN.el.hidden = tramo !== 'N'; dT.el.hidden = tramo !== 'T'; sel.poner(tramo); }
    const errEq = (k) => (err(eq[k].S, eq[k].S0) + err(eq[k].R, eq[k].R0)) / 2;

    function refrescar() {
      const e = eq[tramo];
      plot.actualizar({ curvas: curvas(), arrastrables: handle() });
      if (tramo === 'N') {
        formula.textContent = 'Norton, válido con v entre 0 y V1: i = Is − v / RN.';
        lect.poner([['Fuente Is', `${fmt(e.S)} A`], ['Resistencia RN', `${fmt(e.R)} Ω`]]);
        dN.poner(e.R);
      } else {
        formula.textContent = 'Thevenin, válido con i entre 0 e I1: v = Vs − Rth · i.';
        lect.poner([['Fuente Vs', `${fmt(e.S)} V`], ['Resistencia Rth', `${fmt(e.R)} Ω`]]);
        dT.poner(e.R);
      }
      const ok = (k) => errEq(k) <= 0.01;
      chips.replaceChildren(
        ...['N', 'T'].flatMap((k) => [h('span', { class: 'b2-chip', ...(ok(k) ? { 'data-ok': '' } : {}), texto: `${k === 'N' ? 'Norton' : 'Thevenin'}: ${ok(k) ? 'completo' : 'pendiente'}` }), ' ']));
      ctx.setParams({ V1: redondear(p.V1, 2), I1: redondear(p.I1, 2), Isc: redondear(p.Isc, 2), refs: { R_N: m.RN } });
      // El medidor avanza con la media de los dos equivalentes; el objetivo exige que ambos estén dentro de tolerancia.
      const eN = errEq('N'), eT = errEq('T');
      ctx.onObjetivo(Math.max(aDist((eN + eT) / 2), Math.max(eN, eT) > 0.01 ? 0.03 : 0));
    }
    mostrar(); refrescar();
    return { destruir() { ac.abort(); plot.destruir(); raizEl.remove(); } };
  },
};
