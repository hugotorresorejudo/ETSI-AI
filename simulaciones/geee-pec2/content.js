// Carga de textos (content/es/*.json) y relleno de huecos. Degrada con elegancia si falta algún JSON.
import { fmt } from './engine/num.js';

export const BLOQUES = {
  b1: { id: 'b1', nombre: 'Almacenamiento' },
  b2: { id: 'b2', nombre: 'Panel FV' },
  b3: { id: 'b3', nombre: 'Inversor y armónicos' },
};

export const NIVELES = {
  b1: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6'],
  b2: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'],
  b3: ['3.1', '3.2', '3.3', '3.4', '3.5'],
};

export const VARIANTES = {
  b1: [{ id: 'directo', nombre: 'Directo' }, { id: 'inverso', nombre: 'Inverso (autonomía)' }],
  b2: [
    { id: 'convertidor', nombre: 'Con convertidor' },
    { id: 'bateria', nombre: 'Conectado a batería' },
    { id: 'carga_corriente', nombre: 'Carga de corriente' },
    { id: 'resistencia', nombre: 'Carga resistiva' },
  ],
  b3: [
    { id: 'cuadrada', nombre: 'Onda cuadrada' },
    { id: 'cuasicuadrada', nombre: 'Onda cuasicuadrada' },
    { id: 'inverso_phi', nombre: 'Hallar el desfase' },
  ],
};

export const bloqueDeNivel = (id) => 'b' + String(id).split('.')[0];

// Textos de reserva: se usan solo si el JSON real no trae la clave.
export const UI_DEFECTO = {
  menu: {
    modos: { campana: 'Campaña completa', bloques: 'Por bloques', suelto: 'Ejercicio suelto', simulacro: 'Simulacro PEC2', progreso: 'Progreso', ajustes: 'Ajustes' },
    descripciones: {},
    titulo: 'Menú principal',
    bloque: 'Bloque',
    variante: 'Variante',
    generar: 'Generar ejercicio',
    continuar: 'Continuar simulacro en curso',
    bloqueado: 'Bloqueado',
    abrir: 'Abrir',
    zonaCompleta: 'Completada',
    auditoria: 'Auditoría',
    auditoriaAviso: 'Te faltan zonas por completar; puedes hacerla igualmente.',
    estrellas: 'estrellas',
    sinNiveles: 'Los niveles de este bloque todavía no están disponibles.',
  },
  carga: { prefijo: 'Preparando el nivel', ejercicio: 'Generando el ejercicio', simulacro: 'Preparando la auditoría', cargando: 'Cargando' },
  resultados: { titulo: 'Resultados', estrellas: 'Estrellas', aciertos: 'Aciertos por paso', erroresDetectados: 'Errores típicos detectados', repetir: 'Repetir con otra variante', siguiente: 'Siguiente nivel', volverMenu: 'Volver al menú', sinResultado: 'Todavía no hay ningún resultado que mostrar.', ok: 'Correcto', fallo: 'Incorrecto', vacio: 'Sin responder', nota: 'Nota', sinErrores: 'No se han detectado errores típicos.' },
  ajustes: { titulo: 'Ajustes', narrativa: 'Mostrar la narrativa', cronometro: 'Cronómetro en la auditoría', reiniciar: 'Reiniciar progreso', confirmarReinicio: 'Se borrarán estrellas, intentos y simulacros. ¿Quieres continuar?', confirmar: 'Sí, reiniciar', cancelar: 'Cancelar', reiniciado: 'Progreso reiniciado.' },
  progreso: { titulo: 'Progreso', nivelesCompletados: 'Niveles completados', simulacros: 'Simulacros', sinIntentos: 'Todavía no hay intentos registrados', intentos: 'intentos', intento: 'intento', nivel: 'Nivel', nota: 'Nota' },
  nivel: { ficha: 'Ficha teórica', objetivo: 'Objetivo', comprobar: 'Comprobar', pista: 'Pista', resolucion: 'Resolución', otraVariante: 'Otra variante', siguiente: 'Siguiente nivel', menu: 'Volver al menú' },
  errores: { noNumero: 'Introduce un número', enConstruccion: 'En construcción', enConstruccionTexto: 'Esta pantalla todavía no está disponible. Vuelve al menú mientras se termina.', rutaDesconocida: 'No encontramos esa pantalla.', volver: 'Volver al menú' },
};

export const NARRATIVA_DEFECTO = {
  mentora: { nombre: 'Irene Calvo Ruiz', rol: 'Ingeniera del laboratorio' },
  titulo: { titulo: 'Estación Solar ETSI', subtitulo: 'GEEE | PEC2 | Laboratorio interactivo', boton: 'Empezar' },
  campana: { intro: [], zonas: {}, auditoria: { intro: [], cierre: [] } },
};

function mezclar(base, extra) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return extra === undefined || extra === null ? base : extra;
  const out = { ...base };
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    for (const k of Object.keys(extra)) out[k] = k in base ? mezclar(base[k], extra[k]) : extra[k];
  }
  return out;
}

// --- Relleno de huecos ---
const HUECO = /\{(param|paso)\.([A-Za-z0-9_.]+)\}/g;
const DESCONOCIDO = '⟨?⟩';

function formatear(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? fmt(v) : DESCONOCIDO;
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && Number.isFinite(v.mag) && Number.isFinite(v.deg)) return `${fmt(v.mag)} ∠ ${fmt(v.deg)}°`;
  return DESCONOCIDO;
}

export function rellenar(plantilla, { param, paso } = {}) {
  if (plantilla === undefined || plantilla === null) return '';
  const raices = { param, paso };
  return String(plantilla).replace(HUECO, (_, raiz, ruta) => {
    let v = raices[raiz];
    for (const k of ruta.split('.')) {
      if (v === null || typeof v !== 'object') return DESCONOCIDO;
      v = v[k];
    }
    return v === undefined || v === null ? DESCONOCIDO : formatear(v);
  });
}

// --- Carga de JSON ---
const BASE = new URL('./content/es/', import.meta.url).href;
const cacheGlobal = new Map();

// Devuelve el JSON o null si no existe o falla. Guarda en caché también los fallos de la sesión.
export async function cargarContenido(ruta, { fetchFn = globalThis.fetch, cache = cacheGlobal } = {}) {
  if (cache.has(ruta)) return cache.get(ruta);
  const p = (async () => {
    try {
      const r = await fetchFn(BASE + ruta, { cache: 'no-cache' });
      if (!r || !r.ok) return null;
      return await r.json();
    } catch { return null; }
  })();
  cache.set(ruta, p);
  return p;
}

export const cargarNiveles = (b, o) => cargarContenido(`niveles/${b}.json`, o);
export const cargarEjercicios = (b, o) => cargarContenido(`ejercicios/${b}.json`, o);

export async function cargarTextos(o) {
  const [ui, narrativa, b1, b2, b3] = await Promise.all([
    cargarContenido('ui.json', o), cargarContenido('narrativa.json', o),
    cargarNiveles('b1', o), cargarNiveles('b2', o), cargarNiveles('b3', o),
  ]);
  return {
    ui: mezclar(UI_DEFECTO, ui || {}),
    narrativa: mezclar(NARRATIVA_DEFECTO, narrativa || {}),
    niveles: { b1, b2, b3 },
    faltan: [!ui && 'ui', !narrativa && 'narrativa', !b1 && 'niveles/b1', !b2 && 'niveles/b2', !b3 && 'niveles/b3'].filter(Boolean),
  };
}

export function datosNivel(niveles, id) {
  return niveles?.[bloqueDeNivel(id)]?.niveles?.[id] || null;
}
export function tituloNivel(niveles, id) {
  return datosNivel(niveles, id)?.titulo || id;
}
