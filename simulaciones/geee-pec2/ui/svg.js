// Utilidades comunes de los componentes SVG (sin dependencias).
export const NS = 'http://www.w3.org/2000/svg';

const nf = new Map();
/** Formato es-ES (coma decimal), `cifras` cifras significativas, sin agrupar. */
export function fmt(x, cifras = 3) {
  if (!Number.isFinite(x)) return '–';
  if (!nf.has(cifras)) nf.set(cifras, new Intl.NumberFormat('es-ES', { maximumSignificantDigits: cifras, useGrouping: false }));
  return nf.get(cifras).format(Math.abs(x) < 1e-12 ? 0 : x);
}

/** Lee un número con coma o punto decimal; NaN si no es válido. */
export function leerNum(s) {
  const t = String(s).trim().replace(/\s+/g, '').replace(',', '.');
  if (t === '') return NaN;
  return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t) ? Number(t) : NaN;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Crea un elemento HTML o SVG (si el nombre empieza por "svg:"). */
export function h(tag, attrs = {}, hijos = []) {
  const svg = tag.startsWith('svg:');
  const el = svg ? document.createElementNS(NS, tag.slice(4)) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'texto') el.textContent = v; else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(hijos)) if (c) el.append(c);
  return el;
}

/** Escala lineal dominio -> rango. */
export const escala = (d0, d1, r0, r1) => v => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

/** Marcas "bonitas" entre min y max. */
export function marcas(min, max, n = 5) {
  const span = max - min || 1, raw = span / n, mag = 10 ** Math.floor(Math.log10(raw));
  const paso = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(min / paso - 1e-9) * paso; v <= max + paso * 1e-6; v += paso) out.push(+v.toFixed(10));
  return out;
}

/** Coordenadas del puntero en el sistema del viewBox del <svg>. */
export function aSvg(svg, ev) {
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX; pt.y = ev.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: p.x, y: p.y };
}

/** Arrastre con pointer events (ratón y táctil). */
export function arrastrar(nodo, svg, { mover, inicio, fin }, signal) {
  nodo.style.touchAction = 'none';
  nodo.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault();
    nodo.setPointerCapture(e.pointerId);
    nodo.classList.add('geee-arrastrando');
    inicio?.();
    const m = ev => { const p = aSvg(svg, ev); mover(p.x, p.y, ev); };
    const u = ev => {
      nodo.classList.remove('geee-arrastrando');
      nodo.removeEventListener('pointermove', m);
      nodo.removeEventListener('pointerup', u);
      nodo.removeEventListener('pointercancel', u);
      fin?.(ev);
    };
    nodo.addEventListener('pointermove', m);
    nodo.addEventListener('pointerup', u);
    nodo.addEventListener('pointercancel', u);
  }, { signal });
}

/** Campo numérico accesible (alternativa al arrastre). Devuelve { el, poner(v), input }. */
export function campoNumero({ etiqueta, valor, paso = 1, min = -Infinity, max = Infinity, onCambio }, signal) {
  const input = h('input', { type: 'text', inputmode: 'decimal', 'aria-label': etiqueta, autocomplete: 'off' });
  const poner = v => { if (document.activeElement !== input) input.value = fmt(v, 4); };
  const aplicar = v => { if (Number.isFinite(v)) onCambio(clamp(v, min, max)); };
  input.addEventListener('change', () => {
    const v = leerNum(input.value);
    if (Number.isNaN(v)) { input.value = fmt(valor(), 4); input.setAttribute('aria-invalid', 'true'); return; }
    input.removeAttribute('aria-invalid');
    aplicar(v);
    input.value = fmt(clamp(v, min, max), 4);
  }, { signal });
  input.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const v = (Number.isNaN(leerNum(input.value)) ? valor() : leerNum(input.value)) + (e.key === 'ArrowUp' ? paso : -paso);
    aplicar(v); input.value = fmt(clamp(v, min, max), 4);
  }, { signal });
  const el = h('label', { class: 'geee-campo' }, [h('span', { texto: etiqueta }), input]);
  poner(valor());
  return { el, poner, input };
}

/** Botón +/- accesible. */
export function boton(texto, etiqueta, onClick, signal) {
  const b = h('button', { type: 'button', class: 'geee-btn', 'aria-label': etiqueta, texto });
  b.addEventListener('click', onClick, { signal });
  return b;
}

let _id = 0;
export const uid = p => `${p}${++_id}`;

const CSS = `
.geee-comp{--_navy:var(--navy,#0B2545);--_sky:var(--sky,#00A8E8);--_surf:var(--surface,#FFFFFF);--_muted:var(--muted,#F3F6F9);--_line:var(--line,#DCE3EA);--_ink:var(--ink,#0B2545);--_ink2:var(--ink-muted,#4F6279);
  font-family:Inter,system-ui,sans-serif;color:var(--_ink);max-width:100%}
.geee-comp svg{display:block;width:100%;height:auto;background:var(--_surf);border:1px solid var(--_line)}
.geee-comp text{font-family:inherit;font-size:11px;fill:var(--_ink2)}
.geee-comp .geee-eje{stroke:var(--_ink2);stroke-width:1;fill:none}
.geee-comp .geee-rej{stroke:var(--_line);stroke-width:1}
.geee-comp .geee-lbl{font-weight:700;fill:var(--_ink)}
.geee-comp .geee-activa{stroke:var(--_sky);stroke-width:3.5;fill:none}
.geee-comp .geee-base{stroke:var(--_navy);stroke-width:2;fill:none}
.geee-comp .geee-ref{stroke:var(--_ink2);stroke-width:1.5;fill:none;stroke-dasharray:6 4}
.geee-comp .geee-pt{fill:var(--_navy);stroke:var(--_surf);stroke-width:2;cursor:grab}
.geee-comp .geee-pt:hover,.geee-comp .geee-arrastrando{fill:var(--_sky)}
.geee-comp .geee-pt:focus-visible,.geee-comp .geee-foco:focus-visible{outline:3px solid var(--_sky);outline-offset:2px}
.geee-comp .geee-hit{fill:transparent;cursor:grab}
.geee-comp .geee-campos{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:8px}
.geee-comp .geee-campo{display:flex;flex-direction:column;gap:2px;font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--_ink2)}
.geee-comp .geee-campo input{width:6.5em;padding:6px 8px;font:inherit;font-weight:400;letter-spacing:0;border:1px solid var(--_ink2);border-radius:0;background:var(--_surf);color:var(--_ink)}
.geee-comp .geee-campo input[aria-invalid]{border-color:var(--_navy);border-width:2px}
.geee-comp .geee-btn{min-width:44px;min-height:44px;padding:0 12px;font:inherit;font-weight:700;border:1px solid var(--_navy);border-radius:0;background:var(--_surf);color:var(--_navy);cursor:pointer}
.geee-comp .geee-btn:hover{background:var(--_navy);color:#fff}
.geee-comp .geee-btn:focus-visible,.geee-comp input:focus-visible{outline:3px solid var(--_sky);outline-offset:2px}
.geee-comp .geee-ctrl{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;font-weight:700}
.geee-comp .geee-ctrl output{min-width:2.5em;text-align:center;font-weight:400}
.geee-comp .geee-lectura{margin:8px 0 0;font-size:14px;color:var(--_ink)}
`;
export function estilos() {
  if (document.getElementById('geee-svg-estilos')) return;
  const s = document.createElement('style');
  s.id = 'geee-svg-estilos';
  s.textContent = CSS;
  document.head.append(s);
}

/** Prepara el contenedor: clase, estilos y <svg> con viewBox. */
export function montarBase(el, W, H, titulo) {
  estilos();
  el.classList.add('geee-comp');
  el.replaceChildren();
  const svg = h('svg:svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': titulo, preserveAspectRatio: 'xMidYMid meet' });
  el.append(svg);
  return svg;
}
