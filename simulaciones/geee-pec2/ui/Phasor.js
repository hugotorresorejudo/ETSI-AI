import { h, montarBase, fmt, arrastrar, campoNumero, uid } from './svg.js';

const S = 360, R = 115, c0 = S / 2;

export function Phasor(el, cfg) {
  const ac = new AbortController(), sg = ac.signal;
  let fasores = cfg.fasores.map(f => ({ ...f }));
  const svg = montarBase(el, S, S, 'Diagrama fasorial');
  const idm = uid('geee-flecha-');
  const defs = h('svg:defs');
  for (const [k, col] of [['activa', 'var(--sky,#00A8E8)'], ['base', 'var(--navy,#0B2545)'], ['ref', 'var(--ink-muted,#4F6279)']])
    defs.append(h('svg:marker', { id: `${idm}${k}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, [h('svg:path', { d: 'M0 0 L10 5 L0 10 z', fill: col })]));
  svg.append(defs);
  for (const r of [R / 2, R]) svg.append(h('svg:circle', { cx: c0, cy: c0, r, fill: 'none', class: 'geee-rej' }));
  svg.append(h('svg:line', { class: 'geee-eje', x1: 10, x2: S - 10, y1: c0, y2: c0 }), h('svg:line', { class: 'geee-eje', x1: c0, x2: c0, y1: 10, y2: S - 10 }),
    h('svg:text', { x: S - 12, y: c0 - 6, 'text-anchor': 'end', texto: 'Re' }), h('svg:text', { x: c0 + 6, y: 20, texto: 'Im' }));
  const capa = h('svg:g'); svg.append(capa);
  const campos = h('div', { class: 'geee-campos' }); el.append(campos);
  const nodos = new Map();
  const maxMag = () => Math.max(1e-9, ...fasores.map(f => Math.abs(f.mag)));
  const punta = f => { const k = R / maxMag(), a = f.deg * Math.PI / 180; return [c0 + f.mag * k * Math.cos(a), c0 - f.mag * k * Math.sin(a)]; };
  const norm = d => ((d + 180) % 360 + 360) % 360 - 180;

  function crear(f) {
    const estilo = f.estilo || 'base';
    const linea = h('svg:line', { class: `geee-${estilo}`, x1: c0, y1: c0, 'marker-end': `url(#${idm}${estilo})` });
    const etq = h('svg:text', { class: 'geee-lbl', 'pointer-events': 'none', texto: f.id });
    const g = h('svg:g', {}, [linea, etq]);
    const n = { g, linea, etq, campo: null };
    if (f.arrastrable) {
      const hit = h('svg:circle', { class: 'geee-hit', r: 22 });
      const pt = h('svg:circle', { class: 'geee-pt', r: 9, tabindex: 0, role: 'slider', 'aria-label': `Ángulo del fasor ${f.id}`, 'aria-valuemin': -180, 'aria-valuemax': 180 });
      g.append(hit, pt); Object.assign(n, { hit, pt });
      const ang = (px, py) => {
        const a = nodos.get(f.id).f; a.deg = norm(Math.round(Math.atan2(c0 - py, px - c0) * 180 / Math.PI));
        pintar(); cfg.onArrastre?.(f.id, a.deg);
      };
      for (const q of [hit, pt]) arrastrar(q, svg, { mover: ang }, sg);
      pt.addEventListener('keydown', e => { const d = { ArrowLeft: 1, ArrowUp: 1, ArrowRight: -1, ArrowDown: -1 }[e.key]; if (!d) return; e.preventDefault(); const a = nodos.get(f.id).f; a.deg = norm(a.deg + d * (e.shiftKey ? 10 : 1)); pintar(); cfg.onArrastre?.(f.id, a.deg); }, { signal: sg });
      n.campo = campoNumero({ etiqueta: `Ángulo de ${f.id} (grados)`, valor: () => (nodos.get(f.id)?.f ?? f).deg, paso: 1, min: -180, max: 180, onCambio: v => { const a = nodos.get(f.id).f; a.deg = norm(v); pintar(); cfg.onArrastre?.(f.id, a.deg); } }, sg);
      campos.append(n.campo.el);
    }
    capa.append(g); nodos.set(f.id, n); return n;
  }
  function pintar() {
    const ids = new Set(fasores.map(f => f.id));
    for (const [id, n] of nodos) if (!ids.has(id)) { n.g.remove(); n.campo?.el.remove(); nodos.delete(id); }
    for (const f of fasores) {
      const n = nodos.get(f.id) || crear(f); n.f = f;
      const [x, y] = punta(f);
      n.linea.setAttribute('x2', x); n.linea.setAttribute('y2', y);
      n.etq.setAttribute('x', x + (x >= c0 ? 8 : -8)); n.etq.setAttribute('y', y + (y >= c0 ? 16 : -8)); n.etq.setAttribute('text-anchor', x >= c0 ? 'start' : 'end');
      n.etq.textContent = `${f.id} ${fmt(f.mag)} ∠ ${fmt(f.deg, 3)}°`;
      if (n.pt) { for (const q of [n.pt, n.hit]) { q.setAttribute('cx', x); q.setAttribute('cy', y); } n.pt.setAttribute('aria-valuenow', f.deg); n.pt.setAttribute('aria-valuetext', `${fmt(f.deg)} grados`); }
      n.campo?.poner(f.deg);
    }
  }
  pintar();
  return {
    actualizar(d = {}) { if (d.fasores) fasores = d.fasores.map(f => ({ ...f })); pintar(); },
    destruir() { ac.abort(); el.replaceChildren(); el.classList.remove('geee-comp'); },
  };
}
