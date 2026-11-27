import { h, redNodos, simboloRecortado } from './comun.js';

export function montar(cont, ctx) {
  const t = ctx.narrativa.titulo;
  cont.append(h('section', { class: 'pantalla pantalla--neg pantalla--titulo' },
    redNodos(),
    simboloRecortado(),
    h('div', { class: 'pantalla__in' },
      h('h1', { class: 'titular' }, t.titulo),
      h('p', { class: 'subtitulo' }, t.subtitulo),
      h('div', { class: 'acciones' }, h('a', { class: 'btn btn--sky', href: '#/menu' }, t.boton)),
    )));
  return { destruir() {} };
}
