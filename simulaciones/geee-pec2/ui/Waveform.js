import { h, montarBase, escala, marcas, fmt } from './svg.js';

const W = 480, H = 240, M = { l: 52, r: 16, t: 14, b: 36 };
// Estilo -> clase y trazo adicional (se distingue por grosor y trazo, no solo por color).
const EST = { activa: 'geee-activa', base: 'geee-base', ref: 'geee-ref' };

export function Waveform(el, cfg) {
  let series = cfg.series || [];
  const svg = montarBase(el, W, H, 'Forma de onda');
  const capa = h('svg:g'); svg.append(capa);

  function pintar() {
    capa.replaceChildren();
    const ts = series.flatMap(s => s.t), ys = series.flatMap(s => s.y).filter(Number.isFinite);
    if (!ts.length) return;
    const t0 = Math.min(...ts), t1 = Math.max(...ts);
    let y0 = Math.min(0, ...ys), y1 = Math.max(0, ...ys); if (y1 - y0 < 1e-9) { y0 -= 1; y1 += 1; }
    const pad = (y1 - y0) * 0.08; y0 -= pad; y1 += pad;
    const sx = escala(t0, t1, M.l, W - M.r), sy = escala(y0, y1, H - M.b, M.t);
    for (const v of marcas(t0, t1, 6)) capa.append(h('svg:line', { class: 'geee-rej', x1: sx(v), x2: sx(v), y1: M.t, y2: H - M.b }), h('svg:text', { x: sx(v), y: H - M.b + 15, 'text-anchor': 'middle', texto: fmt(v) }));
    for (const v of marcas(y0, y1, 4)) capa.append(h('svg:line', { class: 'geee-rej', x1: M.l, x2: W - M.r, y1: sy(v), y2: sy(v) }), h('svg:text', { x: M.l - 6, y: sy(v) + 4, 'text-anchor': 'end', texto: fmt(v) }));
    capa.append(h('svg:rect', { class: 'geee-eje', x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b }),
      h('svg:line', { class: 'geee-eje', x1: M.l, x2: W - M.r, y1: sy(0), y2: sy(0) }),
      h('svg:text', { class: 'geee-lbl', x: (M.l + W - M.r) / 2, y: H - 4, 'text-anchor': 'middle', texto: 't' }));
    series.forEach(s => {
      const pts = s.t.map((t, i) => Number.isFinite(s.y[i]) ? `${sx(t).toFixed(2)},${sy(s.y[i]).toFixed(2)}` : null).filter(Boolean).join(' ');
      capa.append(h('svg:polyline', { class: EST[s.estilo || 'base'], points: pts, 'stroke-linejoin': 'round' }));
    });
  }
  pintar();
  return {
    actualizar(d = {}) { if (d.series) series = d.series; pintar(); },
    destruir() { el.replaceChildren(); el.classList.remove('geee-comp'); },
  };
}
