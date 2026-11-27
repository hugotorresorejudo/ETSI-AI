// Nivel 1.3: celdas en serie y en paralelo con packBateria.
import { estilos, crearRng, lecturas, avisar, h, fmt } from './b1-comun.js';

const NS_MAX = 8, NP_MAX = 8;

export default {
  id: '1.3',
  montar(cont, ctx) {
    estilos();
    const { motor, ui } = ctx;
    const rng = crearRng(ctx, '1.3');
    const celda = { V: rng.pick([1.2, 2, 3.2, 3.6, 3.7]), C_Ah: rng.pick([1, 2, 2.5, 3, 5]), Rs: rng.pick([0.05, 0.08, 0.1, 0.15]), Imax: rng.pick([2, 5, 10]) };
    const nsObj = rng.int(2, 6), npObj = rng.int(2, 6);
    const objP = motor.almacenamiento.packBateria({ ns: nsObj, np: npObj, celda });
    let ns = 1, np = 1;

    const raiz = h('div', { class: 'b1-nivel' });
    cont.replaceChildren(raiz);
    const obj = lecturas('Dato del objetivo', { objetivo: true, filas: [
      ['Tensión del pack', `${fmt(objP.V)} V`, true],
      ['Capacidad del pack', `${fmt(objP.C_Ah)} Ah`, true],
    ] });
    const cel = lecturas('Una celda', { filas: [
      ['Tensión V', `${fmt(celda.V)} V`], ['Capacidad C', `${fmt(celda.C_Ah)} Ah`],
      ['Resistencia serie Rs', `${fmt(celda.Rs)} Ω`], ['Corriente máxima', `${fmt(celda.Imax)} A`],
    ] });
    const lect = lecturas('Tu pack');
    const gridEl = h('div');
    raiz.append(obj.el, h('div', { class: 'b1-fila' }, [
      h('div', { class: 'b1-col' }, [h('div', { class: 'b1-caja' }, [h('p', { class: 'b1-tit', texto: 'Rejilla de celdas' }), gridEl,
        h('p', { class: 'b1-nota', texto: 'Pulsa o arrastra sobre la rejilla para marcar celdas, o usa los botones más y menos de cada eje.' })])]),
      h('div', { class: 'b1-col' }, [cel.el, lect.el]),
    ]));

    const grid = ui.CellGrid(gridEl, { nsMax: NS_MAX, npMax: NP_MAX, ns, np, onCambio(a, b) { ns = a; np = b; refrescar(); } });

    function refrescar() {
      const p = motor.almacenamiento.packBateria({ ns, np, celda });
      lect.poner([
        ['Configuración', `${ns} serie x ${np} paralelo`],
        ['Tensión V', `${fmt(p.V)} V`, true],
        ['Capacidad C', `${fmt(p.C_Ah)} Ah`, true],
        ['Resistencia serie Rs', `${fmt(p.Rs)} Ω`],
        ['Energía E', `${fmt(p.E_Wh)} Wh`],
        ['Corriente máxima', `${fmt(p.Imax)} A`],
      ]);
      const eV = Math.abs(p.V - objP.V) / objP.V, eC = Math.abs(p.C_Ah - objP.C_Ah) / objP.C_Ah;
      const ok = eV < 1e-9 && eC < 1e-9;
      avisar(ctx, ok ? 0 : Math.min(1, Math.max(0.05, (eV + eC) / 1.5)));
    }
    refrescar();

    return { destruir() { grid.destruir(); cont.replaceChildren(); } };
  },
};
