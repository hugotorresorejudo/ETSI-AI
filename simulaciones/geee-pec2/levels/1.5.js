// Nivel 1.5: banco de supercondensadores con el mínimo de celdas (óptimo de bancoSC).
import { estilos, crearRng, lecturas, avisar, h, fmt } from './b1-comun.js';

const NS_MAX = 8, NP_MAX = 12;
const r3 = (x) => Math.round(x * 1000) / 1000;

export default {
  id: '1.5',
  montar(cont, ctx) {
    estilos();
    const { motor, ui } = ctx;
    const A = motor.almacenamiento;
    const rng = crearRng(ctx, '1.5');

    let celda, Vmax, Vmin, E_J, opt;
    for (let k = 0; k < 200; k++) {
      celda = { V: rng.pick([2.7, 3]), C: rng.pick([100, 150, 350, 500]), Imax: rng.pick([5, 10, 25, 50]), m_g: rng.pick([5, 10, 20, 60]) };
      const nsT = rng.int(2, 5), npT = rng.int(3, 9);
      Vmax = r3(nsT * celda.V - rng.pick([0, 0.2, 0.4]));
      Vmin = Math.round(Vmax * 10) / 20;
      const CT = ((npT - rng.pick([0.1, 0.3, 0.5, 0.7, 0.9])) * celda.C) / nsT;
      E_J = (CT * (Vmax * Vmax - Vmin * Vmin)) / 2;
      opt = A.bancoSC({ E_J, Vmax, Vmin, celda });
      if (opt.ns === nsT && opt.np === npT && opt.ns <= NS_MAX && opt.np <= NP_MAX) break;
    }
    let ns = 1, np = 1;
    const CTreq = opt.C_T;

    const raiz = h('div', { class: 'b1-nivel' });
    cont.replaceChildren(raiz);
    const obj = lecturas('Dato del objetivo', { objetivo: true, filas: [
      ['Energía útil a cubrir', `${fmt(E_J)} J`, true],
      ['Tensión máxima del banco', `${fmt(Vmax)} V`, true],
      ['Tensión mínima de trabajo', `${fmt(Vmin)} V`],
    ] });
    const ficha = lecturas('Ficha técnica de la celda', { filas: [
      ['Tensión V', `${fmt(celda.V)} V`], ['Capacidad C', `${fmt(celda.C)} F`],
      ['Corriente máxima', `${fmt(celda.Imax)} A`], ['Masa', `${fmt(celda.m_g)} g`],
    ] });
    const lect = lecturas('Tu banco');
    const gridEl = h('div');
    raiz.append(obj.el, h('div', { class: 'b1-fila' }, [
      h('div', { class: 'b1-col' }, [h('div', { class: 'b1-caja' }, [h('p', { class: 'b1-tit', texto: 'Rejilla de celdas' }), gridEl,
        h('p', { class: 'b1-nota', texto: 'Pulsa o arrastra sobre la rejilla, o usa los botones más y menos. El banco debe cumplir tensión y energía con el menor número de celdas.' })])]),
      h('div', { class: 'b1-col' }, [ficha.el, lect.el]),
    ]));

    const grid = ui.CellGrid(gridEl, { nsMax: NS_MAX, npMax: NP_MAX, ns, np, onCambio(a, b) { ns = a; np = b; refrescar(); } });

    function refrescar() {
      const p = A.packSC({ ns, np, celda });
      const n = ns * np;
      const E = p.Vmax > Vmin ? A.energiaSC({ C: p.C_T, Vmax: Math.min(p.Vmax, Vmax), Vmin }) : 0;
      const okV = p.Vmax >= Vmax - 1e-9, okE = E >= E_J * (1 - 1e-9);
      lect.poner([
        ['Configuración', `${ns} serie x ${np} paralelo`],
        ['Número de celdas', `${n}`, true],
        ['Capacidad total C_T = C·np/ns', `${fmt(p.C_T)} F`],
        ['Tensión máxima ns·V', `${fmt(p.Vmax)} V`],
        ['Energía útil del banco', `${fmt(E)} J`],
        ['Corriente máxima np·Imax', `${fmt(p.Imax)} A`],
        ['Peso ns·np·m', `${fmt(p.peso_g)} g`],
        ['Tensión', okV ? 'Cumple' : 'No cumple', true],
        ['Energía', okE ? 'Cumple' : 'No cumple', true],
      ]);
      let dist;
      if (!okV || !okE) {
        const falta = (Math.max(0, 1 - p.Vmax / Vmax) + Math.max(0, 1 - p.C_T / CTreq)) / 2;
        dist = 0.6 + 0.4 * Math.min(1, falta);
      } else if (n === opt.n) dist = 0;
      else dist = 0.05 + 0.4 * Math.min(1, (n - opt.n) / opt.n);
      ctx.setParams({ refs: { peso: opt.peso_g } });
      avisar(ctx, dist);
    }
    refrescar();

    return { destruir() { grid.destruir(); cont.replaceChildren(); } };
  },
};
