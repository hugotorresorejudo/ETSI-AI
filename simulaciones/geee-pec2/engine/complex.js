// Números complejos { re, im }. Ángulos en grados.
const RAD = Math.PI / 180;
export const C = (re, im = 0) => ({ re, im });
export const polar = (mag, deg) => ({ re: mag * Math.cos(deg * RAD), im: mag * Math.sin(deg * RAD) });
export const add = (a, b) => C(a.re + b.re, a.im + b.im);
export const sub = (a, b) => C(a.re - b.re, a.im - b.im);
export const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const div = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
export const abs = (a) => Math.hypot(a.re, a.im);
export const argDeg = (a) => Math.atan2(a.im, a.re) / RAD;
