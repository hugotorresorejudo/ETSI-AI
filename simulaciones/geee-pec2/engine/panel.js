// Modelo de panel FV lineal a tramos (apuntes Tema 4). Modulo puro, unidades SI.
// Panel = { Isc, I1, V1, Voc }

export function modeloPanel(p) {
  const { Isc, I1, V1, Voc } = p;
  const RN = V1 / (Isc - I1);
  const Rth = (Voc - V1) / I1;
  const i = (v) => {
    if (v <= 0) return Isc;
    if (v < V1) return Isc - v / RN;
    if (v < Voc) return (Voc - v) / Rth;
    return 0;
  };
  const v = (c) => {
    if (c <= 0) return Voc;
    if (c <= I1) return Voc - Rth * c;
    if (c < Isc) return RN * (Isc - c);
    return 0;
  };
  return { RN, Rth, i, v, mpp: { v: V1, i: I1, P: V1 * I1 } };
}

export function asociar(p, ns, np) {
  return { Isc: p.Isc * np, I1: p.I1 * np, V1: p.V1 * ns, Voc: p.Voc * ns };
}

export function irradiar(p, G) {
  return { Isc: p.Isc * G, I1: p.I1 * G, V1: p.V1, Voc: p.Voc };
}

export function puntoBateria(p, Vbat) {
  const m = modeloPanel(p);
  if (Vbat >= p.Voc) return { v: Vbat, i: 0, modo: 'sin_suministro' };
  return { v: Vbat, i: m.i(Vbat), modo: Vbat < p.V1 ? 'corriente' : 'tension' };
}

export function puntoCargaCorriente(p, IL) {
  const m = modeloPanel(p);
  // Sin suministro: la carga pide mas que Isc; el panel colapsa (v = 0, i = 0).
  if (IL > p.Isc) return { v: 0, i: 0, modo: 'sin_suministro' };
  return { v: m.v(IL), i: IL, modo: IL <= p.I1 ? 'tension' : 'corriente' };
}

export function puntoResistencia(p, RL) {
  const m = modeloPanel(p);
  if (RL <= 0) return { v: 0, i: p.Isc, modo: 'corriente' };
  // Intento en el tramo de fuente de corriente: i = Isc / (1 + RL/RN)
  const ic = p.Isc / (1 + RL / m.RN);
  const vc = RL * ic;
  if (vc <= p.V1) return { v: vc, i: ic, modo: 'corriente' };
  // Tramo de fuente de tension: i = Voc / (RL + Rth)
  const it = p.Voc / (RL + m.Rth);
  return { v: RL * it, i: it, modo: 'tension' };
}

// Raices de a x^2 + b x + c = 0 ordenadas; [] si no hay reales.
function raices(a, b, c) {
  const d = b * b - 4 * a * c;
  if (d < 0) return [];
  const s = Math.sqrt(d);
  return [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((x, y) => x - y);
}

// Eleccion de raiz: la que cae en (0, max); si hay dos, la menor (ver informe).
function elegir(rs, max) {
  const dentro = rs.filter((r) => r > 0 && r < max);
  if (dentro.length === 0) return null;
  const sel = dentro[0];
  const otra = rs.find((r) => r !== sel);
  return { sel, otra: otra === undefined ? null : otra };
}

export function puntoPotencia(p, Pin) {
  const { RN, Rth } = modeloPanel(p);
  // fc: v (Isc - v/RN) = Pin  ->  v^2/RN - Isc v + Pin = 0
  const rf = elegir(raices(1 / RN, -p.Isc, Pin), p.V1);
  const fc = rf
    ? { v: rf.sel, i: p.Isc - rf.sel / RN, descartada: rf.otra }
    : { v: null, i: null, descartada: null };
  // ft: i (Voc - Rth i) = Pin  ->  Rth i^2 - Voc i + Pin = 0
  const rt = elegir(raices(Rth, -p.Voc, Pin), p.I1);
  const ft = rt
    ? { v: p.Voc - Rth * rt.sel, i: rt.sel, descartada: rt.otra }
    : { v: null, i: null, descartada: null };
  return { fc, ft };
}
