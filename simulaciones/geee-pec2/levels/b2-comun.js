// Utilidades comunes de los niveles del bloque 2 (Panel FV). Los cálculos salen del motor (ctx.motor).
import { h, fmt, parseNum, campoNumero, boton, clamp } from '../ui/svg.js';
export { h, fmt, parseNum, campoNumero, boton, clamp };

const CSS = `
.b2{display:grid;gap:16px;grid-template-columns:minmax(0,1fr);color:var(--ink,#0B2545)}
@media(min-width:900px){.b2--dos{grid-template-columns:minmax(0,3fr) minmax(0,2fr)}}
.b2__col{display:grid;gap:12px;align-content:start;min-width:0}
.b2__caja{background:var(--surface,#fff);border:1px solid var(--line,#DCE3EA);padding:12px;min-width:0}
.b2__t{margin:0 0 8px;font:700 12px/1.2 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-muted,#4F6279)}
.b2__reto{margin:0;font-size:16px;line-height:1.45;font-weight:700}
.b2__regla{margin:0;font-size:15px;line-height:1.4}
.b2__nota{margin:0;font-size:13px;color:var(--ink-muted,#4F6279)}
.b2-dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:14px}
.b2-dl dt{color:var(--ink-muted,#4F6279)}
.b2-dl dd{margin:0;font-weight:700;font-variant-numeric:tabular-nums}
.b2-fila{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:flex-end}
.b2-desl{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--ink-muted,#4F6279);min-width:0;flex:1 1 200px}
.b2-desl[hidden]{display:none}
.b2-desl__fila{display:flex;align-items:center;gap:8px}
.b2-desl input[type=range]{flex:1;min-width:0;min-height:44px;accent-color:var(--navy,#0B2545)}
.b2-desl input[type=text]{width:6em;padding:6px 8px;font:inherit;font-weight:400;border:1px solid var(--ink-muted,#4F6279);border-radius:0;background:#fff;color:var(--ink,#0B2545)}
.b2-opc{display:flex;flex-wrap:wrap;gap:8px;border:0;margin:0;padding:0}
.b2-opc legend{padding:0;margin:0 0 6px;font:700 12px/1.2 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-muted,#4F6279)}
.b2-opc label{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1px solid var(--navy,#0B2545);background:#fff;cursor:pointer;font-size:14px;font-weight:700}
.b2-opc input{margin:0;accent-color:var(--navy,#0B2545);width:18px;height:18px}
.b2-opc label:has(input:checked){background:var(--navy,#0B2545);color:#fff}
.b2-opc label:has(input:focus-visible){outline:3px solid var(--sky,#00A8E8);outline-offset:2px}
.b2-chip{display:inline-block;padding:4px 10px;border:1px solid var(--navy,#0B2545);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.b2-chip[data-ok]{background:var(--navy,#0B2545);color:#fff}
.b2 .geee-comp svg,.b2 svg{max-width:100%}
`;
export function estilosB2() {
  if (document.getElementById('geee-b2-estilos')) return;
  const s = document.createElement('style');
  s.id = 'geee-b2-estilos';
  s.textContent = CSS;
  document.head.append(s);
}

export const redondear = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
export const err = (x, ref) => Math.abs(x - ref) / Math.max(Math.abs(ref), 1e-9);
// Distancia 0..1 a partir de un error relativo. Con k = 2 el objetivo (<= 0,02) se da con un 1 % de error.
export const aDist = (e, k = 2) => clamp(e * k, 0, 1);

// Panel de módulo de la semilla (cada nivel usa su propia etiqueta, así que otra semilla es otro panel).
export function panelDeSemilla(motor, seed, tag) {
  const rng = motor.rng.makeRng(`${seed}:${tag}`);
  const Isc = rng.step(5, 10, 0.5);
  const I1 = redondear(Isc * (0.88 + 0.07 * rng.next()), 1);
  const V1 = rng.step(20, 36, 1);
  const Voc = redondear(V1 * (1.15 + 0.15 * rng.next()), 1);
  return { rng, panel: { Isc, I1: Math.min(I1, redondear(Isc - 0.5, 1)), V1, Voc } };
}

export const curvaIV = (p, id, estilo) => ({ id, estilo, puntos: [[0, p.Isc], [p.V1, p.I1], [p.Voc, 0]] });

export function curvaPV(motor, p, id, estilo, n = 80) {
  const m = motor.panel.modeloPanel(p), pts = [];
  for (let k = 0; k <= n; k++) { const v = (p.Voc * k) / n; pts.push([v, v * m.i(v)]); }
  return { id, estilo, puntos: pts };
}

// Recorta el segmento a [0, xmax] x [0, ymax] (Liang-Barsky); [] si queda fuera.
export function recortar(a, b, xmax, ymax) {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0]], [dx, xmax - a[0]], [-dy, a[1]], [dy, ymax - a[1]]]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return []; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return []; if (r > t0) t0 = r; } else { if (r < t0) return []; if (r < t1) t1 = r; }
  }
  return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}

// Aspa (X) centrada en (x, y) para marcar raíces; el tamaño se da respecto de los ejes.
export function aspa(id, estilo, x, y, xmax, ymax) {
  const dx = xmax * 0.018, dy = ymax * 0.025;
  return { id, estilo, puntos: [[x - dx, y - dy], [x + dx, y + dy], [x, y], [x - dx, y + dy], [x + dx, y - dy]] };
}

export function lectura(filas) {
  const dl = h('dl', { class: 'b2-dl' });
  const poner = (fs) => dl.replaceChildren(...fs.flatMap(([k, v]) => [h('dt', { texto: k }), h('dd', { texto: v })]));
  poner(filas);
  return { el: dl, poner };
}

// Deslizador con campo numérico: dos controles para un mismo valor (el campo es la alternativa accesible).
export function deslizador({ etiqueta, unidad = '', min, max, paso, valor, onCambio }, signal) {
  const rg = h('input', { type: 'range', min, max, step: paso, value: valor, 'aria-label': `${etiqueta} (${unidad})` });
  const num = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': `${etiqueta}, valor numérico` });
  const cab = h('span', { texto: `${etiqueta}${unidad ? ` (${unidad})` : ''}` });
  const el = h('div', { class: 'b2-desl' }, [cab, h('div', { class: 'b2-desl__fila' }, [rg, num])]);
  let v = valor;
  const pintar = () => { rg.value = String(v); if (document.activeElement !== num) num.value = fmt(v, 4); };
  const poner = (x, avisar) => { v = clamp(x, min, max); pintar(); if (avisar) onCambio(v); };
  rg.addEventListener('input', () => poner(Number(rg.value), true), { signal });
  num.addEventListener('change', () => {
    const x = parseNum(num.value);
    if (Number.isNaN(x)) { num.setAttribute('aria-invalid', 'true'); num.value = fmt(v, 4); return; }
    num.removeAttribute('aria-invalid');
    poner(x, true); num.value = fmt(v, 4);
  }, { signal });
  pintar();
  return { el, poner: (x) => poner(x, false), valor: () => v };
}

// Grupo de opciones (radio) accesible.
export function opciones({ nombre, leyenda, items, valor, onCambio }, signal) {
  const fs = h('fieldset', { class: 'b2-opc' }, [h('legend', { texto: leyenda })]);
  const radios = new Map();
  for (const [id, txt] of items) {
    const r = h('input', { type: 'radio', name: nombre, value: id });
    if (id === valor) r.checked = true;
    r.addEventListener('change', () => onCambio(id), { signal });
    radios.set(id, r);
    fs.append(h('label', {}, [r, h('span', { texto: txt })]));
  }
  return { el: fs, poner(id) { const r = radios.get(id); if (r) r.checked = true; } };
}

export function raiz(cont, dos = true) {
  estilosB2();
  const r = h('div', { class: dos ? 'b2 b2--dos' : 'b2' });
  cont.append(r);
  return r;
}
export const caja = (titulo, ...hijos) => h('section', { class: 'b2__caja', 'aria-label': titulo }, [h('p', { class: 'b2__t', texto: titulo }), ...hijos]);
