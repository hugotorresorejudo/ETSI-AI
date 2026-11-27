// Anfitrión común de niveles (ruta #/nivel/<id>?modo=campana|bloques&s=<semilla>).
// Pinta diálogo, ficha, objetivo con medidor, banco (módulo levels/<id>.js), pistas, comprobación y cierre.
// Los niveles de examen (1.6, 2.6 y 3.5) montan exam-view en lugar del banco.
import { h, estrellas as pintarEstrellas, rutaCarga } from './screens/comun.js';
import { datosNivel, bloqueDeNivel, rellenar, cargarEjercicios, NIVELES } from './content.js';
import { nuevaSemilla } from './engine/rng.js';
import { fmt } from './engine/num.js';
import { guardarResultado, marcarNivel } from './state.js';
import { montarEjercicio, estrellasPorPistas, evaluarPregunta, renderTex, chipEstado } from './exam-view.js';
import * as rng from './engine/rng.js';
import * as num from './engine/num.js';
import * as complex from './engine/complex.js';
import * as almacenamiento from './engine/almacenamiento.js';
import * as panel from './engine/panel.js';
import * as armonicos from './engine/armonicos.js';
import * as inversor from './engine/inversor.js';
import * as ejercicios from './engine/ejercicios.js';

export const motor = { rng, num, complex, almacenamiento, panel, armonicos, inversor, ejercicios };

export const NIVELES_EXAMEN = { '1.6': 'b1', '2.6': 'b2', '3.5': 'b3' };
export const VARIANTE_DEFECTO = { b1: 'directo', b2: 'convertidor', b3: 'cuadrada' };
export const UMBRAL_OBJETIVO = 0.02;

export const TEXTOS_NIVEL = {
  nivel: 'Nivel',
  contexto: 'Contexto',
  sistema: 'Sistema',
  ficha: 'Ficha teórica',
  objetivo: 'Objetivo',
  comprobar: 'Comprobar',
  pista: 'Pista',
  pistaAviso: 'Cada pista resta una estrella.',
  pistaTitulos: ['Orientación', 'Fórmula', 'Primer paso'],
  resolucion: 'Resolución',
  resolucionAviso: 'Abrirla limita el nivel a una estrella.',
  otraVariante: 'Otra variante',
  siguiente: 'Siguiente nivel',
  menu: 'Volver al menú',
  verResultados: 'Ver resultados',
  bancoTitulo: 'Banco de trabajo',
  bancoConstruccion: 'Banco en construcción',
  bancoConstruccionTexto: 'El banco de trabajo de este nivel todavía no está disponible. El resto del nivel funciona igual.',
  comprobacionTitulo: 'Comprobación',
  comprobacionBloqueada: 'Alcanza el objetivo para desbloquear la comprobación.',
  correcto: 'Correcto',
  revisa: 'Revisa',
  sinResponder: 'Sin responder',
  sinValor: 'Esta magnitud estará disponible cuando el banco del nivel esté listo, así que no cuenta todavía.',
  superado: 'Nivel superado',
  respuesta: 'Respuesta',
  noExiste: 'No encontramos este nivel.',
  noNumero: 'Introduce un número',
  estrellas: 'Estrellas',
};

const textosNivel = (ui) => ({ ...TEXTOS_NIVEL, noNumero: ui?.errores?.noNumero || TEXTOS_NIVEL.noNumero, ...(ui?.nivel || {}) });

export const esNivelExamen = (id) => id in NIVELES_EXAMEN;

// Carga de componentes SVG para ctxNivel.ui (por demanda, una sola vez).
let cacheUi = null;
function cargarComponentes() {
  if (!cacheUi) {
    const pedir = (ruta, nombre) => import(ruta).then((m) => m[nombre]);
    cacheUi = Promise.all([
      pedir('./ui/CurvePlot.js', 'CurvePlot'), pedir('./ui/CellGrid.js', 'CellGrid'), pedir('./ui/Timeline.js', 'Timeline'),
      pedir('./ui/Phasor.js', 'Phasor'), pedir('./ui/Spectrum.js', 'Spectrum'), pedir('./ui/Waveform.js', 'Waveform'),
      pedir('./ui/ProximityMeter.js', 'ProximityMeter'), import('./ui/svg.js'),
    ]).then(([CurvePlot, CellGrid, Timeline, Phasor, Spectrum, Waveform, ProximityMeter, svg]) => ({ CurvePlot, CellGrid, Timeline, Phasor, Spectrum, Waveform, ProximityMeter, svg }));
  }
  return cacheUi;
}

// Resolución de un nivel: las tres pistas en orden y las respuestas de la comprobación.
export function resolucionNivel(datos, refs = {}) {
  const lineas = [];
  (datos.pistas || []).forEach((p, i) => lineas.push({ tipo: 'pista', titulo: TEXTOS_NIVEL.pistaTitulos[i] || `${TEXTOS_NIVEL.pista} ${i + 1}`, texto: p }));
  for (const q of datos.comprobacion || []) {
    if (q.tipo === 'opcion') lineas.push({ tipo: 'respuesta', titulo: q.pregunta, texto: q.opciones?.[q.correcta] ?? '' });
    else if (typeof refs[q.ref] === 'number') lineas.push({ tipo: 'respuesta', titulo: q.pregunta, texto: fmt(refs[q.ref]) });
  }
  return lineas;
}

// ---------- Montaje ----------
export async function montarNivel(id, ctx) {
  const T = textosNivel(ctx.ui);
  const cont = ctx.contenedor;
  const datos = datosNivel(ctx.niveles, id);
  const bloque = bloqueDeNivel(id);
  const raiz = h('section', { class: 'pantalla pantalla--clara pantalla--nivel' });
  const dentro = h('div', { class: 'pantalla__in' });
  raiz.append(dentro);
  cont.append(raiz);

  if (!datos) {
    dentro.append(h('h1', { class: 'titular titular--claro' }, T.noExiste), h('div', { class: 'acciones' }, h('a', { class: 'btn', href: '#/menu' }, T.menu)));
    return { destruir() {} };
  }

  const modo = ctx.query.get('modo') === 'campana' ? 'campana' : 'bloques';
  let seed = ctx.query.get('s');
  if (!seed) {
    seed = nuevaSemilla();
    const base = location.hash.includes('?') ? location.hash + '&' : location.hash + '?';
    try { history.replaceState(null, '', base + 's=' + seed); } catch { /* sin history */ }
  }
  const narrativa = ctx.estado?.().ajustes?.narrativa !== false;
  const examen = esNivelExamen(id);

  let vivo = true;
  const destruibles = [];
  const params = {};
  const refs = {};
  const plantillas = []; // { el, texto } para volver a rellenar cuando el nivel aporte params
  const rellenarTodo = () => { for (const p of plantillas) p.el.textContent = rellenar(p.texto, { param: params }); };
  const conPlantilla = (tag, attrs, texto) => { const el = h(tag, attrs, rellenar(texto, { param: params })); plantillas.push({ el, texto }); return el; };

  let alcanzado = false, completado = false, pistasVistas = 0, resolucionAbierta = false;

  // Cabecera
  dentro.append(
    h('p', { class: 'etq' }, `${T.nivel} ${id}`),
    h('h1', { class: 'titular titular--claro' }, datos.titulo));

  // Diálogo (omitido si la narrativa está desactivada; plegado en "Por bloques")
  if (narrativa && (datos.dialogo || []).length) {
    const nombreMentora = ctx.narrativa?.mentora?.nombre || 'Mentora';
    const globos = h('div', { class: 'dialogo' }, datos.dialogo.map((g) => h('div', { class: `globo globo--${g.quien === 'mentora' ? 'mentora' : 'sistema'}` },
      h('p', { class: 'globo__quien' }, g.quien === 'mentora' ? nombreMentora : T.sistema),
      conPlantilla('p', { class: 'globo__txt' }, g.texto))));
    if (modo === 'campana') dentro.append(globos);
    else dentro.append(h('details', { class: 'plegable' }, h('summary', null, T.contexto), globos));
  }

  // Ficha teórica plegable
  if (datos.ficha) {
    const formulas = h('div', { class: 'teoria__formulas' }, (datos.ficha.formulas || []).map((f) => { const d = h('div', { class: 'teoria__formula' }); renderTex(d, f, true); return d; }));
    dentro.append(h('details', { class: 'plegable teoria' },
      h('summary', null, `${T.ficha}: ${datos.ficha.titulo}`),
      h('ul', { class: 'teoria__puntos' }, (datos.ficha.puntos || []).map((p) => h('li', null, p))),
      formulas));
  }

  // Objetivo (con medidor si hay banco)
  const objetivoBloque = h('div', { class: 'objetivo' }, h('p', { class: 'etq' }, T.objetivo), h('p', { class: 'objetivo__txt' }, datos.objetivo));
  dentro.append(objetivoBloque);

  // --- Nivel de examen: exam-view en lugar del banco ---
  if (examen) {
    const textosEj = await cargarEjercicios(bloque);
    if (!vivo) return { destruir() {} };
    const ex = montarEjercicio(bloque, VARIANTE_DEFECTO[bloque], seed, {
      modo: 'practica', textos: textosEj, ui: ctx.ui,
      onTerminar(info) {
        marcarNivel(id, info.estrellas);
        guardarResultado({ tipo: 'nivel', id, bloque, modo, variante: info.ejercicio.variante, estrellas: info.estrellas, nota: info.nota, puntos: info.puntos, pasos: info.pasos, errores: info.errores });
        ctx.ir('/resultados');
      },
    });
    destruibles.push(ex);
    dentro.append(h('div', { class: 'banco banco--examen' }, ex.el), h('div', { class: 'acciones' }, h('a', { class: 'btn btn--ghost', href: '#/menu' }, T.menu)));
    return { destruir() { vivo = false; destruibles.forEach((d) => d.destruir?.()); } };
  }

  // --- Nivel con banco ---
  const medidorEl = h('div', { class: 'medidor' });
  objetivoBloque.append(medidorEl);
  const comps = await cargarComponentes();
  if (!vivo) return { destruir() {} };
  const medidor = comps.ProximityMeter(medidorEl, { dist01: 1 });
  destruibles.push(medidor);

  const bancoEl = h('div', { class: 'banco__in' });
  dentro.append(h('section', { class: 'banco', 'aria-label': T.bancoTitulo }, bancoEl));

  // Pistas
  const pistasLista = h('ol', { class: 'pistas__lista' });
  const btnPista = h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => {
    if (pistasVistas >= 3 || completado) return;
    pistasVistas += 1; pintarPistas();
  } });
  const pistasEstado = h('p', { class: 'nota pistas__aviso' }, T.pistaAviso);
  function pintarPistas() {
    const lista = datos.pistas || [];
    pistasLista.replaceChildren(...lista.slice(0, pistasVistas).map((p, i) => {
      const li = h('li', { class: 'pista' }, h('span', { class: 'pista__t' }, `${T.pistaTitulos[i] || T.pista}. `), conPlantilla('span', {}, p));
      return li;
    }));
    const quedan = pistasVistas < Math.min(3, lista.length);
    btnPista.hidden = !quedan || completado;
    btnPista.textContent = `${T.pista} ${pistasVistas + 1} de 3`;
    btnPista.setAttribute('aria-label', `${T.pista} ${pistasVistas + 1} de 3. ${T.pistaAviso}`);
  }
  const pistasBloque = h('section', { class: 'pistas', 'aria-label': T.pista + 's' }, h('div', { class: 'pistas__cab' }, btnPista, pistasEstado), pistasLista);
  dentro.append(pistasBloque);
  pintarPistas();

  // Comprobación
  const preguntas = datos.comprobacion || [];
  const respuestas = preguntas.map(() => null);
  const comprobBloque = h('section', { class: 'comprob', 'aria-label': T.comprobacionTitulo });
  const comprobAviso = h('p', { class: 'nota' }, T.comprobacionBloqueada);
  const comprobCuerpo = h('div', { class: 'comprob__cuerpo' });
  comprobBloque.append(h('p', { class: 'etq' }, T.comprobacionTitulo), comprobAviso, comprobCuerpo);
  dentro.append(comprobBloque);
  const filasQ = [];
  preguntas.forEach((q, i) => {
    const estado = h('div', { class: 'preg__estado', role: 'status' });
    let campo;
    if (q.tipo === 'opcion') {
      campo = h('fieldset', { class: 'preg__opciones' }, h('legend', { class: 'preg__txt' }, q.pregunta),
        ...q.opciones.map((o, k) => h('label', { class: 'opcion' },
          h('input', { type: 'radio', name: `q-${id}-${i}`, value: String(k), onchange: () => { respuestas[i] = k; limpiarQ(i); } }), h('span', null, o))));
    } else {
      const inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', class: 'campo-num', id: `q-${id}-${i}`, 'aria-describedby': `q-${id}-${i}-e`, oninput: () => { respuestas[i] = inp.value; limpiarQ(i); } });
      estado.id = `q-${id}-${i}-e`;
      campo = h('div', { class: 'preg__num' }, h('label', { class: 'preg__txt', for: inp.id }, q.pregunta), inp);
    }
    const fila = h('div', { class: 'preg', 'data-q': i }, campo, estado);
    filasQ.push({ fila, estado, campo });
    comprobCuerpo.append(fila);
  });
  function limpiarQ(i) { filasQ[i].estado.replaceChildren(); filasQ[i].fila.dataset.estado = ''; }
  const btnComprobar = h('button', { type: 'button', class: 'btn', onclick: () => comprobar() }, T.comprobar);
  comprobCuerpo.append(h('div', { class: 'acciones' }, btnComprobar));
  comprobCuerpo.hidden = true;

  // Cierre y resolución
  const cierre = h('section', { class: 'cierre', hidden: true, 'aria-live': 'polite' });
  dentro.append(cierre);
  const detRes = h('details', { class: 'resolucion' },
    h('summary', null, T.resolucion, h('span', { class: 'resolucion__aviso' }, ` ${T.resolucionAviso}`)), h('div', { class: 'resolucion__cuerpo' }));
  detRes.addEventListener('toggle', () => {
    if (!detRes.open) return;
    resolucionAbierta = true;
    const cuerpo = detRes.querySelector('.resolucion__cuerpo');
    cuerpo.replaceChildren(...resolucionNivel(datos, refs).map((l) => h('div', { class: 'res-nivel' }, h('p', { class: 'res-nivel__t' }, l.titulo), conPlantilla('p', {}, l.texto))));
  });
  dentro.append(detRes, h('div', { class: 'acciones' }, h('a', { class: 'btn btn--ghost', href: '#/menu' }, T.menu)));

  function desbloquear() {
    if (alcanzado) return;
    alcanzado = true;
    comprobAviso.textContent = '';
    comprobAviso.hidden = true;
    comprobCuerpo.hidden = false;
  }

  function comprobar() {
    let todo = true;
    preguntas.forEach((q, i) => {
      const r = evaluarPregunta(q, respuestas[i], refs);
      const f = filasQ[i];
      f.estado.replaceChildren(); f.fila.dataset.estado = r;
      if (r === 'ok') f.estado.append(chipEstado('ok', '✓', T.correcto));
      else if (r === 'fallo') { f.estado.append(chipEstado('fallo', '✕', T.revisa)); todo = false; }
      else if (r === 'invalido') { f.estado.append(chipEstado('neutro', '!', T.noNumero)); todo = false; }
      else if (r === 'vacio') { f.estado.append(chipEstado('neutro', '–', T.sinResponder)); todo = false; }
      else f.estado.append(h('span', { class: 'preg__nota' }, T.sinValor));
    });
    if (todo) completar();
  }

  function completar() {
    if (completado) return;
    completado = true;
    const est = estrellasPorPistas(pistasVistas, resolucionAbierta);
    marcarNivel(id, est);
    guardarResultado({ tipo: 'nivel', id, bloque, modo, estrellas: est, pasos: {}, errores: [] });
    btnComprobar.disabled = true;
    pintarPistas();
    const lista = NIVELES[bloque] || [];
    const sig = lista[lista.indexOf(id) + 1];
    cierre.hidden = false;
    cierre.replaceChildren(
      h('p', { class: 'etq' }, T.superado),
      h('p', { class: 'cierre__exito' }, datos.exito || ''),
      h('div', { class: 'cierre__estrellas' }, h('span', { class: 'etq' }, T.estrellas), pintarEstrellas(est)),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn', onclick: () => ctx.ir('/resultados') }, T.verResultados),
        h('a', { class: 'btn btn--sky', href: rutaCarga(`/nivel/${id}?modo=${modo}&s=${nuevaSemilla()}`) }, T.otraVariante),
        sig ? h('a', { class: 'btn btn--ghost', href: rutaCarga(`/nivel/${sig}?modo=${modo}&s=${nuevaSemilla()}`) }, T.siguiente) : null));
    cierre.scrollIntoView?.({ block: 'nearest' });
  }

  // Contexto que recibe el módulo del nivel
  const ctxNivel = {
    seed, motor, ui: comps, textos: datos,
    onObjetivo(dist01) {
      const d = Number.isFinite(dist01) ? Math.min(1, Math.max(0, dist01)) : 1;
      medidor.actualizar({ dist01: d });
      if (d <= UMBRAL_OBJETIVO) desbloquear();
    },
    onCompletar() { medidor.actualizar({ dist01: 0 }); desbloquear(); },
    setParams(obj = {}) {
      const { refs: r, ...resto } = obj || {};
      Object.assign(params, resto);
      if (r && typeof r === 'object') Object.assign(refs, r);
      rellenarTodo();
    },
  };

  // Módulo del banco: si no existe, el resto del nivel sigue funcionando.
  let instancia = null;
  try {
    const mod = await import(`./levels/${id}.js`);
    if (!vivo) return { destruir() {} };
    const def = mod.default;
    if (!def || typeof def.montar !== 'function') throw new Error('módulo sin montar()');
    instancia = await def.montar(bancoEl, ctxNivel);
    if (!vivo) { instancia?.destruir?.(); return { destruir() {} }; }
  } catch (err) {
    if (!vivo) return { destruir() {} };
    instancia = null;
    bancoEl.replaceChildren(h('div', { class: 'banco__vacio', role: 'note' }, h('p', { class: 'banco__vacio-t' }, T.bancoConstruccion), h('p', { class: 'nota' }, T.bancoConstruccionTexto)));
    // Sin banco no hay objetivo que medir: la comprobación queda disponible.
    console.warn(`[geee-pec2] banco del nivel ${id} no disponible:`, err && err.message);
    medidor.actualizar({ dist01: 1 });
    desbloquear();
  }
  if (instancia?.destruir) destruibles.push(instancia);

  return { destruir() { vivo = false; destruibles.forEach((d) => { try { d.destruir?.(); } catch { /* ignorar */ } }); } };
}

export function montar(cont, ctx) {
  return montarNivel(ctx.arg || ctx.id, { ...ctx, contenedor: cont });
}

export default { montar, montarNivel };
