// Utilidades comunes de los niveles del bloque 3 (Conexión a red).
// Sin cálculo propio: solo controles accesibles, lecturas y estilos. Todo número pasa por fmt.
const CSS = `
.b3{--b3-navy:var(--navy,#0B2545);--b3-sky:var(--sky,#00A8E8);--b3-surf:var(--surface,#FFFFFF);--b3-muted:var(--muted,#F3F6F9);--b3-line:var(--line,#DCE3EA);--b3-ink:var(--ink,#0B2545);--b3-ink2:var(--ink-muted,#4F6279);
  display:flex;flex-direction:column;gap:16px;min-width:0;font-family:Inter,system-ui,sans-serif;color:var(--b3-ink)}
.b3 *{border-radius:0;box-sizing:border-box}
.b3-meta{margin:0;padding:12px 16px;background:var(--b3-navy);color:#fff;font-size:15px;line-height:1.4}
.b3-meta b{font-weight:800}
.b3-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px;align-items:start}
.b3-panel{background:var(--b3-surf);border:1px solid var(--b3-line);padding:14px;min-width:0}
.b3-tit{margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--b3-ink2)}
.b3-sub{margin:10px 0 0;font-size:13px;color:var(--b3-ink2);line-height:1.45}
.b3-ctl{display:grid;grid-template-columns:1fr;gap:6px;padding:8px 0;border-top:1px solid var(--b3-line)}
.b3-ctl:first-of-type{border-top:0}
.b3-ctl__t{font-size:13px;font-weight:700}
.b3-ctl__fila{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.b3-ctl input[type=range]{flex:1 1 140px;min-width:100px;min-height:44px;accent-color:var(--b3-navy);margin:0}
.b3-ctl .geee-campo{flex-direction:row;align-items:center;gap:6px}
.b3-ctl .geee-campo span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.b3-ctl .geee-campo input{width:6em;min-height:44px}
.b3-uni{font-size:13px;color:var(--b3-ink2);min-width:2em}
.b3-chk{display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px;font-weight:700;cursor:pointer}
.b3-chk input{width:22px;height:22px;margin:0;accent-color:var(--b3-navy)}
.b3-radios{display:flex;flex-wrap:wrap;gap:8px;border:0;margin:0;padding:0}
.b3-radios legend{padding:0;margin:0 0 6px;font-size:13px;font-weight:700}
.b3-radio{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 12px;border:1px solid var(--b3-navy);background:var(--b3-surf);font-size:14px;font-weight:700;cursor:pointer}
.b3-radio input{width:18px;height:18px;margin:0;accent-color:var(--b3-navy)}
.b3-radio:has(input:checked){background:var(--b3-navy);color:#fff}
.b3-radio:has(input:focus-visible){outline:3px solid var(--b3-sky);outline-offset:2px}
.b3-fila-armo{display:grid;grid-template-columns:1fr;gap:2px;padding:10px 0;border-top:1px solid var(--b3-line)}
.b3-fila-armo:first-of-type{border-top:0}
.b3-fila-armo[data-activo="false"] .b3-ctl{opacity:.55}
.b3-lect{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:0}
.b3-lect__it{margin:0;padding:8px 10px;background:var(--b3-muted);border:1px solid var(--b3-line);min-width:0}
.b3-lect dt{margin:0;font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--b3-ink2)}
.b3-lect dd{margin:2px 0 0;font-size:20px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.b3-lect__it[data-resalte="true"]{background:var(--b3-navy);border-color:var(--b3-navy)}
.b3-lect__it[data-resalte="true"] dt{color:#fff}
.b3-lect__it[data-resalte="true"] dd{color:#fff}
.b3-medidor{padding:8px 0;border-top:1px solid var(--b3-line)}
.b3-medidor:first-of-type{border-top:0}
.b3-medidor__cab{display:flex;justify-content:space-between;gap:8px;font-size:13px;font-weight:700}
.b3-medidor__val{font-variant-numeric:tabular-nums}
.b3-medidor__pista{height:14px;margin-top:4px;background:var(--b3-muted);border:1px solid var(--b3-navy);position:relative}
.b3-medidor__barra{position:absolute;inset:0 auto 0 0;background:var(--b3-navy)}
.b3-medidor[data-activo="true"] .b3-medidor__barra{background:var(--b3-sky)}
.b3-tabla{width:100%;border-collapse:collapse;font-size:13px}
.b3-tabla th,.b3-tabla td{padding:6px 6px;text-align:right;border-bottom:1px solid var(--b3-line);font-variant-numeric:tabular-nums}
.b3-tabla th{font-size:12px;letter-spacing:.02em;color:var(--b3-ink2)}
.b3-tabla th:first-child,.b3-tabla td:first-child{text-align:left}
.b3-tabla td.b3-nota{text-align:left;font-size:12px;color:var(--b3-ink2)}
.b3-tabla tr[data-aporta="true"] td{font-weight:700;color:var(--b3-ink)}
.b3-btn{min-height:44px;padding:0 14px;font:inherit;font-size:13px;font-weight:700;border:1px solid var(--b3-navy);background:var(--b3-surf);color:var(--b3-navy);cursor:pointer}
.b3-btn:hover{background:var(--b3-navy);color:#fff}
.b3-btn:focus-visible{outline:3px solid var(--b3-sky);outline-offset:2px}
.b3 .geee-comp{min-width:0}
.b3 .geee-btn{min-width:44px;min-height:44px}
.b3-ctl input[type=range]{min-height:44px}
@media (max-width:480px){.b3-panel{padding:10px}.b3-lect dd{font-size:18px}.b3-ctl input[type=range]{flex-basis:100%}}
`;

function estilos() {
  if (document.getElementById('b3-estilos')) return;
  const s = document.createElement('style');
  s.id = 'b3-estilos';
  s.textContent = CSS;
  document.head.append(s);
}

const redondear = (v) => Math.round(v * 1e6) / 1e6;
let seq = 0;

// Devuelve las herramientas ya ligadas al contexto del nivel.
export function kit(ctx) {
  estilos();
  const { h, campoNumero, boton, clamp } = ctx.ui.svg;
  const { fmt } = ctx.motor.num;
  const ac = new AbortController();
  const sg = ac.signal;

  const panel = (titulo, ...hijos) => h('section', { class: 'b3-panel' }, [titulo ? h('h3', { class: 'b3-tit', texto: titulo }) : null, ...hijos]);

  // Franja con el objetivo concreto de la semilla.
  const meta = (html) => {
    const p = h('p', { class: 'b3-meta', role: 'note' });
    const poner = (partes) => {
      p.replaceChildren();
      partes.forEach((t, i) => p.append(i % 2 ? h('b', { texto: t }) : document.createTextNode(t)));
    };
    poner(html);
    return { el: p, poner };
  };

  // Deslizador + campo numérico + botones ± (siempre visibles). Devuelve { el, poner(v), valor() }.
  function control({ etiqueta, unidad = '', min, max, paso, valor, onCambio }) {
    const id = `b3-r-${++seq}`;
    let v = clamp(valor, min, max);
    const rango = h('input', { type: 'range', id, min, max, step: paso, value: v, 'aria-label': `${etiqueta}, deslizador` });
    const campo = campoNumero({ etiqueta: `${etiqueta}${unidad ? ` (${unidad})` : ''}`, valor: () => v, paso, min, max, onCambio: (x) => poner(x, true) }, sg);
    const menos = boton('−', `Disminuir ${etiqueta}`, () => poner(v - paso, true), sg);
    const mas = boton('+', `Aumentar ${etiqueta}`, () => poner(v + paso, true), sg);
    function poner(x, aviso = false) {
      v = redondear(clamp(x, min, max));
      rango.value = String(v);
      campo.poner(v);
      campo.input.value = fmt(v, 4);
      if (aviso) onCambio?.(v);
    }
    rango.addEventListener('input', () => poner(Number(rango.value), true), { signal: sg });
    campo.input.value = fmt(v, 4);
    const el = h('div', { class: 'b3-ctl' }, [
      h('span', { class: 'b3-ctl__t', texto: etiqueta }),
      h('div', { class: 'b3-ctl__fila' }, [menos, rango, campo.el, unidad ? h('span', { class: 'b3-uni', texto: unidad }) : null, mas]),
    ]);
    return { el, poner: (x) => poner(x, false), valor: () => v, input: campo.input, rango };
  }

  function casilla({ etiqueta, marcado, onCambio, nombre }) {
    const input = h('input', { type: 'checkbox', 'data-n': nombre ?? '' });
    input.checked = !!marcado;
    input.addEventListener('change', () => onCambio?.(input.checked), { signal: sg });
    return { el: h('label', { class: 'b3-chk' }, [input, h('span', { texto: etiqueta })]), input, poner: (b) => { input.checked = !!b; } };
  }

  function radios({ leyenda, opciones, valor, onCambio, nombre }) {
    const grupo = `b3-g-${++seq}`;
    const inputs = opciones.map((o) => {
      const input = h('input', { type: 'radio', name: grupo, value: o.valor, 'data-valor': o.valor });
      input.checked = o.valor === valor;
      input.addEventListener('change', () => { if (input.checked) onCambio?.(o.valor); }, { signal: sg });
      return { o, input };
    });
    const el = h('fieldset', { class: 'b3-radios', 'data-nombre': nombre ?? '' }, [
      h('legend', { texto: leyenda }),
      ...inputs.map(({ o, input }) => h('label', { class: 'b3-radio' }, [input, h('span', { texto: o.etiqueta })])),
    ]);
    return { el, poner: (val) => inputs.forEach(({ o, input }) => { input.checked = o.valor === val; }) };
  }

  // Rejilla de lecturas. items: [{ clave, etiqueta, resalte }]. poner(clave, texto, crudo).
  function lecturas(items, etiqueta = 'Lecturas') {
    const dds = {};
    const el = h('dl', { class: 'b3-lect', 'aria-label': etiqueta });
    for (const it of items) {
      const dd = h('dd', { 'data-clave': it.clave });
      dds[it.clave] = dd;
      el.append(h('div', { class: 'b3-lect__it', 'data-resalte': it.resalte ? 'true' : 'false' }, [h('dt', { texto: it.etiqueta }), dd]));
    }
    return { el, poner(clave, texto, crudo) { const d = dds[clave]; if (!d) return; d.textContent = texto; if (crudo !== undefined) d.dataset.valor = String(crudo); } };
  }

  // Medidor de barra (0..1 sobre el rango dado).
  function medidor({ etiqueta, min = 0, max = 1, activo = false }) {
    const val = h('span', { class: 'b3-medidor__val' });
    const barra = h('div', { class: 'b3-medidor__barra' });
    const pista = h('div', { class: 'b3-medidor__pista', role: 'meter', 'aria-label': etiqueta, 'aria-valuemin': min, 'aria-valuemax': max }, [barra]);
    const el = h('div', { class: 'b3-medidor', 'data-activo': activo ? 'true' : 'false' }, [h('div', { class: 'b3-medidor__cab' }, [h('span', { texto: etiqueta }), val]), pista]);
    return {
      el,
      poner(x, texto) {
        const f = Number.isFinite(x) ? clamp((x - min) / (max - min), 0, 1) : 0;
        barra.style.width = `${(f * 100).toFixed(1)}%`;
        pista.setAttribute('aria-valuenow', Number.isFinite(x) ? x : 0);
        pista.setAttribute('aria-valuetext', texto);
        val.textContent = texto;
        val.dataset.valor = String(x);
      },
    };
  }

  const pct = (x) => `${fmt(x * 100)} %`;
  const boton44 = (texto, onClick) => { const b = h('button', { type: 'button', class: 'b3-btn', texto }); b.addEventListener('click', onClick, { signal: sg }); return b; };
  const raiz = (...hijos) => h('div', { class: 'b3' }, hijos);

  return { h, fmt, pct, panel, meta, control, casilla, radios, lecturas, medidor, boton44, raiz, clamp, destruir() { ac.abort(); } };
}
