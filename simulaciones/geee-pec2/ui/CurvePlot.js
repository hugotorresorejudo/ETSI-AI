import { h, montarBase, escala, marcas, fmt, clamp, arrastrar, campoNumero } from './svg.js';

const W = 480, H = 320, M = { l: 52, r: 16, t: 14, b: 44 };

export function CurvePlot(el, cfg) {
  const ac = new AbortController(), sg = ac.signal;
  const svg = montarBase(el, W, H, 'Gráfica de curvas');
  let ejes = cfg.ejes, curvas = cfg.curvas || [], arr = (cfg.arrastrables || []).map(a => ({ ...a }));
  const fondo = h('svg:g'), capaCurvas = h('svg:g'), capaPts = h('svg:g');
  svg.append(fondo, capaCurvas, capaPts);
  const campos = h('div', { class: 'geee-campos' });
  el.append(campos);
  const nodos = new Map(); // id -> { g, c, hit, cx, cy }
  let sx, sy;

  function limites(a) {
    const eje = a.eje || 'xy';
    const lim = { x: [ejes.x.min, ejes.x.max], y: [ejes.y.min, ejes.y.max] };
    if (a.min != null || a.max != null) {
      if (eje === 'xy') { if (Array.isArray(a.min)) { lim.x[0] = a.min[0]; lim.y[0] = a.min[1]; } if (Array.isArray(a.max)) { lim.x[1] = a.max[0]; lim.y[1] = a.max[1]; } }
      else { if (a.min != null) lim[eje][0] = a.min; if (a.max != null) lim[eje][1] = a.max; }
    }
    return lim;
  }
  function fijar(a, x, y, avisar) {
    const eje = a.eje || 'xy', lim = limites(a);
    if (eje !== 'y') a.x = clamp(x, ...lim.x);
    if (eje !== 'x') a.y = clamp(y, ...lim.y);
    pintarPunto(a);
    if (avisar) cfg.onArrastre?.(a.id, a.x, a.y);
  }
  function pintarPunto(a) {
    const n = nodos.get(a.id); if (!n) return;
    const cx = sx(a.x), cy = sy(a.y);
    n.c.setAttribute('cx', cx); n.c.setAttribute('cy', cy);
    n.hit.setAttribute('cx', cx); n.hit.setAttribute('cy', cy);
    n.c.setAttribute('aria-valuetext', `x ${fmt(a.x)}, y ${fmt(a.y)}`);
    n.cx?.poner(a.x); n.cy?.poner(a.y);
  }

  function ejesYRejilla() {
    sx = escala(ejes.x.min, ejes.x.max, M.l, W - M.r);
    sy = escala(ejes.y.min, ejes.y.max, H - M.b, M.t);
    fondo.replaceChildren();
    for (const v of marcas(ejes.x.min, ejes.x.max, 6)) {
      fondo.append(h('svg:line', { class: 'geee-rej', x1: sx(v), x2: sx(v), y1: M.t, y2: H - M.b }),
        h('svg:text', { x: sx(v), y: H - M.b + 15, 'text-anchor': 'middle', texto: fmt(v) }));
    }
    for (const v of marcas(ejes.y.min, ejes.y.max, 5)) {
      fondo.append(h('svg:line', { class: 'geee-rej', y1: sy(v), y2: sy(v), x1: M.l, x2: W - M.r }),
        h('svg:text', { x: M.l - 6, y: sy(v) + 4, 'text-anchor': 'end', texto: fmt(v) }));
    }
    fondo.append(h('svg:rect', { class: 'geee-eje', x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b }),
      h('svg:text', { class: 'geee-lbl', x: (M.l + W - M.r) / 2, y: H - 6, 'text-anchor': 'middle', texto: ejes.x.etiqueta || '' }),
      h('svg:text', { class: 'geee-lbl', transform: `translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`, 'text-anchor': 'middle', texto: ejes.y.etiqueta || '' }));
  }
  function pintarCurvas() {
    capaCurvas.replaceChildren();
    const orden = { ref: 0, base: 1, activa: 2 };
    for (const c of [...curvas].sort((a, b) => orden[a.estilo || 'base'] - orden[b.estilo || 'base'])) {
      const pts = c.puntos.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])).map(([x, y]) => `${sx(x).toFixed(2)},${sy(y).toFixed(2)}`).join(' ');
      capaCurvas.append(h('svg:polyline', { class: `geee-${c.estilo || 'base'}`, points: pts, 'data-curva': c.id, 'stroke-linejoin': 'round' }));
    }
  }
  function sincronizarPuntos() {
    const ids = new Set(arr.map(a => a.id));
    for (const [id, n] of nodos) if (!ids.has(id)) { n.g.remove(); n.campos.forEach(c => c.remove()); nodos.delete(id); }
    for (const a of arr) {
      if (!nodos.has(a.id)) crearPunto(a);
      else { const n = nodos.get(a.id); n.a = a; }
      pintarPunto(a);
    }
  }
  function crearPunto(a) {
    const eje = a.eje || 'xy', lim = limites(a);
    const hit = h('svg:circle', { class: 'geee-hit', r: 20 });
    const c = h('svg:circle', { class: 'geee-pt', r: 8, tabindex: 0, role: 'slider', 'aria-label': `Punto ${a.id}`, 'aria-orientation': eje === 'y' ? 'vertical' : 'horizontal', 'data-id': a.id });
    const t = h('svg:text', { class: 'geee-lbl', 'text-anchor': 'middle', 'pointer-events': 'none', texto: a.id });
    const g = h('svg:g', {}, [hit, c, t]);
    capaPts.append(g);
    const n = { g, c, hit, a, campos: [] };
    nodos.set(a.id, n);
    const mover = (px, py) => {
      const act = arr.find(q => q.id === a.id);
      fijar(act, ejes.x.min + (px - M.l) / (W - M.l - M.r) * (ejes.x.max - ejes.x.min),
        ejes.y.min + (H - M.b - py) / (H - M.t - M.b) * (ejes.y.max - ejes.y.min), true);
      t.setAttribute('x', sx(act.x)); t.setAttribute('y', sy(act.y) - 13);
    };
    for (const nodo of [hit, c]) arrastrar(nodo, svg, { mover }, sg);
    c.addEventListener('keydown', e => {
      const act = arr.find(q => q.id === a.id);
      const px = (ejes.x.max - ejes.x.min) / 100, py = (ejes.y.max - ejes.y.min) / 100;
      const d = { ArrowLeft: [-px, 0], ArrowRight: [px, 0], ArrowUp: [0, py], ArrowDown: [0, -py] }[e.key];
      if (!d) return;
      e.preventDefault();
      fijar(act, act.x + d[0], act.y + d[1], true);
    }, { signal: sg });
    const mk = (ej, nombre) => {
      const f = campoNumero({ etiqueta: `${a.id}, ${nombre}`, valor: () => arr.find(q => q.id === a.id)[ej],
        paso: (ej === 'x' ? ejes.x.max - ejes.x.min : ejes.y.max - ejes.y.min) / 100, min: lim[ej][0], max: lim[ej][1],
        onCambio: v => { const act = arr.find(q => q.id === a.id); fijar(act, ej === 'x' ? v : act.x, ej === 'y' ? v : act.y, true); } }, sg);
      campos.append(f.el); n.campos.push(f.el); return f;
    };
    if (eje !== 'y') n.cx = mk('x', ejes.x.etiqueta || 'x');
    if (eje !== 'x') n.cy = mk('y', ejes.y.etiqueta || 'y');
    n.t = t;
  }
  function etiquetas() { for (const a of arr) { const n = nodos.get(a.id); n.t.setAttribute('x', sx(a.x)); n.t.setAttribute('y', sy(a.y) - 13); } }

  function dibujar() { ejesYRejilla(); pintarCurvas(); sincronizarPuntos(); etiquetas(); }
  dibujar();

  return {
    actualizar(d = {}) {
      if (d.ejes) ejes = d.ejes;
      if (d.curvas) curvas = d.curvas;
      if (d.arrastrables) arr = d.arrastrables.map(a => ({ ...a }));
      dibujar();
    },
    destruir() { ac.abort(); el.replaceChildren(); el.classList.remove('geee-comp'); },
  };
}
