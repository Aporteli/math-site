import type { Polynomial, Rational } from '../types/quadratic';
import { ZERO, ONE, add, sub, mul, div, isZero, rat } from './rational';

export function poly(c0: Rational = ZERO, c1: Rational = ZERO, c2: Rational = ZERO): Polynomial {
  return { c0, c1, c2 };
}

export function addPoly(a: Polynomial, b: Polynomial): Polynomial {
  return poly(add(a.c0, b.c0), add(a.c1, b.c1), add(a.c2, b.c2));
}
export function subPoly(a: Polynomial, b: Polynomial): Polynomial {
  return poly(sub(a.c0, b.c0), sub(a.c1, b.c1), sub(a.c2, b.c2));
}
export function negPoly(a: Polynomial): Polynomial {
  return poly(sub(ZERO, a.c0), sub(ZERO, a.c1), sub(ZERO, a.c2));
}
export function scalePoly(a: Polynomial, k: Rational): Polynomial {
  return poly(mul(a.c0, k), mul(a.c1, k), mul(a.c2, k));
}
export function mulPoly(a: Polynomial, b: Polynomial): Polynomial {
  const d0 = mul(a.c0, b.c0);
  const d1 = add(mul(a.c0, b.c1), mul(a.c1, b.c0));
  const d2 = add(add(mul(a.c0, b.c2), mul(a.c1, b.c1)), mul(a.c2, b.c0));
  const d3 = add(mul(a.c1, b.c2), mul(a.c2, b.c1));
  const d4 = mul(a.c2, b.c2);
  if (!isZero(d3) || !isZero(d4)) throw new Error('გამოსახულების ხარისხი 2-ზე მეტია');
  return poly(d0, d1, d2);
}
export function divPoly(a: Polynomial, b: Polynomial): Polynomial {
  if (!isZero(b.c1) || !isZero(b.c2)) throw new Error('მხოლოდ მუდმივზე გაყოფაა მხარდაჭერილი');
  if (isZero(b.c0)) throw new Error('გაყოფა ნულზე');
  return scalePoly(a, div(ONE, b.c0));
}
export function evalPoly(p: Polynomial, x: Rational): Rational {
  return add(p.c0, mul(x, add(p.c1, mul(x, p.c2))));
}

export function degree(p: Polynomial): number {
  if (!isZero(p.c2)) return 2;
  if (!isZero(p.c1)) return 1;
  return 0;
}

export function isZeroPoly(p: Polynomial): boolean {
  return isZero(p.c0) && isZero(p.c1) && isZero(p.c2);
}
