// Nivel 2.5 El convertidor de corriente: hipérbola v·i = Pin y las dos raíces de cada cuadrática.
import { h, fmt, raiz, caja, lectura, deslizador, curvaIV, recortar, aspa, redondear, err, aDist, panelDeSemilla } from './b2-comun.js';

export default {
  id: '2.5',
  montar(cont, ctx) {
    const { panel: P } = ctx.motor;
    const ac = new AbortController(), sg = ac.signal;
    const { rng, panel: p } = panelDeSemilla(ctx.motor, ctx.seed, '2.5');
    const m = P.modeloPanel(p);
    const xmax = Math.ceil(p.Voc * 1.15), ymax = Math.ceil(p.Isc * 1.2);

    // Objetivo con semilla: una tripleta (Vbat, Iout, eta) cuya Pin da un punto válido en cada tramo.
    let Vb, Io, et, PinObj;
    for (let k = 0; k < 200; k++) {
      Vb = rng.pick([5, 12, 20, 24, 27, 48]); et = rng.pick([80, 85, 90, 95]);
      Io = Math.max(0.5, redondear((0.4 + 0.5 * rng.next()) * m.mpp.P * (et / 100) / Vb, 1));
      PinObj = Vb * Io / (et / 100);
      const pp = P.puntoPotencia(p, PinObj), { fc, ft } = pp;
      if (PinObj < m.mpp.P && fc.v !== null && ft.v !== null && fc.v < p.V1 && ft.v > p.V1 && fc.descartada > p.V1 && ft.descartada > p.I1) break;
    }
    const s = { Vbat: Vb === 12 ? 24 : 12, Iout: 1, eta: 100 };
    const Imax = Math.ceil(Io * 2.2);

    const raizEl = raiz(cont);
    const elPlot = h('div');
    const lect = lectura([]);
    const aviso = h('p', { class: 'b2__regla', role: 'status' });
    const datos = lectura([['Isc', `${fmt(p.Isc)} A`], ['I1 (codo)', `${fmt(p.I1)} A`], ['V1 (codo)', `${fmt(p.V1)} V`], ['Voc', `${fmt(p.Voc)} V`], ['P en el codo', `${fmt(m.mpp.P)} W`]]);
    const reto = h('p', { class: 'b2__reto', texto: `Ajusta Iout, Vbat y el rendimiento para que el convertidor extraiga del panel Pin = ${fmt(PinObj)} W.` });
    const dV = deslizador({ etiqueta: 'Tensión de la batería Vbat', unidad: 'V', min: 1, max: 60, paso: 1, valor: s.Vbat, onCambio: (v) => { s.Vbat = v; refrescar(); } }, sg);
    const dI = deslizador({ etiqueta: 'Corriente de salida Iout', unidad: 'A', min: 0.1, max: Imax, paso: 0.05, valor: s.Iout, onCambio: (v) => { s.Iout = v; refrescar(); } }, sg);
    const dE = deslizador({ etiqueta: 'Rendimiento η', unidad: '%', min: 50, max: 100, paso: 1, valor: s.eta, onCambio: (v) => { s.eta = v; refrescar(); } }, sg);
    raizEl.append(
      h('div', { class: 'b2__col' }, [caja('Curva I-V del panel e hipérbola de potencia', elPlot)]),
      h('div', { class: 'b2__col' }, [caja('Reto', reto), caja('Datos del panel', datos.el), caja('Convertidor', dV.el, dI.el, dE.el), caja('Lecturas', lect.el, aviso)]));

    const ejes = { x: { min: 0, max: xmax, etiqueta: 'V (V)' }, y: { min: 0, max: ymax, etiqueta: 'I (A)' } };
    const dentro = (x, y) => x >= 0 && x <= xmax && y >= 0 && y <= ymax;
    const hiperbola = (Pin) => {
      const pts = [], v0 = Math.max(Pin / ymax, xmax / 400);
      for (let k = 0; k <= 120; k++) { const v = v0 + ((xmax - v0) * k) / 120; pts.push([v, Pin / v]); }
      return { id: 'hip', estilo: 'activa', puntos: pts };
    };
    function curvas(Pin, pp) {
      const cs = [
        { id: 'extN', estilo: 'ref', puntos: recortar([p.V1, p.I1], [m.RN * p.Isc, 0], xmax, ymax) },
        { id: 'extT', estilo: 'ref', puntos: recortar([p.V1, p.I1], [0, p.Voc / m.Rth], xmax, ymax) },
        curvaIV(p, 'panel', 'base'),
        hiperbola(Pin),
      ];
      const { fc, ft } = pp;
      if (fc.v !== null) cs.push(aspa('fc', 'activa', fc.v, fc.i, xmax, ymax));
      if (ft.v !== null) cs.push(aspa('ft', 'activa', ft.v, ft.i, xmax, ymax));
      if (fc.descartada !== null) { const x = fc.descartada, y = p.Isc - x / m.RN; if (dentro(x, y)) cs.push(aspa('fcd', 'ref', x, y, xmax, ymax)); }
      if (ft.descartada !== null) { const y = ft.descartada, x = p.Voc - m.Rth * y; if (dentro(x, y)) cs.push(aspa('ftd', 'ref', x, y, xmax, ymax)); }
      return cs;
    }
    const calc = () => { const Pout = s.Vbat * s.Iout, Pin = Pout / (s.eta / 100); return { Pout, Pin, pp: P.puntoPotencia(p, Pin) }; };
    const c0 = calc();
    const plot = ctx.ui.CurvePlot(elPlot, { ejes, curvas: curvas(c0.Pin, c0.pp), arrastrables: [] });

    function refrescar() {
      const { Pout, Pin, pp } = calc(), { fc, ft } = pp;
      plot.actualizar({ curvas: curvas(Pin, pp) });
      const fila = [['Pout = Vbat · Iout', `${fmt(Pout)} W`], ['Pin = Pout / η', `${fmt(Pin)} W`]];
      if (fc.v !== null) fila.push(['Modo fuente de corriente: v, i', `${fmt(fc.v)} V, ${fmt(fc.i)} A`], ['Raíz descartada de v', `${fmt(fc.descartada)} V (v > V1)`]);
      if (ft.v !== null) fila.push(['Modo fuente de tensión: v, i', `${fmt(ft.v)} V, ${fmt(ft.i)} A`], ['Raíz descartada de i', `${fmt(ft.descartada)} A (i > I1)`]);
      lect.poner(fila);
      aviso.textContent = Pin >= m.mpp.P ? `Sin solución: Pin supera la potencia del codo (${fmt(m.mpp.P)} W). La hipérbola no corta la curva.` : `Las aspas continuas son las raíces válidas. ${curvas(Pin, pp).some((c) => c.id === 'fcd' || c.id === 'ftd') ? 'Las discontinuas son las descartadas por caer fuera del tramo.' : 'Las descartadas caen fuera de la gráfica; sus valores están en las lecturas.'}`;
      ctx.setParams({ V1: redondear(p.V1, 2), I1: redondear(p.I1, 2), Isc: redondear(p.Isc, 2), Vbat: Vb, Iout: Io, eta: et, refs: { P_in: Pin } });
      ctx.onObjetivo(aDist(err(Pin, PinObj)));
    }
    refrescar();
    return { destruir() { ac.abort(); plot.destruir(); raizEl.remove(); } };
  },
};
