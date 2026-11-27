import { h, montarBase, clamp, arrastrar, boton } from './svg.js';

export function CellGrid(el, cfg) {
  const ac = new AbortController(), sg = ac.signal;
  let { nsMax, npMax, ns, np } = cfg;
  const C = 36, G = 4, P = 28;
  let W, H, svg, celdas = [], lectura;

  function construir() {
    W = P + npMax * (C + G) + 8; H = P + nsMax * (C + G) + 8;
    svg = montarBase(el, W, H, 'Rejilla de celdas en serie y paralelo');
    svg.style.maxWidth = `${Math.max(240, W * 1.4)}px`;
    celdas = [];
    svg.append(h('svg:text', { class: 'geee-lbl', x: P + (npMax * (C + G)) / 2, y: 14, 'text-anchor': 'middle', texto: 'np (paralelo)' }));
    svg.append(h('svg:text', { class: 'geee-lbl', transform: `translate(12 ${P + (nsMax * (C + G)) / 2}) rotate(-90)`, 'text-anchor': 'middle', texto: 'ns (serie)' }));
    for (let i = 0; i < nsMax; i++) for (let j = 0; j < npMax; j++) {
      const r = h('svg:rect', { class: 'geee-celda', x: P + j * (C + G), y: P + i * (C + G), width: C, height: C, 'stroke-width': 1.5 });
      svg.append(r); celdas.push({ i, j, r });
    }
    // Rejilla actúa como una sola superficie de arrastre.
    const sup = h('svg:rect', { x: P, y: P, width: npMax * (C + G), height: nsMax * (C + G), fill: 'transparent', style: 'cursor:pointer', 'data-superficie': '' });
    svg.append(sup);
    const desde = (px, py) => {
      const j = clamp(Math.floor((px - P) / (C + G)), 0, npMax - 1), i = clamp(Math.floor((py - P) / (C + G)), 0, nsMax - 1);
      poner(i + 1, j + 1, true);
    };
    arrastrar(sup, svg, { inicio: null, mover: desde }, sg);
    sup.addEventListener('pointerdown', e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); desde(q.x, q.y); }, { signal: sg });

    const ctl = h('div', { class: 'geee-campos' });
    for (const [eje, nombre] of [['ns', 'Serie (ns)'], ['np', 'Paralelo (np)']]) {
      const out = h('output', { 'aria-live': 'polite', 'data-valor': eje });
      const menos = boton('−', `Quitar una celda en ${nombre.toLowerCase()}`, () => eje === 'ns' ? poner(ns - 1, np, true) : poner(ns, np - 1, true), sg);
      const mas = boton('+', `Añadir una celda en ${nombre.toLowerCase()}`, () => eje === 'ns' ? poner(ns + 1, np, true) : poner(ns, np + 1, true), sg);
      ctl.append(h('div', { class: 'geee-ctrl', role: 'group', 'aria-label': nombre }, [h('span', { texto: nombre }), menos, out, mas]));
    }
    lectura = h('p', { class: 'geee-lectura' });
    el.append(ctl, lectura);
    ctl.append(); el._out = { ns: ctl.querySelector('[data-valor=ns]'), np: ctl.querySelector('[data-valor=np]') };
  }
  function pintar() {
    for (const c of celdas) {
      const on = c.i < ns && c.j < np;
      c.r.setAttribute('fill', on ? 'var(--navy,#0B2545)' : 'var(--muted,#F3F6F9)');
      c.r.setAttribute('stroke', on ? 'var(--navy,#0B2545)' : 'var(--line,#DCE3EA)');
      if (on && c.i === ns - 1 && c.j === np - 1) c.r.setAttribute('stroke', 'var(--sky,#00A8E8)');
    }
    el._out.ns.textContent = ns; el._out.np.textContent = np;
    lectura.textContent = `${ns} en serie x ${np} en paralelo = ${ns * np} celdas`;
  }
  function poner(a, b, avisar) {
    const na = clamp(Math.round(a), 1, nsMax), nb = clamp(Math.round(b), 1, npMax);
    if (na === ns && nb === np) return;
    ns = na; np = nb; pintar();
    if (avisar) cfg.onCambio?.(ns, np);
  }
  construir(); pintar();
  return {
    actualizar(d = {}) {
      const dim = (d.nsMax && d.nsMax !== nsMax) || (d.npMax && d.npMax !== npMax);
      if (d.nsMax) nsMax = d.nsMax; if (d.npMax) npMax = d.npMax;
      if (d.ns != null) ns = clamp(d.ns, 1, nsMax); if (d.np != null) np = clamp(d.np, 1, npMax);
      if (dim) { el.replaceChildren(); construir(); }
      pintar();
    },
    destruir() { ac.abort(); el.replaceChildren(); el.classList.remove('geee-comp'); },
  };
}
