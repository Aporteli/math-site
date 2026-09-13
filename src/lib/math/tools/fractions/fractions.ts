export type Fraction = {
  n: number;
  d: number;
};

export type MixedNumber = {
  whole: number;
  n: number;
  d: number;
};

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x;
}

export function simplify(n: number, d: number): Fraction {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) {
    throw new Error("Division by zero");
  }

  const sign = n < 0 !== d < 0 ? -1 : 1;
  const absN = Math.abs(Math.trunc(n));
  const absD = Math.abs(Math.trunc(d));
  const divisor = gcd(absN, absD) || 1;

  return { n: sign * (absN / divisor), d: absD / divisor };
}

function asFraction(value: Fraction): Fraction {
  return simplify(value.n, value.d);
}

export function add(a: Fraction, b: Fraction): Fraction {
  const left = asFraction(a);
  const right = asFraction(b);
  return simplify(left.n * right.d + right.n * left.d, left.d * right.d);
}

export function subtract(a: Fraction, b: Fraction): Fraction {
  const left = asFraction(a);
  const right = asFraction(b);
  return simplify(left.n * right.d - right.n * left.d, left.d * right.d);
}

export function multiply(a: Fraction, b: Fraction): Fraction {
  const left = asFraction(a);
  const right = asFraction(b);
  return simplify(left.n * right.n, left.d * right.d);
}

export function divide(a: Fraction, b: Fraction): Fraction {
  const left = asFraction(a);
  const right = asFraction(b);
  if (right.n === 0) {
    throw new Error("Division by zero");
  }
  return simplify(left.n * right.d, left.d * right.n);
}

type FractionOp = "+" | "-" | "*" | "/";

const OP_FN: Record<FractionOp, (a: Fraction, b: Fraction) => Fraction> = {
  "+": add,
  "-": subtract,
  "*": multiply,
  "/": divide,
};

/** Evaluates left-to-right: a + b × c means ((a + b) × c), not a + (b × c) */
export function evaluateLeftToRight(
  fractions: Fraction[],
  ops: FractionOp[],
): Fraction {
  if (fractions.length === 0) throw new Error("No fractions");
  let acc = fractions[0]!;
  for (let i = 0; i < ops.length; i++) {
    acc = OP_FN[ops[i]!](acc, fractions[i + 1]!);
  }
  return acc;
}

export function toMixed(n: number, d: number): MixedNumber {
  const { n: num, d: den } = simplify(n, d);
  const sign = num < 0 ? -1 : 1;
  const absN = Math.abs(num);
  return {
    whole: sign * Math.floor(absN / den),
    n: absN % den,
    d: den,
  };
}

export function toLaTeX(n: number, d: number): string {
  const { n: num, d: den } = simplify(n, d);
  if (den === 1) {
    return String(num);
  }
  if (num < 0) {
    return `-\\frac{${Math.abs(num)}}{${den}}`;
  }
  return `\\frac{${num}}{${den}}`;
}
