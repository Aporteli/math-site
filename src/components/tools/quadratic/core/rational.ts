import type { Rational, Sign } from '../types/quadratic';

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

export function rat(n: number | Rational, d: number = 1): Rational {
  if (typeof n === 'object') return n;
  let nn = Math.trunc(n);
  let dd = Math.trunc(d);
  if (dd === 0) throw new Error('გაყოფა ნულზე');
  if (dd < 0) {
    nn = -nn;
    dd = -dd;
  }
  const g = gcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

export function fromDecimal(text: string): Rational {
  const s = text.trim();
  if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) throw new Error(`არასწორი რიცხვი: ${text}`);
  const sign = s.startsWith('-') ? -1 : 1;
  const unsigned = s.replace(/^[+-]/, '');
  if (!unsigned.includes('.')) return rat(sign * Number(unsigned));
  const [whole, frac] = unsigned.split('.');
  const digits = `${whole || '0'}${frac || ''}`;
  const scale = 10 ** (frac || '').length;
  return rat(sign * Number(digits || '0'), scale);
}

export const ZERO = rat(0);
export const ONE = rat(1);
export const TWO = rat(2);
export const FOUR = rat(4);

export function add(a: Rational, b: Rational): Rational {
  return rat(a.n * b.d + b.n * a.d, a.d * b.d);
}
export function sub(a: Rational, b: Rational): Rational {
  return rat(a.n * b.d - b.n * a.d, a.d * b.d);
}
export function mul(a: Rational, b: Rational): Rational {
  return rat(a.n * b.n, a.d * b.d);
}
export function div(a: Rational, b: Rational): Rational {
  if (b.n === 0) throw new Error('გაყოფა ნულზე');
  return rat(a.n * b.d, a.d * b.n);
}
export function neg(a: Rational): Rational {
  return { n: -a.n, d: a.d };
}
export function square(a: Rational): Rational {
  return mul(a, a);
}
export function cmp(a: Rational, b: Rational): Sign {
  const v = a.n * b.d - b.n * a.d;
  return v < 0 ? -1 : v > 0 ? 1 : 0;
}
export function isZero(a: Rational): boolean {
  return a.n === 0;
}
export function isPositive(a: Rational): boolean {
  return a.n > 0;
}
export function isNegative(a: Rational): boolean {
  return a.n < 0;
}
export function abs(a: Rational): Rational {
  return a.n < 0 ? neg(a) : a;
}

function integerSqrt(n: number): number {
  if (n < 0) throw new Error('უარყოფითი რიცხვის კვადრატული ფესვი');
  if (n < 2) return n;
  let x0 = Math.floor(Math.sqrt(n));
  // refine in case of float imprecision for large ints
  while (x0 * x0 > n) x0--;
  while ((x0 + 1) * (x0 + 1) <= n) x0++;
  return x0;
}

/** Returns √x as a Rational if x is a perfect square of a rational; otherwise null. */
export function perfectSquareRational(x: Rational): Rational | null {
  if (x.n < 0) return null;
  const rn = integerSqrt(x.n);
  const rd = integerSqrt(x.d);
  return rn * rn === x.n && rd * rd === x.d ? rat(rn, rd) : null;
}

function factorSquareFreeSimple(n: number): { coeff: number; rest: number } {
  if (n <= 0) return { coeff: 1, rest: n };
  let coeff = 1;
  let rest = Math.trunc(n);
  for (let i = 2; i * i <= rest; ) {
    if (rest % (i * i) === 0) {
      rest = rest / (i * i);
      coeff *= i;
    } else {
      i++;
    }
  }
  return { coeff, rest };
}

/**
 * Simplify √(p/q) into a nicer radical form.
 */
export function simplifySqrtRational(x: Rational): { latex: string; isPerfect: boolean; value?: Rational } {
  if (x.n < 0) throw new Error('უარყოფითი დისკრიმინანტი');
  const perfect = perfectSquareRational(x);
  if (perfect) {
    return { latex: toFraction(perfect), isPerfect: true, value: perfect };
  }
  // √(n/d) = √(n·d) / d
  const num = x.n * x.d;
  const { coeff: c, rest: r } = factorSquareFreeSimple(num);
  const denom = x.d;
  const outer = rat(c, denom);
  if (r === 1) {
    return { latex: toFraction(outer), isPerfect: true, value: outer };
  }
  const outerTex = toFraction(outer);
  if (outer.n === outer.d) {
    return { latex: `\\sqrt{${r}}`, isPerfect: false };
  }
  if (outer.n === -outer.d) {
    return { latex: `-\\sqrt{${r}}`, isPerfect: false };
  }
  if (outer.d === 1) {
    return { latex: `${outer.n}\\sqrt{${r}}`, isPerfect: false };
  }
  return {
    latex: `${outerTex}\\sqrt{${r}}`,
    isPerfect: false,
  };
}

export function toDecimal(x: Rational, digits = 12): string {
  const val = x.n / x.d;
  if (!isFinite(val)) return '∞';
  let s = val.toFixed(digits);
  s = s.replace(/\.?0+$/, '');
  return s || '0';
}

export function toFraction(x: Rational): string {
  if (x.d === 1) return String(x.n);
  const sign = x.n < 0 ? '-' : '';
  const num = Math.abs(x.n);
  return `${sign}\\frac{${num}}{${x.d}}`;
}

export function toFractionPlain(x: Rational): string {
  if (x.d === 1) return String(x.n);
  return `${x.n}/${x.d}`;
}

export function rationalEquals(a: Rational, b: Rational): boolean {
  return a.n === b.n && a.d === b.d;
}
