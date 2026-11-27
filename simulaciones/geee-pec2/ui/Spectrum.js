import { h, montarBase, escala, marcas, fmt } from './svg.js';

const W = 480, H = 280, M = { l: 48, r: 12, t: 14, b: 58 };

export function Spectrum(el, cfg) {
  const ac = new AbortController(), sg = ac.signal;
  let barras = cfg.barras.map(b => ({ ...b }));
  const svg = montarBase(el, W, H, 'Espectro de armónicos');
  const capa = h('svg:g'); svg.append(capa);
  const lectura = h('p', { class: 'geee-lectura' }); el.append(lectura);

  function pintar() {
    capa.replaceChildren();
    const vmax = Math.max(1e-9, ...barras.map(b => Math.abs(b.valor))) * 1.1;
    const sy = escala(0, vmax, H - M.b, M.t), n = barras.length, ancho = (W - M.l - M.r) / Math.max(n, 1), bw = ancho * 0.6;
    for (const v of marcas(0, vmax, 4)) capa.append(h('svg:line', { class: 'geee-rej', x1: M.l, x2: W - M.r, y1: sy(v), y2: sy(v) }), h('svg:text', { x: M.l - 6, y: sy(v) + 4, 'text-anchor': 'end', texto: fmt(v) }));
    capa.append(h('svg:line', { class: 'geee-eje', x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }),
      h('svg:text', { class: 'geee-lbl', x: (M.l + W - M.r) / 2, y: H - 6, 'text-anchor': 'middle', texto: 'Armónico n' }));
    barras.forEach((b, i) => {
      const x = M.l + i * ancho + (ancho - bw) / 2, y = sy(Math.abs(b.valor)), alto = H - M.b - y;
      const g = h('svg:g', { class: 'geee-foco', tabindex: 0, role: 'switch', 'aria-checked': b.activo ? 'true' : 'false', 'aria-label': `Armónico ${b.n}, valor ${fmt(b.valor)}`, 'data-n': b.n, style: 'cursor:pointer' });
      g.append(h('svg:rect', { x: M.l + i * ancho, y: M.t, width: ancho, height: H - M.t - M.b, fill: 'transparent' }),
        h('svg:rect', { x, y, width: bw, height: Math.max(alto, 1), fill: b.activo ? 'var(--navy,#0B2545)' : 'var(--surface,#fff)', stroke: b.activo ? 'var(--navy,#0B2545)' : 'var(--ink-muted,#4F6279)', 'stroke-width': 2, 'stroke-dasharray': b.activo ? null : '4 3' }),
        h('svg:text', { x: x + bw / 2, y: Math.max(y - 4, M.t + 8), 'text-anchor': 'middle', texto: fmt(b.valor) }),
        h('svg:text', { class: 'geee-lbl', x: x + bw / 2, y: H - M.b + 16, 'text-anchor': 'middle', texto: b.n }),
        h('svg:text', { x: x + bw / 2, y: H - M.b + 29, 'text-anchor': 'middle', texto: b.activo ? 'activo' : 'apagado' }));
      const alt = () => cfg.onToggle?.(b.n);
      g.addEventListener('click', alt, { signal: sg });
      g.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); alt(); } }, { signal: sg });
      capa.append(g);
    });
    const act = barras.filter(b => b.activo);
    lectura.textContent = act.length ? `Activos: ${act.map(b => b.n).join(', ')}. Valor eficaz de los activos: ${fmt(Math.hypot(...act.map(b => b.valor)))}` : 'Ningún armónico activo';
  }
  pintar();
  return {
    actualizar(d = {}) { if (d.barras) barras = d.barras.map(b => ({ ...b })); pintar(); },
    destruir() { ac.abort(); el.replaceChildren(); el.classList.remove('geee-comp'); },
  };
}
