// Estado persistente. Único punto de acceso a localStorage, siempre con try/catch y respaldo en memoria.
export const CLAVE = 'etsiai.geee-pec2.v1';

const porDefecto = () => ({
  version: 1,
  niveles: {},            // { [id]: { estrellas, intentos } }
  simulacros: [],         // { seeds, respuestas, nota, fecha }[]
  ajustes: { narrativa: true, cronometro: true },
  simulacroEnCurso: null, // { seeds, respuestas, finEpochMs } | null
  ultimoResultado: null,  // lo escriben las pantallas de nivel y simulacro; lo lee #/resultados
});

let memoria = null;

const clonar = (o) => JSON.parse(JSON.stringify(o));

function completar(raw) {
  const base = porDefecto();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    niveles: raw.niveles && typeof raw.niveles === 'object' ? raw.niveles : base.niveles,
    simulacros: Array.isArray(raw.simulacros) ? raw.simulacros : base.simulacros,
    ajustes: { ...base.ajustes, ...(raw.ajustes && typeof raw.ajustes === 'object' ? raw.ajustes : {}) },
    simulacroEnCurso: raw.simulacroEnCurso ?? null,
    ultimoResultado: raw.ultimoResultado ?? null,
  };
}

export function cargar() {
  try {
    const txt = globalThis.localStorage.getItem(CLAVE);
    if (txt !== null && txt !== undefined) {
      memoria = completar(JSON.parse(txt));
      return clonar(memoria);
    }
  } catch { /* almacén no disponible o JSON corrupto: se sigue con la memoria */ }
  if (!memoria) memoria = porDefecto();
  return clonar(memoria);
}

export function guardar(e) {
  memoria = completar(clonar(e));
  try { globalThis.localStorage.setItem(CLAVE, JSON.stringify(memoria)); } catch { /* solo memoria */ }
  return clonar(memoria);
}

export function marcarNivel(id, estrellas) {
  const e = cargar();
  const previo = e.niveles[id] || { estrellas: 0, intentos: 0 };
  e.niveles[id] = { estrellas: Math.max(previo.estrellas || 0, estrellas || 0), intentos: (previo.intentos || 0) + 1 };
  return guardar(e);
}

export function registrarSimulacro({ seeds, respuestas, nota, fecha }) {
  const e = cargar();
  e.simulacros.push({ seeds, respuestas, nota, fecha });
  e.simulacroEnCurso = null;
  return guardar(e);
}

export function guardarResultado(r) {
  const e = cargar();
  e.ultimoResultado = r;
  return guardar(e);
}

// Borra estrellas, intentos y simulacros; conserva los ajustes.
export function reiniciar() {
  const e = cargar();
  return guardar({ ...porDefecto(), ajustes: e.ajustes });
}

// Solo para tests: olvida la copia en memoria.
export function _olvidarMemoria() { memoria = null; }
