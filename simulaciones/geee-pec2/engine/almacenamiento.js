// Baterías y supercondensadores. SI salvo horas y C_Ah (convención del examen).
export function potenciaMedia(modos) {
  const T = modos.reduce((s, m) => s + m.t, 0);
  const E = modos.reduce((s, m) => s + m.P * m.t, 0);
  return { Pmed: E / T, T };
}

export function capacidadBateria({ Pmed, Vbat, horas }) {
  const E_Wh = Pmed * horas;
  return { E_Wh, E_J: E_Wh * 3600, C_Ah: E_Wh / Vbat };
}

export function autonomiaBateria({ C_Ah, Vbat, Pmed }) {
  return (C_Ah * Vbat) / Pmed;
}

export function packBateria({ ns, np, celda }) {
  const V = ns * celda.V;
  const C_Ah = np * celda.C_Ah;
  return { V, C_Ah, Rs: (celda.Rs * ns) / np, E_Wh: V * C_Ah, Imax: np * celda.Imax };
}

export function energiaSC({ C, Vmax, Vmin }) {
  return 0.5 * C * (Vmax * Vmax - Vmin * Vmin);
}

export function bancoSC({ E_J, Vmax, Vmin, celda }) {
  const ns = Math.ceil(Vmax / celda.V - 1e-9);
  const C_T = (2 * E_J) / (Vmax * Vmax - Vmin * Vmin);
  const np = Math.ceil((C_T * ns) / celda.C - 1e-9);
  const n = ns * np;
  return { C_T, ns, np, n, peso_g: n * celda.m_g, Imax: np * celda.Imax };
}

export function packSC({ ns, np, celda }) {
  return {
    C_T: (np * celda.C) / ns,
    Vmax: ns * celda.V,
    Imax: np * celda.Imax,
    peso_g: ns * np * celda.m_g,
  };
}
