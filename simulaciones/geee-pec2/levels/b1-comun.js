// Utilidades comunes de los niveles 1.1 a 1.5 (bloque 1, almacenamiento).
// Solo presentación y control: todo cálculo físico sale de engine/.
import { h, fmt, parseNum, clamp } from '../ui/svg.js';

const CSS = `
.b1-nivel{display:grid;gap:16px;min-width:0}
.b1-fila{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px;align-items:start;min-width:0}
.b1-col{display:grid;gap:12px;min-width:0}
.b1-caja{background:var(--surface,#fff);border:1px solid var(--line,#DCE3EA);padding:12px 16px;min-width:0}
.b1-caja--obj{background:var(--navy,#0B2545);color:var(--on-navy,#fff);border-color:var(--navy,#0B2545)}
.b1-tit{margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-muted,#4F6279)}
.b1-caja--obj .b1-tit{color:var(--on-navy,#fff)}
.b1-lect{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 16px;margin:0;font-size:14px}
.b1-lect dt{color:var(--ink-muted,#4F6279)}
.b1-lect dd{margin:0;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
.b1-caja--obj .b1-lect dt{color:var(--on-navy,#fff)}
.b1-dest{background:var(--muted,#F3F6F9);padding:0 6px}
.b1-caja--obj .b1-dest{background:transparent;text-decoration:underline}
.b1-nota{margin:8px 0 0;font-size:13px;color:var(--ink-muted,#4F6279)}
.b1-form{margin:8px 0 0;font-size:14px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.b1-desl{display:grid;grid-template-columns:minmax(0,1fr) 7.5em;gap:4px 12px;align-items:center}
.b1-desl label{grid-column:1/-1;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink,#0B2545)}
.b1-desl input[type=range]{width:100%;min-height:44px;accent-color:var(--navy,#0B2545)}
.b1-desl .b1-num{min-height:44px;padding:6px 8px;font:inherit;border:1px solid var(--ink-muted,#4F6279);border-radius:0;background:var(--surface,#fff);color:var(--ink,#0B2545);width:100%;box-sizing:border-box}
.b1-desl .b1-num[aria-invalid]{border-width:2px;border-color:var(--navy,#0B2545)}
.b1-desl input:focus-visible{outline:3px solid var(--sky,#00A8E8);outline-offset:2px}
.b1-acciones{display:flex;flex-wrap:wrap;gap:8px}
.b1-svg{display:block;width:100%;height:auto;background:var(--surface,#fff);border:1px solid var(--line,#DCE3EA)}
.b1-svg text{font-family:inherit;font-size:11px;fill:var(--ink-muted,#4F6279)}
.b1-svg .b1-t{font-weight:700;fill:var(--ink,#0B2545)}
`;
export function estilos() {
  if (document.getElementById('b1-estilos')) return;
  const s = document.createElement('style');
  s.id = 'b1-estilos'; s.textContent = CSS; document.head.append(s);
}

export const crearRng = (ctx, id) => ctx.motor.rng.makeRng(`${ctx.seed}:b1:${id}`);

/** Distancia normalizada 0..1. 0 solo dentro de la tolerancia relativa tol. */
export function distRel(x, obj, tol = 0.02, esc = 1) {
  if (!Number.isFinite(x) || !(obj > 0)) return 1;
  const r = Math.abs(x - obj) / obj;
  return r <= tol ? 0 : Math.min(1, Math.max(0.03, r / esc));
}

/** Caja de pares etiqueta/valor. filas: [etiqueta, texto, destacada?][] */
export function lecturas(titulo, { objetivo = false, filas = [] } = {}) {
  const dl = h('dl', { class: 'b1-lect' });
  const el = h('div', { class: `b1-caja${objetivo ? ' b1-caja--obj' : ''}` }, [h('p', { class: 'b1-tit', texto: titulo }), dl]);
  const poner = (fs) => dl.replaceChildren(...fs.flatMap(([k, v, d]) => [h('dt', { texto: k }), h('dd', { class: d ? 'b1-dest' : '', texto: v })]));
  poner(filas);
  return { el, poner };
}

/** Deslizador con campo numérico exacto (alternativa accesible siempre visible). */
let _n = 0;
export function deslizador({ etiqueta, min, max, paso, valor, onCambio }, sg) {
  const id = `b1-r${++_n}`;
  const rango = h('input', { type: 'range', id, min, max, step: paso, value: valor });
  const num = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'b1-num', 'aria-label': `${etiqueta}, valor exacto` });
  const el = h('div', { class: 'b1-desl' }, [h('label', { for: id, texto: etiqueta }), rango, num]);
  let actual = valor;
  const poner = (v) => { actual = v; rango.value = String(v); if (document.activeElement !== num) num.value = fmt(v, 4); };
  const aplicar = (v) => { const c = clamp(v, min, max); poner(c); onCambio(c); return c; };
  rango.addEventListener('input', () => aplicar(Number(rango.value)), { signal: sg });
  num.addEventListener('change', () => {
    const v = parseNum(num.value);
    if (Number.isNaN(v)) { num.setAttribute('aria-invalid', 'true'); num.value = fmt(actual, 4); return; }
    num.removeAttribute('aria-invalid');
    num.value = fmt(aplicar(v), 4);
  }, { signal: sg });
  poner(valor);
  return { el, poner };
}

export const boton = (texto, onClick, sg, clase = 'btn btn--ghost') => {
  const b = h('button', { type: 'button', class: clase, texto });
  b.addEventListener('click', onClick, { signal: sg });
  return b;
};

/** Notifica al anfitrión: dist 0 = conseguido. */
export function avisar(ctx, dist) {
  ctx.onObjetivo(dist);
  if (dist === 0) ctx.onCompletar();
}

export { h, fmt, clamp };
