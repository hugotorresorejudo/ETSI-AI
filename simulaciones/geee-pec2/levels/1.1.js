// Nivel 1.1: perfil de consumo cíclico. Objetivo: una potencia media dada.
import { estilos, crearRng, distRel, lecturas, boton, avisar, h, fmt } from './b1-comun.js';

const PMAX = 5, TMAX = 30;

export default {
  id: '1.1',
  montar(cont, ctx) {
    estilos();
    const { motor, ui } = ctx;
    const ac = new AbortController(), sg = ac.signal;
    const rng = crearRng(ctx, '1.1');

    // Ciclo oculto que fija el objetivo y horas de autonomía.
    const oculto = [
      { P: rng.pick([0, 0.1, 0.2]), t: rng.pick([4, 5, 8, 10]) },
      { P: rng.pick([0.5, 1, 2]), t: rng.pick([2, 4, 5]) },
      { P: rng.pick([3, 4, 5]), t: rng.pick([1, 2, 4]) },
    ];
    const objetivo = motor.almacenamiento.potenciaMedia(oculto).Pmed;
    const horas = rng.pick([10, 12, 16, 20, 24, 30, 36, 48]);
    const salidas = [
      [{ P: 1, t: 5 }, { P: 1, t: 5 }, { P: 1, t: 5 }],
      [{ P: 3, t: 5 }, { P: 0.5, t: 5 }, { P: 3, t: 5 }],
      [{ P: 0.2, t: 8 }, { P: 0.2, t: 8 }, { P: 0.2, t: 8 }],
    ];
    let bloques = salidas.find((s) => distRel(motor.almacenamiento.potenciaMedia(s).Pmed, objetivo) > 0.3) || salidas[2];

    const raiz = h('div', { class: 'b1-nivel' });
    cont.replaceChildren(raiz);
    const obj = lecturas('Dato del objetivo', { objetivo: true, filas: [
      ['Potencia media objetivo', `${fmt(objetivo)} W`, true],
      ['Tiempo de autonomía', `${fmt(horas)} h`],
    ] });
    const tlEl = h('div'), ondaEl = h('div');
    const lect = lecturas('Tu ciclo');
    const botones = h('div', { class: 'b1-acciones' });
    const nota = h('p', { class: 'b1-nota', texto: 'Arrastra el punto de cada bloque para cambiar su potencia y el tirador de su borde derecho para cambiar su duración. Los campos numéricos hacen lo mismo.' });
    raiz.append(obj.el, h('div', { class: 'b1-fila' }, [
      h('div', { class: 'b1-col' }, [tlEl, botones, nota]),
      h('div', { class: 'b1-col' }, [lect.el, h('div', { class: 'b1-caja' }, [h('p', { class: 'b1-tit', texto: 'Energía acumulada E(t) en J frente a t en s' }), ondaEl])]),
    ]));

    const tl = ui.Timeline(tlEl, { bloques, Pmax: PMAX, Tmax: TMAX, onCambio(b) { bloques = b; refrescar(); } });
    const onda = ui.Waveform(ondaEl, { series: [] });

    function refrescar() {
      const { Pmed, T } = motor.almacenamiento.potenciaMedia(bloques);
      const valido = T > 0 && Number.isFinite(Pmed);
      const E = bloques.reduce((s, b) => s + b.P * b.t, 0);
      const Eaut = valido ? Pmed * horas : NaN;
      lect.poner([
        ['Duración del ciclo T', `${fmt(T)} s`],
        ['Energía del ciclo', `${fmt(E)} J`],
        ['Potencia media', valido ? `${fmt(Pmed)} W` : 'sin ciclo', true],
        ['Diferencia con el objetivo', valido ? `${fmt(((Pmed - objetivo) / objetivo) * 100, 3)} %` : 'sin ciclo'],
        [`Energía en ${fmt(horas)} h de autonomía`, valido ? `${fmt(Eaut)} Wh` : 'sin ciclo'],
        ['Energía en autonomía en julios', valido ? `${fmt(Eaut * 3600)} J` : 'sin ciclo'],
      ]);
      // Energía acumulada: lineal dentro de cada modo.
      const t = [0], y = [0];
      let ta = 0, ya = 0;
      for (const b of bloques) { ta += b.t; ya += b.P * b.t; t.push(ta); y.push(ya); }
      const series = [{ t, y, estilo: 'activa' }];
      if (valido) series.unshift({ t: [0, T], y: [0, Pmed * T], estilo: 'ref' });
      onda.actualizar({ series });
      if (valido) ctx.setParams({ refs: { Pmed } });
      avisar(ctx, valido ? distRel(Pmed, objetivo) : 1);
    }

    const masModo = boton('Añadir un modo', () => {
      if (bloques.length >= 3) return;
      const T = bloques.reduce((s, b) => s + b.t, 0);
      bloques = [...bloques, { P: 1, t: Math.max(0, Math.min(5, TMAX - T)) }];
      tl.actualizar({ bloques }); refrescar(); estadoBotones();
    }, sg);
    const menosModo = boton('Quitar el último modo', () => {
      if (bloques.length <= 2) return;
      bloques = bloques.slice(0, -1);
      tl.actualizar({ bloques }); refrescar(); estadoBotones();
    }, sg);
    function estadoBotones() { masModo.disabled = bloques.length >= 3; menosModo.disabled = bloques.length <= 2; }
    botones.append(masModo, menosModo);
    estadoBotones(); refrescar();

    return { destruir() { ac.abort(); tl.destruir(); onda.destruir(); cont.replaceChildren(); } };
  },
};
