// Nivel 2.4 ¿Qué impone la carga?: batería, carga de corriente o resistencia; recta de carga arrastrable.
import { h, fmt, clamp, raiz, caja, lectura, deslizador, opciones, curvaIV, recortar, aspa, redondear, aDist, panelDeSemilla } from './b2-comun.js';

const NOMBRE = { bat: 'batería', cor: 'carga de corriente', res: 'resistencia' };
const MODO = { corriente: 'Modo corriente: el panel actúa como fuente de corriente', tension: 'Modo tensión: el panel actúa como fuente de tensión', sin_suministro: 'Sin suministro: la carga excede lo que da el panel' };

export default {
  id: '2.4',
  montar(cont, ctx) {
    const { panel: P } = ctx.motor;
    const ac = new AbortController(), sg = ac.signal;
    const { rng, panel: p } = panelDeSemilla(ctx.motor, ctx.seed, '2.4');
    const m = P.modeloPanel(p);
    const xmax = Math.ceil(p.Voc * 1.3), ymax = Math.ceil(p.Isc * 1.3);
    const RLmax = redondear(10 * p.V1 / p.I1, 0);

    // Objetivo con semilla: una carga y un punto a distancia clara del codo (modo inequívoco).
    const opDe = (t, x) => t === 'bat' ? P.puntoBateria(p, x) : t === 'cor' ? P.puntoCargaCorriente(p, x) : P.puntoResistencia(p, x);
    let tObj, xObj, ptObj;
    do {
      tObj = rng.pick(['bat', 'cor', 'res']);
      const v = p.Voc * (0.15 + 0.8 * rng.next()), i = m.i(v);
      xObj = redondear(tObj === 'bat' ? v : tObj === 'cor' ? i : v / i, 1);
      ptObj = opDe(tObj, xObj);
    } while (!(xObj > 0 && ptObj.modo !== 'sin_suministro' && ptObj.v > 0 && ptObj.i > 0 && Math.abs(ptObj.v - p.V1) / p.V1 > 0.08 && Math.abs(ptObj.i - p.I1) / p.I1 > 0.03));
    let tipo = tObj === 'bat' ? 'res' : 'bat';
    const val = { bat: redondear(p.V1 * 0.3, 1), cor: redondear(p.I1 * 0.4, 1), res: redondear((p.V1 / p.I1) * 3, 1) };

    const raizEl = raiz(cont);
    const elPlot = h('div');
    const lect = lectura([]);
    const datos = lectura([['Isc', `${fmt(p.Isc)} A`], ['I1 (codo)', `${fmt(p.I1)} A`], ['V1 (codo)', `${fmt(p.V1)} V`], ['Voc', `${fmt(p.Voc)} V`]]);
    const reto = h('p', { class: 'b2__reto', texto: `Conecta una ${NOMBRE[tObj]} para que el panel trabaje en modo ${ptObj.modo === 'corriente' ? 'corriente' : 'tensión'}, en el punto de la aspa discontinua (v = ${fmt(ptObj.v)} V, i = ${fmt(ptObj.i)} A).` });
    const modoEl = h('p', { class: 'b2__regla', role: 'status' });
    const sel = opciones({ nombre: 'b24-carga', leyenda: 'Carga conectada', valor: tipo,
      items: [['bat', 'Batería'], ['cor', 'Carga de corriente'], ['res', 'Resistencia']],
      onCambio: (t) => { tipo = t; mostrar(); refrescar(); } }, sg);
    const ds = {
      bat: deslizador({ etiqueta: 'Tensión de la batería Vbat', unidad: 'V', min: 0.5, max: xmax, paso: 0.1, valor: val.bat, onCambio: (v) => { val.bat = v; refrescar(); } }, sg),
      cor: deslizador({ etiqueta: 'Corriente de la carga IL', unidad: 'A', min: 0.1, max: ymax, paso: 0.05, valor: val.cor, onCambio: (v) => { val.cor = v; refrescar(); } }, sg),
      res: deslizador({ etiqueta: 'Resistencia RL', unidad: 'Ω', min: 0.2, max: RLmax, paso: 0.1, valor: val.res, onCambio: (v) => { val.res = v; refrescar(); } }, sg),
    };
    raizEl.append(
      h('div', { class: 'b2__col' }, [caja('Curva I-V y recta de carga', elPlot)]),
      h('div', { class: 'b2__col' }, [caja('Reto', reto), caja('Datos del panel', datos.el), caja('Carga', sel.el, ds.bat.el, ds.cor.el, ds.res.el), caja('Punto de operación', lect.el, modoEl)]));

    const ejes = { x: { min: 0, max: xmax, etiqueta: 'V (V)' }, y: { min: 0, max: ymax, etiqueta: 'I (A)' } };
    const op = () => opDe(tipo, val[tipo]);
    const linea = () => tipo === 'bat' ? [[val.bat, 0], [val.bat, ymax]] : tipo === 'cor' ? [[0, val.cor], [xmax, val.cor]] : recortar([0, 0], [xmax, xmax / val.res], xmax, ymax);
    const curvas = () => [
      curvaIV(p, 'panel', 'base'),
      aspa('obj', 'ref', ptObj.v, ptObj.i, xmax, ymax),
      { id: 'carga', estilo: 'activa', puntos: linea() },
    ];
    const handle = () => {
      const o = op();
      if (tipo === 'bat') return [{ id: 'Vbat', x: val.bat, y: o.i, eje: 'x', min: 0.5 }];
      if (tipo === 'cor') return [{ id: 'IL', x: o.modo === 'sin_suministro' ? 0 : o.v, y: val.cor, eje: 'y', min: 0.1 }];
      return [{ id: 'RL', x: o.v, y: o.i, eje: 'xy' }];
    };
    const plot = ctx.ui.CurvePlot(elPlot, { ejes, curvas: curvas(), arrastrables: handle(),
      onArrastre(id, x, y) {
        if (id === 'Vbat') val.bat = Math.max(x, 0.5);
        else if (id === 'IL') val.cor = Math.max(y, 0.1);
        else val.res = y > 0.02 ? clamp(x / y, 0.2, RLmax) : RLmax;
        ds[tipo].poner(val[tipo]);
        refrescar();
      } });

    function mostrar() { for (const k of Object.keys(ds)) ds[k].el.hidden = k !== tipo; sel.poner(tipo); }
    function refrescar() {
      const o = op();
      plot.actualizar({ curvas: curvas(), arrastrables: handle() });
      lect.poner([['Tensión del panel v', `${fmt(o.v)} V`], ['Corriente del panel i', `${fmt(o.i)} A`], ['Potencia v · i', `${fmt(o.v * o.i)} W`]]);
      modoEl.textContent = MODO[o.modo];
      ctx.setParams({ V1: redondear(p.V1, 2), I1: redondear(p.I1, 2), Isc: redondear(p.Isc, 2), Vbat: redondear(ptObj.v, 1), IL: redondear(ptObj.i, 2) });
      const d = Math.hypot((o.v - ptObj.v) / p.V1, (o.i - ptObj.i) / p.I1);
      const mal = tipo !== tObj || o.modo !== ptObj.modo;
      ctx.onObjetivo(Math.max(aDist(d), mal ? 0.5 : 0));
    }
    mostrar(); refrescar();
    return { destruir() { ac.abort(); plot.destruir(); raizEl.remove(); } };
  },
};
