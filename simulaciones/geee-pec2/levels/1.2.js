// Nivel 1.2: capacidad y autonomía de la batería, con depósito y modelo v = v0 - dv·SoD - Rs·i.
import { estilos, crearRng, distRel, lecturas, deslizador, avisar, h, fmt, clamp } from './b1-comun.js';

const CMAX = 25, TMAXH = 100;

export default {
  id: '1.2',
  montar(cont, ctx) {
    estilos();
    const { motor, ui } = ctx;
    const A = motor.almacenamiento;
    const ac = new AbortController(), sg = ac.signal;
    const rng = crearRng(ctx, '1.2');

    let Pmed, Vbat, horas, Cobj;
    for (let k = 0; k < 200; k++) {
      Pmed = rng.pick([0.1, 0.2, 0.25, 0.5, 0.8, 1.2]);
      Vbat = rng.pick([3, 3.3, 3.6, 3.7, 4]);
      horas = rng.pick([10, 12, 16, 20, 24, 30, 36, 48]);
      Cobj = A.capacidadBateria({ Pmed, Vbat, horas }).C_Ah;
      if (Cobj >= 0.4 && Cobj <= 12) break;
    }
    const Rs = rng.pick([0.05, 0.1, 0.2, 0.5]);
    const v0 = Vbat, dv = 0.1 * v0;
    const i = Pmed / Vbat;
    let C = Math.round(clamp(rng.pick([0.4, 1.8]) * Cobj, 0.1, CMAX) * 20) / 20;
    if (distRel(C, Cobj) === 0) C = Math.min(CMAX, C * 2);
    let SoD = 0.5;

    const vSoD = (s) => v0 - dv * s - Rs * i;

    const raiz = h('div', { class: 'b1-nivel' });
    cont.replaceChildren(raiz);
    const obj = lecturas('Dato del objetivo', { objetivo: true, filas: [
      ['Autonomía exigida', `${fmt(horas)} h`, true],
      ['Potencia media del nodo', `${fmt(Pmed)} W`],
      ['Tensión nominal', `${fmt(Vbat)} V`],
      ['Resistencia serie', `${fmt(Rs)} Ω`],
    ] });

    const sC = deslizador({ etiqueta: 'Capacidad (Ah)', min: 0.1, max: CMAX, paso: 0.05, valor: C, onCambio(v) { C = v; sincronizar('C'); } }, sg);
    const sT = deslizador({ etiqueta: 'Autonomía (h)', min: 1, max: TMAXH, paso: 0.5, valor: A.autonomiaBateria({ C_Ah: C, Vbat, Pmed }), onCambio(t) {
      C = clamp(A.capacidadBateria({ Pmed, Vbat, horas: t }).C_Ah, 0.1, CMAX); sincronizar('T'); } }, sg);
    const sS = deslizador({ etiqueta: 'Estado de descarga SoD (0 a 1)', min: 0, max: 1, paso: 0.01, valor: SoD, onCambio(v) { SoD = v; sincronizar('S'); } }, sg);

    const depEl = h('div'), curvaEl = h('div');
    const lect = lecturas('Batería');
    const form = h('p', { class: 'b1-form' });
    raiz.append(obj.el, h('div', { class: 'b1-fila' }, [
      h('div', { class: 'b1-col' }, [h('div', { class: 'b1-caja' }, [h('p', { class: 'b1-tit', texto: 'Mandos' }), sC.el, sT.el, sS.el]), depEl, lect.el]),
      h('div', { class: 'b1-col' }, [h('div', { class: 'b1-caja' }, [h('p', { class: 'b1-tit', texto: 'Tensión en bornes v frente a SoD' }), curvaEl, form])]),
    ]));

    // Depósito
    const DW = 160, DH = 210;
    const dep = h('svg:svg', { viewBox: `0 0 ${DW} ${DH}`, class: 'b1-svg', role: 'img', 'aria-label': 'Depósito de carga de la batería', style: 'max-width:240px' });
    const nivel = h('svg:rect', { x: 40, width: 80, fill: 'var(--navy,#0B2545)' });
    const marco = h('svg:rect', { x: 40, y: 20, width: 80, height: 160, fill: 'none', stroke: 'var(--navy,#0B2545)', 'stroke-width': 2 });
    const tapa = h('svg:rect', { x: 65, y: 12, width: 30, height: 8, fill: 'var(--navy,#0B2545)' });
    const tSoC = h('svg:text', { class: 'b1-t', x: DW / 2, y: 200, 'text-anchor': 'middle' });
    dep.append(nivel, marco, tapa, tSoC);
    depEl.append(h('div', { class: 'b1-caja' }, [h('p', { class: 'b1-tit', texto: 'Depósito de carga' }), dep]));

    // Curva v(SoD)
    const pts = Array.from({ length: 21 }, (_, k) => [k / 20, vSoD(k / 20)]);
    const yMin = Math.floor((vSoD(1) - 0.05 * v0) * 10) / 10, yMax = Math.ceil(v0 * 10) / 10;
    const plot = ui.CurvePlot(curvaEl, {
      ejes: { x: { min: 0, max: 1, etiqueta: 'SoD' }, y: { min: yMin, max: yMax, etiqueta: 'v (V)' } },
      curvas: [{ id: 'v', estilo: 'activa', puntos: pts }],
      arrastrables: [{ id: 'SoD', x: SoD, y: vSoD(SoD), eje: 'x', min: 0, max: 1 }],
      onArrastre(_id, x) { SoD = x; sS.poner(x); sincronizar('S'); },
    });

    function sincronizar(origen) {
      const Eaut = A.autonomiaBateria({ C_Ah: C, Vbat, Pmed });
      if (origen !== 'C') sC.poner(C);
      if (origen !== 'T') sT.poner(clamp(Eaut, 1, TMAXH));
      if (origen !== 'S') sS.poner(SoD);
      const v = vSoD(SoD);
      plot.actualizar({ arrastrables: [{ id: 'SoD', x: SoD, y: v, eje: 'x', min: 0, max: 1 }] });
      const hVal = 160 * (1 - SoD);
      nivel.setAttribute('y', 180 - hVal); nivel.setAttribute('height', hVal);
      tSoC.textContent = `SoC ${fmt((1 - SoD) * 100)} %`;
      dep.setAttribute('aria-label', `Depósito de carga de la batería al ${fmt((1 - SoD) * 100)} por ciento`);
      const E_Wh = Vbat * C;
      lect.poner([
        ['Autonomía real', `${fmt(Eaut)} h`, true],
        ['Energía almacenada E = V·C', `${fmt(E_Wh)} Wh`],
        ['Corriente de descarga i', `${fmt(i)} A`],
        ['Ratio de descarga i/C', `${fmt(i / C)} C`],
        ['Tiempo transcurrido', `${fmt(SoD * Eaut)} h`],
        ['SoD / SoC', `${fmt(SoD * 100)} % / ${fmt((1 - SoD) * 100)} %`],
        ['Tensión en bornes v', `${fmt(v)} V`],
      ]);
      form.textContent = `v = v0 − Δv·SoD − Rs·i = ${fmt(v0)} − ${fmt(dv)}·${fmt(SoD)} − ${fmt(Rs)}·${fmt(i)} = ${fmt(v)} V, con Δv = 0,1·v0 e i = P media / Vbat.`;
      ctx.setParams({ refs: { C_Ah: Cobj } });
      avisar(ctx, distRel(C, Cobj));
    }
    sincronizar();

    return { destruir() { ac.abort(); plot.destruir(); cont.replaceChildren(); } };
  },
};
