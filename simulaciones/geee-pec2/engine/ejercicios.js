// Generadores de ejercicios con semilla y corrector con diagnóstico de errores.
// Unidades SI (salvo horas y C_Ah). params guarda los valores listos para los textos.
import { makeRng } from './rng.js';
import { close, fmt, parseNum } from './num.js';
import { potenciaMedia, capacidadBateria, bancoSC } from './almacenamiento.js';
import { modeloPanel, puntoBateria, puntoCargaCorriente, puntoResistencia, puntoPotencia } from './panel.js';
import { inversorRed, phiParaP } from './inversor.js';
import { efCuasicuadrada } from './armonicos.js';
import { C, polar, sub, div, abs } from './complex.js';

export const VARIANTES = {
  b1: ['directo', 'inverso'],
  b2: ['convertidor', 'bateria', 'carga_corriente', 'resistencia'],
  b3: ['cuadrada', 'cuasicuadrada', 'inverso_phi'],
};
const PUNTOS = { b1: 3, b2: 3, b3: 4 };

// ---------- utilidades de muestreo ----------
const sig = (x, n = 2) => Number(x.toPrecision(n));
const r3 = (x) => Math.round(x * 1000) / 1000;
const ok = Number.isFinite;

// Hasta 200 intentos con la semilla; si no, semillas derivadas. Nunca devuelve algo sin validar.
function muestrear(seed, intento) {
  for (let j = 0; j < 30; j++) {
    const rng = makeRng(j === 0 ? seed : `${seed}#${j}`);
    for (let k = 0; k < 200; k++) {
      const r = intento(rng);
      if (r) return r;
    }
  }
  throw new Error(`No se pudo generar un ejercicio válido para la semilla ${seed}`);
}

function elegirVariante(bloque, seed, opts, pesos) {
  if (opts && opts.variante) {
    if (!VARIANTES[bloque].includes(opts.variante)) throw new Error(`Variante desconocida: ${opts.variante}`);
    return opts.variante;
  }
  return makeRng(`${seed}:variante`).pick(pesos || VARIANTES[bloque]);
}

function paso({ id, unidad = '', tipo = 'num', valor, tex = '', sustitucion = '', depende = [], recalc, errores = [] }) {
  return { id, unidad, tipo, valor, tex, sustitucion, depende, recalc, errores: errores.filter((e) => ok(e.valor)), peso: 0 };
}

function ensamblar(bloque, seed, variante, params, pasos) {
  const puntos = PUNTOS[bloque];
  for (const p of pasos) p.peso = puntos / pasos.length;
  return { bloque, seed, variante, params, pasos, puntos };
}

// ---------- Bloque 1: almacenamiento ----------
function textoModos(modos) {
  const t = modos.map((m) => `${fmt(m.P, 3)} W durante ${fmt(m.t, 3)} s`);
  return t.length < 2 ? t.join('') : `${t.slice(0, -1).join(', ')} y ${t[t.length - 1]}`;
}

function genB1(seed, opts) {
  const variante = elegirVariante('b1', seed, opts);
  const p = muestrear(seed, (rng) => {
    const nm = rng.pick([2, 3]);
    const Ps = [0.05, 0.1, 0.125, 0.2, 0.25, 0.5, 1, 2, 5];
    const ts = [0.5, 1, 2, 2.5, 5, 8, 10];
    const modos = [];
    for (let i = 0; i < nm; i++) modos.push({ P: rng.pick(Ps), t: rng.pick(ts) });
    if (nm === 3) modos[rng.int(0, 2)].P = 0;
    const { Pmed } = potenciaMedia(modos);
    if (!(Pmed > 0)) return null;
    const Vbat = rng.pick([3, 3.3, 3.6, 3.7, 4]);
    const celda = { V: rng.pick([2.5, 2.7, 3]), C: rng.pick([3, 5, 10, 25, 50, 100, 150]), Imax: rng.pick([1, 2, 3, 3.4, 5, 10]), m_g: rng.pick([1, 2, 3, 5]) };
    const nsObj = rng.int(1, 3);
    const Vmax = r3(nsObj * celda.V);
    const Vmin = Math.round(Vmax * 5) / 10;
    let horas, C_Ah;
    if (variante === 'directo') {
      horas = rng.pick([10, 12, 16, 20, 24, 30, 36, 48]);
      C_Ah = capacidadBateria({ Pmed, Vbat, horas }).C_Ah;
    } else {
      C_Ah = rng.pick([0.5, 1, 1.5, 1.8, 2, 2.5, 3, 4, 5]);
      horas = (C_Ah * Vbat) / Pmed;
      if (horas < 1 || horas > 500) return null;
    }
    const E_J = Pmed * horas * 3600;
    const b = bancoSC({ E_J, Vmax, Vmin, celda });
    if (!(b.np >= 10 && b.np <= 5000) || !ok(b.C_T)) return null;
    return { modos, Pmed, Vbat, celda, Vmax, Vmin, horas, C_Ah, E_J, b };
  });
  const { modos, Pmed, Vbat, celda, Vmax, Vmin, horas, C_Ah, E_J, b } = p;
  const params = { modos: textoModos(modos), modosLista: modos, Vbat, Vmax, Vmin, celda };
  if (variante === 'directo') params.horas = horas; else params.C_Ah = C_Ah;
  const E_Wh = E_J / 3600;
  const npReal = (b.C_T * b.ns) / celda.C;
  const den = Vmax * Vmax - Vmin * Vmin;
  const calcNp = (CT, ns) => Math.ceil((CT * ns) / celda.C - 1e-9);
  const pasos = [
    paso({ id: 'Pmed', unidad: 'W', valor: Pmed, tex: '\\bar P=\\sum P_i t_i / T', sustitucion: `Pmed = ${fmt(Pmed)} W` }),
  ];
  if (variante === 'directo') {
    pasos.push(paso({ id: 'C_Ah', unidad: 'Ah', valor: C_Ah, tex: 'C=\\bar P\\,t/V_{bat}', sustitucion: `C = ${fmt(Pmed)}·${fmt(horas)}/${fmt(Vbat)}`, depende: ['Pmed'], recalc: (e) => (e.Pmed * horas) / Vbat }));
  } else {
    pasos.push(paso({ id: 'horas', unidad: 'h', valor: horas, tex: 't=C\\,V_{bat}/\\bar P', sustitucion: `t = ${fmt(C_Ah)}·${fmt(Vbat)}/${fmt(Pmed)}`, depende: ['Pmed'], recalc: (e) => (C_Ah * Vbat) / e.Pmed }));
  }
  const depE = variante === 'directo' ? ['Pmed'] : ['Pmed', 'horas'];
  pasos.push(
    paso({ id: 'E_J', unidad: 'J', valor: E_J, tex: 'E=\\bar P\\,t\\cdot 3600', sustitucion: `E = ${fmt(Pmed)}·${fmt(horas)}·3600`, depende: depE,
      recalc: (e) => e.Pmed * (variante === 'directo' ? horas : e.horas) * 3600, errores: [{ id: 'b1.energia_en_wh', valor: E_Wh }] }),
    paso({ id: 'C_T', unidad: 'F', valor: b.C_T, tex: 'C_T=\\dfrac{2E}{V_{max}^2-V_{min}^2}', sustitucion: `C_T = 2·${fmt(E_J)}/(${fmt(Vmax)}²−${fmt(Vmin)}²)`, depende: ['E_J'],
      recalc: (e) => (2 * e.E_J) / den,
      errores: [
        { id: 'b1.sin_vmin', valor: (2 * E_J) / (Vmax * Vmax) },
        { id: 'b1.vnom_por_vmax', valor: Vbat * Vbat - Vmin * Vmin > 0 ? (2 * E_J) / (Vbat * Vbat - Vmin * Vmin) : NaN },
      ] }),
    paso({ id: 'ns', unidad: '', tipo: 'int', valor: b.ns, tex: 'n_s=\\lceil V_{max}/V_{celda}\\rceil', sustitucion: `ns = ceil(${fmt(Vmax)}/${fmt(celda.V)})` }),
    paso({ id: 'np', unidad: '', tipo: 'int', valor: b.np, tex: 'n_p=\\lceil C_T n_s/C_{celda}\\rceil', sustitucion: `np = ceil(${fmt(b.C_T)}·${b.ns}/${fmt(celda.C)})`, depende: ['C_T', 'ns'],
      recalc: (e) => calcNp(e.C_T, e.ns),
      errores: [
        { id: 'b1.np_sin_redondear', valor: npReal },
        { id: 'b1.ns_por_np', valor: Math.ceil(b.C_T / (celda.C * b.ns) - 1e-9) },
      ] }),
    paso({ id: 'n', unidad: '', tipo: 'int', valor: b.n, tex: 'n=n_s n_p', sustitucion: `n = ${b.ns}·${b.np}`, depende: ['ns', 'np'], recalc: (e) => e.ns * e.np }),
    paso({ id: 'peso', unidad: 'g', valor: b.peso_g, tex: 'm=n\\,m_{celda}', sustitucion: `m = ${b.n}·${fmt(celda.m_g)}`, depende: ['n'], recalc: (e) => e.n * celda.m_g }),
    paso({ id: 'Imax', unidad: 'A', valor: b.Imax, tex: 'I_{max}=n_p I_{celda}', sustitucion: `Imax = ${b.np}·${fmt(celda.Imax)}`, depende: ['np'], recalc: (e) => e.np * celda.Imax,
      errores: [{ id: 'b1.imax_con_ns', valor: b.ns * celda.Imax }] }),
  );
  return ensamblar('b1', seed, variante, params, pasos);
}

// ---------- Bloque 2: panel FV ----------
function genB2(seed, opts) {
  const variante = elegirVariante('b2', seed, opts, ['convertidor', 'convertidor', 'bateria', 'carga_corriente', 'resistencia']);
  const p = muestrear(seed, (rng) => {
    const Isc = rng.int(5, 40);
    const I1 = sig(Isc * (0.75 + 0.2 * rng.next()));
    const V1 = rng.int(8, 40);
    const Voc = sig(V1 * (1.15 + 0.35 * rng.next()));
    if (!(I1 < Isc && I1 > Isc / 2 && Voc > V1)) return null;
    const panel = { Isc, I1, V1, Voc };
    const m = modeloPanel(panel);
    const params = { Isc, I1, V1, Voc };
    if (variante === 'convertidor') {
      const Vbat = rng.pick([5, 12, 20, 24, 27, 48]);
      const eta = rng.pick([80, 85, 90, 95, 100]);
      const f = 0.4 + 0.55 * rng.next();
      const Iout = Math.max(1, sig((f * m.mpp.P * (eta / 100)) / Vbat));
      Object.assign(params, { Vbat, Iout, eta });
      const Pout = Vbat * Iout, Pin = Pout / (eta / 100);
      if (!(Pin < V1 * I1)) return null;
      const pp = puntoPotencia(panel, Pin);
      const { fc, ft } = pp;
      if (fc.v === null || ft.v === null) return null;
      if (!(fc.v > 0 && fc.v < V1 && ft.v > V1 && ft.v < Voc)) return null;
      if (!(fc.descartada > V1 && ft.descartada > I1)) return null;
      return { panel, params, m, Pout, Pin, pp };
    }
    let pt;
    if (variante === 'bateria') {
      const Vbat = sig(Voc * (0.3 + 0.65 * rng.next()));
      if (!(Vbat < Voc && Math.abs(Vbat - V1) / V1 > 0.05)) return null;
      params.Vbat = Vbat; pt = puntoBateria(panel, Vbat);
    } else if (variante === 'carga_corriente') {
      const IL = sig(Isc * (0.2 + 0.75 * rng.next()));
      if (!(IL < Isc && Math.abs(IL - I1) / I1 > 0.05)) return null;
      params.IL = IL; pt = puntoCargaCorriente(panel, IL);
    } else {
      const RL = sig((V1 / I1) * (0.3 + 2.7 * rng.next()));
      params.RL = RL; pt = puntoResistencia(panel, RL);
      if (!(Math.abs(pt.v - V1) / V1 > 0.05)) return null;
    }
    if (pt.modo === 'sin_suministro' || !(pt.v > 0 && pt.i > 0)) return null;
    return { panel, params, m, pt };
  });
  const { panel, params, m } = p;
  const { Isc, V1, Voc } = panel;
  const pasos = [];
  if (variante === 'convertidor') {
    const { Pout, Pin, pp } = p;
    const eta = params.eta;
    // tramo equivocado: se usa la recta del otro tramo
    const vFcMal = (() => { const d = Math.sqrt(Voc * Voc - 4 * m.Rth * Pin); return (Voc - d) / 2; })();
    const vFtMal = (() => { const a = 1 / m.RN, d = Math.sqrt(Isc * Isc - 4 * a * Pin); return (Isc + d) / (2 * a); })();
    const iDeV = (v) => Isc - v / m.RN;
    const vDeI = (i) => Voc - m.Rth * i;
    pasos.push(
      paso({ id: 'Pout', unidad: 'W', valor: Pout, tex: 'P_{out}=V_{bat}I_{out}', sustitucion: `Pout = ${fmt(params.Vbat)}·${fmt(params.Iout)}` }),
      paso({ id: 'Pin', unidad: 'W', valor: Pin, tex: 'P_{in}=P_{out}/\\eta', sustitucion: `Pin = ${fmt(Pout)}/${fmt(eta / 100)}`, depende: ['Pout'], recalc: (e) => e.Pout / (eta / 100),
        errores: [{ id: 'b2.sin_eta', valor: Pout }] }),
      paso({ id: 'v_fc', unidad: 'V', valor: pp.fc.v, tex: 'v\\,(I_{sc}-v/R_N)=P_{in}', sustitucion: `v en (0, ${fmt(V1)}) V`, depende: ['Pin'], recalc: (e) => puntoPotencia(panel, e.Pin).fc.v ?? NaN,
        errores: [{ id: 'b2.raiz_fuera', valor: pp.fc.descartada }, { id: 'b2.tramo_equivocado', valor: vFcMal }] }),
      paso({ id: 'i_fc', unidad: 'A', valor: pp.fc.i, tex: 'i=I_{sc}-v/R_N', sustitucion: `i = ${fmt(Isc)} − v/${fmt(m.RN)}`, depende: ['v_fc'], recalc: (e) => iDeV(e.v_fc),
        errores: [{ id: 'b2.raiz_fuera', valor: iDeV(pp.fc.descartada) }, { id: 'b2.tramo_equivocado', valor: (Voc - vFcMal) / m.Rth }] }),
      paso({ id: 'v_ft', unidad: 'V', valor: pp.ft.v, tex: 'v=V_{oc}-R_{th} i', sustitucion: `v = ${fmt(Voc)} − ${fmt(m.Rth)}·i`, depende: ['Pin'], recalc: (e) => { const r = puntoPotencia(panel, e.Pin).ft; return r.v ?? NaN; },
        errores: [{ id: 'b2.raiz_fuera', valor: vDeI(pp.ft.descartada) }, { id: 'b2.tramo_equivocado', valor: vFtMal }] }),
      paso({ id: 'i_ft', unidad: 'A', valor: pp.ft.i, tex: 'i\\,(V_{oc}-R_{th} i)=P_{in}', sustitucion: `i en (0, ${fmt(panel.I1)}) A`, depende: ['v_ft'], recalc: (e) => (Voc - e.v_ft) / m.Rth,
        errores: [{ id: 'b2.raiz_fuera', valor: pp.ft.descartada }, { id: 'b2.tramo_equivocado', valor: iDeV(vFtMal) }] }),
    );
  } else {
    const { pt } = p;
    const modo = pt.modo === 'corriente' ? 0 : 1;
    const modoDeV = (v) => (v < V1 ? 0 : 1);
    const iMal = (v) => (modo === 0 ? (Voc - v) / m.Rth : Isc - v / m.RN); // recta del otro tramo
    const vMal = (i) => (modo === 0 ? Voc - m.Rth * i : m.RN * (Isc - i));
    const errV = [], errI = [];
    let depI = ['v'];
    let recI = (e) => m.i(e.v);
    if (variante === 'bateria') {
      errI.push({ id: 'b2.tramo_equivocado', valor: iMal(pt.v) });
    } else if (variante === 'carga_corriente') {
      depI = []; recI = undefined;
      errV.push({ id: 'b2.tramo_equivocado', valor: vMal(pt.i) });
    } else {
      const RL = params.RL;
      const vc = (RL * Isc) / (1 + RL / m.RN), it = Voc / (RL + m.Rth);
      const [vm, im] = modo === 0 ? [RL * it, it] : [vc, Isc / (1 + RL / m.RN)];
      errV.push({ id: 'b2.tramo_equivocado', valor: vm });
      errI.push({ id: 'b2.tramo_equivocado', valor: im });
      recI = (e) => e.v / RL; // i = v/RL
    }
    pasos.push(
      paso({ id: 'v', unidad: 'V', valor: pt.v, tex: 'v', sustitucion: 'Intersección con la recta de carga', errores: errV }),
      paso({ id: 'i', unidad: 'A', valor: pt.i, tex: 'i', sustitucion: 'Corriente en el punto de operación', depende: depI, recalc: recI, errores: errI }),
      paso({ id: 'modo', unidad: '', tipo: 'int', valor: modo, tex: '0:\\ \\text{corriente},\\ 1:\\ \\text{tensión}', sustitucion: `V1 = ${fmt(V1)} V`, depende: ['v'], recalc: (e) => modoDeV(e.v), errores: [{ id: 'b2.tramo_equivocado', valor: 1 - modo }] }),
    );
  }
  return ensamblar('b2', seed, variante, params, pasos);
}

// ---------- Bloque 3: inversor y armónicos ----------
function genB3(seed, opts) {
  const variante = elegirVariante('b3', seed, opts);
  const p = muestrear(seed, (rng) => {
    const Vred = rng.pick([110, 200, 220, 230, 240]);
    const f = rng.pick([50, 50, 50, 60]);
    const VDC = rng.pick([150, 200, 220, 250, 300, 350, 400]);
    const L_mH = rng.int(1, 10);
    const L = L_mH / 1000;
    const alpha = variante === 'cuadrada' ? 0 : rng.pick([10, 15, 20, 30, 30, 36, 40, 45]);
    let phi = rng.int(30, 250) / 10, Pdato;
    if (variante === 'inverso_phi') {
      const P0 = inversorRed({ Vred, f, VDC, phiDeg: phi, L, alphaDeg: alpha }).P;
      Pdato = sig(P0, 2);
      if (!(Pdato > 0)) return null;
      phi = phiParaP({ Vred, f, VDC, L, alphaDeg: alpha, P: Pdato });
    }
    const r = inversorRed({ Vred, f, VDC, phiDeg: phi, L, alphaDeg: alpha });
    if (!(r.nz.length === 2 && r.P > 0 && r.I1.mag >= 10 && r.I1.mag <= 100 && r.FP_red >= 0.6 && r.FP_red <= 0.95)) return null;
    return { Vred, f, VDC, L_mH, L, alpha, phi, Pdato, r };
  });
  const { Vred, f, VDC, L_mH, L, alpha, r } = p;
  const k = r.nz[1];
  const params = { Vred, f, VDC, L_mH, L, alpha, k };
  if (variante === 'inverso_phi') params.P = p.Pdato; else params.phi = p.phi;
  const inv = variante === 'inverso_phi';
  const w = r.w, X1 = w * L;
  const Vinv = efCuasicuadrada(VDC, alpha);
  const phiDe = (e) => (inv ? e.phi : p.phi);
  const I1c = (e) => div(sub(polar(e.V1, phiDe(e)), C(Vred, 0)), C(0, X1));
  const depI1 = inv ? ['V1', 'phi'] : ['V1'];
  const { V, I, P, I1 } = r;
  const Ief = r.Ief;
  const pasos = [];
  if (inv) pasos.push(paso({ id: 'phi', unidad: '°', valor: p.phi, tex: 'P=V_{red}\\,\\dfrac{V_1\\sin\\varphi}{\\omega L}', sustitucion: `P = ${fmt(p.Pdato)} W` }));
  pasos.push(
    paso({ id: 'V1', unidad: 'V', valor: V[1], tex: 'V_1=\\dfrac{4V_{DC}\\cos\\alpha}{\\pi\\sqrt2}', sustitucion: `V1 = 4·${fmt(VDC)}·cos(${fmt(alpha)}°)/(π√2)`,
      errores: [{ id: 'b3.pico_por_eficaz', valor: V[1] * Math.SQRT2 }] }),
    paso({ id: 'Vk', unidad: 'V', valor: V[k], tex: 'V_k=\\dfrac{4V_{DC}\\cos(k\\alpha)}{k\\pi\\sqrt2}', sustitucion: `V${k} = 4·${fmt(VDC)}·cos(${k}·${fmt(alpha)}°)/(${k}π√2)`,
      errores: [{ id: 'b3.pico_por_eficaz', valor: V[k] * Math.SQRT2 }] }),
    paso({ id: 'I1', unidad: 'A', valor: I1.mag, tex: 'I_1=\\left|\\dfrac{V_1\\angle\\varphi-V_{red}}{j\\omega L}\\right|', sustitucion: `I1 = |(${fmt(V[1])}∠${fmt(p.phi)}° − ${fmt(Vred)})/(j·${fmt(X1)})|`,
      depende: depI1, recalc: (e) => abs(I1c(e)) }),
    paso({ id: 'Ik', unidad: 'A', valor: I[k], tex: 'I_k=\\dfrac{V_k}{k\\omega L}', sustitucion: `I${k} = ${fmt(V[k])}/(${k}·${fmt(X1)})`, depende: ['Vk'], recalc: (e) => e.Vk / (k * X1),
      errores: [{ id: 'b3.xl_sin_n', valor: V[k] / X1 }] }),
    paso({ id: 'P', unidad: 'W', valor: P, tex: 'P=V_{red}\\,\\mathrm{Re}(I_1)', sustitucion: `P = ${fmt(Vred)}·Re(I1)`, depende: depI1, recalc: (e) => Vred * I1c(e).re,
      errores: [{ id: 'b3.p_con_armonico', valor: P + V[k] * I[k] }] }),
    paso({ id: 'FP_inv', unidad: '', valor: r.FP_inv, tex: 'FP_{inv}=\\dfrac{P}{V_{inv,ef}\\,I_{ef}}', sustitucion: `FP = ${fmt(P)}/(${fmt(Vinv)}·${fmt(Ief)})`, depende: ['P', 'I1', 'Ik'],
      recalc: (e) => e.P / (Vinv * Math.hypot(e.I1, e.Ik)),
      errores: [{ id: 'b3.fp_con_i1', valor: P / (Vinv * I1.mag) }, { id: 'b3.vinv_v1', valor: P / (V[1] * Ief) }] }),
    paso({ id: 'FP_red', unidad: '', valor: r.FP_red, tex: 'FP_{red}=\\dfrac{P}{V_{red}\\,I_{ef}}', sustitucion: `FP = ${fmt(P)}/(${fmt(Vred)}·${fmt(Ief)})`, depende: ['P', 'I1', 'Ik'],
      recalc: (e) => e.P / (Vred * Math.hypot(e.I1, e.Ik)),
      errores: [{ id: 'b3.fp_con_i1', valor: P / (Vred * I1.mag) }] }),
  );
  return ensamblar('b3', seed, variante, params, pasos);
}

export const GENERADORES = { b1: genB1, b2: genB2, b3: genB3 };

// ---------- Corrección ----------
function leer(raw, tipo) {
  if (raw === undefined || raw === null) return null;
  if (tipo === 'fasor') {
    if (typeof raw === 'object' && ok(raw.mag) && ok(raw.deg)) return raw;
    return null;
  }
  const x = typeof raw === 'string' ? parseNum(raw) : raw;
  return typeof x === 'number' && ok(x) ? x : null;
}

function coincide(tipo, dado, ref, esError = false) {
  if (tipo === 'fasor') {
    if (typeof ref !== 'object' || typeof dado !== 'object') return false;
    return close(dado.mag, ref.mag) && close(dado.deg, ref.deg, 0.02, 0.5);
  }
  if (typeof dado !== 'number' || typeof ref !== 'number') return false;
  if (tipo === 'int') return esError ? close(dado, ref, 0.005) : Math.abs(dado - ref) < 1e-9;
  return close(dado, ref);
}

export function corregir(ej, respuestas = {}) {
  const usados = Object.fromEntries(ej.pasos.map((p) => [p.id, p.valor]));
  const pasos = {};
  let nota = 0;
  for (const p of ej.pasos) {
    const dado = leer(respuestas ? respuestas[p.id] : undefined, p.tipo);
    // Arrastre: algún antecedente está en fallo o se aceptó solo por arrastre.
    const afectado = p.recalc && p.depende.some((d) => pasos[d] && (pasos[d].estado === 'fallo' || pasos[d].arrastre));
    const rec = afectado ? p.recalc(usados) : undefined;
    const recOk = afectado && typeof rec === 'number' && ok(rec);
    const esperado = recOk ? rec : p.valor;
    let res;
    if (dado === null) {
      res = { estado: 'vacio', esperado, errorId: null, arrastre: false };
    } else if (coincide(p.tipo, dado, p.valor)) {
      res = { estado: 'ok', esperado: p.valor, errorId: null, arrastre: false };
    } else if (recOk && coincide(p.tipo, dado, rec)) {
      res = { estado: 'ok', esperado: rec, errorId: null, arrastre: true };
    } else {
      const e = p.errores.find((x) => coincide(p.tipo, dado, x.valor, true));
      res = { estado: 'fallo', esperado, errorId: e ? e.id : null, arrastre: false };
    }
    if (res.estado === 'ok') nota += p.peso;
    if (dado !== null && res.estado !== 'ok') usados[p.id] = dado;
    else if (res.arrastre) usados[p.id] = dado;
    pasos[p.id] = res;
  }
  return { pasos, nota: Math.min(ej.puntos, Math.round(nota * 1e9) / 1e9) };
}
