import { h, estrellas } from './comun.js';
import { BLOQUES, NIVELES, tituloNivel } from '../content.js';
import { cargar } from '../state.js';
import { fmt } from '../engine/num.js';

export function montar(cont, ctx) {
  const t = ctx.ui.progreso;
  const e = cargar();
  const total = Object.values(NIVELES).flat().length;
  const hechos = Object.values(e.niveles).filter((n) => n.estrellas > 0).length;
  const hayIntentos = Object.keys(e.niveles).length > 0 || e.simulacros.length > 0;

  const tabla = (b) => h('div', { class: 'zona' },
    h('h3', null, BLOQUES[b].nombre),
    h('ul', { class: 'lista' }, NIVELES[b].map((id) => {
      const n = e.niveles[id];
      return h('li', { class: 'fila fila--estatica' },
        h('span', { class: 'fila__id' }, id),
        h('span', { class: 'fila__tit' }, tituloNivel(ctx.niveles, id)),
        estrellas(n?.estrellas || 0),
        h('span', { class: 'fila__estado' }, n ? `${n.intentos} ${t.intentos}` : '-'));
    })));

  const fecha = (f) => { const d = new Date(f); return Number.isNaN(d.getTime()) ? String(f || '') : d.toLocaleDateString('es-ES'); };
  const sims = e.simulacros.length
    ? h('ul', { class: 'lista lista--ancha' }, e.simulacros.slice().reverse().map((s, i) => h('li', { class: 'fila fila--estatica' },
      h('span', { class: 'fila__id' }, `#${e.simulacros.length - i}`), h('span', { class: 'fila__tit' }, fecha(s.fecha)), h('span', { class: 'fila__estado' }, `${t.nota} ${fmt(s.nota)} / 10`))))
    : h('p', { class: 'nota' }, t.sinIntentos);

  cont.append(h('section', { class: 'pantalla pantalla--clara' }, h('div', { class: 'pantalla__in' },
    h('p', { class: 'etq' }, 'GEEE PEC2'),
    h('h1', { class: 'titular titular--claro' }, t.titulo),
    h('p', { class: 'resumen' }, h('b', null, `${hechos} / ${total}`), ` ${t.nivelesCompletados.toLowerCase()}`),
    hayIntentos ? null : h('p', { class: 'nota' }, t.sinIntentos),
    h('div', { class: 'zonas' }, Object.keys(BLOQUES).map(tabla)),
    h('h2', { class: 'panel-modo__t' }, t.simulacros), sims,
    h('div', { class: 'acciones' }, h('a', { class: 'btn btn--ghost', href: '#/menu' }, ctx.ui.nivel.menu)))));
  return { destruir() {} };
}
