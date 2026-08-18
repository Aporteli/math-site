import type { GeneratedProblem } from "../types";
import {
  defineAlgebraProblem,
  linear,
  quadratic,
  selectVariable,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function dfrac(num: string | number, den: string | number): string {
  return `\\dfrac{${num}}{${den}}`;
}

function sqrt(inner: string | number): string {
  return `\\sqrt{${inner}}`;
}

function absTex(inner: string): string {
  return `\\lvert ${inner} \\rvert`;
}

function circ(inner: string): string {
  return `(f \\circ g)(${inner})`;
}

function gcirc(inner: string): string {
  return `(g \\circ f)(${inner})`;
}

function defs(
  variable: string,
  fExpr: string,
  gExpr: string,
  ask: string,
): string {
  return `f(${variable}) = ${fExpr},\\; g(${variable}) = ${gExpr},\\; ${ask}`;
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

export const compositionOfFunctionsProblem = defineAlgebraProblem(
  "composition-of-functions",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // f = x + a, g = x + b
        () => {
          const a = nonzero(rng, -8, 8);
          const b = nonzero(rng, -8, 8);
          return problem(
            "simplify",
            defs(
              variable,
              linear(1, a, variable),
              linear(1, b, variable),
              circ(variable),
            ),
            linear(1, a + b, variable),
            linear(1, a + b, variable),
          );
        },

        // f = a x, g = x + b
        () => {
          const a = nonzero(rng, 2, 7);
          const b = nonzero(rng, -6, 6);
          const ans = linear(a, a * b, variable);
          return problem(
            "simplify",
            defs(
              variable,
              linear(a, 0, variable),
              linear(1, b, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // (f ∘ g)(k) linear
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -8, 8);
          const c = nonzero(rng, -5, 5);
          const d = randInt(rng, -6, 6);
          const k = randInt(rng, -5, 5);
          const inner = c * k + d;
          const val = a * inner + b;
          return problem(
            "evaluate",
            defs(
              variable,
              linear(a, b, variable),
              linear(c, d, variable),
              circ(String(k)),
            ),
            `${val}`,
            linear(a * c, a * d + b, variable),
          );
        },

        // f = x^2, g = x + a
        () => {
          const a = nonzero(rng, -6, 6);
          const ans = quadratic(1, 2 * a, a * a, variable);
          return problem(
            "simplify",
            defs(
              variable,
              `${variable}^{2}`,
              linear(1, a, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // (f ∘ f)(k)
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const k = randInt(rng, -5, 5);
          const val = a * (a * k + b) + b;
          return problem(
            "evaluate",
            `f(${variable}) = ${linear(a, b, variable)},\\; (f \\circ f)(${k})`,
            `${val}`,
            linear(a * a, a * b + b, variable),
          );
        },

        // f = |x|, g = x - c, evaluate
        () => {
          const c = randInt(rng, -6, 6);
          const k = randInt(rng, -8, 8);
          return problem(
            "evaluate",
            defs(
              variable,
              absTex(variable),
              linear(1, -c, variable),
              circ(String(k)),
            ),
            `${Math.abs(k - c)}`,
          );
        },

        // f = √x, g = x + a, evaluate with g(k) ≥ 0
        () => {
          const n = randInt(rng, 1, 8);
          const a = randInt(rng, -6, 6);
          const k = n * n - a;
          return problem(
            "evaluate",
            defs(
              variable,
              sqrt(variable),
              linear(1, a, variable),
              circ(String(k)),
            ),
            `${n}`,
          );
        },

        // g constant
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, -8, 8);
          const c = randInt(rng, -8, 8);
          const val = a * c + b;
          return problem(
            "simplify",
            defs(
              variable,
              linear(a, b, variable),
              `${c}`,
              circ(variable),
            ),
            `${val}`,
          );
        },

        // (g ∘ f)(k)
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const c = nonzero(rng, -5, 5);
          const d = randInt(rng, -6, 6);
          const k = randInt(rng, -5, 5);
          const val = c * (a * k + b) + d;
          return problem(
            "evaluate",
            defs(
              variable,
              linear(a, b, variable),
              linear(c, d, variable),
              gcirc(String(k)),
            ),
            `${val}`,
          );
        },

        // f = x - a, g = x + a → identity
        () => {
          const a = nonzero(rng, -8, 8);
          return problem(
            "simplify",
            defs(
              variable,
              linear(1, -a, variable),
              linear(1, a, variable),
              circ(variable),
            ),
            variable,
            variable,
          );
        },

        // f = 1/x, g = x + a, evaluate
        () => {
          const a = nonzero(rng, -6, 6);
          let k = randInt(rng, -6, 6);
          while (k + a === 0) k = randInt(rng, -6, 6);
          const den = k + a;
          return problem(
            "evaluate",
            defs(
              variable,
              dfrac(1, variable),
              linear(1, a, variable),
              circ(String(k)),
            ),
            den === 1 ? "1" : den === -1 ? "-1" : dfrac(1, den),
          );
        },

        // f = a x, g = b x
        () => {
          const a = nonzero(rng, 2, 7);
          const b = nonzero(rng, 2, 7);
          const ans = linear(a * b, 0, variable);
          return problem(
            "simplify",
            defs(
              variable,
              linear(a, 0, variable),
              linear(b, 0, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // (f ∘ g)(x) linear ∘ linear
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const c = nonzero(rng, -5, 5);
          const d = randInt(rng, -6, 6);
          const ans = linear(a * c, a * d + b, variable);
          return problem(
            "simplify",
            defs(
              variable,
              linear(a, b, variable),
              linear(c, d, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // f = x^2 + p, g = x + a
        () => {
          const p = randInt(rng, -6, 6);
          const a = nonzero(rng, -5, 5);
          const ans = quadratic(1, 2 * a, a * a + p, variable);
          const fExpr =
            p >= 0 ? `${variable}^{2} + ${p}` : `${variable}^{2} - ${-p}`;
          return problem(
            "simplify",
            defs(variable, fExpr, linear(1, a, variable), circ(variable)),
            ans,
            ans,
          );
        },

        // f linear, g = x^2
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const ans = quadratic(a, 0, b, variable);
          return problem(
            "simplify",
            defs(
              variable,
              linear(a, b, variable),
              `${variable}^{2}`,
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // (g ∘ f)(x) linear
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const c = nonzero(rng, -5, 5);
          const d = randInt(rng, -6, 6);
          const ans = linear(c * a, c * b + d, variable);
          return problem(
            "simplify",
            defs(
              variable,
              linear(a, b, variable),
              linear(c, d, variable),
              gcirc(variable),
            ),
            ans,
            ans,
          );
        },

        // f = √(x - a), g = x^2 + a → |x|
        () => {
          const a = randInt(rng, -4, 6);
          return problem(
            "simplify",
            defs(
              variable,
              sqrt(linear(1, -a, variable)),
              quadratic(1, 0, a, variable),
              circ(variable),
            ),
            absTex(variable),
            absTex(variable),
          );
        },

        // f = 1/x, g = a x + b
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const ans = dfrac(1, linear(a, b, variable));
          return problem(
            "simplify",
            defs(
              variable,
              dfrac(1, variable),
              linear(a, b, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // (f ∘ g ∘ h)(k)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const c = nonzero(rng, -4, 4);
          const d = randInt(rng, -5, 5);
          const p = nonzero(rng, -4, 4);
          const q = randInt(rng, -5, 5);
          const k = randInt(rng, -4, 4);
          const val = a * (c * (p * k + q) + d) + b;
          return problem(
            "evaluate",
            `f(${variable}) = ${linear(a, b, variable)},\\; g(${variable}) = ${linear(c, d, variable)},\\; h(${variable}) = ${linear(p, q, variable)},\\; (f \\circ g \\circ h)(${k})`,
            `${val}`,
          );
        },

        // f = |x - c|, g = x + d, evaluate
        () => {
          const c = randInt(rng, -5, 5);
          const d = nonzero(rng, -6, 6);
          const k = randInt(rng, -6, 6);
          return problem(
            "evaluate",
            defs(
              variable,
              absTex(linear(1, -c, variable)),
              linear(1, d, variable),
              circ(String(k)),
            ),
            `${Math.abs(k + d - c)}`,
          );
        },

        // f = u^2 - a, g = √(x + a) → x
        () => {
          const a = randInt(rng, -4, 6);
          const fExpr =
            a >= 0 ? `${variable}^{2} - ${a}` : `${variable}^{2} + ${-a}`;
          const gExpr = sqrt(linear(1, a, variable));
          return problem(
            "simplify",
            defs(variable, fExpr, gExpr, circ(variable)),
            variable,
            variable,
          );
        },

        // D(f ∘ g): f = √x, g = x - a
        () => {
          const a = nonzero(rng, -8, 8);
          return problem(
            "evaluate",
            defs(
              variable,
              sqrt(variable),
              linear(1, -a, variable),
              `D(f \\circ g)`,
            ),
            `${variable} \\ge ${a}`,
          );
        },

        // f linear, g = 1/x
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const ans = `${dfrac(a, variable)}${b >= 0 ? ` + ${b}` : ` - ${-b}`}`;
          return problem(
            "simplify",
            defs(
              variable,
              linear(a, b, variable),
              dfrac(1, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // inverse pair (f ∘ g)(x) = x
        () => {
          const a = nonzero(rng, 2, 6);
          const b = randInt(rng, -8, 8);
          const gExpr = dfrac(linear(1, -b, variable), String(a));
          return problem(
            "simplify",
            defs(variable, linear(a, b, variable), gExpr, circ(variable)),
            variable,
            variable,
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // f = 1/(x - a), g = x + c
        () => {
          const a = nonzero(rng, -6, 6);
          const c = nonzero(rng, -6, 6);
          const ans = dfrac(1, linear(1, c - a, variable));
          return problem(
            "simplify",
            defs(
              variable,
              dfrac(1, linear(1, -a, variable)),
              linear(1, c, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // f = x^2, g = a x + b, expand
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const ans = quadratic(a * a, 2 * a * b, b * b, variable);
          return problem(
            "simplify",
            defs(
              variable,
              `${variable}^{2}`,
              linear(a, b, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // f = (x + h)^2 + k, already vertex; g = x + m wait f quadratic g shift
        () => {
          const p = 1;
          const q = nonzero(rng, -4, 4);
          const r = randInt(rng, -5, 5);
          const h = nonzero(rng, -4, 4);
          const ans = quadratic(p, 2 * p * h + q, p * h * h + q * h + r, variable);
          const fExpr = quadratic(p, q, r, variable);
          return problem(
            "simplify",
            defs(variable, fExpr, linear(1, h, variable), circ(variable)),
            ans,
            ans,
          );
        },

        // (f ∘ g ∘ h)(x) three linears
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -4, 4);
          const c = nonzero(rng, -3, 3);
          const d = randInt(rng, -4, 4);
          const p = nonzero(rng, -3, 3);
          const q = randInt(rng, -4, 4);
          const ans = linear(a * c * p, a * c * q + a * d + b, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${linear(a, b, variable)},\\; g(${variable}) = ${linear(c, d, variable)},\\; h(${variable}) = ${linear(p, q, variable)},\\; (f \\circ g \\circ h)(${variable})`,
            ans,
            ans,
          );
        },

        // f = 1/x, g = 1/x
        () => {
          return problem(
            "simplify",
            defs(
              variable,
              dfrac(1, variable),
              dfrac(1, variable),
              circ(variable),
            ),
            variable,
            variable,
          );
        },

        // D(f ∘ g): f = 1/(x - k^2), g = x^2
        () => {
          const k = randInt(rng, 2, 6);
          return problem(
            "evaluate",
            defs(
              variable,
              dfrac(1, linear(1, -k * k, variable)),
              `${variable}^{2}`,
              `D(f \\circ g)`,
            ),
            `${variable} \\ne ${-k},\\; ${variable} \\ne ${k}`,
          );
        },

        // D(f ∘ g): f = √(c - x), g = x^2, c = k^2
        () => {
          const k = randInt(rng, 2, 6);
          return problem(
            "evaluate",
            defs(
              variable,
              sqrt(linear(-1, k * k, variable)),
              `${variable}^{2}`,
              `D(f \\circ g)`,
            ),
            `${-k} \\le ${variable} \\le ${k}`,
          );
        },

        // (f ∘ f ∘ f)(x) linear
        () => {
          const a = nonzero(rng, -3, 3);
          const b = randInt(rng, -5, 5);
          const coef = a * a * a;
          const cons = b * (a * a + a + 1);
          const ans = linear(coef, cons, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${linear(a, b, variable)},\\; (f \\circ f \\circ f)(${variable})`,
            ans,
            ans,
          );
        },

        // f = (x + p)/(x + q), g = 1/x
        () => {
          const p = nonzero(rng, -6, 6);
          let q = nonzero(rng, -6, 6);
          while (q === p) q = nonzero(rng, -6, 6);
          const ans = dfrac(linear(p, 1, variable), linear(q, 1, variable));
          return problem(
            "simplify",
            defs(
              variable,
              dfrac(linear(1, p, variable), linear(1, q, variable)),
              dfrac(1, variable),
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // f = |x|, g = x^2 - k^2
        () => {
          const k = randInt(rng, 2, 6);
          const ans = absTex(`${variable}^{2} - ${k * k}`);
          return problem(
            "simplify",
            defs(
              variable,
              absTex(variable),
              `${variable}^{2} - ${k * k}`,
              circ(variable),
            ),
            ans,
            ans,
          );
        },

        // (f ∘ g) - (g ∘ f) constant
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, -6, 6);
          const c = nonzero(rng, -5, 5);
          const d = randInt(rng, -6, 6);
          const diff = a * d + b - c * b - d;
          return problem(
            "simplify",
            defs(
              variable,
              linear(a, b, variable),
              linear(c, d, variable),
              `${circ(variable)} - ${gcirc(variable)}`,
            ),
            `${diff}`,
          );
        },

        // (g ∘ f)(k), f quadratic, g linear
        () => {
          const p = nonzero(rng, -3, 3);
          const q = randInt(rng, -4, 4);
          const r = randInt(rng, -5, 5);
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, -5, 5);
          const k = randInt(rng, -4, 4);
          const inner = p * k * k + q * k + r;
          const val = a * inner + b;
          return problem(
            "evaluate",
            defs(
              variable,
              quadratic(p, q, r, variable),
              linear(a, b, variable),
              gcirc(String(k)),
            ),
            `${val}`,
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
