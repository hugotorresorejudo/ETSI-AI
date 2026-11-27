// Nivel 2.2 Asociar módulos: rejilla ns x np, la curva se reescala en vivo e iguala una curva objetivo.
import { h, fmt, clamp, raiz, caja, lectura, curvaIV, redondear, panelDeSemilla } from './b2-comun.js';

const NS_MAX = 5, NP_MAX = 4;

export default {
  id: '2.2',
  montar(cont, ctx) {
    const { panel: P } = ctx.motor;
    const { rng, panel: mod } = panelDeSemilla(ctx.motor, ctx.seed, '2.2');
    let nsObj, npObj;
    do { nsObj = rng.int(1, NS_MAX); npObj = rng.int(1, NP_MAX); } while (nsObj + npObj < 3);
    const objetivo = P.asociar(mod, nsObj, npObj);
    let ns = 1, np = 1;
    const xmax = Math.ceil(mod.Voc * NS_MAX * 1.05 / 10) * 10, ymax = Math.ceil(mod.Isc * NP_MAX * 1.05 / 2) * 2;

    const raizEl = raiz(cont);
    const elGrid = h('div'), elPlot = h('div');
    const lect = lectura([]);
    const regla = h('p', { class: 'b2__regla', texto: 'Serie multiplica V, paralelo multiplica I.' });
    const reto = h('p', { class: 'b2__reto', texto: `Iguala la curva objetivo (trazo discontinuo): Voc = ${fmt(objetivo.Voc)} V e Isc = ${fmt(objetivo.Isc)} A. Cada módulo da Voc = ${fmt(mod.Voc)} V e Isc = ${fmt(mod.Isc)} A.` });
    raizEl.append(
      h('div', { class: 'b2__col' }, [caja('Curva I-V', elPlot)]),
      h('div', { class: 'b2__col' }, [caja('Reto', reto, regla), caja('Módulos', elGrid), caja('Lecturas', lect.el)]));

    const ejes = { x: { min: 0, max: xmax, etiqueta: 'V (V)' }, y: { min: 0, max: ymax, etiqueta: 'I (A)' } };
    const curvas = () => [
      curvaIV(objetivo, 'objetivo', 'ref'),
      curvaIV(mod, 'modulo', 'base'),
      curvaIV(P.asociar(mod, ns, np), 'asociado', 'activa'),
    ];
    const plot = ctx.ui.CurvePlot(elPlot, { ejes, curvas: curvas(), arrastrables: [] });
    const grid = ctx.ui.CellGrid(elGrid, { nsMax: NS_MAX, npMax: NP_MAX, ns, np, onCambio: (a, b) => { ns = a; np = b; refrescar(); } });

    function refrescar() {
      const a = P.asociar(mod, ns, np);
      plot.actualizar({ curvas: curvas() });
      lect.poner([
        ['Módulos en serie', String(ns)], ['Ramas en paralelo', String(np)],
        ['Voc de la asociación', `${fmt(a.Voc)} V`], ['Isc de la asociación', `${fmt(a.Isc)} A`],
        ['Codo (V1, I1)', `${fmt(a.V1)} V, ${fmt(a.I1)} A`], ['P en el codo', `${fmt(a.V1 * a.I1)} W`],
      ]);
      ctx.setParams({ V1: redondear(mod.V1, 2), I1: redondear(mod.I1, 2), Isc: redondear(mod.Isc, 2) });
      ctx.onObjetivo(clamp(Math.abs(ns - nsObj) / nsObj + Math.abs(np - npObj) / npObj, 0, 1));
    }
    refrescar();
    return { destruir() { plot.destruir(); grid.destruir(); raizEl.remove(); } };
  },
};
