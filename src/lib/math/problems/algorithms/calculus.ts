import { formatLinearTex, formatQuadraticTex } from "../tex";
import { nonzero, randInt } from "./rng";
import type { ProblemAlgorithm } from "./types";

export const calculusAlgorithms: ProblemAlgorithm[] = [
  {
    id: "derivative-power",
    topic: "calculus",
    difficulties: ["easy"],
    years: ["11", "12"],
    generate({ rng }) {
      const n = randInt(rng, 2, 6);
      const coef = nonzero(rng, 1, 7);
      const prompt = coef === 1 ? `f(x) = x^{${n}}` : `f(x) = ${coef}x^{${n}}`;
      const newCoef = coef * n;
      const newPow = n - 1;
      const solution =
        newPow === 1
          ? `f'(x) = ${newCoef}x`
          : newPow === 0
            ? `f'(x) = ${newCoef}`
            : `f'(x) = ${newCoef}x^{${newPow}}`;
      return {
        instructionId: "findDerivative",
        promptTex: prompt,
        solutionTex: solution,
        graphExpr: coef === 1 ? `x^${n}` : `${coef}x^${n}`,
      };
    },
  },
  {
    id: "derivative-quadratic",
    topic: "calculus",
    difficulties: ["medium"],
    years: ["11", "12"],
    generate({ rng }) {
      const a = nonzero(rng, -4, 4);
      const b = randInt(rng, -6, 6);
      const c = randInt(rng, -5, 5);
      const expr = formatQuadraticTex(a, b, c);
      const deriv = formatLinearTex(2 * a, b);
      return {
        instructionId: "findDerivative",
        promptTex: `f(x) = ${expr}`,
        solutionTex: `f'(x) = ${deriv}`,
        graphExpr: expr,
      };
    },
  },
  {
    id: "derivative-at",
    topic: "calculus",
    difficulties: ["medium", "hard"],
    years: ["11", "12"],
    generate({ rng }) {
      const a = nonzero(rng, -4, 4);
      const b = randInt(rng, -6, 6);
      const c = randInt(rng, -5, 5);
      const expr = formatQuadraticTex(a, b, c);
      const k = randInt(rng, -4, 4);
      const value = 2 * a * k + b;
      return {
        instructionId: "findDerivative",
        promptTex: `f(x) = ${expr},\\; f'(${k}) = ?`,
        solutionTex: `f'(${k}) = ${value}`,
        graphExpr: expr,
        formula: "2 * a * k + b",
        variables: { a, b, k },
      };
    },
  },
  {
    id: "derivative-sum",
    topic: "calculus",
    difficulties: ["medium", "hard"],
    years: ["11", "12"],
    generate({ rng }) {
      const n = randInt(rng, 3, 6);
      const m = randInt(rng, 1, n - 1);
      const a = nonzero(rng, -5, 5);
      const b = nonzero(rng, -6, 6);
      const aTerm =
        a === 1 ? `x^{${n}}` : a === -1 ? `-x^{${n}}` : `${a}x^{${n}}`;
      const bAbs = Math.abs(b);
      const bBody =
        m === 1
          ? bAbs === 1
            ? "x"
            : `${bAbs}x`
          : bAbs === 1
            ? `x^{${m}}`
            : `${bAbs}x^{${m}}`;
      const prompt = `f(x) = ${aTerm} ${b < 0 ? "-" : "+"} ${bBody}`;
      const da = a * n;
      const db = b * m;
      const dPowA = n - 1;
      const dPowB = m - 1;
      const daTerm =
        dPowA === 1 ? `${da}x` : dPowA === 0 ? String(da) : `${da}x^{${dPowA}}`;
      const dbAbs = Math.abs(db);
      const dbBody =
        dPowB === 0
          ? String(dbAbs)
          : dPowB === 1
            ? dbAbs === 1
              ? "x"
              : `${dbAbs}x`
            : dbAbs === 1
              ? `x^{${dPowB}}`
              : `${dbAbs}x^{${dPowB}}`;
      return {
        instructionId: "findDerivative",
        promptTex: prompt,
        solutionTex: `f'(x) = ${daTerm} ${db < 0 ? "-" : "+"} ${dbBody}`,
        graphExpr: `${a}x^${n} + ${b}x^${m}`,
      };
    },
  },
  {
    id: "antiderivative-power",
    topic: "calculus",
    difficulties: ["easy", "medium"],
    years: ["12"],
    generate({ rng }) {
      const n = randInt(rng, 1, 5);
      const coef = nonzero(rng, 1, 6);
      const p = n + 1;
      const prompt = coef === 1 ? `x^{${n}}` : `${coef}x^{${n}}`;
      let body: string;
      if (coef === p) body = `x^{${p}}`;
      else if (coef % p === 0) {
        const k = coef / p;
        body = k === 1 ? `x^{${p}}` : `${k}x^{${p}}`;
      } else body = `\\dfrac{${coef}}{${p}}x^{${p}}`;
      return {
        instructionId: "evaluate",
        promptTex: `\\int ${prompt}\\, dx`,
        solutionTex: `${body} + C`,
      };
    },
  },
];
