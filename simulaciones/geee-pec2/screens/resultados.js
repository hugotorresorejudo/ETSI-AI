import { h, estrellas, redNodos, simboloRecortado, rutaCarga } from './comun.js';
import { NIVELES, bloqueDeNivel, cargarEjercicios } from '../content.js';
import { nuevaSemilla } from '../engine/rng.js';
import { cargar } from '../state.js';
import { fmt } from '../engine/num.js';

// Forma de ultimoResultado (la escriben level-host, exam-view y simulacro con guardarResultado):
// { tipo: 'nivel'|'ejercicio'|'simulacro', id?, bloque?, variante?, modo?, estrellas?, nota?, puntos?,
//   pasos?: { [pasoId]: 'ok'|'fallo'|'vacio' | { estado } }, errores?: string[] }
export function montar(cont, ctx) {
  const t = ctx.ui.resultados;
  const r = cargar().ultimoResultado;
  const raiz = h('section', { class: 'pantalla pantalla--neg pantalla--resultados' }, redNodos(), simboloRecortado());
  const dentro = h('div', { class: 'pantalla__in' });
  raiz.append(dentro);
  cont.append(raiz);
  let vivo = true;

  const volver = h('a', { class: 'btn btn--neg', href: '#/menu' }, t.volverMenu);
  if (!r) {
    dentro.append(h('h1', { class: 'titular' }, t.titulo), h('p', { class: 'subtitulo' }, t.sinResultado), h('div', { class: 'acciones' }, volver));
    return { destruir() {} };
  }

  const bloque = r.bloque || (r.id ? bloqueDeNivel(r.id) : null);
  const modo = r.modo || 'bloques';
  const acciones = h('div', { class: 'acciones' });
  if (r.tipo === 'nivel' && r.id) {
    acciones.append(h('a', { class: 'btn btn--sky', href: rutaCarga(`/nivel/${r.id}?modo=${modo}&s=${nuevaSemilla()}`) }, t.repetir));
    const lista = NIVELES[bloque] || [];
    const sig = lista[lista.indexOf(r.id) + 1];
    if (sig) acciones.append(h('a', { class: 'btn btn--neg', href: rutaCarga(`/nivel/${sig}?modo=${modo}&s=${nuevaSemilla()}`) }, t.siguiente));
  } else if (r.tipo === 'ejercicio' && bloque) {
    const v = r.variante ? `v=${r.variante}&` : '';
    acciones.append(h('a', { class: 'btn btn--sky', href: rutaCarga(`/ejercicio/${bloque}?${v}s=${nuevaSemilla()}`) }, t.repetir));
  } else if (r.tipo === 'simulacro') {
    acciones.append(h('a', { class: 'btn btn--sky', href: rutaCarga('/simulacro') }, t.repetir));
  }
  acciones.append(volver);

  const cabecera = [h('h1', { class: 'titular' }, t.titulo)];
  if (typeof r.estrellas === 'number') cabecera.push(h('div', { class: 'bloque-res' }, h('p', { class: 'etq etq--neg' }, t.estrellas), estrellas(r.estrellas)));
  if (typeof r.nota === 'number') cabecera.push(h('div', { class: 'bloque-res' }, h('p', { class: 'etq etq--neg' }, t.nota), h('p', { class: 'nota-grande' }, `${fmt(r.nota)}${r.puntos ? ' / ' + fmt(r.puntos) : ''}`)));
  dentro.append(...cabecera);

  const listaPasos = h('ul', { class: 'res-lista' });
  const listaErrores = h('ul', { class: 'res-lista' });
  const pasos = Object.entries(r.pasos || {});
  const errores = r.errores || [];
  const sec = (titulo, ul, vacio) => h('div', { class: 'bloque-res' }, h('h2', { class: 'res-t' }, titulo), ul.children.length ? ul : h('p', { class: 'subtitulo' }, vacio));

  const pintar = (textos) => {
    if (!vivo) return;
    listaPasos.replaceChildren(...pasos.map(([id, v]) => {
      const estado = typeof v === 'string' ? v : v?.estado;
      return h('li', { class: `res-fila res-fila--${estado}` }, h('span', null, textos?.pasos?.[id]?.etiqueta || id), h('span', { class: 'res-estado' }, t[estado] || estado));
    }));
    listaErrores.replaceChildren(...errores.map((id) => h('li', { class: 'res-fila' }, h('span', null, textos?.errores?.[id] || id))));
  };
  pintar(null);
  if (pasos.length) dentro.append(sec(t.aciertos, listaPasos, ''));
  if (r.tipo !== 'nivel' || errores.length) dentro.append(sec(t.erroresDetectados, listaErrores, t.sinErrores));
  dentro.append(acciones);

  // Etiquetas y textos de errores salen del JSON de ejercicios si existe.
  if (bloque && (pasos.length || errores.length)) cargarEjercicios(bloque).then((j) => pintar(j));
  return { destruir() { vivo = false; } };
}
