import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  linear,
  selectVariable,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function absTex(inner: string): string {
  return `\\lvert ${inner} \\rvert`;
}

function paramOf(variable: string): string {
  if (variable !== "a") return "a";
  return "k";
}

function cases(rows: readonly (readonly [string, string])[]): string {
  return `\\begin{cases} ${rows.map(([value, cond]) => `${value}, & ${cond}`).join(" \\\\ ")} \\end{cases}`;
}

function eqAns(
  variable: string,
  sols: readonly (string | number)[],
): string {
  return sols.map((sol) => `${variable} = ${sol}`).join(",\\; ");
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

export const absoluteValueParametricProblem = defineAlgebraProblem(
  "absolute-value-parametric",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);
    const p = paramOf(variable);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // |x| = k
        () => {
          const k = randInt(rng, 1, 9);
          return problem(
            `${absTex(variable)} = ${k}`,
            [],
            eqAns(variable, [-k, k]),
          );
        },

        // |x - c| = k
        () => {
          const c = randInt(rng, -6, 6);
          const k = randInt(rng, 1, 8);
          return problem(
            `${absTex(linear(1, -c, variable))} = ${k}`,
            [],
            eqAns(variable, [c - k, c + k].sort((x, y) => x - y)),
          );
        },

        // |x| < k
        () => {
          const k = randInt(rng, 1, 9);
          return problem(
            `${absTex(variable)} < ${k}`,
            [],
            `${-k} < ${variable} < ${k}`,
          );
        },

        // |x| > k
        () => {
          const k = randInt(rng, 1, 8);
          return problem(
            `${absTex(variable)} > ${k}`,
            [],
            `${variable} < ${-k} \\lor ${variable} > ${k}`,
          );
        },

        // |x| = 0
        () => {
          return problem(`${absTex(variable)} = 0`, [], `${variable} = 0`);
        },

        // |a x| = k
        () => {
          const n = randInt(rng, 1, 8);
          const a = pick(rng, [2, 3, 4, 5]);
          return problem(
            `${absTex(`${a}${variable}`)} = ${a * n}`,
            [],
            eqAns(variable, [-n, n]),
          );
        },

        // |x| ≥ k
        () => {
          const k = randInt(rng, 1, 8);
          return problem(
            `${absTex(variable)} \\ge ${k}`,
            [],
            `${variable} \\le ${-k} \\lor ${variable} \\ge ${k}`,
          );
        },

        // |x - c| < k
        () => {
          const c = randInt(rng, -5, 5);
          const k = randInt(rng, 1, 7);
          return problem(
            `${absTex(linear(1, -c, variable))} < ${k}`,
            [],
            `${c - k} < ${variable} < ${c + k}`,
          );
        },

        // a x = b, a ≠ 0
        () => {
          const b = nonzero(rng, -8, 8);
          return problem(
            `${p}${variable} = ${b}`,
            [`${p} \\ne 0`],
            `${variable} = \\dfrac{${b}}{${p}}`,
          );
        },

        // |x| = a
        () => {
          return problem(
            `${absTex(variable)} = ${p}`,
            [],
            `${variable} = ${cases([
              [`\\pm ${p}`, `${p} > 0`],
              ["0", `${p} = 0`],
              ["\\emptyset", `${p} < 0`],
            ])}`,
          );
        },

        // x - a = 0
        () => {
          return problem(
            `${linear(1, 0, variable)} - ${p} = 0`,
            [],
            `${variable} = ${p}`,
          );
        },

        // (a + 1) x = 0
        () => {
          return problem(
            `(${p} + 1)${variable} = 0`,
            [],
            `${variable} = ${cases([
              ["0", `${p} \\ne -1`],
              [`\\mathbb{R}`, `${p} = -1`],
            ])}`,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // |2x - (t+s)| = |t - s|
        () => {
          let t = randInt(rng, -6, 6);
          let s = randInt(rng, -6, 6);
          while (s === t) s = randInt(rng, -6, 6);
          const mid = t + s;
          const dist = Math.abs(t - s);
          return problem(
            `${absTex(linear(2, -mid, variable))} = ${dist}`,
            [],
            eqAns(variable, [t, s].sort((x, y) => x - y)),
          );
        },

        // |x - c| ≤ k
        () => {
          const c = randInt(rng, -5, 5);
          const k = randInt(rng, 1, 7);
          return problem(
            `${absTex(linear(1, -c, variable))} \\le ${k}`,
            [],
            `${c - k} \\le ${variable} \\le ${c + k}`,
          );
        },

        // |x - c| > k
        () => {
          const c = randInt(rng, -5, 5);
          const k = randInt(rng, 1, 6);
          return problem(
            `${absTex(linear(1, -c, variable))} > ${k}`,
            [],
            `${variable} < ${c - k} \\lor ${variable} > ${c + k}`,
          );
        },

        // |x - r| = |x - s|
        () => {
          let r = randInt(rng, -7, 7);
          let s = randInt(rng, -7, 7);
          while ((r + s) % 2 !== 0 || r === s) {
            r = randInt(rng, -7, 7);
            s = randInt(rng, -7, 7);
          }
          return problem(
            `${absTex(linear(1, -r, variable))} = ${absTex(linear(1, -s, variable))}`,
            [],
            `${variable} = ${(r + s) / 2}`,
          );
        },

        // |x| + |x - c| = d, d > c > 0
        () => {
          const c = randInt(rng, 2, 8);
          const extra = 2 * randInt(rng, 1, 3);
          const d = c + extra;
          const left = (c - d) / 2;
          const right = (c + d) / 2;
          return problem(
            `${absTex(variable)} + ${absTex(linear(1, -c, variable))} = ${d}`,
            [],
            eqAns(variable, [left, right]),
          );
        },

        // |x - c| ≥ k
        () => {
          const c = randInt(rng, -5, 5);
          const k = randInt(rng, 1, 6);
          return problem(
            `${absTex(linear(1, -c, variable))} \\ge ${k}`,
            [],
            `${variable} \\le ${c - k} \\lor ${variable} \\ge ${c + k}`,
          );
        },

        // (a - 1) x = 2
        () => {
          return problem(
            `(${p} - 1)${variable} = 2`,
            [],
            `${variable} = ${cases([
              [`\\dfrac{2}{${p} - 1}`, `${p} \\ne 1`],
              ["\\emptyset", `${p} = 1`],
            ])}`,
          );
        },

        // |x - c| = a
        () => {
          const c = randInt(rng, -5, 5);
          return problem(
            `${absTex(linear(1, -c, variable))} = ${p}`,
            [],
            `${variable} = ${cases([
              [`${c} \\pm ${p}`, `${p} > 0`],
              [`${c}`, `${p} = 0`],
              ["\\emptyset", `${p} < 0`],
            ])}`,
          );
        },

        // |a x + b| < k
        () => {
          const k = randInt(rng, 2, 8);
          const c = randInt(rng, -4, 4);
          return problem(
            `${absTex(linear(1, -c, variable))} < ${k}`,
            [],
            `${c - k} < ${variable} < ${c + k}`,
          );
        },

        // a x = a
        () => {
          return problem(
            `${p}${variable} = ${p}`,
            [],
            `${variable} = ${cases([
              ["1", `${p} \\ne 0`],
              [`\\mathbb{R}`, `${p} = 0`],
            ])}`,
          );
        },

        // ||x| - c| = k, c > k > 0 → four solutions
        () => {
          const k = randInt(rng, 1, 5);
          const c = k + randInt(rng, 1, 5);
          const sols = [-c - k, -c + k, c - k, c + k].sort((x, y) => x - y);
          return problem(
            `${absTex(`${absTex(variable)} - ${c}`)} = ${k}`,
            [],
            eqAns(variable, sols),
          );
        },

        // 2 |x - c| = k, k even
        () => {
          const c = randInt(rng, -5, 5);
          const n = randInt(rng, 1, 6);
          return problem(
            `2${absTex(linear(1, -c, variable))} = ${2 * n}`,
            [],
            eqAns(variable, [c - n, c + n].sort((x, y) => x - y)),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // |x - r| + |x - s| = d, d > |s - r|
        () => {
          const r = randInt(rng, -4, 3);
          const len = randInt(rng, 2, 5);
          const s = r + len;
          const d = len + 2 * randInt(rng, 1, 4);
          const left = (r + s - d) / 2;
          const right = (r + s + d) / 2;
          return problem(
            `${absTex(linear(1, -r, variable))} + ${absTex(linear(1, -s, variable))} = ${d}`,
            [],
            eqAns(variable, [left, right]),
          );
        },

        // |x - r| + |x - s| = s - r → segment
        () => {
          const r = randInt(rng, -5, 3);
          const s = r + randInt(rng, 2, 6);
          return problem(
            `${absTex(linear(1, -r, variable))} + ${absTex(linear(1, -s, variable))} = ${s - r}`,
            [],
            `${r} \\le ${variable} \\le ${s}`,
          );
        },

        // |x - c| = x - b, one valid root
        () => {
          const b = randInt(rng, -4, 4);
          const h = randInt(rng, 1, 4);
          const c = b + 2 * h;
          const t = b + h;
          return problem(
            `${absTex(linear(1, -c, variable))} = ${linear(1, -b, variable)}`,
            [`${linear(1, -b, variable)} \\ge 0`],
            `${variable} = ${t}`,
          );
        },

        // |x + b| = |2x + d|
        () => {
          let t = randInt(rng, -5, 6);
          let s = randInt(rng, -5, 6);
          while (s === t || (t - 3 * s) % 2 !== 0) {
            t = randInt(rng, -5, 6);
            s = randInt(rng, -5, 6);
          }
          const b = (t - 3 * s) / 2;
          const d = (-3 * s - t) / 2;
          return problem(
            `${absTex(linear(1, b, variable))} = ${absTex(linear(2, d, variable))}`,
            [],
            eqAns(variable, [t, s].sort((x, y) => x - y)),
          );
        },

        // |x - r| + |x - s| = a
        () => {
          const r = randInt(rng, -3, 2);
          const s = r + randInt(rng, 2, 5);
          const len = s - r;
          return problem(
            `${absTex(linear(1, -r, variable))} + ${absTex(linear(1, -s, variable))} = ${p}`,
            [],
            `${variable} = ${cases([
              ["\\emptyset", `${p} < ${len}`],
              [`[${r}, ${s}]`, `${p} = ${len}`],
              [
                `\\dfrac{${r + s} - ${p}}{2},\\; \\dfrac{${r + s} + ${p}}{2}`,
                `${p} > ${len}`,
              ],
            ])}`,
          );
        },

        // (a - 2) x = a - 2
        () => {
          return problem(
            `(${p} - 2)${variable} = ${p} - 2`,
            [],
            `${variable} = ${cases([
              ["1", `${p} \\ne 2`],
              [`\\mathbb{R}`, `${p} = 2`],
            ])}`,
          );
        },

        // |x - c| < a
        () => {
          const c = randInt(rng, -4, 4);
          return problem(
            `${absTex(linear(1, -c, variable))} < ${p}`,
            [],
            cases([
              ["\\emptyset", `${p} \\le 0`],
              [`${c} - ${p} < ${variable} < ${c} + ${p}`, `${p} > 0`],
            ]),
          );
        },

        // |x - c| = a, N = 2
        () => {
          const c = randInt(rng, -5, 5);
          return problem(
            `${absTex(linear(1, -c, variable))} = ${p},\\; N = 2`,
            [],
            `${p} > 0`,
          );
        },

        // a |x - c| = b, b > 0
        () => {
          const c = randInt(rng, -4, 4);
          const b = randInt(rng, 2, 8);
          return problem(
            `${p}\\,${absTex(linear(1, -c, variable))} = ${b}`,
            [],
            `${variable} = ${cases([
              [`${c} \\pm \\dfrac{${b}}{${p}}`, `${p} > 0`],
              ["\\emptyset", `${p} \\le 0`],
            ])}`,
          );
        },

        // ||x - c| - k| = m
        () => {
          const c = randInt(rng, -3, 3);
          const m = randInt(rng, 1, 4);
          const k = m + randInt(rng, 1, 4);
          const sols = [c - k - m, c - k + m, c + k - m, c + k + m].sort(
            (x, y) => x - y,
          );
          return problem(
            `${absTex(`${absTex(linear(1, -c, variable))} - ${k}`)} = ${m}`,
            [],
            eqAns(variable, sols),
          );
        },

        // |x - 1| + |x + 1| = a  (min 2)
        () => {
          return problem(
            `${absTex(linear(1, -1, variable))} + ${absTex(linear(1, 1, variable))} = ${p}`,
            [],
            `${variable} = ${cases([
              ["\\emptyset", `${p} < 2`],
              [`[-1, 1]`, `${p} = 2`],
              [
                `\\dfrac{-${p}}{2},\\; \\dfrac{${p}}{2}`,
                `${p} > 2`,
              ],
            ])}`,
          );
        },

        // |2x - p| = x - q
        () => {
          const t = randInt(rng, 3, 8);
          const q = randInt(rng, -2, t);
          const rhs = t - q;
          const inner = pick(rng, [rhs, -rhs]);
          const coef = 2 * t - inner;
          const sols = new Set<number>([t]);
          const otherA = coef - q;
          const otherB = (coef + q) / 3;
          for (const other of [otherA, otherB]) {
            if (
              Number.isInteger(other) &&
              other !== t &&
              other >= q &&
              Math.abs(2 * other - coef) === other - q
            ) {
              sols.add(other);
            }
          }
          return problem(
            `${absTex(linear(2, -coef, variable))} = ${linear(1, -q, variable)}`,
            [`${linear(1, -q, variable)} \\ge 0`],
            eqAns(variable, [...sols].sort((x, y) => x - y)),
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
