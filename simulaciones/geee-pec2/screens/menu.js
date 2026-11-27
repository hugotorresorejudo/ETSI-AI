import { h, estrellas, rutaCarga } from './comun.js';
import { BLOQUES, NIVELES, VARIANTES, tituloNivel } from '../content.js';
import { nuevaSemilla } from '../engine/rng.js';
import { cargar } from '../state.js';

const MODOS = ['campana', 'bloques', 'suelto', 'simulacro', 'progreso', 'ajustes'];

export function montar(cont, ctx) {
  const { ui } = ctx;
  const estado = cargar();
  let modo = MODOS.includes(ctx.query.get('m')) ? ctx.query.get('m') : 'campana';
  let bloque = BLOQUES[ctx.query.get('b')] ? ctx.query.get('b') : 'b1';
  let variante = ctx.query.get('v') || VARIANTES[bloque][0].id;

  const raiz = h('section', { class: 'pantalla pantalla--clara' });
  cont.append(raiz);

  const hecho = (id) => (estado.niveles[id]?.estrellas || 0) > 0;
  const abierto = (id) => {
    const lista = NIVELES[`b${id.split('.')[0]}`];
    const i = lista.indexOf(id);
    return i <= 0 || hecho(lista[i - 1]);
  };
  const auditoriaAbierta = () => ['1.6', '2.6', '3.5'].every(hecho);

  function sincronizarUrl() {
    const q = new URLSearchParams({ m: modo });
    if (modo === 'bloques' || modo === 'suelto') q.set('b', bloque);
    if (modo === 'suelto') q.set('v', variante);
    history.replaceState(null, '', `#/menu?${q}`);
  }

  function filaNivel(id, { bloqueado, destino }) {
    const info = estado.niveles[id];
    const contenido = [
      h('span', { class: 'fila__id' }, id),
      h('span', { class: 'fila__tit' }, tituloNivel(ctx.niveles, id)),
      estrellas(info?.estrellas || 0),
    ];
    if (bloqueado) return h('li', { class: 'fila fila--bloqueada', 'aria-disabled': 'true' }, ...contenido, h('span', { class: 'fila__estado' }, ui.menu.bloqueado));
    return h('li', null, h('a', { class: 'fila', href: rutaCarga(destino) }, ...contenido, h('span', { class: 'fila__estado' }, ui.menu.abrir)));
  }

  function panelCampana() {
    const semilla = nuevaSemilla();
    const zonas = ctx.narrativa.campana?.zonas || {};
    const cols = Object.keys(BLOQUES).map((b) => {
      const completa = NIVELES[b].every(hecho);
      return h('div', { class: 'zona' },
        h('h3', null, zonas[b]?.nombre || BLOQUES[b].nombre, completa ? h('span', { class: 'zona__ok' }, ui.menu.zonaCompleta) : null),
        zonas[b]?.lugar ? h('p', { class: 'zona__lugar' }, zonas[b].lugar) : null,
        h('ul', { class: 'lista' }, NIVELES[b].map((id) => filaNivel(id, { bloqueado: !abierto(id), destino: `/nivel/${id}?modo=campana&s=${semilla}` }))));
    });
    const aud = auditoriaAbierta();
    const audFila = h('a', { class: 'fila', href: rutaCarga('/simulacro') }, h('span', { class: 'fila__id' }, 'PEC2'), h('span', { class: 'fila__tit' }, ui.menu.auditoria), h('span', { class: 'fila__estado' }, ui.menu.abrir));
    return h('div', null,
      h('div', { class: 'zonas' }, cols),
      h('div', { class: 'auditoria' }, audFila, aud ? null : h('p', { class: 'nota' }, ui.menu.auditoriaAviso)));
  }

  function selectorBloque(id, alCambiar) {
    const sel = h('select', { id }, Object.values(BLOQUES).map((b) => h('option', { value: b.id, selected: b.id === bloque }, b.nombre)));
    sel.addEventListener('change', () => alCambiar(sel.value));
    return sel;
  }

  function panelBloques() {
    const semilla = nuevaSemilla();
    const hayJson = !!ctx.niveles[bloque];
    return h('div', null,
      h('div', { class: 'campo' }, h('label', { for: 'sel-bloque' }, ui.menu.bloque), selectorBloque('sel-bloque', (v) => { bloque = v; variante = VARIANTES[v][0].id; sincronizarUrl(); pintar(); raiz.querySelector('#sel-bloque')?.focus(); })),
      hayJson ? null : h('p', { class: 'nota' }, ui.menu.sinNiveles),
      h('ul', { class: 'lista lista--ancha' }, NIVELES[bloque].map((id) => filaNivel(id, { bloqueado: false, destino: `/nivel/${id}?modo=bloques&s=${semilla}` }))));
  }

  function panelSuelto() {
    const selV = h('select', { id: 'sel-variante' }, VARIANTES[bloque].map((v) => h('option', { value: v.id, selected: v.id === variante }, v.nombre)));
    selV.addEventListener('change', () => { variante = selV.value; sincronizarUrl(); });
    if (!VARIANTES[bloque].some((v) => v.id === variante)) variante = VARIANTES[bloque][0].id;
    const ir = h('a', { class: 'btn', href: '#' }, ui.menu.generar);
    ir.addEventListener('click', (e) => {
      e.preventDefault();
      location.hash = rutaCarga(`/ejercicio/${bloque}?v=${variante}&s=${nuevaSemilla()}`);
    });
    return h('div', null,
      h('div', { class: 'campos' },
        h('div', { class: 'campo' }, h('label', { for: 'sel-bloque' }, ui.menu.bloque), selectorBloque('sel-bloque', (v) => { bloque = v; variante = VARIANTES[v][0].id; sincronizarUrl(); pintar(); raiz.querySelector('#sel-bloque')?.focus(); })),
        h('div', { class: 'campo' }, h('label', { for: 'sel-variante' }, ui.menu.variante), selV)),
      h('div', { class: 'acciones' }, ir));
  }

  function panelSimulacro() {
    const curso = estado.simulacroEnCurso;
    return h('div', { class: 'acciones' },
      h('a', { class: 'btn', href: rutaCarga('/simulacro') }, curso ? ui.menu.continuar : (ui.simulacro?.empezar || 'Empezar simulacro')));
  }

  function pintar() {
    raiz.replaceChildren();
    const botones = MODOS.map((m) => {
      const b = h('button', { type: 'button', class: 'modo', 'aria-pressed': String(m === modo) },
        h('span', { class: 'modo__n' }, ui.menu.modos[m]),
        h('span', { class: 'modo__d' }, ui.menu.descripciones[m] || ''));
      b.addEventListener('click', () => {
        if (m === 'progreso' || m === 'ajustes') { location.hash = `#/${m}`; return; }
        modo = m; sincronizarUrl(); pintar();
        raiz.querySelector('.modo[aria-pressed="true"]')?.focus();
      });
      return b;
    });
    const panel = { campana: panelCampana, bloques: panelBloques, suelto: panelSuelto, simulacro: panelSimulacro }[modo]();
    raiz.append(h('div', { class: 'pantalla__in' },
      h('p', { class: 'etq' }, 'GEEE PEC2'),
      h('h1', { class: 'titular titular--claro' }, ui.menu.titulo),
      h('div', { class: 'modos', role: 'group', 'aria-label': ui.menu.titulo }, botones),
      h('div', { class: 'panel-modo', id: 'panel-modo', 'aria-live': 'polite' }, h('h2', { class: 'panel-modo__t' }, ui.menu.modos[modo]), panel)));
  }

  pintar();
  return { destruir() {} };
}
