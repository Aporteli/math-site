import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  distinctNonzero,
  linear,
  polyTex,
  selectVariable,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

/** P = (x - r) Q + rem. Coeffs highest degree first. */
function timesLinearMinusR(
  quotient: readonly number[],
  r: number,
  rem = 0,
): number[] {
  const n = quotient.length;
  const p = Array.from({ length: n + 1 }, () => 0);
  for (let i = 0; i < n; i += 1) p[i]! += quotient[i]!;
  for (let i = 0; i < n; i += 1) p[i + 1]! -= r * quotient[i]!;
  p[n]! += rem;
  return p;
}

function tableau(r: number, coeffs: readonly number[]): string {
  const n = coeffs.length;
  const bottom = [coeffs[0]!];
  const mid: Array<number | ""> = [""];
  for (let i = 1; i < n; i += 1) {
    const prod = r * bottom[i - 1]!;
    mid.push(prod);
    bottom.push(coeffs[i]! + prod);
  }
  const cols = `c|${"r".repeat(n)}`;
  const top = coeffs.join(" & ");
  const midRow = mid.join(" & ");
  const bot = bottom.join(" & ");
  return `\\begin{array}{${cols}} ${r} & ${top} \\\\ & ${midRow} \\\\ \\hline & ${bot} \\end{array}`;
}

function divide(
  variable: string,
  r: number,
  quotient: readonly number[],
  rem = 0,
  instructionId: GeneratedProblem["instructionId"] = "simplify",
): GeneratedProblem {
  const p = timesLinearMinusR(quotient, r, rem);
  const divisor = linear(1, -r, variable);
  const qTex = polyTex(variable, quotient);
  const result =
    rem === 0
      ? `= ${qTex}`
      : `= ${qTex} + \\dfrac{${rem}}{${divisor}}`;

  if (instructionId === "evaluate") {
    return {
      instructionId,
      promptTex: `${polyTex(variable, p)},\\; ${variable} = ${r}`,
      solutionTex: aligned([tableau(r, p), `= ${rem}`]),
    } as GeneratedProblem;
  }

  return {
    instructionId,
    promptTex: `\\left(${polyTex(variable, p)}\\right) \\div \\left(${divisor}\\right)`,
    solutionTex: aligned([tableau(r, p), result]),
  } as GeneratedProblem;
}

export const syntheticDivisionProblem = defineAlgebraProblem(
  "synthetic-division",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // (x-a)(x-b) ÷ (x-a)
        () => {
          const a = nonzero(rng, -6, 6);
          const b = distinctNonzero(rng, -6, 6, [a]);
          return divide(variable, a, [1, -b], 0);
        },

        // (x+a)(x+b) ÷ (x+a)
        () => {
          const a = randInt(rng, 2, 7);
          const b = randInt(rng, 1, 7);
          return divide(variable, -a, [1, b], 0);
        },

        // (x-a)(x-b) + R
        () => {
          const a = nonzero(rng, -5, 6);
          const b = distinctNonzero(rng, -5, 6, [a]);
          const rem = nonzero(rng, -8, 8);
          return divide(variable, a, [1, -b], rem);
        },

        // (x^2 - n^2) ÷ (x-n)
        () => {
          const n = randInt(rng, 2, 9);
          return divide(variable, n, [1, n], 0);
        },

        // x(x-a) ÷ (x-a)
        () => {
          const a = nonzero(rng, -7, 7);
          return divide(variable, a, [1, 0], 0);
        },

        // remainder theorem, quadratic
        () => {
          const a = nonzero(rng, -6, 6);
          const b = distinctNonzero(rng, -6, 6, [a]);
          const rem = nonzero(rng, -9, 9);
          return divide(variable, a, [1, -b], rem, "evaluate");
        },

        // cubic, remainder 0
        () => {
          const a = nonzero(rng, -4, 5);
          const b = distinctNonzero(rng, -4, 5, [a]);
          const c = distinctNonzero(rng, -4, 5, [a, b]);
          return divide(variable, a, [1, -(b + c), b * c], 0);
        },

        // leading 2
        () => {
          const a = nonzero(rng, -5, 5);
          const b = distinctNonzero(rng, -5, 5, [a]);
          return divide(variable, a, [2, -2 * b], 0);
        },

        // x^2 + k  ÷ (x-a)
        () => {
          const a = nonzero(rng, -6, 6);
          const k = nonzero(rng, -9, 9);
          return divide(variable, a, [1, a], k);
        },

        // ÷ x  (r = 0)
        () => {
          const b = nonzero(rng, -6, 6);
          const c = nonzero(rng, -6, 6);
          return divide(variable, 0, [1, b, c], 0);
        },

        // (x-a)^2 ÷ (x-a)
        () => {
          const a = nonzero(rng, -7, 7);
          return divide(variable, a, [1, -a], 0);
        },

        // cubic with remainder
        () => {
          const a = nonzero(rng, -4, 5);
          const b = distinctNonzero(rng, -4, 5, [a]);
          const rem = nonzero(rng, -7, 7);
          return divide(variable, a, [1, -b], rem);
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // cubic, three roots
        () => {
          const a = nonzero(rng, -5, 5);
          const b = distinctNonzero(rng, -5, 5, [a]);
          const c = distinctNonzero(rng, -5, 5, [a, b]);
          return divide(variable, a, [1, -(b + c), b * c], 0);
        },

        // cubic, remainder
        () => {
          const a = nonzero(rng, -5, 5);
          const b = distinctNonzero(rng, -6, 6, [a]);
          const c = nonzero(rng, -6, 6);
          const rem = nonzero(rng, -9, 9);
          return divide(variable, a, [1, b, c], rem);
        },

        // missing x^2: a + s + t = 0
        () => {
          const a = nonzero(rng, -5, 5);
          const s = distinctNonzero(rng, -5, 5, [a, -a]);
          const t = -a - s;
          return divide(variable, a, [1, -(s + t), s * t], 0);
        },

        // leading 3
        () => {
          const a = nonzero(rng, -4, 5);
          const b = distinctNonzero(rng, -5, 5, [a]);
          const c = nonzero(rng, -5, 5);
          return divide(variable, a, [3, b, c], 0);
        },

        // remainder theorem, cubic
        () => {
          const a = nonzero(rng, -5, 5);
          const b = nonzero(rng, -5, 5);
          const c = nonzero(rng, -5, 5);
          const rem = nonzero(rng, -8, 8);
          return divide(variable, a, [1, b, c], rem, "evaluate");
        },

        // divide by x+k, cubic
        () => {
          const k = randInt(rng, 2, 6);
          const b = nonzero(rng, -5, 5);
          const c = nonzero(rng, -5, 5);
          return divide(variable, -k, [1, b, c], 0);
        },

        // quartic, remainder 0
        () => {
          const a = nonzero(rng, -4, 4);
          const b = distinctNonzero(rng, -4, 4, [a]);
          const c = distinctNonzero(rng, -4, 4, [a, b]);
          const d = distinctNonzero(rng, -4, 4, [a, b, c]);
          const q1 = -(b + c + d);
          const q2 = b * c + b * d + c * d;
          const q3 = -b * c * d;
          return divide(variable, a, [1, q1, q2, q3], 0);
        },

        // P(r) = 0
        () => {
          const a = nonzero(rng, -5, 5);
          const b = distinctNonzero(rng, -5, 5, [a]);
          const c = distinctNonzero(rng, -5, 5, [a, b]);
          return divide(variable, a, [1, -(b + c), b * c], 0, "evaluate");
        },

        // quadratic quotient + remainder
        () => {
          const a = nonzero(rng, -5, 5);
          const p = nonzero(rng, -5, 5);
          const q = nonzero(rng, -5, 5);
          const rem = nonzero(rng, -8, 8);
          return divide(variable, a, [1, p, q], rem);
        },

        // negative leading
        () => {
          const a = nonzero(rng, -5, 5);
          const b = nonzero(rng, -5, 5);
          const c = nonzero(rng, -5, 5);
          return divide(variable, a, [-1, b, c], 0);
        },

        // (x-a)(2x^2 + bx + c)
        () => {
          const a = nonzero(rng, -4, 5);
          const b = nonzero(rng, -6, 6);
          const c = nonzero(rng, -6, 6);
          return divide(variable, a, [2, b, c], 0);
        },

        // missing x term: q2 = r q1
        () => {
          const a = nonzero(rng, -5, 5);
          const q1 = nonzero(rng, -5, 5);
          const q2 = a * q1;
          return divide(variable, a, [1, q1, q2], 0);
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // quartic four roots
        () => {
          const a = nonzero(rng, -4, 4);
          const b = distinctNonzero(rng, -4, 4, [a]);
          const c = distinctNonzero(rng, -4, 4, [a, b]);
          const d = distinctNonzero(rng, -4, 4, [a, b, c]);
          return divide(variable, a, [
            1,
            -(b + c + d),
            b * c + b * d + c * d,
            -b * c * d,
          ], 0);
        },

        // quartic with remainder
        () => {
          const a = nonzero(rng, -4, 5);
          const rem = nonzero(rng, -9, 9);
          return divide(
            variable,
            a,
            [1, nonzero(rng, -5, 5), nonzero(rng, -5, 5), nonzero(rng, -5, 5)],
            rem,
          );
        },

        // synthetic twice
        () => {
          const a = nonzero(rng, -4, 5);
          const b = distinctNonzero(rng, -4, 5, [a]);
          const c = distinctNonzero(rng, -4, 5, [a, b]);
          const p = timesLinearMinusR([1, -(b + c), b * c], a, 0);
          const after = timesLinearMinusR([1, -c], b, 0);
          return {
            instructionId: "simplify" as const,
            promptTex: `\\left(${polyTex(variable, p)}\\right) \\div \\left(${linear(1, -a, variable)}\\right)`,
            solutionTex: aligned([
              tableau(a, p),
              `= ${polyTex(variable, after)}`,
              tableau(b, after),
              `= ${linear(1, -c, variable)}`,
            ]),
          } as GeneratedProblem;
        },

        // two missing terms: (x-a)(x^2 + k)
        () => {
          const a = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          return divide(variable, a, [1, 0, k], 0);
        },

        // leading -2, degree 4
        () => {
          const a = nonzero(rng, -4, 4);
          return divide(
            variable,
            a,
            [-2, nonzero(rng, -4, 4), nonzero(rng, -4, 4), nonzero(rng, -4, 4)],
            0,
          );
        },

        // remainder theorem, degree 4
        () => {
          const a = nonzero(rng, -5, 5);
          const rem = nonzero(rng, -10, 10);
          return divide(
            variable,
            a,
            [1, nonzero(rng, -5, 5), nonzero(rng, -5, 5), nonzero(rng, -5, 5)],
            rem,
            "evaluate",
          );
        },

        // cubic factored after synthetic
        () => {
          const a = nonzero(rng, -5, 5);
          const b = distinctNonzero(rng, -5, 5, [a]);
          const c = distinctNonzero(rng, -5, 5, [a, b]);
          const p = timesLinearMinusR([1, -(b + c), b * c], a, 0);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, p),
            solutionTex: aligned([
              tableau(a, p),
              `= ${linear(1, -a, variable)}\\,${linear(1, -b, variable)}\\,${linear(1, -c, variable)}`,
            ]),
          } as GeneratedProblem;
        },

        // degree 5, remainder 0
        () => {
          const a = nonzero(rng, -3, 4);
          return divide(
            variable,
            a,
            [
              1,
              nonzero(rng, -4, 4),
              nonzero(rng, -4, 4),
              nonzero(rng, -4, 4),
              nonzero(rng, -4, 4),
            ],
            0,
          );
        },

        // (x-a)(x-b)(x^2 + k)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = distinctNonzero(rng, -4, 4, [a]);
          const k = nonzero(rng, -5, 5);
          const quad = timesLinearMinusR([1, 0, k], b, 0);
          return divide(variable, a, quad, 0);
        },

        // negative r, degree 4
        () => {
          const k = randInt(rng, 2, 6);
          return divide(
            variable,
            -k,
            [1, nonzero(rng, -5, 5), nonzero(rng, -5, 5), nonzero(rng, -5, 5)],
            nonzero(rng, -8, 8),
          );
        },

        // rewrite P = (x-r)Q + R
        () => {
          const a = nonzero(rng, -5, 5);
          const q = [1, nonzero(rng, -5, 5), nonzero(rng, -5, 5)] as const;
          const rem = nonzero(rng, -8, 8);
          const p = timesLinearMinusR(q, a, rem);
          const divisor = linear(1, -a, variable);
          return {
            instructionId: "simplify" as const,
            promptTex: polyTex(variable, p),
            solutionTex: aligned([
              tableau(a, p),
              `= \\left(${divisor}\\right)\\left(${polyTex(variable, q)}\\right) + ${rem}`,
            ]),
          } as GeneratedProblem;
        },

        // cubic → quadratic quotient, then remainder
        () => {
          const a = nonzero(rng, -5, 5);
          const b = nonzero(rng, -6, 6);
          const c = nonzero(rng, -6, 6);
          const rem = nonzero(rng, -9, 9);
          return divide(variable, a, [2, b, c], rem);
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
