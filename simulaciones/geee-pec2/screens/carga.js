// Pantalla de carga: la barra avanza con las tareas reales (import() del módulo y JSON del bloque).
import { h, redNodos, simboloRecortado } from './comun.js';
import { cargarNiveles, cargarEjercicios, datosNivel, bloqueDeNivel } from '../content.js';

const MINIMO_MS = 350;

function parsear(destino) {
  const [ruta, qs = ''] = destino.replace(/^#?\/?/, '').split('?');
  const [nombre, ...resto] = ruta.split('/');
  return { nombre, arg: decodeURIComponent(resto.join('/')), query: new URLSearchParams(qs) };
}

// Tareas reales según el destino. Un fallo no bloquea: el router mostrará "En construcción".
function planificar(destino) {
  const { nombre, arg } = parsear(destino);
  const seguro = (p) => Promise.resolve(p).catch(() => null);
  if (nombre === 'nivel') {
    const b = bloqueDeNivel(arg);
    return { tipo: 'nivel', bloque: b, id: arg, tareas: [seguro(import('../level-host.js')), seguro(cargarNiveles(b)), seguro(cargarEjercicios(b))] };
  }
  if (nombre === 'ejercicio') {
    return { tipo: 'ejercicio', bloque: arg, tareas: [seguro(import('../exam-view.js')), seguro(cargarEjercicios(arg))] };
  }
  if (nombre === 'simulacro') {
    return { tipo: 'simulacro', tareas: [seguro(import('./simulacro.js')), ...['b1', 'b2', 'b3'].map((b) => seguro(cargarEjercicios(b)))] };
  }
  return { tipo: 'otro', tareas: [] };
}

export function montar(cont, ctx) {
  const destino = (ctx.query.get('to') || '/menu').replace(/^#/, '');
  const plan = planificar(destino);
  let vivo = true;

  const ui = ctx.ui.carga;
  const prefijo = plan.tipo === 'ejercicio' ? ui.ejercicio : plan.tipo === 'simulacro' ? ui.simulacro : plan.tipo === 'nivel' ? `${ui.prefijo} ${plan.id}` : ui.cargando;
  let concepto = '';
  if (plan.tipo === 'nivel') concepto = datosNivel(ctx.niveles, plan.id)?.carga || '';
  const relleno = h('i', { style: 'width:0%' });
  const barra = h('div', { class: 'barra', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 0, 'aria-label': prefijo }, relleno);
  const porcentaje = h('span', { class: 'carga__pct' }, '0 %');

  cont.append(h('section', { class: 'pantalla pantalla--neg pantalla--carga' },
    redNodos(),
    simboloRecortado(),
    h('div', { class: 'pantalla__in' },
      h('p', { class: 'etq etq--neg' }, prefijo),
      h('h1', { class: 'concepto' }, concepto || ' '),
      h('div', { class: 'carga__barra' }, barra, porcentaje),
    )));

  const total = plan.tareas.length;
  let hechas = 0;
  const pintar = (f) => {
    const p = Math.round(f * 100);
    relleno.style.width = p + '%';
    barra.setAttribute('aria-valuenow', p);
    porcentaje.textContent = p + ' %';
  };
  const t0 = performance.now();
  plan.tareas.forEach((t) => t.then(() => { hechas++; if (vivo) pintar(hechas / total); }));
  Promise.all(plan.tareas).then(async () => {
    const resta = MINIMO_MS - (performance.now() - t0);
    if (resta > 0) await new Promise((r) => setTimeout(r, resta));
    if (!vivo) return;
    pintar(1);
    setTimeout(() => { if (vivo) ctx.ir('#' + destino, { replace: true }); }, 120);
  });
  return { destruir() { vivo = false; } };
}
