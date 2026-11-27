// Utilidades numéricas: lectura tolerante, comparación con tolerancia y formato es-ES.
export function parseNum(s) {
  if (typeof s === 'number') return Number.isFinite(s) ? s : NaN;
  if (typeof s !== 'string') return NaN;
  const t = s.replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return NaN;
  const v = Number(t);
  return Number.isFinite(v) ? v : NaN;
}

export function close(x, ref, rel = 0.02, abs = 1e-9) {
  if (!Number.isFinite(x) || !Number.isFinite(ref)) return false;
  return Math.abs(x - ref) <= Math.max(abs, rel * Math.abs(ref));
}

// cifras = cifras significativas; sin notación científica entre 1e-3 y 1e6.
export function fmt(x, cifras = 3) {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e-3 && a < 1e6) {
    const dec = Math.max(0, Math.min(20, cifras - 1 - Math.floor(Math.log10(a))));
    return x.toLocaleString('es-ES', { useGrouping: false, minimumFractionDigits: 0, maximumFractionDigits: dec });
  }
  return x.toExponential(Math.max(0, cifras - 1)).replace('.', ',');
}
