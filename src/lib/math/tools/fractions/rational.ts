import { FractionError, type Fraction, type MixedNumber } from "./types";

export const ZERO: Fraction = { n: 0n, d: 1n };
export const ONE: Fraction = { n: 1n, d: 1n };

export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x === 0n ? 1n : x;
}

export function lcm(a: bigint, b: bigint): bigint {
  return (abs(a) / gcd(a, b)) * abs(b);
}

export function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

/** Canonical form. Never truncates. */
export function frac(n: bigint, d: bigint): Fraction {
  if (d === 0n) throw new FractionError("ZERO_DENOMINATOR");
  if (n === 0n) return { n: 0n, d: 1n };
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export function add(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a: Fraction, b: Fraction): Fraction {
  return frac(a.n * b.n, a.d * b.d);
}

export function div(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0n) throw new FractionError("DIVISION_BY_ZERO");
  return frac(a.n * b.d, a.d * b.n);
}

export function neg(a: Fraction): Fraction {
  return { n: -a.n, d: a.d };
}

export function cmp(a: Fraction, b: Fraction): -1 | 0 | 1 {
  const v = a.n * b.d - b.n * a.d;
  return v < 0n ? -1 : v > 0n ? 1 : 0;
}

export function toMixed(a: Fraction): MixedNumber {
  const sign: 1 | -1 = a.n < 0n ? -1 : 1;
  const absN = abs(a.n);
  return {
    sign,
    whole: absN / a.d,
    n: absN % a.d,
    d: a.d,
  };
}

export function fromMixed(m: MixedNumber): Fraction {
  const n = m.whole * m.d + m.n;
  return frac(m.sign === -1 ? -n : n, m.d);
}

const OP = { "+": add, "-": sub, "*": mul, "/": div } as const;

export function applyOp(
  op: keyof typeof OP,
  a: Fraction,
  b: Fraction,
): Fraction {
  return OP[op](a, b);
}