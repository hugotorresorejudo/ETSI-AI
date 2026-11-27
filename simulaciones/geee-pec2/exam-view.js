// Vista de ejercicio paso a paso (ruta #/ejercicio/<b1|b2|b3>) y bloque reutilizable por level-host (niveles 1.6, 2.6 y 3.5)
// y por el simulacro (S11). La lógica pura (recoger respuestas, estrellas, resumen) se exporta para probarla en Node.
import { h } from './screens/comun.js';
import { estrellas as pintarEstrellas } from './screens/comun.js';
import { GENERADORES, corregir, VARIANTES as VARIANTES_MOTOR } from './engine/ejercicios.js';
import { nuevaSemilla } from './engine/rng.js';
import { parseNum, close, fmt } from './engine/num.js';
import { rellenar, cargarEjercicios, BLOQUES, VARIANTES } from './content.js';
import { guardarResultado } from './state.js';

export const TEXTOS_EJERCICIO = {
  etiqueta: 'Ejercicio tipo examen',
  enunciado: 'Enunciado',
  semilla: 'Semilla',
  copiar: 'Copiar',
  copiada: 'Copiada',
  comprobar: 'Comprobar',
  terminar: 'Terminar y ver resultados',
  pista: 'Pista',
  pistaAviso: 'Cada pista resta una estrella.',
  correcto: 'Correcto',
  revisa: 'Revisa',
  sinResponder: 'Sin responder',
  arrastre: 'Correcto con arrastre: es coherente con tu resultado anterior, que no era el esperado.',
  fallo: 'El valor no coincide con el esperado. Revisa este paso.',
  resolucion: 'Resolución completa',
  resolucionAviso: 'Abrirla limita el ejercicio a una estrella.',
  esperado: 'Valor esperado',
  nota: 'Nota',
  modoCorriente: 'Corriente',
  modoTension: 'Tensión',
  elige: 'Elige',
  modoSimulacro: 'Modo simulacro: las respuestas se corrigen al entregar.',
  fasorMod: 'Módulo',
  fasorAng: 'Ángulo',
  paso: 'Paso',
  volver: 'Volver al menú',
  noNumero: 'Introduce un número',
};

export const textosEjercicio = (ui) => ({ ...TEXTOS_EJERCICIO, noNumero: ui?.errores?.noNumero || TEXTOS_EJERCICIO.noNumero, ...(ui?.ejercicio || {}) });

// ---------- Lógica pura ----------

// crudo: { [pasoId]: string | { mag: string, deg: string } }. Devuelve solo los valores ya parseados.
// Un texto vacío no cuenta; uno no numérico se anota en `invalidos` (no se corrige, no es un fallo).
export function recogerRespuestas(ej, crudo = {}) {
  const respuestas = {};
  const invalidos = [];
  for (const p of ej.pasos) {
    const c = crudo[p.id];
    if (c === undefined || c === null) continue;
    if (p.tipo === 'fasor') {
      const m = String(c.mag ?? '').trim(), d = String(c.deg ?? '').trim();
      if (!m && !d) continue;
      const mag = parseNum(m), deg = parseNum(d);
      if (Number.isNaN(mag) && m || Number.isNaN(deg) && d) { invalidos.push(p.id); continue; }
      if (m && d) respuestas[p.id] = { mag, deg };
      continue;
    }
    const t = String(c).trim();
    if (!t) continue;
    const v = parseNum(t);
    if (Number.isNaN(v)) invalidos.push(p.id); else respuestas[p.id] = v;
  }
  return { respuestas, invalidos };
}

// 3 sin pistas, 2 con una, 1 con más pistas o si se abre la resolución.
export function estrellasPorPistas(pistas, resolucion) {
  if (resolucion) return 1;
  if (pistas <= 0) return 3;
  if (pistas === 1) return 2;
  return 1;
}

// En un ejercicio, además, la nota limita las estrellas: 3 solo con nota completa.
export function estrellasEjercicio({ nota, puntos, pistas, resolucion }) {
  const razon = puntos > 0 ? nota / puntos : 0;
  const tope = razon >= 0.999 ? 3 : razon >= 0.6 ? 2 : razon > 0 ? 1 : 0;
  return Math.min(estrellasPorPistas(pistas, resolucion), tope);
}

export function resumenResultado(correccion) {
  const pasos = {};
  const errores = [];
  for (const [id, r] of Object.entries(correccion.pasos)) {
    pasos[id] = r.estado;
    if (r.errorId && !errores.includes(r.errorId)) errores.push(r.errorId);
  }
  return { pasos, errores };
}

// Pregunta de comprobación de un nivel. respuesta: índice (opción) o texto (num). refs: valores que expone el nivel.
export function evaluarPregunta(q, respuesta, refs = {}) {
  if (q.tipo === 'opcion') {
    if (respuesta === null || respuesta === undefined || respuesta === '') return 'vacio';
    return Number(respuesta) === q.correcta ? 'ok' : 'fallo';
  }
  const t = String(respuesta ?? '').trim();
  const ref = refs[q.ref];
  if (!t) return 'vacio';
  const v = parseNum(t);
  if (Number.isNaN(v)) return 'invalido';
  if (typeof ref !== 'number' || !Number.isFinite(ref)) return 'sin_ref';
  return close(v, ref) ? 'ok' : 'fallo';
}

// ---------- Utilidades de interfaz ----------

export function renderTex(el, tex, displayMode = false) {
  try {
    if (globalThis.katex) { globalThis.katex.render(tex, el, { throwOnError: false, displayMode }); return; }
  } catch { /* se muestra el texto plano */ }
  el.textContent = tex;
}

export function copiarTexto(texto) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(texto).then(() => true, () => false);
  const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0' });
  ta.value = texto; document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* sin portapapeles */ }
  ta.remove();
  return Promise.resolve(ok);
}

// Chip de estado: icono de forma (círculo con ✓ o ✕) y texto, nunca solo color.
export function chipEstado(clase, icono, texto) {
  return h('span', { class: `chip chip--${clase}` }, h('span', { class: 'chip__icono', 'aria-hidden': 'true' }, icono), h('span', { class: 'chip__txt' }, texto));
}

const valorTexto = (v, unidad) => (v && typeof v === 'object' ? `${fmt(v.mag)} ∠ ${fmt(v.deg)}°` : `${fmt(v)}${unidad ? ' ' + unidad : ''}`);

// ---------- Ejercicio ----------
// opts: { modo: 'practica' | 'simulacro', textos (JSON de ejercicios del bloque), ui, valoresIniciales,
//         onRespuestas(parseadas, crudas), onTerminar(info) }
export function montarEjercicio(bloque, variante, seed, opts = {}) {
  const modo = opts.modo === 'simulacro' ? 'simulacro' : 'practica';
  const T = textosEjercicio(opts.ui);
  const ej = GENERADORES[bloque](seed, variante ? { variante } : undefined);
  let textos = opts.textos || null;
  const crudo = {};
  for (const p of ej.pasos) crudo[p.id] = p.tipo === 'fasor' ? { mag: '', deg: '' } : '';
  for (const [k, v] of Object.entries(opts.valoresIniciales || {})) if (k in crudo) crudo[k] = v;
  const pistasVistas = {};
  let resolucionAbierta = false;
  let corregido = null;
  let vivo = true;
  let refs = {}; // { id: { fila, estado, msg, pistas, btn, campos[] } }

  const el = h('div', { class: `ejer ejer--${modo}` });
  const paramsTxt = () => ({ param: ej.params });
  const valoresPasos = () => Object.fromEntries(ej.pasos.map((p) => [p.id, p.valor]));
  const etiquetaDe = (id) => textos?.pasos?.[id]?.etiqueta || id;
  const totalPistas = () => Object.values(pistasVistas).reduce((a, b) => a + b, 0);

  function notificar() {
    if (modo === 'simulacro' && opts.onRespuestas) opts.onRespuestas(recoger(), recogerCrudo());
  }

  function recoger() { return recogerRespuestas(ej, crudo).respuestas; }
  function recogerCrudo() { return JSON.parse(JSON.stringify(crudo)); }

  function limpiarPaso(id) {
    const r = refs[id]; if (!r) return;
    r.fila.dataset.estado = '';
    r.estado.replaceChildren(); r.msg.textContent = '';
    for (const c of r.campos) c.removeAttribute('aria-invalid');
  }

  function crearCampos(p) {
    const id = `paso-${seed}-${p.id}`.replace(/[^A-Za-z0-9_-]/g, '_');
    const unidad = p.unidad ? h('span', { class: 'unidad' }, p.unidad) : null;
    const campos = [];
    const entrada = (clave, etiquetaAria, idc) => {
      const i = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', id: idc, 'aria-label': etiquetaAria, 'aria-describedby': `${id}-msg`, class: 'campo-num' });
      i.value = clave ? crudo[p.id][clave] : crudo[p.id];
      i.addEventListener('input', () => {
        if (clave) crudo[p.id][clave] = i.value; else crudo[p.id] = i.value;
        limpiarPaso(p.id); notificar();
      });
      campos.push(i);
      return i;
    };
    let cuerpo;
    if (p.id === 'modo') {
      const s = h('select', { id: `${id}-in`, 'aria-describedby': `${id}-msg`, class: 'campo-sel' },
        h('option', { value: '' }, T.elige), h('option', { value: '0' }, `0 = ${T.modoCorriente.toLowerCase()}`), h('option', { value: '1' }, `1 = ${T.modoTension.toLowerCase()}`));
      s.value = crudo[p.id];
      s.addEventListener('change', () => { crudo[p.id] = s.value; limpiarPaso(p.id); notificar(); });
      campos.push(s);
      cuerpo = [s];
    } else if (p.tipo === 'fasor') {
      cuerpo = [entrada('mag', `${etiquetaDe(p.id)}: ${T.fasorMod}`, `${id}-mag`), h('span', { class: 'unidad' }, p.unidad), entrada('deg', `${etiquetaDe(p.id)}: ${T.fasorAng}`, `${id}-ang`), h('span', { class: 'unidad' }, '°')];
    } else {
      cuerpo = [entrada(null, etiquetaDe(p.id), `${id}-in`), unidad];
    }
    return { id, campos, cuerpo };
  }

  function construir() {
    refs = {};
    const ui = h('ol', { class: 'pasos' });
    for (const p of ej.pasos) {
      const { id, campos, cuerpo } = crearCampos(p);
      const estado = h('span', { class: 'paso__estado' });
      const msg = h('p', { class: 'paso__msg', id: `${id}-msg`, role: 'status' });
      const pistas = h('ol', { class: 'paso__pistas' });
      const fila = h('li', { class: 'paso', 'data-paso': p.id },
        h('div', { class: 'paso__cab' }, h('label', { class: 'paso__etq', for: campos[0].id }, etiquetaDe(p.id)), estado),
        h('div', { class: 'paso__campos' }, ...cuerpo),
        msg, pistas);
      const r = { fila, estado, msg, pistas, campos, btn: null };
      if (modo === 'practica') {
        r.btn = h('button', { type: 'button', class: 'btn btn--ghost btn--chico', onclick: () => pedirPista(p.id) }, '');
        fila.append(r.btn);
      }
      refs[p.id] = r;
      ui.append(fila);
      pintarPistas(p.id);
    }

    const semillaCod = h('code', { class: 'semilla__cod', tabindex: '0' }, seed);
    const aviso = h('span', { class: 'semilla__ok', role: 'status' });
    const copiar = h('button', { type: 'button', class: 'btn btn--ghost btn--chico', onclick: async () => {
      const bien = await copiarTexto(seed);
      aviso.textContent = bien ? T.copiada : '';
      if (bien) setTimeout(() => { if (vivo) aviso.textContent = ''; }, 2000);
    } }, T.copiar);
    const fila = h('div', { class: 'semilla' }, h('span', { class: 'semilla__etq' }, T.semilla), semillaCod, copiar, aviso);

    const enun = h('div', { class: 'enunciado' }, h('p', { class: 'etq' }, T.enunciado), h('p', { class: 'enunciado__txt' }, rellenar(textos?.enunciados?.[ej.variante] || '', paramsTxt())));
    el.replaceChildren(fila, enun, ...(modo === 'simulacro' ? [h('p', { class: 'nota' }, T.modoSimulacro)] : []), ui);

    if (modo === 'practica') {
      const resumen = h('p', { class: 'ejer__nota', role: 'status', 'aria-live': 'polite' });
      const acciones = h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn', onclick: () => comprobar() }, T.comprobar),
        h('button', { type: 'button', class: 'btn btn--sky', onclick: () => terminar() }, T.terminar));
      const det = h('details', { class: 'resolucion' }, h('summary', null, T.resolucion, h('span', { class: 'resolucion__aviso' }, ` ${T.resolucionAviso}`)), h('div', { class: 'resolucion__cuerpo' }));
      det.addEventListener('toggle', () => {
        if (!det.open) return;
        resolucionAbierta = true;
        const cuerpo = det.querySelector('.resolucion__cuerpo');
        if (!cuerpo.childElementCount) cuerpo.append(...construirResolucion());
        refrescarNota();
      });
      el.append(resumen, acciones, det);
      el._resumen = resumen;
    }
    if (corregido) aplicar(corregido, { revelar: modo === 'simulacro' });
  }

  function textoPista(id, n) {
    return rellenar(textos?.pasos?.[id]?.pistas?.[n], paramsTxt());
  }

  function pintarPistas(id) {
    const r = refs[id], n = pistasVistas[id] || 0;
    r.pistas.replaceChildren(...Array.from({ length: n }, (_, i) => h('li', null, textoPista(id, i))));
    if (r.btn) {
      const quedan = n < 3;
      r.btn.hidden = !quedan;
      r.btn.textContent = `${T.pista} ${n + 1} de 3`;
      r.btn.setAttribute('aria-label', `${T.pista} ${n + 1} de 3 para ${etiquetaDe(id)}. ${T.pistaAviso}`);
    }
  }

  function pedirPista(id) {
    if ((pistasVistas[id] || 0) >= 3) return;
    pistasVistas[id] = (pistasVistas[id] || 0) + 1;
    pintarPistas(id);
    refrescarNota();
  }

  function construirResolucion() {
    const vals = valoresPasos();
    const out = [];
    for (const p of ej.pasos) {
      const tex = h('div', { class: 'res-tex' });
      if (p.tex) renderTex(tex, p.tex, true);
      out.push(h('section', { class: 'res-paso' },
        h('h3', { class: 'res-paso__t' }, etiquetaDe(p.id)),
        tex,
        p.sustitucion ? h('p', { class: 'res-paso__sust' }, p.sustitucion) : null,
        h('p', { class: 'res-paso__val' }, `${T.esperado}: `, h('b', null, valorTexto(p.valor, p.unidad))),
        h('p', { class: 'res-paso__expl' }, rellenar(textos?.pasos?.[p.id]?.explicacion || '', { param: ej.params, paso: vals }))));
    }
    return out;
  }

  // Pinta el resultado de corregir() en cada paso.
  function aplicar(corr, { revelar = false } = {}) {
    const { invalidos } = recogerRespuestas(ej, crudo);
    for (const p of ej.pasos) {
      const r = refs[p.id], c = corr.pasos[p.id];
      limpiarPaso(p.id);
      if (invalidos.includes(p.id)) {
        r.fila.dataset.estado = 'invalido';
        r.estado.append(chipEstado('neutro', '!', T.noNumero));
        for (const campo of r.campos) campo.setAttribute('aria-invalid', 'true');
        continue;
      }
      if (c.estado === 'ok') {
        r.fila.dataset.estado = 'ok';
        r.estado.append(chipEstado('ok', '✓', T.correcto));
        if (c.arrastre) r.msg.textContent = T.arrastre;
      } else if (c.estado === 'fallo') {
        r.fila.dataset.estado = 'fallo';
        r.estado.append(chipEstado('fallo', '✕', T.revisa));
        r.msg.textContent = (c.errorId && textos?.errores?.[c.errorId]) || T.fallo;
        for (const campo of r.campos) campo.setAttribute('aria-invalid', 'true');
      } else {
        r.fila.dataset.estado = 'vacio';
        r.estado.append(chipEstado('neutro', '–', T.sinResponder));
      }
      if (revelar && c.estado !== 'ok') r.msg.append(h('span', { class: 'paso__esp' }, ` ${T.esperado}: ${valorTexto(c.esperado, p.unidad)}.`));
    }
  }

  function refrescarNota() {
    if (!el._resumen) return;
    if (!corregido) { el._resumen.textContent = ''; return; }
    const est = estrellasEjercicio({ nota: corregido.nota, puntos: ej.puntos, pistas: totalPistas(), resolucion: resolucionAbierta });
    el._resumen.replaceChildren(`${T.nota}: ${fmt(corregido.nota)} / ${fmt(ej.puntos)}`, ' ', pintarEstrellas(est));
  }

  function comprobar() {
    const { respuestas } = recogerRespuestas(ej, crudo);
    corregido = corregir(ej, respuestas);
    aplicar(corregido);
    refrescarNota();
    return corregido;
  }

  function terminar() {
    const corr = comprobar();
    const resumen = resumenResultado(corr);
    const info = {
      ejercicio: ej, correccion: corr, nota: corr.nota, puntos: ej.puntos, pasos: resumen.pasos, errores: resumen.errores,
      pistas: totalPistas(), resolucion: resolucionAbierta,
      estrellas: estrellasEjercicio({ nota: corr.nota, puntos: ej.puntos, pistas: totalPistas(), resolucion: resolucionAbierta }),
    };
    opts.onTerminar?.(info);
    return info;
  }

  // Corrección entregada (simulacro): marca cada paso, enseña lo esperado y bloquea los campos.
  function mostrarCorreccion(resultado) {
    corregido = resultado?.pasos ? resultado : resultado?.correccion;
    aplicar(corregido, { revelar: true });
    for (const r of Object.values(refs)) for (const c of r.campos) c.disabled = true;
    if (el._resumen) refrescarNota();
  }

  construir();
  if (!textos) {
    cargarEjercicios(bloque).then((j) => { if (vivo && j) { textos = j; construir(); } });
  }

  return {
    el, ejercicio: ej, recoger, recogerCrudo, comprobar, terminar, mostrarCorreccion,
    estado: () => ({ pistas: totalPistas(), resolucion: resolucionAbierta, corregido }),
    destruir() { vivo = false; el.replaceChildren(); },
  };
}

// ---------- Pantalla #/ejercicio/<b> ----------
const nombreVariante = (b, v) => (VARIANTES[b] || []).find((x) => x.id === v)?.nombre || v;

export async function montar(cont, ctx) {
  const T = textosEjercicio(ctx.ui);
  const bloque = ctx.arg;
  const raiz = h('section', { class: 'pantalla pantalla--clara pantalla--ejercicio' });
  const dentro = h('div', { class: 'pantalla__in' });
  raiz.append(dentro);
  cont.append(raiz);
  if (!GENERADORES[bloque]) {
    dentro.append(h('h1', { class: 'titular titular--claro' }, ctx.ui.errores.rutaDesconocida), h('div', { class: 'acciones' }, h('a', { class: 'btn', href: '#/menu' }, T.volver)));
    return { destruir() {} };
  }
  const v = ctx.query.get('v');
  const variante = VARIANTES_MOTOR[bloque].includes(v) ? v : undefined;
  let seed = ctx.query.get('s');
  if (!seed) {
    seed = nuevaSemilla();
    const base = location.hash.includes('?') ? location.hash + '&' : location.hash + '?';
    try { history.replaceState(null, '', base + 's=' + seed); } catch { /* sin history */ }
  }
  const textos = await cargarEjercicios(bloque);
  const ex = montarEjercicio(bloque, variante, seed, {
    modo: 'practica', textos, ui: ctx.ui,
    onTerminar(info) {
      guardarResultado({ tipo: 'ejercicio', bloque, variante: info.ejercicio.variante, estrellas: info.estrellas, nota: info.nota, puntos: info.puntos, pasos: info.pasos, errores: info.errores });
      ctx.ir('/resultados');
    },
  });
  dentro.append(
    h('p', { class: 'etq' }, T.etiqueta),
    h('h1', { class: 'titular titular--claro' }, `${BLOQUES[bloque].nombre}: ${nombreVariante(bloque, ex.ejercicio.variante)}`),
    ex.el,
    h('div', { class: 'acciones' }, h('a', { class: 'btn btn--ghost', href: '#/menu' }, T.volver)));
  return { destruir() { ex.destruir(); } };
}

export default { montar };
