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

function cbrt(inner: string | number): string {
  return `\\sqrt[3]{${inner}}`;
}

function invLinear(a: number, b: number, variable: string): string {
  if (a === 1) return linear(1, -b, variable);
  if (a === -1) return linear(-1, b, variable);
  if (a < 0) return dfrac(linear(-1, b, variable), String(-a));
  return dfrac(linear(1, -b, variable), String(a));
}

function cubePlus(variable: string, a: number): string {
  if (a === 0) return `${variable}^{3}`;
  return a > 0 ? `${variable}^{3} + ${a}` : `${variable}^{3} - ${-a}`;
}

function sqPlus(variable: string, a: number): string {
  if (a === 0) return `${variable}^{2}`;
  return a > 0 ? `${variable}^{2} + ${a}` : `${variable}^{2} - ${-a}`;
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

export const inverseFunctionsProblem = defineAlgebraProblem(
  "inverse-functions",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // f = x + a
        () => {
          const a = nonzero(rng, -9, 9);
          const ans = linear(1, -a, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${linear(1, a, variable)},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = a x
        () => {
          const a = nonzero(rng, 2, 8);
          const ans = dfrac(variable, String(a));
          return problem(
            "simplify",
            `f(${variable}) = ${linear(a, 0, variable)},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f^{-1}(k) for x + a
        () => {
          const a = nonzero(rng, -8, 8);
          const t = randInt(rng, -8, 8);
          const k = t + a;
          return problem(
            "evaluate",
            `f(${variable}) = ${linear(1, a, variable)},\\; f^{-1}(${k})`,
            `${t}`,
            linear(1, -a, variable),
          );
        },

        // f = x - a
        () => {
          const a = nonzero(rng, -9, 9);
          const ans = linear(1, a, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${linear(1, -a, variable)},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = -x
        () => {
          return problem(
            "simplify",
            `f(${variable}) = -${variable},\\; f^{-1}(${variable})`,
            `-${variable}`,
            `-${variable}`,
          );
        },

        // f = x^3
        () => {
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{3},\\; f^{-1}(${variable})`,
            cbrt(variable),
            cbrt(variable),
          );
        },

        // f^{-1}(k) for a x
        () => {
          const a = nonzero(rng, 2, 7);
          const t = nonzero(rng, -8, 8);
          return problem(
            "evaluate",
            `f(${variable}) = ${linear(a, 0, variable)},\\; f^{-1}(${a * t})`,
            `${t}`,
            dfrac(variable, String(a)),
          );
        },

        // f = a x + b, evaluate
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -8, 8);
          const t = randInt(rng, -6, 6);
          const k = a * t + b;
          return problem(
            "evaluate",
            `f(${variable}) = ${linear(a, b, variable)},\\; f^{-1}(${k})`,
            `${t}`,
            invLinear(a, b, variable),
          );
        },

        // f = 1/x
        () => {
          return problem(
            "simplify",
            `f(${variable}) = ${dfrac(1, variable)},\\; f^{-1}(${variable})`,
            dfrac(1, variable),
            dfrac(1, variable),
          );
        },

        // f = c - x
        () => {
          const c = nonzero(rng, -8, 8);
          const ans = linear(-1, c, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${linear(-1, c, variable)},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = x / a
        () => {
          const a = nonzero(rng, 2, 8);
          const ans = linear(a, 0, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${dfrac(variable, String(a))},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f(p) = q ⇒ f^{-1}(q) = p
        () => {
          const p = nonzero(rng, -9, 9);
          let q = nonzero(rng, -9, 9);
          while (q === p) q = nonzero(rng, -9, 9);
          return problem(
            "evaluate",
            `f(${p}) = ${q},\\; f^{-1}(${q})`,
            `${p}`,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // f = a x + b, formula
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -8, 8);
          const ans = invLinear(a, b, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${linear(a, b, variable)},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = (x + a)/b
        () => {
          const a = nonzero(rng, -8, 8);
          const b = nonzero(rng, 2, 7);
          const ans = linear(b, -a, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${dfrac(linear(1, a, variable), String(b))},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = ∛(x - a)
        () => {
          const a = nonzero(rng, -8, 8);
          const ans = cubePlus(variable, a);
          return problem(
            "simplify",
            `f(${variable}) = ${cbrt(linear(1, -a, variable))},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = x^3 + a
        () => {
          const a = nonzero(rng, -8, 8);
          const ans = cbrt(linear(1, -a, variable));
          return problem(
            "simplify",
            `f(${variable}) = ${cubePlus(variable, a)},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = √(x - a), x ≥ a
        () => {
          const a = randInt(rng, -6, 6);
          const ans = sqPlus(variable, a);
          return problem(
            "simplify",
            `f(${variable}) = ${sqrt(linear(1, -a, variable))},\\; f^{-1}(${variable})`,
            `${ans},\\; ${variable} \\ge 0`,
            ans,
          );
        },

        // (f ∘ f^{-1})(x) = x
        () => {
          const a = nonzero(rng, 2, 6);
          const b = randInt(rng, -6, 6);
          return problem(
            "simplify",
            `f(${variable}) = ${linear(a, b, variable)},\\; (f \\circ f^{-1})(${variable})`,
            variable,
            variable,
          );
        },

        // D(f^{-1}) = R(f) for √(x - a)
        () => {
          const a = randInt(rng, -5, 6);
          return problem(
            "evaluate",
            `f(${variable}) = ${sqrt(linear(1, -a, variable))},\\; D(f^{-1})`,
            `${variable} \\ge 0`,
          );
        },

        // f^{-1}(k) for (x + a)/b
        () => {
          const a = nonzero(rng, -7, 7);
          const b = nonzero(rng, 2, 6);
          const k = randInt(rng, -6, 6);
          const t = b * k - a;
          return problem(
            "evaluate",
            `f(${variable}) = ${dfrac(linear(1, a, variable), String(b))},\\; f^{-1}(${k})`,
            `${t}`,
            linear(b, -a, variable),
          );
        },

        // f = a - b x
        () => {
          const a = randInt(rng, -6, 6);
          const b = nonzero(rng, 2, 6);
          const ans = dfrac(linear(-1, a, variable), String(b));
          return problem(
            "simplify",
            `f(${variable}) = ${linear(-b, a, variable)},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = 1/(x - a)
        () => {
          const a = nonzero(rng, -6, 6);
          const ans =
            a > 0
              ? `${dfrac(1, variable)} + ${a}`
              : `${dfrac(1, variable)} - ${-a}`;
          return problem(
            "simplify",
            `f(${variable}) = ${dfrac(1, linear(1, -a, variable))},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f(p) = q without formula
        () => {
          const p = randInt(rng, -9, 9);
          let q = randInt(rng, -9, 9);
          while (q === p) q = randInt(rng, -9, 9);
          return problem(
            "evaluate",
            `f(${p}) = ${q},\\; f^{-1}(${q})`,
            `${p}`,
          );
        },

        // f^{-1}(k) for x^3
        () => {
          const t = nonzero(rng, -5, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${variable}^{3},\\; f^{-1}(${t * t * t})`,
            `${t}`,
            cbrt(variable),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // f = (a x + b)/(c x + d)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          let c = nonzero(rng, -4, 4);
          let d = randInt(rng, -5, 5);
          while (a * d - b * c === 0) {
            c = nonzero(rng, -4, 4);
            d = randInt(rng, -5, 5);
          }
          const ans = dfrac(linear(d, -b, variable), linear(-c, a, variable));
          return problem(
            "simplify",
            `f(${variable}) = ${dfrac(linear(a, b, variable), linear(c, d, variable))},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = (x + p)/(x + q)
        () => {
          const p = nonzero(rng, -6, 6);
          let q = nonzero(rng, -6, 6);
          while (q === p) q = nonzero(rng, -6, 6);
          const ans = dfrac(linear(-q, p, variable), linear(1, -1, variable));
          return problem(
            "simplify",
            `f(${variable}) = ${dfrac(linear(1, p, variable), linear(1, q, variable))},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f = x^3 + a, evaluate
        () => {
          const a = nonzero(rng, -8, 8);
          const t = nonzero(rng, -4, 4);
          const k = t * t * t + a;
          return problem(
            "evaluate",
            `f(${variable}) = ${cubePlus(variable, a)},\\; f^{-1}(${k})`,
            `${t}`,
          );
        },

        // f = 2 x^3 + b, evaluate
        () => {
          const t = nonzero(rng, -3, 3);
          const b = randInt(rng, -6, 6);
          const k = 2 * t * t * t + b;
          const fExpr =
            b === 0
              ? `2${variable}^{3}`
              : b > 0
                ? `2${variable}^{3} + ${b}`
                : `2${variable}^{3} - ${-b}`;
          return problem(
            "evaluate",
            `f(${variable}) = ${fExpr},\\; f^{-1}(${k})`,
            `${t}`,
          );
        },

        // f = x^2, x ≥ 0
        () => {
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; ${variable} \\ge 0,\\; f^{-1}(${variable})`,
            `${sqrt(variable)},\\; ${variable} \\ge 0`,
            sqrt(variable),
          );
        },

        // f = √(a - x)
        () => {
          const a = randInt(rng, 1, 8);
          const ans = `${a} - ${variable}^{2}`;
          return problem(
            "simplify",
            `f(${variable}) = ${sqrt(linear(-1, a, variable))},\\; f^{-1}(${variable})`,
            `${ans},\\; ${variable} \\ge 0`,
            ans,
          );
        },

        // (f^{-1} ∘ f)(k) = k
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const k = randInt(rng, -6, 6);
          return problem(
            "evaluate",
            `f(${variable}) = ${linear(a, b, variable)},\\; (f^{-1} \\circ f)(${k})`,
            `${k}`,
          );
        },

        // f = (a x + b)/(x - s)
        () => {
          const a = nonzero(rng, -4, 4);
          const s = nonzero(rng, -5, 5);
          let b = randInt(rng, -5, 5);
          while (b + a * s === 0) b = randInt(rng, -5, 5);
          const ans = dfrac(linear(s, b, variable), linear(1, -a, variable));
          return problem(
            "simplify",
            `f(${variable}) = ${dfrac(linear(a, b, variable), linear(1, -s, variable))},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // R(f^{-1}) = D(f) for 1/(x - a)
        () => {
          const a = nonzero(rng, -6, 6);
          return problem(
            "evaluate",
            `f(${variable}) = ${dfrac(1, linear(1, -a, variable))},\\; R(f^{-1})`,
            `\\mathbb{R} \\setminus \\{${a}\\}`,
          );
        },

        // f = a/x + b
        () => {
          const a = nonzero(rng, -6, 6);
          const b = nonzero(rng, -6, 6);
          const ans = dfrac(a, linear(1, -b, variable));
          const fExpr =
            b > 0
              ? `${dfrac(a, variable)} + ${b}`
              : `${dfrac(a, variable)} - ${-b}`;
          return problem(
            "simplify",
            `f(${variable}) = ${fExpr},\\; f^{-1}(${variable})`,
            ans,
            ans,
          );
        },

        // f^{-1}(k) for (a x + b)/(c x + d)
        () => {
          const t = randInt(rng, -5, 5);
          const k = randInt(rng, -6, 6);
          const a = nonzero(rng, -3, 3);
          let c = nonzero(rng, -3, 3);
          let d = randInt(rng, -4, 4);
          while (c * t + d === 0) d = randInt(rng, -4, 4);
          let b = k * (c * t + d) - a * t;
          let guard = 0;
          while (a * d - b * c === 0 && guard < 12) {
            c = nonzero(rng, -3, 3);
            d = randInt(rng, -4, 4);
            if (c * t + d === 0) continue;
            b = k * (c * t + d) - a * t;
            guard += 1;
          }
          return problem(
            "evaluate",
            `f(${variable}) = ${dfrac(linear(a, b, variable), linear(c, d, variable))},\\; f^{-1}(${k})`,
            `${t}`,
          );
        },

        // f = √(x - a), evaluate f^{-1}(n)
        () => {
          const a = randInt(rng, -4, 6);
          const n = randInt(rng, 1, 7);
          return problem(
            "evaluate",
            `f(${variable}) = ${sqrt(linear(1, -a, variable))},\\; f^{-1}(${n})`,
            `${n * n + a}`,
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
