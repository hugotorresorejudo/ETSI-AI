// Router por hash. Rutas: #/titulo, #/menu, #/carga?to=, #/nivel/<id>, #/ejercicio/<b>, #/simulacro, #/resultados, #/progreso, #/ajustes
import { cargarTextos } from './content.js';
import { cargar } from './state.js';
import { h, enfocarTitulo } from './screens/comun.js';

const RUTAS = {
  titulo: { mod: './screens/titulo.js', neg: true },
  menu: { mod: './screens/menu.js' },
  carga: { mod: './screens/carga.js', neg: true },
  resultados: { mod: './screens/resultados.js', neg: true },
  progreso: { mod: './screens/progreso.js' },
  ajustes: { mod: './screens/ajustes.js' },
  nivel: { mod: './level-host.js', pendiente: true },
  ejercicio: { mod: './exam-view.js', pendiente: true },
  simulacro: { mod: './screens/simulacro.js', pendiente: true },
};

const raiz = document.getElementById('app');
let textos = null;
let actual = null;   // { destruir }
let pase = 0;        // descarta renders obsoletos si se navega rápido

export function parsearHash(hash) {
  const limpio = String(hash || '').replace(/^#\/?/, '');
  const [ruta, qs = ''] = limpio.split('?');
  const [nombre, ...resto] = ruta.split('/');
  return { nombre: nombre || 'titulo', arg: decodeURIComponent(resto.join('/')), query: new URLSearchParams(qs) };
}

export function ir(destino, { replace = false } = {}) {
  const url = destino.startsWith('#') ? destino : '#' + destino;
  if (replace) location.replace(url); else location.hash = url;
}

function enConstruccion(ui, pendiente) {
  const t = ui.errores;
  return h('section', { class: 'pantalla pantalla--clara' }, h('div', { class: 'pantalla__in pantalla__in--estrecha' },
    h('p', { class: 'etq' }, 'GEEE PEC2'),
    h('h1', { class: 'titular titular--claro' }, pendiente ? t.enConstruccion : t.rutaDesconocida),
    pendiente ? h('p', { class: 'resumen' }, t.enConstruccionTexto) : null,
    h('div', { class: 'acciones' }, h('a', { class: 'btn', href: '#/menu' }, t.volver))));
}

async function pintar() {
  const mio = ++pase;
  const { nombre, arg, query } = parsearHash(location.hash);
  const def = RUTAS[nombre];
  if (actual) { try { actual.destruir?.(); } catch { /* ignorar */ } actual = null; }
  raiz.replaceChildren();
  raiz.classList.toggle('app--neg', !!def?.neg);
  if (!textos) textos = await cargarTextos();
  if (mio !== pase) return;

  const ctx = { ui: textos.ui, narrativa: textos.narrativa, niveles: textos.niveles, estado: cargar, ir, query, arg, nombre, id: arg, textos };
  if (!def) { raiz.append(enConstruccion(textos.ui, false)); return; }
  try {
    const mod = await import(def.mod);
    if (mio !== pase) return;
    const montar = mod.montar || mod.default?.montar;
    if (typeof montar !== 'function') throw new Error('sin montar()');
    actual = montar(raiz, ctx) || null;
    if (actual?.then) actual = await actual;
    if (mio !== pase) { actual?.destruir?.(); actual = null; return; }
  } catch (err) {
    if (mio !== pase) return;
    console.warn(`[geee-pec2] no se pudo abrir ${def.mod}:`, err);
    raiz.replaceChildren(enConstruccion(textos.ui, true));
  }
  window.scrollTo(0, 0);
  enfocarTitulo(raiz);
}

addEventListener('hashchange', pintar);
if (!location.hash) location.replace('#/titulo'); else pintar();
