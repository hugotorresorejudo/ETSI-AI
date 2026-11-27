import { h, montarBase, clamp, estilos } from './svg.js';

const W = 480, H = 44;

export function estado(dist01) {
  if (dist01 <= 0.02) return 'Conseguido';
  if (dist01 <= 0.35) return 'Cerca';
  return 'Lejos';
}

export function ProximityMeter(el, cfg) {
  const svg = montarBase(el, W, H, 'Medidor de proximidad al objetivo');
  svg.setAttribute('role', 'meter'); svg.removeAttribute('aria-label');
  svg.setAttribute('aria-label', 'Proximidad al objetivo'); svg.setAttribute('aria-valuemin', 0); svg.setAttribute('aria-valuemax', 100);
  const fondo = h('svg:rect', { x: 1, y: 8, width: W - 2, height: 28, fill: 'var(--muted,#F3F6F9)', stroke: 'var(--navy,#0B2545)', 'stroke-width': 1.5 });
  const barra = h('svg:rect', { x: 1, y: 8, height: 28, fill: 'var(--navy,#0B2545)' });
  const punta = h('svg:rect', { y: 8, width: 5, height: 28, fill: 'var(--sky,#00A8E8)' });
  svg.append(fondo, barra, punta);
  for (const f of [0.35, 0.02]) { const x = 1 + (W - 2) * (1 - f); svg.append(h('svg:line', { class: 'geee-ref', x1: x, x2: x, y1: 4, y2: 40 })); }
  const texto = h('p', { class: 'geee-lectura', role: 'status', 'aria-live': 'polite', style: 'font-weight:700' });
  el.append(texto);
  function pintar(d) {
    const prox = 1 - clamp(Number.isFinite(d) ? d : 1, 0, 1), w = (W - 2) * prox;
    barra.setAttribute('width', w); punta.setAttribute('x', Math.max(1, w - 4));
    svg.setAttribute('aria-valuenow', Math.round(prox * 100));
    const e = estado(d); svg.setAttribute('aria-valuetext', e);
    texto.textContent = e; texto.dataset.estado = e;
  }
  pintar(cfg.dist01);
  return { actualizar(d = {}) { if (d.dist01 != null) pintar(d.dist01); }, destruir() { el.replaceChildren(); el.classList.remove('geee-comp'); } };
}
