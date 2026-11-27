import { h, montarBase, escala, marcas, fmt, clamp, arrastrar, campoNumero } from './svg.js';

const W = 480, H = 280, M = { l: 52, r: 16, t: 16, b: 44 };

export function Timeline(el, cfg) {
  const ac = new AbortController(), sg = ac.signal;
  let bloques = cfg.bloques.map(b => ({ ...b })), Pmax = cfg.Pmax, Tmax = cfg.Tmax;
  const svg = montarBase(el, W, H, 'Perfil de consumo P(t) por modos');
  const fondo = h('svg:g'), capa = h('svg:g'), media = h('svg:line', { class: 'geee-ref' });
  svg.append(fondo, capa, media);
  const campos = h('div', { class: 'geee-campos' }), lectura = h('p', { class: 'geee-lectura' });
  el.append(campos, lectura);
  let sx, sy, partes = [], construidos = -1;

  const total = () => bloques.reduce((s, b) => s + b.t, 0);
  const emitir = () => cfg.onCambio?.(bloques.map(b => ({ ...b })));
  function cambiar(i, k, v) {
    if (k === 't') v = clamp(v, 0, Tmax - (total() - bloques[i].t)); else v = clamp(v, 0, Pmax);
    bloques[i][k] = v; pintar(); emitir();
  }
  function fondoEjes() {
    sx = escala(0, Tmax, M.l, W - M.r); sy = escala(0, Pmax, H - M.b, M.t);
    fondo.replaceChildren();
    for (const v of marcas(0, Tmax, 6)) fondo.append(h('svg:line', { class: 'geee-rej', x1: sx(v), x2: sx(v), y1: M.t, y2: H - M.b }), h('svg:text', { x: sx(v), y: H - M.b + 15, 'text-anchor': 'middle', texto: fmt(v) }));
    for (const v of marcas(0, Pmax, 5)) fondo.append(h('svg:line', { class: 'geee-rej', x1: M.l, x2: W - M.r, y1: sy(v), y2: sy(v) }), h('svg:text', { x: M.l - 6, y: sy(v) + 4, 'text-anchor': 'end', texto: fmt(v) }));
    fondo.append(h('svg:rect', { class: 'geee-eje', x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b }),
      h('svg:text', { class: 'geee-lbl', x: (M.l + W - M.r) / 2, y: H - 6, 'text-anchor': 'middle', texto: 't (s)' }),
      h('svg:text', { class: 'geee-lbl', transform: `translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`, 'text-anchor': 'middle', texto: 'P (W)' }));
  }
  function construir() {
    capa.replaceChildren(); campos.replaceChildren(); partes = [];
    bloques.forEach((b, i) => {
      const rect = h('svg:rect', { fill: 'var(--muted,#F3F6F9)', stroke: 'var(--navy,#0B2545)', 'stroke-width': 2 });
      const hP = h('svg:circle', { class: 'geee-pt', r: 8, tabindex: 0, role: 'slider', 'aria-label': `Potencia del modo ${i + 1}`, 'aria-orientation': 'vertical' });
      const hPh = h('svg:circle', { class: 'geee-hit', r: 20 });
      const hT = h('svg:rect', { class: 'geee-pt', width: 10, height: 28, tabindex: 0, role: 'slider', 'aria-label': `Duración del modo ${i + 1}` });
      const hTh = h('svg:rect', { class: 'geee-hit', width: 28, height: 44 });
      const etq = h('svg:text', { class: 'geee-lbl', 'text-anchor': 'middle', 'pointer-events': 'none' });
      capa.append(rect, etq, hPh, hP, hTh, hT);
      const inicioT = () => bloques.slice(0, i).reduce((s, q) => s + q.t, 0);
      for (const n of [hP, hPh]) arrastrar(n, svg, { mover: (_x, py) => cambiar(i, 'P', Pmax * (H - M.b - py) / (H - M.t - M.b)) }, sg);
      for (const n of [hT, hTh]) arrastrar(n, svg, { mover: px => cambiar(i, 't', Tmax * (px - M.l) / (W - M.l - M.r) - inicioT()) }, sg);
      const tecla = (k, paso) => e => { const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); cambiar(i, k, bloques[i][k] + d * paso); } };
      hP.addEventListener('keydown', tecla('P', Pmax / 100), { signal: sg });
      hT.addEventListener('keydown', tecla('t', Tmax / 100), { signal: sg });
      const fP = campoNumero({ etiqueta: `P modo ${i + 1} (W)`, valor: () => bloques[i].P, paso: Pmax / 100, min: 0, max: Pmax, onCambio: v => cambiar(i, 'P', v) }, sg);
      const fT = campoNumero({ etiqueta: `t modo ${i + 1} (s)`, valor: () => bloques[i].t, paso: Tmax / 100, min: 0, max: Tmax, onCambio: v => cambiar(i, 't', v) }, sg);
      campos.append(fP.el, fT.el);
      partes.push({ rect, hP, hPh, hT, hTh, etq, fP, fT, inicioT });
    });
    construidos = bloques.length;
  }
  function pintar() {
    bloques.forEach((b, i) => {
      const p = partes[i], x0 = sx(p.inicioT()), x1 = sx(p.inicioT() + b.t), y = sy(b.P);
      p.rect.setAttribute('x', x0); p.rect.setAttribute('y', y); p.rect.setAttribute('width', Math.max(0, x1 - x0)); p.rect.setAttribute('height', Math.max(0, H - M.b - y));
      p.hP.setAttribute('cx', (x0 + x1) / 2); p.hP.setAttribute('cy', y); p.hPh.setAttribute('cx', (x0 + x1) / 2); p.hPh.setAttribute('cy', y);
      const yt = Math.min(Math.max(y + 22, M.t + 14), H - M.b - 16);
      p.hT.setAttribute('x', x1 - 5); p.hT.setAttribute('y', yt); p.hTh.setAttribute('x', x1 - 14); p.hTh.setAttribute('y', yt - 8);
      p.hP.setAttribute('aria-valuetext', `${fmt(b.P)} W`); p.hT.setAttribute('aria-valuetext', `${fmt(b.t)} s`);
      p.etq.setAttribute('x', (x0 + x1) / 2); p.etq.setAttribute('y', H - M.b - 6); p.etq.textContent = x1 - x0 > 80 ? `Modo ${i + 1}` : '';
      p.fP.poner(b.P); p.fT.poner(b.t);
    });
    const T = total(), E = bloques.reduce((s, b) => s + b.P * b.t, 0), Pm = T > 0 ? E / T : 0;
    media.setAttribute('x1', M.l); media.setAttribute('x2', W - M.r); media.setAttribute('y1', sy(Pm)); media.setAttribute('y2', sy(Pm));
    lectura.textContent = `T = ${fmt(T)} s; P media = ${fmt(Pm)} W; energía = ${fmt(E)} J`;
  }
  function todo() { fondoEjes(); if (construidos !== bloques.length) construir(); pintar(); }
  todo();
  return {
    actualizar(d = {}) {
      if (d.Pmax) Pmax = d.Pmax; if (d.Tmax) Tmax = d.Tmax;
      if (d.bloques) { if (d.bloques.length !== bloques.length) construidos = -1; bloques = d.bloques.map(b => ({ ...b })); }
      todo();
    },
    destruir() { ac.abort(); el.replaceChildren(); el.classList.remove('geee-comp'); },
  };
}
