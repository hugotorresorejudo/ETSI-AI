// Nivel 1.4: descarga del supercondensador y energía útil entre Vmax y Vmin.
import { estilos, crearRng, distRel, lecturas, deslizador, avisar, h, fmt, clamp } from './b1-comun.js';

export default {
  id: '1.4',
  montar(cont, ctx) {
    estilos();
    const { motor, ui } = ctx;
    const A = motor.almacenamiento;
    const ac = new AbortController(), sg = ac.signal;
    const rng = crearRng(ctx, '1.4');

    const C = rng.pick([1, 5, 10, 50, 100, 350]);
    const Vmax = rng.pick([2.5, 2.7, 3, 5.4]);
    const T0 = rng.pick([10, 20, 60]); // segundos que tardaría en vaciarse del todo
    const I = (C * Vmax) / T0;
    const VminObj = Math.round(Vmax * rng.pick([0.3, 0.4, 0.5, 0.6, 0.7]) * 20) / 20;
    const Eobj = A.energiaSC({ C, Vmax, Vmin: VminObj });
    let Vmin = Math.abs(VminObj - 0.1 * Vmax) < 0.15 * Vmax ? 0.9 * Vmax : 0.1 * Vmax;
    Vmin = Math.round(Vmin * 20) / 20;
    const Etot = A.energiaSC({ C, Vmax, Vmin: 0 });

    const raiz = h('div', { class: 'b1-nivel' });
    cont.replaceChildren(raiz);
    const obj = lecturas('Dato del objetivo', { objetivo: true, filas: [
      ['Energía útil requerida', `${fmt(Eobj)} J`, true],
      ['Capacidad C', `${fmt(C)} F`],
      ['Tensión máxima', `${fmt(Vmax)} V`],
      ['Corriente de descarga constante', `${fmt(I)} A`],
    ] });
    const sV = deslizador({ etiqueta: 'Tensión mínima Vmin (V)', min: 0, max: Vmax, paso: 0.05, valor: Vmin, onCambio(v) { Vmin = v; actualizar('S'); } }, sg);
    const curvaEl = h('div');
    const lect = lecturas('Energía');
    const form = h('p', { class: 'b1-form' });
    const barra = h('svg:svg', { viewBox: '0 0 400 56', class: 'b1-svg', role: 'img', 'aria-label': 'Fracción de la energía total que es útil' });
    const bTot = h('svg:rect', { x: 1, y: 6, width: 398, height: 28, fill: 'var(--muted,#F3F6F9)', stroke: 'var(--navy,#0B2545)', 'stroke-width': 1.5 });
    const bUtil = h('svg:rect', { x: 1, y: 6, height: 28, fill: 'var(--sky,#00A8E8)', stroke: 'var(--navy,#0B2545)', 'stroke-width': 1.5 });
    const bTxt = h('svg:text', { class: 'b1-t', x: 200, y: 51, 'text-anchor': 'middle' });
    barra.append(bTot, bUtil, bTxt);

    raiz.append(obj.el, h('div', { class: 'b1-fila' }, [
      h('div', { class: 'b1-col' }, [h('div', { class: 'b1-caja' }, [h('p', { class: 'b1-tit', texto: 'Descarga v(t) a corriente constante' }), curvaEl,
        h('p', { class: 'b1-nota', texto: 'Arrastra el punto Vmin verticalmente, usa el deslizador o escribe el valor.' })]), h('div', { class: 'b1-caja' }, [sV.el])]),
      h('div', { class: 'b1-col' }, [lect.el, h('div', { class: 'b1-caja' }, [h('p', { class: 'b1-tit', texto: 'Fracción de energía útil' }), barra, form])]),
    ]));

    const tDe = (v) => (C * (Vmax - v)) / I;
    const curvas = () => [
      { id: 'total', estilo: 'base', puntos: [[0, Vmax], [T0, 0]] },
      { id: 'ref', estilo: 'ref', puntos: [[0, Vmin], [T0, Vmin]] },
      { id: 'util', estilo: 'activa', puntos: [[0, Vmax], [tDe(Vmin), Vmin]] },
    ];
    const plot = ui.CurvePlot(curvaEl, {
      ejes: { x: { min: 0, max: T0, etiqueta: 't (s)' }, y: { min: 0, max: Math.ceil(Vmax * 1.05 * 10) / 10, etiqueta: 'v (V)' } },
      curvas: curvas(),
      arrastrables: [{ id: 'Vmin', x: tDe(Vmin), y: Vmin, eje: 'y', min: 0, max: Vmax }],
      onArrastre(_id, _x, y) { Vmin = clamp(y, 0, Vmax); actualizar('G'); },
    });

    function actualizar(origen) {
      if (origen !== 'S') sV.poner(Vmin);
      plot.actualizar({ curvas: curvas(), arrastrables: [{ id: 'Vmin', x: tDe(Vmin), y: Vmin, eje: 'y', min: 0, max: Vmax }] });
      const E = A.energiaSC({ C, Vmax, Vmin });
      const frac = E / Etot;
      bUtil.setAttribute('width', Math.max(0, 398 * frac));
      bTxt.textContent = `Útil ${fmt(frac * 100)} % de ${fmt(Etot)} J`;
      barra.setAttribute('aria-label', `Energía útil: ${fmt(frac * 100)} por ciento de la energía total`);
      lect.poner([
        ['Energía útil E', `${fmt(E)} J`, true],
        ['Energía total hasta 0 V', `${fmt(Etot)} J`],
        ['Fracción útil', `${fmt(frac * 100)} %`],
        ['Tiempo de descarga útil', `${fmt(tDe(Vmin))} s`],
        ['Corriente i = C·dv/dt', `${fmt(I)} A`],
        ['Potencia al final, Vmin·i', `${fmt(Vmin * I)} W`],
      ]);
      form.textContent = `E = ½·C·(Vmax² − Vmin²) = ½·${fmt(C)}·(${fmt(Vmax)}² − ${fmt(Vmin)}²) = ${fmt(E)} J`;
      ctx.setParams({ refs: { E_J: E } });
      avisar(ctx, distRel(E, Eobj));
    }
    actualizar();

    return { destruir() { ac.abort(); plot.destruir(); cont.replaceChildren(); } };
  },
};
