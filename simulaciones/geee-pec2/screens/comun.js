// Utilidades de interfaz compartidas por las pantallas de juego.
import { makeRng } from '../engine/rng.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}

export function svg(tag, attrs, ...hijos) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  for (const c of hijos.flat()) if (c) e.append(c);
  return e;
}

// Red de nodos determinista (la misma en todas las pantallas en negativo). Se pinta al 7 %.
export function redNodos() {
  const rng = makeRng('estacion-solar-red');
  const W = 1200, H = 700, N = 34;
  const pts = [];
  for (let i = 0; i < N; i++) pts.push({ x: Math.round(rng.next() * W), y: Math.round(rng.next() * H) });
  const g = svg('g', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': '1.2' });
  const nodos = svg('g', { fill: '#FFFFFF' });
  pts.forEach((p, i) => {
    const vec = pts.map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) })).filter((o) => o.j > i).sort((a, b) => a.d - b.d).slice(0, 2);
    for (const o of vec) g.append(svg('line', { x1: p.x, y1: p.y, x2: pts[o.j].x, y2: pts[o.j].y }));
    nodos.append(svg('circle', { cx: p.x, cy: p.y, r: 3.5 }));
  });
  const raiz = svg('svg', { class: 'red', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false' });
  const grupo = svg('g', { opacity: '0.07' });
  grupo.append(g, nodos);
  raiz.append(grupo);
  return raiz;
}

// Símbolo de marca recortado: sangra por la esquina inferior derecha.
export function simboloRecortado() {
  return h('img', { class: 'simbolo', src: '/assets/brand/simbolo-negativo.svg', alt: '', 'aria-hidden': 'true', width: 640, height: 640 });
}

const CHISPA = 'M12 0Q12.9 11.1 24 12Q12.9 12.9 12 24Q11.1 12.9 0 12Q11.1 11.1 12 0Z';

// Estrellas del nivel (chispas). n llenas de un máximo de 3; el texto accesible da la cuenta.
export function estrellas(n, max = 3) {
  const cont = h('span', { class: 'estrellas', role: 'img', 'aria-label': `${n} de ${max}` });
  for (let i = 0; i < max; i++) {
    const s = svg('svg', { viewBox: '0 0 24 24', width: 18, height: 18, class: i < n ? 'llena' : 'vacia', 'aria-hidden': 'true' });
    s.append(svg('path', { d: CHISPA }));
    cont.append(s);
  }
  return cont;
}

export function nuevoId() { return Math.random().toString(36).slice(2, 8); }

export function enfocarTitulo(cont) {
  const t = cont.querySelector('h1');
  if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
}

export function rutaCarga(destino) {
  return `#/carga?to=${encodeURIComponent(destino.replace(/^#/, ''))}`;
}
