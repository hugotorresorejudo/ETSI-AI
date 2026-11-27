// Nivel 3.2: potencia con armónicos. Solo producen P los pares de igual orden en v e i.
import { kit } from './b3-comun.js';

const ORDENES = [1, 3, 5];
const F = 50, N = 240;

export default {
  id: '3.2',
  montar(cont, ctx) {
    const k = kit(ctx);
    const { fmt } = k;
    const { rng, armonicos } = ctx.motor;
    const r = rng.makeRng(ctx.seed);

    // Caso oculto de la semilla: de él sale la P objetivo (el alumno no lo ve).
    const V1 = r.pick([100, 120, 230]);
    const V3 = V1 * r.pick([0.3, 0.4, 0.5]);
    const I1 = r.pick([4, 5, 8, 10]);
    const phi1 = r.pick([20, 30, 40]);
    const I3 = I1 * r.pick([0.5, 0.6, 0.8]);
    const v3deg = r.pick([0, 30, -30]);
    const d3 = r.pick([0, 15, 30, -20]);
    const oculto = [{ n: 1, ef: V1, deg: 0 }, { n: 3, ef: V3, deg: v3deg }];
    const ocultoI = [{ n: 1, ef: I1, deg: -phi1 }, { n: 3, ef: I3, deg: v3deg - d3 }];
    const Pobj = Math.round(armonicos.potenciaArmonicos(oculto, ocultoI));

    // Estado inicial: v con 1.º y 3.º; i solo con el fundamental (el 3.º de v queda sin pareja).
    const v = { 1: { activo: true, ef: V1, deg: 0 }, 3: { activo: true, ef: V3, deg: v3deg }, 5: { activo: false, ef: V1 * 0.2, deg: 0 } };
    const i = { 1: { activo: true, ef: I1, deg: -phi1 }, 3: { activo: false, ef: I1 * 0.5, deg: 0 }, 5: { activo: false, ef: I1 * 0.2, deg: 0 } };

    const metaEl = k.meta(['Objetivo de esta semilla: potencia media ', `P = ${fmt(Pobj)} W`, ' (con un 2 % de margen).']);

    const ctrls = [];
    function bloque(titulo, est, unidad, efMax, paso, clave) {
      const col = k.h('div', {});
      for (const n of ORDENES) {
        const chk = k.casilla({ etiqueta: `${titulo}, armónico ${n}`, marcado: est[n].activo, nombre: `${clave}${n}`, onCambio: (b) => { est[n].activo = b; fila.dataset.activo = String(b); refrescar(); } });
        const ef = k.control({ etiqueta: `${clave === 'v' ? 'Vef' : 'Ief'} del armónico ${n}`, unidad, min: 0, max: efMax, paso, valor: est[n].ef, onCambio: (x) => { est[n].ef = x; refrescar(); } });
        const fase = k.control({ etiqueta: `Fase de ${clave === 'v' ? 'v' : 'i'}${n}`, unidad: 'grados', min: -180, max: 180, paso: 1, valor: est[n].deg, onCambio: (x) => { est[n].deg = x; refrescar(); } });
        const fila = k.h('div', { class: 'b3-fila-armo', 'data-activo': String(est[n].activo), 'data-clave': `${clave}${n}` }, [chk.el, ef.el, fase.el]);
        col.append(fila);
        ctrls.push({ chk, ef, fase });
      }
      return k.panel(titulo, col);
    }

    const elV = k.h('div', {}), elI = k.h('div', {}), elP = k.h('div', {});
    const cuerpoTabla = k.h('tbody', {});
    const tabla = k.h('table', { class: 'b3-tabla' }, [
      k.h('caption', { class: 'b3-sub', style: 'text-align:left;margin:0 0 6px', texto: 'Parejas de armónicos y potencia de cada una' }),
      k.h('thead', {}, [k.h('tr', {}, ['n', 'Vn (V)', 'In (A)', 'Pn (W)', 'Estado'].map((t) => k.h('th', { scope: 'col', texto: t })))]),
      cuerpoTabla]);
    const lect = k.lecturas([
      { clave: 'P', etiqueta: 'P = Σ Vn In cos φn (W)', resalte: true },
      { clave: 'Pt', etiqueta: 'Media de p(t) (W)' },
      { clave: 'S', etiqueta: 'S = Vef Ief (VA)' },
      { clave: 'Q', etiqueta: 'Q = √(S² − P²) (var)' },
      { clave: 'obj', etiqueta: 'P objetivo (W)' },
    ]);

    cont.replaceChildren(k.raiz(
      metaEl.el,
      k.h('div', { class: 'b3-grid' }, [bloque('Tensión v(t)', v, 'V', V1 * 2, V1 / 100, 'v'), bloque('Corriente i(t)', i, 'A', I1 * 2, I1 / 100, 'i')]),
      k.h('div', { class: 'b3-grid' }, [k.panel('v(t)', elV), k.panel('i(t)', elI), k.panel('p(t) y su media P (discontinuo)', elP)]),
      k.panel('Potencia', lect.el, k.h('div', { style: 'margin-top:12px;overflow-x:auto' }, [tabla]),
        k.h('p', { class: 'b3-sub', texto: 'Un armónico de tensión sin su pareja de corriente (o al revés) no aporta potencia media: su producto promedia cero.' }))));

    const wV = ctx.ui.Waveform(elV, { series: [] }), wI = ctx.ui.Waveform(elI, { series: [] }), wP = ctx.ui.Waveform(elP, { series: [] });

    const arm = (est) => ORDENES.filter((n) => est[n].activo).map((n) => ({ n, ef: est[n].ef, deg: est[n].deg }));
    const aPico = (a) => a.map((x) => ({ n: x.n, pico: x.ef * Math.SQRT2, deg: x.deg }));

    function refrescar() {
      const va = arm(v), ia = arm(i);
      const P = armonicos.potenciaArmonicos(va, ia);
      const sv = armonicos.muestras(aPico(va), F, N), si = armonicos.muestras(aPico(ia), F, N);
      const pt = sv.y.map((x, j) => x * si.y[j]);
      const Pt = pt.reduce((a, b) => a + b, 0) / N;
      const S = armonicos.eficaz(va.map((x) => x.ef)) * armonicos.eficaz(ia.map((x) => x.ef));
      const Q = Math.sqrt(Math.max(0, S * S - P * P));
      wV.actualizar({ series: [{ t: sv.t, y: sv.y, estilo: 'base' }] });
      wI.actualizar({ series: [{ t: si.t, y: si.y, estilo: 'base' }] });
      wP.actualizar({ series: [{ t: sv.t, y: sv.t.map(() => Pt), estilo: 'ref' }, { t: sv.t, y: pt, estilo: 'activa' }] });
      lect.poner('P', fmt(P), P);
      lect.poner('Pt', fmt(Pt), Pt);
      lect.poner('S', fmt(S), S);
      lect.poner('Q', fmt(Q), Q);
      lect.poner('obj', fmt(Pobj), Pobj);
      cuerpoTabla.replaceChildren(...ORDENES.map((n) => {
        const a = v[n].activo, b = i[n].activo;
        const Pn = a && b ? armonicos.potenciaArmonicos([{ n, ef: v[n].ef, deg: v[n].deg }], [{ n, ef: i[n].ef, deg: i[n].deg }]) : 0;
        const estado = a && b ? 'Con pareja' : a ? 'Sin pareja en i: 0 W' : b ? 'Sin pareja en v: 0 W' : 'Apagado';
        return k.h('tr', { 'data-n': n, 'data-aporta': String(a && b) }, [
          k.h('td', { texto: String(n) }), k.h('td', { texto: a ? fmt(v[n].ef) : '0' }), k.h('td', { texto: b ? fmt(i[n].ef) : '0' }),
          k.h('td', { texto: fmt(Pn), 'data-valor': Pn }), k.h('td', { class: 'b3-nota', texto: estado })]);
      }));
      ctx.setParams({ refs: { P } });
      const rel = Math.abs(P - Pobj) / Math.abs(Pobj);
      ctx.onObjetivo(rel / (1 + rel));
    }
    refrescar();

    return { destruir() { k.destruir(); wV.destruir(); wI.destruir(); wP.destruir(); cont.replaceChildren(); } };
  },
};
