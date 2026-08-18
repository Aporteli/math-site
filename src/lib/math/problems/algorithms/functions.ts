import { formatLinearTex, formatQuadraticTex } from "../tex";
import { nonzero, randInt } from "./rng";
import type { ProblemAlgorithm } from "./types";

export const functionsAlgorithms: ProblemAlgorithm[] = [
  {
    id: "function-linear",
    topic: "functions",
    difficulties: ["easy", "medium"],
    years: ["8", "9"],
    generate({ rng }) {
      const a = nonzero(rng, -5, 5);
      const b = randInt(rng, -8, 8);
      const k = randInt(rng, -6, 6);
      const value = a * k + b;
      const expr = formatLinearTex(a, b);
      return {
        instructionId: "evaluate",
        promptTex: `f(x) = ${expr},\\; f(${k}) = ?`,
        solutionTex: `f(${k}) = ${value}`,
        graphExpr: expr,
        formula: "a * k + b",
        variables: { a, b, k },
      };
    },
  },
  {
    id: "function-quadratic",
    topic: "functions",
    difficulties: ["medium", "hard"],
    years: ["9", "10", "11"],
    generate({ rng }) {
      const a = nonzero(rng, -3, 3);
      const b = randInt(rng, -5, 5);
      const c = randInt(rng, -6, 6);
      const k = randInt(rng, -4, 4);
      const value = a * k * k + b * k + c;
      const expr = formatQuadraticTex(a, b, c);
      return {
        instructionId: "evaluate",
        promptTex: `f(x) = ${expr},\\; f(${k}) = ?`,
        solutionTex: `f(${k}) = ${value}`,
        graphExpr: expr,
        formula: "a * k^2 + b * k + c",
        variables: { a, b, c, k },
      };
    },
  },
  {
    id: "function-composition",
    topic: "functions",
    difficulties: ["medium", "hard"],
    years: ["10", "11", "12"],
    generate({ rng }) {
      const a = nonzero(rng, -4, 4);
      const b = randInt(rng, -6, 6);
      const c = nonzero(rng, -4, 4);
      const d = randInt(rng, -6, 6);
      const k = randInt(rng, -5, 5);
      const inner = c * k + d;
      const value = a * inner + b;
      return {
        instructionId: "evaluate",
        promptTex: `f(x) = ${formatLinearTex(a, b)},\\; g(x) = ${formatLinearTex(c, d)},\\; (f \\circ g)(${k}) = ?`,
        solutionTex: `(f \\circ g)(${k}) = ${value}`,
        graphExpr: formatLinearTex(a * c, a * d + b),
      };
    },
  },
  {
    id: "linear-inverse",
    topic: "functions",
    difficulties: ["medium", "hard"],
    years: ["10", "11", "12"],
    generate({ rng }) {
      const a = nonzero(rng, -5, 5);
      const b = randInt(rng, -8, 8);
      const x = randInt(rng, -6, 6);
      const k = a * x + b;
      return {
        instructionId: "evaluate",
        promptTex: `f(x) = ${formatLinearTex(a, b)},\\; f^{-1}(${k}) = ?`,
        solutionTex: `f^{-1}(${k}) = ${x}`,
        graphExpr: formatLinearTex(a, b),
      };
    },
  },
  {
    id: "arithmetic-term",
    topic: "functions",
    difficulties: ["easy", "medium"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const a1 = randInt(rng, -8, 12);
      const d = nonzero(rng, -6, 6);
      const n = randInt(rng, 4, 12);
      const value = a1 + (n - 1) * d;
      return {
        instructionId: "evaluate",
        promptTex: `a_{1} = ${a1},\\; d = ${d},\\; a_{${n}} = ?`,
        solutionTex: `a_{${n}} = ${value}`,
        formula: "a1 + (n - 1) * d",
        variables: { a1, d, n },
        promptTemplate: "a_{1} = {{a1}},\\; d = {{d}},\\; a_{{{n}}} = ?",
      };
    },
  },
];
