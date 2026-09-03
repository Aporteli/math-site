import type {
  ExactRoot,
  QuadraticSolution,
  ParabolaAnalysis,
  QuadraticClassification,
} from '../types/quadratic';
import {
  add,
  cmp,
  div,
  FOUR,
  mul,
  neg,
  perfectSquareRational,
  rat,
  sub,
  toDecimal,
  toFraction,
  ZERO,
  TWO,
  ONE,
  isZero,
  isPositive,
  simplifySqrtRational,
} from './rational';
import { evalPoly } from './polynomial';
import { parseQuadraticEquation } from './parser';

function rationalRoot(r: ReturnType<typeof rat>): ExactRoot {
  return {
    kind: 'rational',
    exact: toFraction(r),
    decimal: toDecimal(r, 10),
    value: r,
  };
}

function radicalRoot(
  b: ReturnType<typeof rat>,
  denom: ReturnType<typeof rat>,
  discriminant: ReturnType<typeof rat>,
  sign: 1 | -1,
): ExactRoot {
  const sqrtPart = simplifySqrtRational(discriminant);
  const negB = toFraction(neg(b));
  const denomTex = toFraction(denom);
  const signStr = sign === 1 ? '+' : '-';

  if (sqrtPart.isPerfect && sqrtPart.value) {
    const num = sign === 1 ? add(neg(b), sqrtPart.value) : sub(neg(b), sqrtPart.value);
    return rationalRoot(div(num, denom));
  }

  const exact = `\\dfrac{${negB} ${signStr} ${sqrtPart.latex}}{${denomTex}}`;
  return {
    kind: 'radical',
    exact,
  };
}

function complexRoot(
  real: ReturnType<typeof rat>,
  imagSqrt: ReturnType<typeof rat>,
  denom: ReturnType<typeof rat>,
  sign: 1 | -1,
): ExactRoot {
  const realTex = toFraction(real);
  const sqrtPart = simplifySqrtRational(imagSqrt);
  const denomTex = toFraction(denom);

  let imagTex: string;
  if (sqrtPart.isPerfect && sqrtPart.value) {
    const imag = div(sqrtPart.value, denom);
    imagTex = toFraction(imag);
  } else {
    imagTex = `\\dfrac{${sqrtPart.latex}}{${denomTex}}`;
  }

  const signStr = sign === 1 ? '+' : '-';
  const exact =
    isZero(real)
      ? sign === 1
        ? `${imagTex}i`
        : `-${imagTex}i`
      : `${realTex} ${signStr} ${imagTex}i`;

  return {
    kind: 'complex',
    exact,
    decimal: `${toDecimal(real, 8)} ${signStr} ${toDecimal(div(imagSqrt, denom), 8)}i`,
  };
}

function factorization(
  a: ReturnType<typeof rat>,
  b: ReturnType<typeof rat>,
  c: ReturnType<typeof rat>,
  variable: string,
): string | null {
  const D = sub(mul(b, b), mul(mul(FOUR, a), c));
  const sqrtD = perfectSquareRational(D);
  if (sqrtD === null) return null;

  const r1 = div(add(neg(b), sqrtD), mul(TWO, a));
  const r2 = div(sub(neg(b), sqrtD), mul(TWO, a));

  const aTex = toFraction(a);
  const rootText = (r: ReturnType<typeof rat>) => {
    const t = toFraction(r);
    if (t === '0') return variable;
    if (r.n < 0) {
      const pos = toFraction(neg(r));
      return `\\left(${variable}+${pos}\\right)`;
    }
    return `\\left(${variable}-${t}\\right)`;
  };

  if (a.n === a.d) return `${rootText(r1)}${rootText(r2)}`;
  if (a.n === -a.d) return `-${rootText(r1)}${rootText(r2)}`;
  return `${aTex}\\,${rootText(r1)}${rootText(r2)}`;
}

function buildAnalysis(
  a: ReturnType<typeof rat>,
  b: ReturnType<typeof rat>,
  c: ReturnType<typeof rat>,
  D: ReturnType<typeof rat>,
  roots: ExactRoot[],
  variable: string,
): ParabolaAnalysis {
  const vertexX = div(neg(b), mul(TWO, a));
  const vertexY = div(neg(D), mul(FOUR, a));

  const direction: 'up' | 'down' = isPositive(a) ? 'up' : 'down';
  const extremaType = direction === 'up' ? 'მინიმუმი' : 'მაქსიმუმი';

  const domain = `(-\\infty; +\\infty)`;
  let range: string;
  if (direction === 'up') {
    range = `\\left[${toFraction(vertexY)}; +\\infty\\right)`;
  } else {
    range = `\\left(-\\infty; ${toFraction(vertexY)}\\right]`;
  }

  const mono =
    direction === 'up'
      ? `კლებადია $(-\\infty; ${toFraction(vertexX)}]$-ზე და ზრდადია $[${toFraction(vertexX)}; +\\infty)$-ზე`
      : `ზრდადია $(-\\infty; ${toFraction(vertexX)}]$-ზე და კლებადია $[${toFraction(vertexX)}; +\\infty)$-ზე`;

  const realRoots = roots.filter((r) => r.kind !== 'complex');

  return {
    vertex: { x: rationalRoot(vertexX), y: rationalRoot(vertexY) },
    axisOfSymmetry: rationalRoot(vertexX),
    yIntercept: rationalRoot(c),
    xIntercepts: realRoots,
    direction,
    extremaType,
    domain,
    range,
    monotonicity: mono,
  };
}

export function solveQuadratic(input: string, variable = 'x'): QuadraticSolution {
  const equation = parseQuadraticEquation(input, variable);
  const { a, b, c } = equation;

  if (isZero(a) && isZero(b) && isZero(c)) {
    return {
      equation,
      discriminant: ZERO,
      discriminantExact: '0',
      classification: 'identity',
      roots: [],
      factorization: null,
      analysis: {
        vertex: { x: rationalRoot(ZERO), y: rationalRoot(ZERO) },
        axisOfSymmetry: rationalRoot(ZERO),
        yIntercept: rationalRoot(ZERO),
        xIntercepts: [],
        direction: 'up',
        extremaType: 'მინიმუმი',
        domain: '(-\\infty; +\\infty)',
        range: '(-\\infty; +\\infty)',
        monotonicity: 'ყველგან',
      },
      verified: true,
    };
  }

  if (isZero(a) && isZero(b)) {
    return {
      equation,
      discriminant: ZERO,
      discriminantExact: '0',
      classification: 'inconsistent',
      roots: [],
      factorization: null,
      analysis: {
        vertex: { x: rationalRoot(ZERO), y: rationalRoot(c) },
        axisOfSymmetry: rationalRoot(ZERO),
        yIntercept: rationalRoot(c),
        xIntercepts: [],
        direction: 'up',
        extremaType: 'მინიმუმი',
        domain: '(-\\infty; +\\infty)',
        range: `{${toFraction(c)}}`,
        monotonicity: 'მუდმივი',
      },
      verified: true,
    };
  }

  if (isZero(a)) {
    const root = rationalRoot(div(neg(c), b));
    return {
      equation,
      discriminant: ZERO,
      discriminantExact: '0',
      classification: 'linear',
      roots: [root],
      factorization: null,
      analysis: {
        vertex: { x: root, y: rationalRoot(ZERO) },
        axisOfSymmetry: root,
        yIntercept: rationalRoot(c),
        xIntercepts: [root],
        direction: 'up',
        extremaType: 'მინიმუმი',
        domain: '(-\\infty; +\\infty)',
        range: '(-\\infty; +\\infty)',
        monotonicity: isPositive(b) ? 'ზრდადი' : 'კლებადი',
      },
      verified: true,
    };
  }

  const D = sub(mul(b, b), mul(mul(FOUR, a), c));
  const dsqrt = perfectSquareRational(D);
  let roots: ExactRoot[];
  let classification: QuadraticClassification;

  if (cmp(D, ZERO) > 0) {
    classification = 'two-real-distinct';
    if (dsqrt !== null) {
      roots = [
        rationalRoot(div(add(neg(b), dsqrt), mul(TWO, a))),
        rationalRoot(div(sub(neg(b), dsqrt), mul(TWO, a))),
      ];
    } else {
      const denom = mul(TWO, a);
      roots = [radicalRoot(b, denom, D, 1), radicalRoot(b, denom, D, -1)];
    }
  } else if (cmp(D, ZERO) === 0) {
    classification = 'one-real-double';
    roots = [rationalRoot(div(neg(b), mul(TWO, a)))];
  } else {
    classification = 'two-complex';
    const negD = neg(D);
    const denom = mul(TWO, a);
    const real = div(neg(b), denom);
    roots = [complexRoot(real, negD, denom, 1), complexRoot(real, negD, denom, -1)];
  }

  let verified = true;
  for (const r of roots) {
    if (r.kind === 'rational' && r.value) {
      const val = evalPoly(equation.polynomial, r.value);
      if (!isZero(val)) {
        verified = false;
        break;
      }
    }
  }

  const analysis = buildAnalysis(a, b, c, D, roots, variable);

  return {
    equation,
    discriminant: D,
    discriminantExact: toFraction(D),
    classification,
    roots,
    factorization: factorization(a, b, c, variable),
    analysis,
    verified,
  };
}

export function verifyRoot(input: string, root: ReturnType<typeof rat>, variable = 'x'): boolean {
  const eq = parseQuadraticEquation(input, variable);
  return isZero(evalPoly(eq.polynomial, root));
}
