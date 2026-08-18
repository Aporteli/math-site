import type { GeneratedProblem } from "../types";
import {
  defineAlgebraProblem,
  linear,
  selectVariable,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function dfrac(num: string | number, den: string): string {
  return `\\dfrac{${num}}{${den}}`;
}

function sqrt(inner: string | number): string {
  return `\\sqrt{${inner}}`;
}

function absTex(inner: string): string {
  return `\\lvert ${inner} \\rvert`;
}

function vertex(variable: string, h: number, k: number): string {
  const sq =
    h === 0 ? `${variable}^{2}` : `(${linear(1, -h, variable)})^{2}`;
  if (k === 0) return sq;
  if (k > 0) return `${sq} + ${k}`;
  return `${sq} - ${-k}`;
}

function fnPrompt(variable: string, expr: string, kind: "D" | "R"): string {
  return `f(${variable}) = ${expr},\\; ${kind}(f)`;
}

function problem(
  expr: string,
  kind: "D" | "R",
  variable: string,
  answer: string,
): GeneratedProblem {
  return {
    instructionId: "evaluate" as const,
    promptTex: fnPrompt(variable, expr, kind),
    solutionTex: answer,
    graphExpr: expr,
  } as GeneratedProblem;
}

export const domainRangeProblem = defineAlgebraProblem(
  "domain-range",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // linear domain
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -8, 8);
          return problem(
            linear(a, b, variable),
            "D",
            variable,
            "\\mathbb{R}",
          );
        },

        // linear range
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -8, 8);
          return problem(
            linear(a, b, variable),
            "R",
            variable,
            "\\mathbb{R}",
          );
        },

        // √x domain
        () => {
          return problem(sqrt(variable), "D", variable, `${variable} \\ge 0`);
        },

        // √x range
        () => {
          return problem(sqrt(variable), "R", variable, `[0, \\infty)`);
        },

        // 1/x domain
        () => {
          return problem(
            dfrac(1, variable),
            "D",
            variable,
            `${variable} \\ne 0`,
          );
        },

        // √(x - a) domain
        () => {
          const a = nonzero(rng, -8, 8);
          return problem(
            sqrt(linear(1, -a, variable)),
            "D",
            variable,
            `${variable} \\ge ${a}`,
          );
        },

        // |x| domain
        () => {
          return problem(absTex(variable), "D", variable, "\\mathbb{R}");
        },

        // |x| range
        () => {
          return problem(absTex(variable), "R", variable, `[0, \\infty)`);
        },

        // 1/(x - a) domain
        () => {
          const a = nonzero(rng, -8, 8);
          return problem(
            dfrac(1, linear(1, -a, variable)),
            "D",
            variable,
            `${variable} \\ne ${a}`,
          );
        },

        // x^2 domain
        () => {
          return problem(`${variable}^{2}`, "D", variable, "\\mathbb{R}");
        },

        // √(a - x) domain
        () => {
          const a = randInt(rng, -4, 8);
          return problem(
            sqrt(linear(-1, a, variable)),
            "D",
            variable,
            `${variable} \\le ${a}`,
          );
        },

        // constant range
        () => {
          const k = nonzero(rng, -9, 9);
          return problem(`${k}`, "R", variable, `\\{${k}\\}`);
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // 1/((x-a)(x-b)) domain
        () => {
          let a = randInt(rng, -5, 5);
          let b = randInt(rng, -5, 5);
          while (b === a) b = randInt(rng, -5, 5);
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          const expr = dfrac(
            1,
            `(${linear(1, -a, variable)})(${linear(1, -b, variable)})`,
          );
          return problem(
            expr,
            "D",
            variable,
            `${variable} \\ne ${lo},\\; ${variable} \\ne ${hi}`,
          );
        },

        // √(x - a) range
        () => {
          const a = nonzero(rng, -6, 6);
          return problem(
            sqrt(linear(1, -a, variable)),
            "R",
            variable,
            `[0, \\infty)`,
          );
        },

        // (x - h)^2 + k range, opens up
        () => {
          const h = randInt(rng, -5, 5);
          const k = randInt(rng, -6, 6);
          return problem(vertex(variable, h, k), "R", variable, `[${k}, \\infty)`);
        },

        // k - (x - h)^2 range
        () => {
          const h = randInt(rng, -4, 4);
          const k = randInt(rng, -4, 6);
          const sq =
            h === 0 ? `${variable}^{2}` : `(${linear(1, -h, variable)})^{2}`;
          return problem(
            `${k} - ${sq}`,
            "R",
            variable,
            `(-\\infty, ${k}]`,
          );
        },

        // √(x - a) + b range
        () => {
          const a = nonzero(rng, -6, 6);
          const b = nonzero(rng, -6, 6);
          const expr =
            b > 0
              ? `${sqrt(linear(1, -a, variable))} + ${b}`
              : `${sqrt(linear(1, -a, variable))} - ${-b}`;
          return problem(expr, "R", variable, `[${b}, \\infty)`);
        },

        // 1/(x - a) range
        () => {
          const a = nonzero(rng, -6, 6);
          return problem(
            dfrac(1, linear(1, -a, variable)),
            "R",
            variable,
            `\\mathbb{R} \\setminus \\{0\\}`,
          );
        },

        // √x + √(x - c) domain
        () => {
          const c = randInt(rng, 1, 8);
          return problem(
            `${sqrt(variable)} + ${sqrt(linear(1, -c, variable))}`,
            "D",
            variable,
            `${variable} \\ge ${c}`,
          );
        },

        // 1/√(x - a) domain
        () => {
          const a = randInt(rng, -5, 6);
          return problem(
            dfrac(1, sqrt(linear(1, -a, variable))),
            "D",
            variable,
            `${variable} > ${a}`,
          );
        },

        // √(a x + b) domain, a > 0
        () => {
          const a = randInt(rng, 2, 6);
          const t = randInt(rng, -5, 5);
          const b = -a * t;
          return problem(
            sqrt(linear(a, b, variable)),
            "D",
            variable,
            `${variable} \\ge ${t}`,
          );
        },

        // |x - c| + k range
        () => {
          const c = randInt(rng, -5, 5);
          const k = randInt(rng, -4, 6);
          const expr =
            k >= 0
              ? `${absTex(linear(1, -c, variable))} + ${k}`
              : `${absTex(linear(1, -c, variable))} - ${-k}`;
          return problem(expr, "R", variable, `[${k}, \\infty)`);
        },

        // (x - r)/(x - s) domain
        () => {
          const s = nonzero(rng, -6, 6);
          let r = randInt(rng, -6, 6);
          while (r === s) r = randInt(rng, -6, 6);
          return problem(
            dfrac(linear(1, -r, variable), linear(1, -s, variable)),
            "D",
            variable,
            `${variable} \\ne ${s}`,
          );
        },

        // x^2 + c range
        () => {
          const c = randInt(rng, -6, 6);
          const expr = c >= 0 ? `${variable}^{2} + ${c}` : `${variable}^{2} - ${-c}`;
          return problem(expr, "R", variable, `[${c}, \\infty)`);
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // √((x - a)(b - x)) domain
        () => {
          const a = randInt(rng, -4, 3);
          const b = a + randInt(rng, 2, 7);
          return problem(
            sqrt(`(${linear(1, -a, variable)})(${linear(-1, b, variable)})`),
            "D",
            variable,
            `[${a}, ${b}]`,
          );
        },

        // 1/(x^2 - k^2) domain
        () => {
          const k = randInt(rng, 2, 8);
          return problem(
            dfrac(1, `${variable}^{2} - ${k * k}`),
            "D",
            variable,
            `${variable} \\ne ${-k},\\; ${variable} \\ne ${k}`,
          );
        },

        // √(x^2 - k^2) domain
        () => {
          const k = randInt(rng, 2, 7);
          return problem(
            sqrt(`${variable}^{2} - ${k * k}`),
            "D",
            variable,
            `${variable} \\le ${-k} \\lor ${variable} \\ge ${k}`,
          );
        },

        // √(k^2 - x^2) domain
        () => {
          const k = randInt(rng, 2, 8);
          return problem(
            sqrt(`${k * k} - ${variable}^{2}`),
            "D",
            variable,
            `[${-k}, ${k}]`,
          );
        },

        // √(k^2 - x^2) range
        () => {
          const k = randInt(rng, 2, 8);
          return problem(
            sqrt(`${k * k} - ${variable}^{2}`),
            "R",
            variable,
            `[0, ${k}]`,
          );
        },

        // (a x + b)/(x - s) range y ≠ a
        () => {
          const a = nonzero(rng, -5, 5);
          const s = randInt(rng, -5, 5);
          let b = randInt(rng, -6, 6);
          while (b + a * s === 0) b = randInt(rng, -6, 6);
          return problem(
            dfrac(linear(a, b, variable), linear(1, -s, variable)),
            "R",
            variable,
            `\\mathbb{R} \\setminus \\{${a}\\}`,
          );
        },

        // x + 1/x domain
        () => {
          return problem(
            `${variable} + ${dfrac(1, variable)}`,
            "D",
            variable,
            `${variable} \\ne 0`,
          );
        },

        // x + 1/x range
        () => {
          return problem(
            `${variable} + ${dfrac(1, variable)}`,
            "R",
            variable,
            `(-\\infty, -2] \\cup [2, \\infty)`,
          );
        },

        // √(x - a)/(x - b) domain
        () => {
          const a = randInt(rng, -4, 5);
          let b = randInt(rng, -4, 6);
          while (b === a) b = randInt(rng, -4, 6);
          return problem(
            dfrac(
              sqrt(linear(1, -a, variable)),
              linear(1, -b, variable),
            ),
            "D",
            variable,
            `${variable} \\ge ${a},\\; ${variable} \\ne ${b}`,
          );
        },

        // 1/(√(x - a) - c), c > 0
        () => {
          const a = randInt(rng, -4, 4);
          const c = randInt(rng, 1, 5);
          const hole = a + c * c;
          return problem(
            dfrac(1, `${sqrt(linear(1, -a, variable))} - ${c}`),
            "D",
            variable,
            `${variable} \\ge ${a},\\; ${variable} \\ne ${hole}`,
          );
        },

        // √(x - a) + √(x - b) domain
        () => {
          const a = randInt(rng, -5, 5);
          let b = randInt(rng, -5, 5);
          while (b === a) b = randInt(rng, -5, 5);
          const lo = Math.max(a, b);
          return problem(
            `${sqrt(linear(1, -a, variable))} + ${sqrt(linear(1, -b, variable))}`,
            "D",
            variable,
            `${variable} \\ge ${lo}`,
          );
        },

        // |x - p| + |x - q| range
        () => {
          const p = randInt(rng, -5, 3);
          const q = p + randInt(rng, 1, 6);
          return problem(
            `${absTex(linear(1, -p, variable))} + ${absTex(linear(1, -q, variable))}`,
            "R",
            variable,
            `[${q - p}, \\infty)`,
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
