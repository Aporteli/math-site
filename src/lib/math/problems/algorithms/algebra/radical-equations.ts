import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  linear,
  selectVariable,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function sqrt(inner: string | number): string {
  return `\\sqrt{${inner}}`;
}

function cbrt(inner: string | number): string {
  return `\\sqrt[3]{${inner}}`;
}

function fourth(inner: string | number): string {
  return `\\sqrt[4]{${inner}}`;
}

function problem(
  promptTex: string,
  steps: string[],
  answer: string,
): GeneratedProblem {
  return {
    instructionId: "solve" as const,
    promptTex,
    solutionTex: aligned([...steps, answer]),
  } as GeneratedProblem;
}

export const radicalEquationsInequalitiesProblem = defineAlgebraProblem(
  "radical-equations-inequalities",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // √x = k
        () => {
          const k = randInt(rng, 1, 9);
          return problem(
            `${sqrt(variable)} = ${k}`,
            [],
            `${variable} = ${k * k}`,
          );
        },

        // √(x + a) = k
        () => {
          const k = randInt(rng, 1, 8);
          const a = nonzero(rng, -8, 8);
          return problem(
            `${sqrt(linear(1, a, variable))} = ${k}`,
            [`${linear(1, a, variable)} \\ge 0`],
            `${variable} = ${k * k - a}`,
          );
        },

        // √x = √n
        () => {
          const k = randInt(rng, 1, 9);
          return problem(
            `${sqrt(variable)} = ${sqrt(k * k)}`,
            [],
            `${variable} = ${k * k}`,
          );
        },

        // ∛x = k
        () => {
          const k = nonzero(rng, -5, 5);
          return problem(
            `${cbrt(variable)} = ${k}`,
            [],
            `${variable} = ${k * k * k}`,
          );
        },

        // √x > k, k > 0
        () => {
          const k = randInt(rng, 1, 8);
          return problem(
            `${sqrt(variable)} > ${k}`,
            [`${variable} \\ge 0`],
            `${variable} > ${k * k}`,
          );
        },

        // √x < k, k > 0
        () => {
          const k = randInt(rng, 1, 8);
          return problem(
            `${sqrt(variable)} < ${k}`,
            [`${variable} \\ge 0`],
            `0 \\le ${variable} < ${k * k}`,
          );
        },

        // √(x - a) = k, a > 0
        () => {
          const k = randInt(rng, 1, 7);
          const a = randInt(rng, 1, 8);
          return problem(
            `${sqrt(linear(1, -a, variable))} = ${k}`,
            [`${variable} \\ge ${a}`],
            `${variable} = ${a + k * k}`,
          );
        },

        // ∛(x + a) = k
        () => {
          const k = nonzero(rng, -4, 4);
          const a = nonzero(rng, -8, 8);
          return problem(
            `${cbrt(linear(1, a, variable))} = ${k}`,
            [],
            `${variable} = ${k * k * k - a}`,
          );
        },

        // √x ≥ k
        () => {
          const k = randInt(rng, 1, 8);
          return problem(
            `${sqrt(variable)} \\ge ${k}`,
            [`${variable} \\ge 0`],
            `${variable} \\ge ${k * k}`,
          );
        },

        // √(a x) = k
        () => {
          const k = randInt(rng, 2, 6);
          const a = pick(rng, [2, 4, 5, k, k * k]);
          const t = (k * k) / a;
          if (!Number.isInteger(t)) {
            const a2 = k;
            return problem(
              `${sqrt(`${a2}${variable}`)} = ${k}`,
              [`${variable} \\ge 0`],
              `${variable} = ${k}`,
            );
          }
          return problem(
            `${sqrt(`${a}${variable}`)} = ${k}`,
            [`${variable} \\ge 0`],
            `${variable} = ${t}`,
          );
        },

        // √x = 0
        () => {
          return problem(`${sqrt(variable)} = 0`, [], `${variable} = 0`);
        },

        // √(c - x) = k
        () => {
          const k = randInt(rng, 1, 7);
          const c = randInt(rng, 0, 8);
          return problem(
            `${sqrt(linear(-1, c, variable))} = ${k}`,
            [`${variable} \\le ${c}`],
            `${variable} = ${c - k * k}`,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // √(x + a) = x - b, extraneous candidate fails RHS ≥ 0
        () => {
          const b = randInt(rng, -2, 4);
          const d = randInt(rng, 2, 5);
          const t = b + d;
          const a = d * d - t;
          const u = 2 * b - t + 1;
          return problem(
            `${sqrt(linear(1, a, variable))} = ${linear(1, -b, variable)}`,
            [
              `${linear(1, -b, variable)} \\ge 0`,
              `${u}\\colon ${u - b} < 0`,
            ],
            `${variable} = ${t}`,
          );
        },

        // k √x = m
        () => {
          const n = randInt(rng, 1, 8);
          const k = randInt(rng, 2, 7);
          return problem(
            `${k}${sqrt(variable)} = ${k * n}`,
            [`${variable} \\ge 0`],
            `${variable} = ${n * n}`,
          );
        },

        // √(x + a) + m = n
        () => {
          const m = randInt(rng, 1, 6);
          const n = m + randInt(rng, 1, 7);
          const k = n - m;
          const a = nonzero(rng, -8, 8);
          return problem(
            `${sqrt(linear(1, a, variable))} + ${m} = ${n}`,
            [`${linear(1, a, variable)} \\ge 0`],
            `${variable} = ${k * k - a}`,
          );
        },

        // √(x + a) < k
        () => {
          const k = randInt(rng, 2, 8);
          const a = nonzero(rng, -6, 6);
          return problem(
            `${sqrt(linear(1, a, variable))} < ${k}`,
            [`${variable} \\ge ${-a}`],
            `${-a} \\le ${variable} < ${k * k - a}`,
          );
        },

        // √(x + a) ≥ k
        () => {
          const k = randInt(rng, 1, 7);
          const a = nonzero(rng, -6, 6);
          return problem(
            `${sqrt(linear(1, a, variable))} \\ge ${k}`,
            [`${variable} \\ge ${-a}`],
            `${variable} \\ge ${k * k - a}`,
          );
        },

        // ∛x < k
        () => {
          const k = nonzero(rng, -4, 4);
          return problem(
            `${cbrt(variable)} < ${k}`,
            [],
            `${variable} < ${k * k * k}`,
          );
        },

        // ∛(x + a) > k
        () => {
          const k = nonzero(rng, -4, 4);
          const a = nonzero(rng, -6, 6);
          return problem(
            `${cbrt(linear(1, a, variable))} > ${k}`,
            [],
            `${variable} > ${k * k * k - a}`,
          );
        },

        // √(x + a) = √(c - x)
        () => {
          const t = randInt(rng, -3, 6);
          const a = nonzero(rng, -5, 5);
          const c = 2 * t + a;
          return problem(
            `${sqrt(linear(1, a, variable))} = ${sqrt(linear(-1, c, variable))}`,
            [`${variable} \\ge ${-a},\\; ${variable} \\le ${c}`],
            `${variable} = ${t}`,
          );
        },

        // x + √x = n
        () => {
          const n = randInt(rng, 1, 7);
          return problem(
            `${variable} + ${sqrt(variable)} = ${n * n + n}`,
            [`${variable} \\ge 0`],
            `${variable} = ${n * n}`,
          );
        },

        // √(a x + b) = k
        () => {
          const k = randInt(rng, 1, 7);
          const a = randInt(rng, 2, 6);
          const t = randInt(rng, -4, 6);
          const b = k * k - a * t;
          return problem(
            `${sqrt(linear(a, b, variable))} = ${k}`,
            [`${linear(a, b, variable)} \\ge 0`],
            `${variable} = ${t}`,
          );
        },

        // √x > √k
        () => {
          const k = randInt(rng, 1, 9);
          return problem(
            `${sqrt(variable)} > ${sqrt(k)}`,
            [`${variable} \\ge 0`],
            `${variable} > ${k}`,
          );
        },

        // √x = -k → empty
        () => {
          const k = randInt(rng, 1, 9);
          return problem(`${sqrt(variable)} = -${k}`, [], "\\emptyset");
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // √(x + p) + √(x + q) = k
        () => {
          const m = randInt(rng, 1, 5);
          const n = randInt(rng, 1, 5);
          const t = randInt(rng, -2, 6);
          const p = m * m - t;
          const q = n * n - t;
          const k = m + n;
          const lo = Math.max(-p, -q);
          return problem(
            `${sqrt(linear(1, p, variable))} + ${sqrt(linear(1, q, variable))} = ${k}`,
            [`${variable} \\ge ${lo}`],
            `${variable} = ${t}`,
          );
        },

        // √(a x + b) = x - c, extraneous
        () => {
          const c = randInt(rng, -2, 4);
          const d = randInt(rng, 2, 5);
          const a = randInt(rng, 1, d - 1);
          const t = c + d;
          const b = d * d - a * t;
          const u = 2 * c + a - t;
          return problem(
            `${sqrt(linear(a, b, variable))} = ${linear(1, -c, variable)}`,
            [
              `${linear(1, -c, variable)} \\ge 0`,
              `${u}\\colon ${u - c} < 0`,
            ],
            `${variable} = ${t}`,
          );
        },

        // √x + √(x - c) = k
        () => {
          const m = randInt(rng, 2, 6);
          const n = randInt(rng, 1, m - 1);
          const t = m * m;
          const c = t - n * n;
          return problem(
            `${sqrt(variable)} + ${sqrt(linear(1, -c, variable))} = ${m + n}`,
            [`${variable} \\ge ${c}`],
            `${variable} = ${t}`,
          );
        },

        // √(x + p) > √(x + q)
        () => {
          const q = nonzero(rng, -5, 5);
          let p = nonzero(rng, -5, 5);
          while (p === q) p = nonzero(rng, -5, 5);
          const lo = Math.max(-p, -q);
          if (p > q) {
            return problem(
              `${sqrt(linear(1, p, variable))} > ${sqrt(linear(1, q, variable))}`,
              [`${variable} \\ge ${lo}`],
              `${variable} \\ge ${lo}`,
            );
          }
          return problem(
            `${sqrt(linear(1, p, variable))} > ${sqrt(linear(1, q, variable))}`,
            [`${variable} \\ge ${lo}`],
            "\\emptyset",
          );
        },

        // √√(x + a) = k
        () => {
          const k = randInt(rng, 1, 4);
          const a = nonzero(rng, -8, 8);
          return problem(
            `${sqrt(sqrt(linear(1, a, variable)))} = ${k}`,
            [`${linear(1, a, variable)} \\ge 0`],
            `${variable} = ${k ** 4 - a}`,
          );
        },

        // ∛(a x + b) = k
        () => {
          const k = nonzero(rng, -4, 4);
          const a = nonzero(rng, 2, 5);
          const t = randInt(rng, -5, 5);
          const b = k * k * k - a * t;
          return problem(
            `${cbrt(linear(a, b, variable))} = ${k}`,
            [],
            `${variable} = ${t}`,
          );
        },

        // √(x + a) = √x + k
        () => {
          const m = randInt(rng, 0, 6);
          const k = randInt(rng, 1, 5);
          const t = m * m;
          const a = k * k + 2 * k * m;
          return problem(
            `${sqrt(linear(1, a, variable))} = ${sqrt(variable)} + ${k}`,
            [`${variable} \\ge 0`],
            `${variable} = ${t}`,
          );
        },

        // √(a - x) + √(x - b) = k
        () => {
          const p = randInt(rng, 1, 4);
          const q = randInt(rng, 1, 4);
          const b = randInt(rng, -4, 4);
          const t = b + q * q;
          const a = t + p * p;
          return problem(
            `${sqrt(linear(-1, a, variable))} + ${sqrt(linear(1, -b, variable))} = ${p + q}`,
            [`${b} \\le ${variable} \\le ${a}`],
            `${variable} = ${t}`,
          );
        },

        // √x < x
        () => {
          return problem(
            `${sqrt(variable)} < ${variable}`,
            [`${variable} \\ge 0`],
            `${variable} > 1`,
          );
        },

        // k < √(x + a) < m
        () => {
          const k = randInt(rng, 1, 4);
          const m = k + randInt(rng, 1, 4);
          const a = nonzero(rng, -6, 6);
          return problem(
            `${k} < ${sqrt(linear(1, a, variable))} < ${m}`,
            [`${variable} \\ge ${-a}`],
            `${k * k - a} < ${variable} < ${m * m - a}`,
          );
        },

        // √(x + a) ≤ k
        () => {
          const k = randInt(rng, 1, 7);
          const a = nonzero(rng, -6, 6);
          return problem(
            `${sqrt(linear(1, a, variable))} \\le ${k}`,
            [`${variable} \\ge ${-a}`],
            `${-a} \\le ${variable} \\le ${k * k - a}`,
          );
        },

        // ∜x < k
        () => {
          const k = randInt(rng, 2, 5);
          return problem(
            `${fourth(variable)} < ${k}`,
            [`${variable} \\ge 0`],
            `0 \\le ${variable} < ${k ** 4}`,
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
