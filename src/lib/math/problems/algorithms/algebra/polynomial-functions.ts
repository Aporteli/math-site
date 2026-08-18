import type { GeneratedProblem } from "../types";
import {
  defineAlgebraProblem,
  parenLinear,
  polyTex,
  selectVariable,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function evalPoly(coeffs: readonly number[], x: number): number {
  return coeffs.reduce((acc, coef) => acc * x + coef, 0);
}

function fromRoots(lead: number, roots: readonly number[]): number[] {
  let coeffs = [lead];
  for (const root of roots) {
    const next = Array.from({ length: coeffs.length + 1 }, () => 0);
    for (let i = 0; i < coeffs.length; i += 1) {
      next[i]! += coeffs[i]!;
      next[i + 1]! -= root * coeffs[i]!;
    }
    coeffs = next;
  }
  return coeffs;
}

function factored(
  lead: number,
  roots: readonly number[],
  variable: string,
): string {
  const counts = new Map<number, number>();
  const order: number[] = [];
  for (const root of roots) {
    if (!counts.has(root)) order.push(root);
    counts.set(root, (counts.get(root) ?? 0) + 1);
  }
  const body = order
    .map((root) => {
      const mult = counts.get(root)!;
      const lin = parenLinear(1, -root, variable);
      return mult === 1 ? lin : `${lin}^{${mult}}`;
    })
    .join("");
  if (lead === 1) return body;
  if (lead === -1) return `-${body}`;
  return `${lead}${body}`;
}

function padAdd(a: readonly number[], b: readonly number[]): number[] {
  const n = Math.max(a.length, b.length);
  const pa = [...Array(n - a.length).fill(0), ...a];
  const pb = [...Array(n - b.length).fill(0), ...b];
  return pa.map((c, i) => c + pb[i]!);
}

function trimLead(coeffs: readonly number[]): number[] {
  const i = coeffs.findIndex((c) => c !== 0);
  if (i <= 0) return [...coeffs];
  return coeffs.slice(i);
}

function distinctInts(
  rng: () => number,
  count: number,
  min: number,
  max: number,
): number[] {
  const xs: number[] = [];
  while (xs.length < count) {
    const x = randInt(rng, min, max);
    if (!xs.includes(x)) xs.push(x);
  }
  return xs;
}

function zerosTex(variable: string, roots: readonly number[]): string {
  const unique = [...new Set(roots)].sort((a, b) => a - b);
  return unique.map((r) => `${variable} = ${r}`).join(",\\; ");
}

function infSign(positive: boolean): string {
  return positive ? "+\\infty" : "-\\infty";
}

function jsPoly(variable: string, coeffs: readonly number[]): string {
  const degree = coeffs.length - 1;
  const parts: string[] = [];
  for (let i = 0; i < coeffs.length; i += 1) {
    const c = coeffs[i]!;
    if (c === 0) continue;
    const p = degree - i;
    const abs = Math.abs(c);
    let body: string;
    if (p === 0) body = String(abs);
    else if (p === 1) body = abs === 1 ? variable : `${abs}*${variable}`;
    else body = abs === 1 ? `${variable}^${p}` : `${abs}*${variable}^${p}`;
    if (parts.length === 0) {
      parts.push(c < 0 ? `-${body}` : body);
    } else {
      parts.push(c < 0 ? `-${body}` : `+${body}`);
    }
  }
  return parts.join("") || "0";
}

function fOf(variable: string, expr: string): string {
  return `f(${variable}) = ${expr}`;
}

function problem(
  instructionId: GeneratedProblem["instructionId"],
  promptTex: string,
  answer: string,
  graphExpr = "",
): GeneratedProblem {
  return {
    instructionId,
    promptTex,
    solutionTex: answer,
    graphExpr,
  } as GeneratedProblem;
}

export const polynomialFunctionsProblem = defineAlgebraProblem(
  "polynomial-functions",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // f(t) quadratic
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const c = randInt(rng, -8, 8);
          const coeffs = [a, b, c];
          const t = randInt(rng, -5, 5);
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(${t})`,
            `${evalPoly(coeffs, t)}`,
            jsPoly(variable, coeffs),
          );
        },

        // deg quadratic / cubic
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -6, 6);
          const c = randInt(rng, -6, 6);
          const d = randInt(rng, -6, 6);
          const cubic = rng() < 0.5;
          const coeffs = cubic ? [a, b, c, d] : [a, b, c];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; \\deg(f)`,
            `${coeffs.length - 1}`,
            jsPoly(variable, coeffs),
          );
        },

        // f(0)
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -7, 7);
          const c = randInt(rng, -9, 9);
          const coeffs = [a, b, c];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(0)`,
            `${c}`,
            jsPoly(variable, coeffs),
          );
        },

        // leading coefficient [x^n]
        () => {
          const a = nonzero(rng, -8, 8);
          const b = randInt(rng, -6, 6);
          const c = randInt(rng, -6, 6);
          const coeffs = [a, b, c];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; [${variable}^{2}]`,
            `${a}`,
            jsPoly(variable, coeffs),
          );
        },

        // f(1)
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const c = randInt(rng, -6, 6);
          const coeffs = [a, b, c];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(1)`,
            `${evalPoly(coeffs, 1)}`,
            jsPoly(variable, coeffs),
          );
        },

        // f(-1) cubic
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const c = randInt(rng, -5, 5);
          const d = randInt(rng, -5, 5);
          const coeffs = [a, b, c, d];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(-1)`,
            `${evalPoly(coeffs, -1)}`,
            jsPoly(variable, coeffs),
          );
        },

        // zeros of (x-r)(x-s)
        () => {
          const roots = distinctInts(rng, 2, -6, 6);
          return problem(
            "solve",
            `${fOf(variable, factored(1, roots, variable))},\\; f(${variable}) = 0`,
            zerosTex(variable, roots),
            jsPoly(variable, fromRoots(1, roots)),
          );
        },

        // (f+g)(x) two linears
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -8, 8);
          const c = nonzero(rng, -6, 6);
          const d = randInt(rng, -8, 8);
          const sum = padAdd([a, b], [c, d]);
          return problem(
            "simplify",
            `f(${variable}) = ${polyTex(variable, [a, b])},\\; g(${variable}) = ${polyTex(variable, [c, d])},\\; (f+g)(${variable})`,
            polyTex(variable, sum),
            jsPoly(variable, sum),
          );
        },

        // (f+g)(t)
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const c = nonzero(rng, -5, 5);
          const d = randInt(rng, -6, 6);
          const t = randInt(rng, -5, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${polyTex(variable, [a, b])},\\; g(${variable}) = ${polyTex(variable, [c, d])},\\; (f+g)(${t})`,
            `${evalPoly([a, b], t) + evalPoly([c, d], t)}`,
          );
        },

        // x → +∞, even degree LC > 0
        () => {
          const a = randInt(rng, 1, 6);
          const b = randInt(rng, -5, 5);
          const c = randInt(rng, -5, 5);
          const coeffs = [a, b, c];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; ${variable} \\to +\\infty,\\; f(${variable}) \\to`,
            infSign(true),
            jsPoly(variable, coeffs),
          );
        },

        // leading coefficient of a cubic
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -6, 6);
          const c = randInt(rng, -6, 6);
          const d = randInt(rng, -4, 4);
          const coeffs = [a, b, c, d];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; [${variable}^{3}]`,
            `${a}`,
            jsPoly(variable, coeffs),
          );
        },

        // f(-x) for even quadratic ax^2+c
        () => {
          const a = nonzero(rng, -6, 6);
          const c = nonzero(rng, -8, 8);
          const coeffs = [a, 0, c];
          return problem(
            "simplify",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(-${variable})`,
            polyTex(variable, coeffs),
            jsPoly(variable, coeffs),
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // f(t) cubic
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const c = randInt(rng, -5, 5);
          const d = randInt(rng, -6, 6);
          const coeffs = [a, b, c, d];
          const t = nonzero(rng, -4, 4);
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(${t})`,
            `${evalPoly(coeffs, t)}`,
            jsPoly(variable, coeffs),
          );
        },

        // deg with a missing term
        () => {
          const a = nonzero(rng, -5, 5);
          const c = randInt(rng, -6, 6);
          const d = randInt(rng, -6, 6);
          const coeffs = [a, 0, c, d];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; \\deg(f)`,
            `3`,
            jsPoly(variable, coeffs),
          );
        },

        // three linear factors, zeros
        () => {
          const roots = distinctInts(rng, 3, -5, 5);
          return problem(
            "solve",
            `${fOf(variable, factored(1, roots, variable))},\\; f(${variable}) = 0`,
            zerosTex(variable, roots),
            jsPoly(variable, fromRoots(1, roots)),
          );
        },

        // monic quadratic from zeros
        () => {
          const roots = distinctInts(rng, 2, -6, 6);
          const coeffs = fromRoots(1, roots);
          return problem(
            "simplify",
            `f(${roots[0]}) = f(${roots[1]}) = 0,\\; \\deg(f) = 2,\\; [${variable}^{2}] = 1,\\; f(${variable})`,
            polyTex(variable, coeffs),
            jsPoly(variable, coeffs),
          );
        },

        // f(-x) mixed cubic
        () => {
          const a = nonzero(rng, -4, 4);
          const b = nonzero(rng, -5, 5);
          const c = randInt(rng, -5, 5);
          const d = randInt(rng, -5, 5);
          const coeffs = [a, b, c, d];
          const flipped = coeffs.map((coef, i) =>
            (coeffs.length - 1 - i) % 2 === 0 ? coef : -coef,
          );
          return problem(
            "simplify",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(-${variable})`,
            polyTex(variable, flipped),
            jsPoly(variable, coeffs),
          );
        },

        // (fg)(t)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const c = nonzero(rng, -4, 4);
          const d = randInt(rng, -5, 5);
          const t = randInt(rng, -4, 4);
          return problem(
            "evaluate",
            `f(${variable}) = ${polyTex(variable, [a, b])},\\; g(${variable}) = ${polyTex(variable, [c, d])},\\; (fg)(${t})`,
            `${evalPoly([a, b], t) * evalPoly([c, d], t)}`,
          );
        },

        // (f-g)(t)
        () => {
          const fa = nonzero(rng, -4, 4);
          const fb = randInt(rng, -5, 5);
          const fc = randInt(rng, -5, 5);
          const ga = nonzero(rng, -4, 4);
          const gb = randInt(rng, -5, 5);
          const t = randInt(rng, -4, 4);
          return problem(
            "evaluate",
            `f(${variable}) = ${polyTex(variable, [fa, fb, fc])},\\; g(${variable}) = ${polyTex(variable, [ga, gb])},\\; (f-g)(${t})`,
            `${evalPoly([fa, fb, fc], t) - evalPoly([ga, gb], t)}`,
          );
        },

        // x → −∞, odd degree
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -4, 4);
          const d = randInt(rng, -4, 4);
          const coeffs = [a, b, c, d];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; ${variable} \\to -\\infty,\\; f(${variable}) \\to`,
            infSign(a > 0 ? false : true),
            jsPoly(variable, coeffs),
          );
        },

        // multiplicity
        () => {
          const r = nonzero(rng, -5, 5);
          const s = randInt(rng, -5, 5);
          const ss = s === r ? r + (r > 0 ? -1 : 1) : s;
          const m = pick(rng, [2, 3]);
          const roots = [...Array(m).fill(r), ss];
          return problem(
            "evaluate",
            `${fOf(variable, factored(1, roots, variable))},\\; m(${r})`,
            `${m}`,
            jsPoly(variable, fromRoots(1, roots)),
          );
        },

        // f(0) from factored form
        () => {
          const lead = nonzero(rng, -4, 4);
          const roots = distinctInts(rng, 2, -5, 5);
          const coeffs = fromRoots(lead, roots);
          return problem(
            "evaluate",
            `${fOf(variable, factored(lead, roots, variable))},\\; f(0)`,
            `${evalPoly(coeffs, 0)}`,
            jsPoly(variable, coeffs),
          );
        },

        // deg(fg)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const c = randInt(rng, -5, 5);
          const p = nonzero(rng, -4, 4);
          const q = randInt(rng, -5, 5);
          const r = randInt(rng, -5, 5);
          const s = randInt(rng, -4, 4);
          return problem(
            "evaluate",
            `f(${variable}) = ${polyTex(variable, [a, b, c])},\\; g(${variable}) = ${polyTex(variable, [p, q, r, s])},\\; \\deg(fg)`,
            `5`,
          );
        },

        // odd: f(-x) + f(x) = 0
        () => {
          const a = nonzero(rng, -4, 4);
          const c = nonzero(rng, -5, 5);
          const coeffs = [a, 0, c, 0];
          return problem(
            "simplify",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(-${variable}) + f(${variable})`,
            `0`,
            jsPoly(variable, coeffs),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // f(t) quartic
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -4, 4);
          const d = randInt(rng, -4, 4);
          const e = randInt(rng, -5, 5);
          const coeffs = [a, b, c, d, e];
          const t = nonzero(rng, -3, 3);
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(${t})`,
            `${evalPoly(coeffs, t)}`,
            jsPoly(variable, coeffs),
          );
        },

        // monic cubic from three zeros
        () => {
          const roots = distinctInts(rng, 3, -4, 5);
          const coeffs = fromRoots(1, roots);
          return problem(
            "simplify",
            `f(${roots[0]}) = f(${roots[1]}) = f(${roots[2]}) = 0,\\; \\deg(f) = 3,\\; [${variable}^{3}] = 1,\\; f(${variable})`,
            polyTex(variable, coeffs),
            jsPoly(variable, coeffs),
          );
        },

        // quadratic from two zeros and a third point
        () => {
          const roots = distinctInts(rng, 2, -5, 5);
          const a = nonzero(rng, -4, 4);
          let p = randInt(rng, -5, 5);
          while (roots.includes(p)) p = randInt(rng, -5, 5);
          const coeffs = fromRoots(a, roots);
          const q = evalPoly(coeffs, p);
          return problem(
            "simplify",
            `f(${roots[0]}) = f(${roots[1]}) = 0,\\; f(${p}) = ${q},\\; \\deg(f) = 2,\\; f(${variable})`,
            polyTex(variable, coeffs),
            jsPoly(variable, coeffs),
          );
        },

        // zeros with multiplicity listed
        () => {
          const r = nonzero(rng, -4, 4);
          let s = nonzero(rng, -5, 5);
          while (s === r) s = nonzero(rng, -5, 5);
          const roots = [r, r, s];
          return problem(
            "solve",
            `${fOf(variable, factored(1, roots, variable))},\\; f(${variable}) = 0`,
            zerosTex(variable, roots),
            jsPoly(variable, fromRoots(1, roots)),
          );
        },

        // deg(f+g) after leading-term cancel
        () => {
          const a = nonzero(rng, 2, 5);
          const b = randInt(rng, -5, 5);
          const c = randInt(rng, -5, 5);
          const d = randInt(rng, -5, 5);
          const g1 = nonzero(rng, -5, 5);
          const g1Adj = g1 === -b ? g1 + (g1 > 0 ? 1 : -1) : g1;
          const g2 = randInt(rng, -5, 5);
          const g3 = randInt(rng, -5, 5);
          const fCoeffs = [a, b, c, d];
          const gCoeffs = [-a, g1Adj, g2, g3];
          const sum = trimLead(padAdd(fCoeffs, gCoeffs));
          return problem(
            "evaluate",
            `f(${variable}) = ${polyTex(variable, fCoeffs)},\\; g(${variable}) = ${polyTex(variable, gCoeffs)},\\; \\deg(f+g)`,
            `${sum.length - 1}`,
            jsPoly(variable, sum),
          );
        },

        // both-end behavior, even degree LC < 0
        () => {
          const a = randInt(rng, -6, -1);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -4, 4);
          const d = randInt(rng, -4, 4);
          const e = randInt(rng, -4, 4);
          const coeffs = [a, b, c, d, e];
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; ${variable} \\to \\pm\\infty,\\; f(${variable}) \\to`,
            infSign(false),
            jsPoly(variable, coeffs),
          );
        },

        // (f+g)(x) quadratic + cubic
        () => {
          const fCoeffs = [
            nonzero(rng, -4, 4),
            randInt(rng, -5, 5),
            randInt(rng, -5, 5),
          ];
          const gCoeffs = [
            nonzero(rng, -4, 4),
            randInt(rng, -4, 4),
            randInt(rng, -4, 4),
            randInt(rng, -5, 5),
          ];
          const sum = padAdd(fCoeffs, gCoeffs);
          return problem(
            "simplify",
            `f(${variable}) = ${polyTex(variable, fCoeffs)},\\; g(${variable}) = ${polyTex(variable, gCoeffs)},\\; (f+g)(${variable})`,
            polyTex(variable, sum),
            jsPoly(variable, sum),
          );
        },

        // factor theorem: f(r) for cubic built from roots
        () => {
          const roots = distinctInts(rng, 3, -5, 5);
          const lead = nonzero(rng, -3, 3);
          const coeffs = fromRoots(lead, roots);
          const r = pick(rng, roots);
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(${r})`,
            `0`,
            jsPoly(variable, coeffs),
          );
        },

        // real zeros of (x² + k²)(x − r)
        () => {
          const k = randInt(rng, 2, 6);
          const r = nonzero(rng, -5, 5);
          const quad = polyTex(variable, [1, 0, k * k]);
          const coeffs = [1, -r, k * k, -r * k * k];
          return problem(
            "solve",
            `${fOf(variable, `(${quad})${parenLinear(1, -r, variable)}`)},\\; Z(f) \\cap \\mathbb{R}`,
            `\\{${r}\\}`,
            jsPoly(variable, coeffs),
          );
        },

        // f(-x) even quartic
        () => {
          const a = nonzero(rng, -3, 3);
          const c = randInt(rng, -5, 5);
          const e = randInt(rng, -6, 6);
          const coeffs = [a, 0, c, 0, e];
          return problem(
            "simplify",
            `${fOf(variable, polyTex(variable, coeffs))},\\; f(-${variable})`,
            polyTex(variable, coeffs),
            jsPoly(variable, coeffs),
          );
        },

        // Vieta sum of zeros, monic cubic
        () => {
          const roots = distinctInts(rng, 3, -5, 5);
          const coeffs = fromRoots(1, roots);
          const sum = roots[0]! + roots[1]! + roots[2]!;
          return problem(
            "evaluate",
            `${fOf(variable, polyTex(variable, coeffs))},\\; ${variable}_{1}+${variable}_{2}+${variable}_{3}`,
            `${sum}`,
            jsPoly(variable, coeffs),
          );
        },

        // (fg)(t) quadratic × linear
        () => {
          const fCoeffs = [
            nonzero(rng, -3, 3),
            randInt(rng, -4, 4),
            randInt(rng, -4, 4),
          ];
          const gCoeffs = [nonzero(rng, -4, 4), randInt(rng, -5, 5)];
          const t = nonzero(rng, -3, 3);
          return problem(
            "evaluate",
            `f(${variable}) = ${polyTex(variable, fCoeffs)},\\; g(${variable}) = ${polyTex(variable, gCoeffs)},\\; (fg)(${t})`,
            `${evalPoly(fCoeffs, t) * evalPoly(gCoeffs, t)}`,
          );
        },
      ],
    };

    const generateSelectedTemplate = pick(
      rng,
      templatesByDifficulty[difficulty],
    );
    return generateSelectedTemplate();
  },
);
