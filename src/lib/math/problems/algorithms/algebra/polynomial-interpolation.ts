import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  polyTex,
  selectVariable,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

/** Coeffs highest degree first. */
function evalPoly(coeffs: readonly number[], x: number): number {
  return coeffs.reduce((acc, coef) => acc * x + coef, 0);
}

function distinctXs(
  rng: () => number,
  count: number,
  min = -4,
  max = 5,
): number[] {
  const xs: number[] = [];
  while (xs.length < count) {
    const x = randInt(rng, min, max);
    if (!xs.includes(x)) xs.push(x);
  }
  return xs;
}

function samples(
  coeffs: readonly number[],
  xs: readonly number[],
): Array<[number, number]> {
  return xs.map((x) => [x, evalPoly(coeffs, x)]);
}

function conditions(pts: Array<[number, number]>): string {
  return pts.map(([x, y]) => `P(${x}) = ${y}`).join(",\\; ");
}

/** `(x - node)` with a proper sign. */
function subNode(variable: string, node: number): string {
  if (node === 0) return variable;
  if (node > 0) return `${variable} - ${node}`;
  return `${variable} + ${-node}`;
}

function signedTimes(k: number, factor: string): string {
  if (k === 1) return `+ ${factor}`;
  if (k === -1) return `- ${factor}`;
  if (k > 0) return `+ ${k}${factor}`;
  return `- ${-k}${factor}`;
}

function interpolant(
  variable: string,
  coeffs: readonly number[],
  xs: readonly number[],
  instructionId: GeneratedProblem["instructionId"] = "simplify",
  extraX?: number,
): GeneratedProblem {
  const pts = samples(coeffs, xs);
  const pTex = `P(${variable}) = ${polyTex(variable, coeffs)}`;
  if (instructionId === "evaluate" && extraX !== undefined) {
    const y = evalPoly(coeffs, extraX);
    return {
      instructionId,
      promptTex: `${conditions(pts)},\\; \\deg P \\le ${coeffs.length - 1},\\; P(${extraX}) = ?`,
      solutionTex: aligned([pTex, `P(${extraX}) = ${y}`]),
    } as GeneratedProblem;
  }
  return {
    instructionId,
    promptTex: `${conditions(pts)},\\; \\deg P \\le ${coeffs.length - 1}`,
    solutionTex: aligned([pTex]),
  } as GeneratedProblem;
}

export const polynomialInterpolationProblem = defineAlgebraProblem(
  "polynomial-interpolation",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // two points → linear
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const xs = distinctXs(rng, 2, -3, 5);
          return interpolant(variable, [a, b], xs);
        },

        // through origin
        () => {
          const a = nonzero(rng, -6, 6);
          const t = nonzero(rng, -5, 5);
          return interpolant(variable, [a, 0], [0, t]);
        },

        // evaluate linear interpolant
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const xs = distinctXs(rng, 2, -3, 4);
          let extra = randInt(rng, -4, 6);
          while (xs.includes(extra)) extra = randInt(rng, -4, 6);
          return interpolant(variable, [a, b], xs, "evaluate", extra);
        },

        // P(0), P(1)
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -6, 6);
          return interpolant(variable, [a, b], [0, 1]);
        },

        // Lagrange two-point written out
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -5, 5);
          const x0 = randInt(rng, -3, 1);
          const x1 = x0 + randInt(rng, 1, 4);
          const y0 = evalPoly([a, b], x0);
          const y1 = evalPoly([a, b], x1);
          const d = x0 - x1;
          return {
            instructionId: "simplify" as const,
            promptTex: `${conditions([[x0, y0], [x1, y1]])},\\; \\deg P \\le 1`,
            solutionTex: aligned([
              `P(${variable}) = ${y0}\\,\\dfrac{${subNode(variable, x1)}}{${d}} + ${y1}\\,\\dfrac{${subNode(variable, x0)}}{${x1 - x0}}`,
              `P(${variable}) = ${polyTex(variable, [a, b])}`,
            ]),
          } as GeneratedProblem;
        },

        // Newton two-point
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -5, 5);
          const x0 = randInt(rng, -3, 2);
          const x1 = x0 + randInt(rng, 1, 4);
          const y0 = evalPoly([a, b], x0);
          const y1 = evalPoly([a, b], x1);
          return {
            instructionId: "simplify" as const,
            promptTex: `${conditions([[x0, y0], [x1, y1]])},\\; \\deg P \\le 1`,
            solutionTex: aligned([
              `P(${variable}) = ${y0} ${signedTimes(a, `(${subNode(variable, x0)})`)}`,
              `P(${variable}) = ${polyTex(variable, [a, b])}`,
            ]),
          } as GeneratedProblem;
        },

        // find P(0)
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const xs = distinctXs(rng, 2, 1, 6);
          return interpolant(variable, [a, b], xs, "evaluate", 0);
        },

        // three collinear points
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const xs = distinctXs(rng, 3, -3, 5);
          return interpolant(variable, [a, b], xs);
        },

        // table x = 1, 2
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -6, 6);
          return interpolant(variable, [a, b], [1, 2]);
        },

        // constant interpolant
        () => {
          const b = nonzero(rng, -8, 8);
          const xs = distinctXs(rng, 2, -4, 5);
          return interpolant(variable, [b], xs);
        },

        // inverse: find x with P(x) = y, linear
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -5, 5);
          const xs = distinctXs(rng, 2, -3, 4);
          let t = randInt(rng, -5, 6);
          while (xs.includes(t)) t = randInt(rng, -6, 7);
          const y = evalPoly([a, b], t);
          const pts = samples([a, b], xs);
          return {
            instructionId: "solve" as const,
            promptTex: `${conditions(pts)},\\; \\deg P \\le 1,\\; P(${variable}) = ${y}`,
            solutionTex: aligned([
              `P(${variable}) = ${polyTex(variable, [a, b])}`,
              `${variable} = ${t}`,
            ]),
          } as GeneratedProblem;
        },

        // through (a, a) and (b, b) → identity if... not always. Use P(x)=x
        () => {
          const x0 = nonzero(rng, -5, 5);
          const x1 = distinctXs(rng, 1, -5, 5).find((x) => x !== x0) ?? x0 + 1;
          return interpolant(variable, [1, 0], [x0, x1]);
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // quadratic, 3 points
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -5, 5);
          return interpolant(variable, [a, b, c], distinctXs(rng, 3, -3, 4));
        },

        // evaluate quadratic interpolant
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -5, 5);
          const xs = distinctXs(rng, 3, -3, 3);
          let extra = randInt(rng, -4, 5);
          while (xs.includes(extra)) extra = randInt(rng, -4, 5);
          return interpolant(variable, [a, b, c], xs, "evaluate", extra);
        },

        // Newton DD, equally spaced
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -4, 4);
          const x0 = randInt(rng, -2, 1);
          const xs = [x0, x0 + 1, x0 + 2];
          const pts = samples([a, b, c], xs);
          const d1 = pts[1]![1] - pts[0]![1];
          const d2 = pts[2]![1] - pts[1]![1];
          const dd2 = d2 - d1;
          return {
            instructionId: "simplify" as const,
            promptTex: `${conditions(pts)},\\; \\deg P \\le 2`,
            solutionTex: aligned([
              `f[${xs[0]}, ${xs[1]}] = ${d1},\\; f[${xs[1]}, ${xs[2]}] = ${d2}`,
              `f[${xs[0]}, ${xs[1]}, ${xs[2]}] = ${dd2 / 2}`,
              `P(${variable}) = ${polyTex(variable, [a, b, c])}`,
            ]),
          } as GeneratedProblem;
        },

        // P(-1), P(0), P(1)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -5, 5);
          return interpolant(variable, [a, b, c], [-1, 0, 1]);
        },

        // even quadratic: P(-t)=P(t)
        () => {
          const a = nonzero(rng, -4, 4);
          const c = randInt(rng, -6, 6);
          const t = randInt(rng, 1, 4);
          return interpolant(variable, [a, 0, c], [-t, 0, t]);
        },

        // finite differences: next value
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -3, 3);
          const c = randInt(rng, -4, 4);
          const x0 = randInt(rng, 0, 2);
          const xs = [x0, x0 + 1, x0 + 2];
          const next = x0 + 3;
          const pts = samples([a, b, c], xs);
          const y = evalPoly([a, b, c], next);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${conditions(pts)},\\; \\deg P \\le 2,\\; P(${next}) = ?`,
            solutionTex: aligned([
              `P(${variable}) = ${polyTex(variable, [a, b, c])}`,
              `P(${next}) = ${y}`,
            ]),
          } as GeneratedProblem;
        },

        // Lagrange evaluate at 0
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -5, 5);
          const xs = distinctXs(rng, 3, 1, 5);
          return interpolant(variable, [a, b, c], xs, "evaluate", 0);
        },

        // missing midpoint, linear
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const x0 = randInt(rng, -3, 2);
          const mid = x0 + 1;
          const x2 = x0 + 2;
          return interpolant(variable, [a, b], [x0, x2], "evaluate", mid);
        },

        // monic quadratic
        () => {
          const b = randInt(rng, -5, 5);
          const c = randInt(rng, -5, 5);
          return interpolant(variable, [1, b, c], distinctXs(rng, 3, -3, 4));
        },

        // Newton form displayed
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -3, 3);
          const c = randInt(rng, -4, 4);
          const x0 = randInt(rng, -2, 1);
          const x1 = x0 + 1;
          const x2 = x0 + 2;
          const y0 = evalPoly([a, b, c], x0);
          const d1 = evalPoly([a, b, c], x1) - y0;
          return {
            instructionId: "simplify" as const,
            promptTex: `${conditions(samples([a, b, c], [x0, x1, x2]))},\\; \\deg P \\le 2`,
            solutionTex: aligned([
              `P(${variable}) = ${y0} ${signedTimes(d1, `(${subNode(variable, x0)})`)} ${signedTimes(a, `(${subNode(variable, x0)})(${subNode(variable, x1)})`)}`,
              `P(${variable}) = ${polyTex(variable, [a, b, c])}`,
            ]),
          } as GeneratedProblem;
        },

        // coefficient of x^2
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -4, 4);
          const c = randInt(rng, -4, 4);
          const pts = samples([a, b, c], distinctXs(rng, 3, -3, 4));
          return {
            instructionId: "evaluate" as const,
            promptTex: `${conditions(pts)},\\; \\deg P \\le 2,\\; [${variable}^{2}]P`,
            solutionTex: aligned([
              `P(${variable}) = ${polyTex(variable, [a, b, c])}`,
              `${a}`,
            ]),
          } as GeneratedProblem;
        },

        // one root among nodes
        () => {
          const r = nonzero(rng, -3, 3);
          const s = randInt(rng, -3, 3);
          const t = nonzero(rng, -3, 3);
          const coeffs = [1, -(r + s), r * s];
          if (t !== 0) {
            coeffs[0] = t;
            coeffs[1] = -t * (r + s);
            coeffs[2] = t * r * s;
          }
          const xs = distinctXs(rng, 3, -4, 4);
          if (!xs.includes(r)) xs[0] = r;
          return interpolant(variable, coeffs, xs);
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // cubic, 4 points
        () => {
          const a = nonzero(rng, -2, 2);
          const b = randInt(rng, -3, 3);
          const c = randInt(rng, -3, 3);
          const d = randInt(rng, -4, 4);
          return interpolant(variable, [a, b, c, d], distinctXs(rng, 4, -3, 4));
        },

        // evaluate cubic interpolant
        () => {
          const a = nonzero(rng, -2, 2);
          const b = randInt(rng, -3, 3);
          const c = randInt(rng, -3, 3);
          const d = randInt(rng, -4, 4);
          const xs = distinctXs(rng, 4, -3, 3);
          let extra = randInt(rng, -4, 5);
          while (xs.includes(extra)) extra = randInt(rng, -4, 5);
          return interpolant(variable, [a, b, c, d], xs, "evaluate", extra);
        },

        // Newton 4 equally spaced
        () => {
          const a = nonzero(rng, -2, 2);
          const b = randInt(rng, -2, 2);
          const c = randInt(rng, -3, 3);
          const d = randInt(rng, -3, 3);
          const x0 = randInt(rng, -1, 1);
          const xs = [x0, x0 + 1, x0 + 2, x0 + 3];
          return interpolant(variable, [a, b, c, d], xs);
        },

        // divided-difference table
        () => {
          const a = nonzero(rng, -2, 2);
          const b = randInt(rng, -3, 3);
          const c = randInt(rng, -3, 3);
          const x0 = randInt(rng, -1, 1);
          const xs = [x0, x0 + 1, x0 + 2];
          const ys = xs.map((x) => evalPoly([a, b, c], x));
          const d01 = ys[1]! - ys[0]!;
          const d12 = ys[2]! - ys[1]!;
          const d012 = (d12 - d01) / 2;
          return {
            instructionId: "simplify" as const,
            promptTex: `${conditions(xs.map((x, i) => [x, ys[i]!] as [number, number]))},\\; \\deg P \\le 2`,
            solutionTex: aligned([
              `\\begin{array}{c|ccc} ${xs[0]} & ${ys[0]} \\\\ ${xs[1]} & ${ys[1]} & ${d01} \\\\ ${xs[2]} & ${ys[2]} & ${d12} & ${d012} \\end{array}`,
              `P(${variable}) = ${polyTex(variable, [a, b, c])}`,
            ]),
          } as GeneratedProblem;
        },

        // inverse interpolation: P(x)=y
        () => {
          const a = nonzero(rng, -2, 2);
          const b = randInt(rng, -3, 3);
          const c = randInt(rng, -3, 3);
          const xs = distinctXs(rng, 3, -3, 3);
          let t = randInt(rng, -4, 4);
          while (xs.includes(t)) t = randInt(rng, -5, 5);
          const y = evalPoly([a, b, c], t);
          return {
            instructionId: "solve" as const,
            promptTex: `${conditions(samples([a, b, c], xs))},\\; \\deg P \\le 2,\\; P(${variable}) = ${y}`,
            solutionTex: aligned([
              `P(${variable}) = ${polyTex(variable, [a, b, c])}`,
              `${variable} = ${t}`,
            ]),
          } as GeneratedProblem;
        },

        // degree ≤ 3, 4 points
        () => {
          const coeffs = [
            nonzero(rng, -2, 2),
            randInt(rng, -3, 3),
            randInt(rng, -3, 3),
            randInt(rng, -3, 3),
          ];
          return interpolant(variable, coeffs, distinctXs(rng, 4, -3, 4));
        },

        // equally spaced, next term via Δ
        () => {
          const coeffs = [
            nonzero(rng, -2, 2),
            randInt(rng, -2, 2),
            randInt(rng, -3, 3),
            randInt(rng, -3, 3),
          ];
          const xs = [0, 1, 2, 3];
          return interpolant(variable, coeffs, xs, "evaluate", 4);
        },

        // leading coefficient
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -3, 3);
          const c = randInt(rng, -3, 3);
          const d = randInt(rng, -3, 3);
          const pts = samples([a, b, c, d], distinctXs(rng, 4, -3, 4));
          return {
            instructionId: "evaluate" as const,
            promptTex: `${conditions(pts)},\\; \\deg P \\le 3,\\; [${variable}^{3}]P`,
            solutionTex: aligned([
              `P(${variable}) = ${polyTex(variable, [a, b, c, d])}`,
              `${a}`,
            ]),
          } as GeneratedProblem;
        },

        // P(p) + P(q) at new nodes
        () => {
          const coeffs = [
            nonzero(rng, -2, 2),
            randInt(rng, -3, 3),
            randInt(rng, -3, 3),
          ];
          const xs = distinctXs(rng, 3, -3, 3);
          const extra = distinctXs(rng, 2, -5, 5).filter((x) => !xs.includes(x));
          const p = extra[0] ?? 6;
          const q = extra[1] ?? -6;
          const sum = evalPoly(coeffs, p) + evalPoly(coeffs, q);
          return {
            instructionId: "evaluate" as const,
            promptTex: `${conditions(samples(coeffs, xs))},\\; \\deg P \\le 2,\\; P(${p}) + P(${q})`,
            solutionTex: aligned([
              `P(${variable}) = ${polyTex(variable, coeffs)}`,
              `${sum}`,
            ]),
          } as GeneratedProblem;
        },

        // missing x^2 term (coeff 0)
        () => {
          const a = nonzero(rng, -3, 3);
          const c = randInt(rng, -4, 4);
          const d = randInt(rng, -4, 4);
          return interpolant(
            variable,
            [a, 0, c, d],
            distinctXs(rng, 4, -3, 4),
          );
        },

        // cubic through origin
        () => {
          const a = nonzero(rng, -2, 2);
          const b = randInt(rng, -3, 3);
          const c = randInt(rng, -3, 3);
          const xs = distinctXs(rng, 3, 1, 5);
          return interpolant(variable, [a, b, c, 0], [0, ...xs].slice(0, 4));
        },

        // Newton cubic equally spaced displayed
        () => {
          const a = nonzero(rng, -2, 2);
          const b = randInt(rng, -2, 2);
          const c = randInt(rng, -3, 3);
          const d = randInt(rng, -3, 3);
          const xs = [0, 1, 2, 3];
          const pts = samples([a, b, c, d], xs);
          const y0 = pts[0]![1];
          const d1 = pts[1]![1] - y0;
          const d2 = (pts[2]![1] - 2 * pts[1]![1] + y0) / 2;
          return {
            instructionId: "simplify" as const,
            promptTex: `${conditions(pts)},\\; \\deg P \\le 3`,
            solutionTex: aligned([
              `P(${variable}) = ${y0} ${signedTimes(d1, variable)} ${signedTimes(d2, `${variable}(${variable} - 1)`)} ${signedTimes(a, `${variable}(${variable} - 1)(${variable} - 2)`)}`,
              `P(${variable}) = ${polyTex(variable, [a, b, c, d])}`,
            ]),
          } as GeneratedProblem;
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
