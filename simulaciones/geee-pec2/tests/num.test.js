import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNum, close, fmt } from '../engine/num.js';
import { makeRng, nuevaSemilla } from '../engine/rng.js';

test('parseNum acepta coma, espacios y notación científica', () => {
  assert.equal(parseNum('1,5'), 1.5);
  assert.equal(parseNum(' 2 458 '), 2458);
  assert.equal(parseNum('1,2e3'), 1200);
  assert.equal(parseNum('-0,25'), -0.25);
});
test('parseNum rechaza texto vacío o no numérico', () => {
  assert.ok(Number.isNaN(parseNum('abc')));
  assert.ok(Number.isNaN(parseNum('')));
  assert.ok(Number.isNaN(parseNum('   ')));
  assert.ok(Number.isNaN(parseNum('1,2,3')));
  assert.ok(Number.isNaN(parseNum('Infinity')));
  assert.ok(Number.isNaN(parseNum(undefined)));
});
test('close', () => {
  assert.equal(close(4178.6, 4178.6 * 1.019), true);
  assert.equal(close(1, 1.03), false);
  assert.equal(close(0, 1e-12), true);
});
test('fmt', () => {
  assert.equal(fmt(0.5), '0,5');
  assert.equal(fmt(2458), '2458');
  assert.equal(fmt(4178.6), '4179');
  assert.ok(!/e/i.test(fmt(0.002)));
});
test('rng determinista', () => {
  const a = makeRng('abc'), b = makeRng('abc');
  for (let k = 0; k < 5; k++) assert.equal(a.next(), b.next());
  assert.notEqual(makeRng('abc').next(), makeRng('abd').next());
  const r = makeRng('x');
  for (let k = 0; k < 200; k++) {
    const v = r.int(2, 5); assert.ok(v >= 2 && v <= 5 && Number.isInteger(v));
    const s = r.step(1, 2, 0.25); assert.ok(s >= 1 && s <= 2 && Math.abs((s - 1) / 0.25 - Math.round((s - 1) / 0.25)) < 1e-9);
  }
  assert.ok([1, 2, 3].includes(r.pick([1, 2, 3])));
  assert.match(nuevaSemilla(), /^[0-9a-z]{8}$/);
});
