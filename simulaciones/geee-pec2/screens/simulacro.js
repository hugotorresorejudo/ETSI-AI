// Auditoría PEC2: tres ejercicios generados, cronómetro opcional y nota sobre 10.
import { h } from './comun.js';
import { cargar, guardar, registrarSimulacro, guardarResultado } from '../state.js';
import { nuevaSemilla } from '../engine/rng.js';
import { corregir } from '../engine/ejercicios.js';
import { fmt } from '../engine/num.js';
import { cargarEjercicios, rellenar, BLOQUES } from '../content.js';
import { montarEjercicio, renderTex, resumenResultado, textosEjercicio } from '../exam-view.js';

export const BLOQUES_SIM = ['b1', 'b2', 'b3'];
export const PESOS = { b1: 3, b2: 3, b3: 4 };
export const DURACION_MS = 90 * 60 * 1000;

// ---------- Lógica pura ----------
// notas: { b1, b2, b3 } con la nota de cada ejercicio sobre sus puntos (los puntos coinciden con el peso).
export function notaSobre10(notas) {
  let total = 0;
  for (const b of BLOQUES_SIM) {
    const n = Number(notas?.[b]);
    if (!Number.isFinite(n)) continue;
    const frac = Math.min(1, Math.max(0, n / PESOS[b]));
    total += frac * PESOS[b];
  }
  return Math.min(10, Math.max(0, total));
}

export const finDesdeInicio = (inicioMs) => inicioMs + DURACION_MS;

// Sin finEpochMs (cronómetro desactivado) el tiempo es ilimitado.
export function tiempoRestanteMs(finEpochMs, ahoraMs = Date.now()) {
  if (finEpochMs === null || finEpochMs === undefined) return Infinity;
  return Math.max(0, finEpochMs - ahoraMs);
}

export function formatoTiempo(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return hh ? `${hh}:${p(mm)}:${p(ss)}` : `${p(mm)}:${p(ss)}`;
}

export const notaTexto = (n) => n.toFixed(1).replace('.', ',');

export function semillasNuevas(gen = nuevaSemilla) {
  const out = {};
  const usadas = new Set();
  for (const b of BLOQUES_SIM) {
    let s = gen();
    while (usadas.has(s)) s = gen();
    usadas.add(s);
    out[b] = s;
  }
  return out;
}

const valorTexto = (v, unidad) => (v && typeof v === 'object' ? `${fmt(v.mag)} ∠ ${fmt(v.deg)}°` : `${fmt(v)}${unidad ? ' ' + unidad : ''}`);

// ---------- Pantalla ----------
const TXT = {
  titulo: 'Auditoría PEC2',
  instrucciones: 'Tres ejercicios generados, con pesos de 3, 3 y 4 puntos. Sin pistas ni medidores. Al entregar verás la nota y la resolución de cada paso.',
  empezar: 'Empezar simulacro', entregar: 'Entregar', tiempoRestante: 'Tiempo restante', sinLimite: 'Sin límite de tiempo',
  nota: 'Nota', desglose: 'Desglose por apartado', verResolucion: 'Ver resolución completa', ejercicio: 'Ejercicio', puntos: 'puntos',
  nuevo: 'Nuevo simulacro', menu: 'Volver al menú', terminado: 'Se acabó el tiempo: el simulacro se ha entregado.', cargando: 'Cargando',
  confirmar: 'Quedan apartados sin responder. ¿Entregar igualmente?', esperado: 'Valor esperado',
};

export function montar(cont, ctx) {
  const T = { ...TXT, ...(ctx.ui?.simulacro || {}) };
  const ajustes = cargar().ajustes;
  const raiz = h('section', { class: 'pantalla pantalla--clara pantalla--simulacro' });
  const dentro = h('div', { class: 'pantalla__in' });
  raiz.append(dentro);
  cont.append(raiz);
  let vivo = true;
  let temporizador = null;
  let vistas = [];
  const textosBloques = {};

  const parar = () => { if (temporizador) { clearInterval(temporizador); temporizador = null; } };

  function intro() {
    const globos = ajustes.narrativa ? (ctx.narrativa?.campana?.auditoria?.intro || []) : [];
    dentro.replaceChildren(
      h('p', { class: 'etq' }, 'GEEE PEC2'),
      h('h1', { class: 'titular titular--claro' }, T.titulo),
      h('p', { class: 'resumen' }, T.instrucciones),
      ...globos.map((g) => h('p', { class: 'resumen sim__globo' }, g.texto)),
      h('p', { class: 'resumen' }, ajustes.cronometro ? `${T.tiempoRestante}: ${formatoTiempo(DURACION_MS)}` : T.sinLimite),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn btn--sky', id: 'sim-empezar', onclick: empezar }, T.empezar),
        h('a', { class: 'btn btn--ghost', href: '#/menu' }, T.menu)));
  }

  function empezar() {
    const e = cargar();
    e.simulacroEnCurso = {
      seeds: semillasNuevas(),
      respuestas: {},
      finEpochMs: e.ajustes.cronometro ? finDesdeInicio(Date.now()) : null,
    };
    guardar(e);
    curso(e.simulacroEnCurso);
  }

  async function curso(sim) {
    await Promise.all(BLOQUES_SIM.map(async (b) => { textosBloques[b] = await cargarEjercicios(b); }));
    if (!vivo) return;

    const guardarRespuestas = (b, crudo) => {
      const e = cargar();
      if (!e.simulacroEnCurso) return;
      e.simulacroEnCurso.respuestas = { ...e.simulacroEnCurso.respuestas, [b]: crudo };
      guardar(e);
    };

    vistas = BLOQUES_SIM.map((b) => montarEjercicio(b, undefined, sim.seeds[b], {
      modo: 'simulacro', textos: textosBloques[b], ui: ctx.ui,
      valoresIniciales: sim.respuestas?.[b] || {},
      onRespuestas: (_p, crudo) => guardarRespuestas(b, crudo),
    }));

    const crono = h('div', { class: 'sim__crono', role: 'timer', 'aria-live': 'off' });
    const barra = h('div', { class: 'sim__barra' },
      h('span', { class: 'sim__crono-etq' }, sim.finEpochMs === null ? T.sinLimite : T.tiempoRestante), crono,
      h('button', { type: 'button', class: 'btn btn--sky btn--chico', id: 'sim-entregar', onclick: () => entregar(false) }, T.entregar));
    if (sim.finEpochMs === null) crono.hidden = true;

    const cuerpo = h('div', { class: 'sim__ejercicios' });
    vistas.forEach((v, i) => {
      const b = BLOQUES_SIM[i];
      cuerpo.append(h('section', { class: 'sim__ej', 'data-bloque': b },
        h('h2', { class: 'sim__ej-t' }, `${T.ejercicio} ${i + 1}: ${BLOQUES[b].nombre}`, h('span', { class: 'sim__pts' }, `${PESOS[b]} ${T.puntos}`)),
        v.el));
    });
    dentro.replaceChildren(h('h1', { class: 'titular titular--claro' }, T.titulo), barra, cuerpo);

    const pintarTiempo = () => {
      const rest = tiempoRestanteMs(sim.finEpochMs);
      if (rest === Infinity) return false;
      crono.textContent = formatoTiempo(rest);
      barra.classList.toggle('sim__barra--poco', rest <= 5 * 60 * 1000);
      if (rest <= 0) { entregar(true); return true; }
      return false;
    };
    if (sim.finEpochMs !== null && !pintarTiempo()) temporizador = setInterval(pintarTiempo, 500);

    function entregar(porTiempo) {
      parar();
      const notas = {}, correcciones = {};
      for (let i = 0; i < BLOQUES_SIM.length; i++) {
        const b = BLOQUES_SIM[i];
        const c = corregir(vistas[i].ejercicio, vistas[i].recoger());
        correcciones[b] = c;
        notas[b] = c.nota;
      }
      const nota = notaSobre10(notas);
      const respuestas = {};
      BLOQUES_SIM.forEach((b, i) => { respuestas[b] = vistas[i].recogerCrudo(); });
      registrarSimulacro({ seeds: sim.seeds, respuestas, nota, fecha: new Date().toISOString() });
      const errores = [];
      for (const b of BLOQUES_SIM) for (const id of resumenResultado(correcciones[b]).errores) if (!errores.includes(id)) errores.push(id);
      guardarResultado({ tipo: 'simulacro', nota, puntos: 10, errores });
      resultado(nota, notas, correcciones, porTiempo);
    }
  }

  function resolucion(ej, textos) {
    const T2 = textosEjercicio(ctx.ui);
    const vals = Object.fromEntries(ej.pasos.map((p) => [p.id, p.valor]));
    return h('details', { class: 'resolucion' }, h('summary', null, T.verResolucion),
      h('div', { class: 'resolucion__cuerpo' }, ...ej.pasos.map((p) => {
        const tex = h('div', { class: 'res-tex' });
        if (p.tex) renderTex(tex, p.tex, true);
        return h('section', { class: 'res-paso' },
          h('h3', { class: 'res-paso__t' }, textos?.pasos?.[p.id]?.etiqueta || p.id), tex,
          p.sustitucion ? h('p', { class: 'res-paso__sust' }, p.sustitucion) : null,
          h('p', { class: 'res-paso__val' }, `${T2.esperado || T.esperado}: `, h('b', null, valorTexto(p.valor, p.unidad))),
          h('p', { class: 'res-paso__expl' }, rellenar(textos?.pasos?.[p.id]?.explicacion || '', { param: ej.params, paso: vals })));
      })));
  }

  async function resultado(nota, notas, correcciones, porTiempo) {
    if (!vivo) return;
    const cab = h('div', { class: 'sim__nota' },
      h('p', { class: 'etq' }, T.nota),
      h('p', { class: 'nota-grande', id: 'sim-nota' }, `${notaTexto(nota)} / 10`),
      porTiempo ? h('p', { class: 'resumen', role: 'status' }, T.terminado) : null,
      h('ul', { class: 'sim__desglose', 'aria-label': T.desglose },
        ...BLOQUES_SIM.map((b, i) => h('li', null, `${T.ejercicio} ${i + 1} (${BLOQUES[b].nombre}): ${fmt(notas[b])} / ${PESOS[b]}`))));
    const secs = BLOQUES_SIM.map((b, i) => {
      vistas[i].mostrarCorreccion(correcciones[b]);
      return h('section', { class: 'sim__ej', 'data-bloque': b },
        h('h2', { class: 'sim__ej-t' }, `${T.ejercicio} ${i + 1}: ${BLOQUES[b].nombre}`, h('span', { class: 'sim__pts' }, `${fmt(notas[b])} / ${PESOS[b]}`)),
        vistas[i].el, resolucion(vistas[i].ejercicio, textosBloques[b]));
    });
    dentro.replaceChildren(h('h1', { class: 'titular titular--claro' }, T.titulo), cab, h('div', { class: 'sim__ejercicios' }, ...secs),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'btn btn--sky', onclick: () => { vistas.forEach((v) => v.destruir()); vistas = []; empezar(); } }, T.nuevo),
        h('a', { class: 'btn btn--ghost', href: '#/menu' }, T.menu)));
    window.scrollTo(0, 0);
  }

  const e0 = cargar().simulacroEnCurso;
  if (e0 && e0.seeds && BLOQUES_SIM.every((b) => typeof e0.seeds[b] === 'string')) curso(e0); else intro();

  return { destruir() { vivo = false; parar(); vistas.forEach((v) => v.destruir?.()); } };
}

export default { montar };
