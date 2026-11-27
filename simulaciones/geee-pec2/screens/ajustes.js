import { h } from './comun.js';
import { cargar, guardar, reiniciar } from '../state.js';

export function montar(cont, ctx) {
  const t = ctx.ui.ajustes;
  const e = cargar();
  const interruptor = (clave, texto) => {
    const c = h('input', { type: 'checkbox', id: `aj-${clave}`, checked: !!e.ajustes[clave] });
    c.addEventListener('change', () => { const s = cargar(); s.ajustes[clave] = c.checked; guardar(s); });
    return h('label', { class: 'check', for: `aj-${clave}` }, c, h('span', null, texto));
  };
  const zona = h('div', { class: 'reinicio' });
  const aviso = h('p', { class: 'nota', role: 'status' });
  const pintarReinicio = (confirmando) => {
    zona.replaceChildren();
    if (!confirmando) {
      const b = h('button', { type: 'button', class: 'btn btn--ghost' }, t.reiniciar);
      b.addEventListener('click', () => { aviso.textContent = ''; pintarReinicio(true); zona.querySelector('button')?.focus(); });
      zona.append(b);
    } else {
      const si = h('button', { type: 'button', class: 'btn' }, t.confirmar);
      const no = h('button', { type: 'button', class: 'btn btn--ghost' }, t.cancelar);
      si.addEventListener('click', () => { reiniciar(); pintarReinicio(false); aviso.textContent = t.reiniciado; });
      no.addEventListener('click', () => pintarReinicio(false));
      zona.append(h('p', { class: 'nota' }, t.confirmarReinicio), h('div', { class: 'acciones' }, si, no));
    }
  };
  pintarReinicio(false);
  cont.append(h('section', { class: 'pantalla pantalla--clara' }, h('div', { class: 'pantalla__in pantalla__in--estrecha' },
    h('p', { class: 'etq' }, 'GEEE PEC2'),
    h('h1', { class: 'titular titular--claro' }, t.titulo),
    h('div', { class: 'ajustes' }, interruptor('narrativa', t.narrativa), interruptor('cronometro', t.cronometro)),
    zona, aviso,
    h('div', { class: 'acciones' }, h('a', { class: 'btn btn--ghost', href: '#/menu' }, ctx.ui.nivel.menu)))));
  return { destruir() {} };
}
