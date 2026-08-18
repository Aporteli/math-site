import type { GeneratedProblem } from "../types";
import {
  defineAlgebraProblem,
  linear,
  selectVariable,
  signed,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function pow(base: string | number, exp: string | number): string {
  return `${base}^{${exp}}`;
}

function half(): string {
  return `\\left(\\dfrac{1}{2}\\right)`;
}

function ipow(base: number, n: number): number {
  if (n === 0) return 1;
  if (n < 0) return 1 / base ** -n;
  return base ** n;
}

function powVal(base: number, n: number): string {
  if (n >= 0) return String(ipow(base, n));
  return texFrac(1, ipow(base, -n));
}

function timesPow(a: number, base: number, exp: string): string {
  if (a === 1) return pow(base, exp);
  if (a === -1) return `-${pow(base, exp)}`;
  return `${a} \\cdot ${pow(base, exp)}`;
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

export const exponentialFunctionsProblem = defineAlgebraProblem(
  "exponential-functions",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // 2^n
        () => {
          const n = randInt(rng, 0, 6);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(2, variable)},\\; f(${n})`,
            `${ipow(2, n)}`,
            `2^${variable}`,
          );
        },

        // 3^n
        () => {
          const n = randInt(rng, 0, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(3, variable)},\\; f(${n})`,
            `${ipow(3, n)}`,
            `3^${variable}`,
          );
        },

        // 10^n
        () => {
          const n = randInt(rng, 0, 3);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(10, variable)},\\; f(${n})`,
            `${ipow(10, n)}`,
            `10^${variable}`,
          );
        },

        // a^0 = 1
        () => {
          const a = pick(rng, [2, 3, 5, 7, 10]);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(a, variable)},\\; f(0)`,
            `1`,
            `${a}^${variable}`,
          );
        },

        // 2^{-n}
        () => {
          const n = randInt(rng, 1, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(2, variable)},\\; f(${-n})`,
            powVal(2, -n),
            `2^${variable}`,
          );
        },

        // 2^x = 2^k
        () => {
          const k = randInt(rng, 1, 6);
          return problem(
            "solve",
            `${pow(2, variable)} = ${ipow(2, k)}`,
            `${variable} = ${k}`,
            `2^${variable}`,
          );
        },

        // 3^x = 3^k
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "solve",
            `${pow(3, variable)} = ${ipow(3, k)}`,
            `${variable} = ${k}`,
            `3^${variable}`,
          );
        },

        // 5^n
        () => {
          const n = randInt(rng, 0, 4);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(5, variable)},\\; f(${n})`,
            `${ipow(5, n)}`,
            `5^${variable}`,
          );
        },

        // f(m) f(n) = f(m+n)
        () => {
          const m = randInt(rng, 1, 4);
          const n = randInt(rng, 1, 4);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(2, variable)},\\; f(${m}) \\cdot f(${n})`,
            `${ipow(2, m + n)}`,
            `2^${variable}`,
          );
        },

        // D(2^x) = ℝ
        () => {
          const a = pick(rng, [2, 3, 5, 10]);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(a, variable)},\\; D(f)`,
            `\\mathbb{R}`,
            `${a}^${variable}`,
          );
        },

        // 2^{x+k} at an integer
        () => {
          const k = nonzero(rng, -3, 3);
          const t = randInt(rng, 0, 4);
          const exp = t + k;
          if (exp < -4 || exp > 6) {
            const t2 = 2;
            return problem(
              "evaluate",
              `f(${variable}) = ${pow(2, linear(1, k, variable))},\\; f(${t2})`,
              powVal(2, t2 + k),
              `2^(${variable}${k > 0 ? "+" : ""}${k})`,
            );
          }
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(2, linear(1, k, variable))},\\; f(${t})`,
            powVal(2, exp),
            `2^(${variable}${k > 0 ? "+" : ""}${k})`,
          );
        },

        // A · 2^x, f(0) = A
        () => {
          const A = nonzero(rng, 2, 9);
          return problem(
            "evaluate",
            `f(${variable}) = ${timesPow(A, 2, variable)},\\; f(0)`,
            `${A}`,
            `${A}*2^${variable}`,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // 4^x = 2^k with k even
        () => {
          const x = randInt(rng, 1, 4);
          return problem(
            "solve",
            `${pow(4, variable)} = ${ipow(2, 2 * x)}`,
            `${variable} = ${x}`,
            `4^${variable}`,
          );
        },

        // 4^x = 8 → x = 3/2
        () => {
          return problem(
            "solve",
            `${pow(4, variable)} = 8`,
            `${variable} = ${texFrac(3, 2)}`,
            `4^${variable}`,
          );
        },

        // 2^{x-h}, f(h) = 1
        () => {
          const h = nonzero(rng, -5, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(2, linear(1, -h, variable))},\\; f(${h})`,
            `1`,
            `2^(${variable}${h > 0 ? "-" : "+"}${Math.abs(h)})`,
          );
        },

        // A · 3^n
        () => {
          const A = nonzero(rng, 2, 6);
          const n = randInt(rng, 0, 4);
          return problem(
            "evaluate",
            `f(${variable}) = ${timesPow(A, 3, variable)},\\; f(${n})`,
            `${A * ipow(3, n)}`,
            `${A}*3^${variable}`,
          );
        },

        // R(a^x) = (0, ∞)
        () => {
          const a = pick(rng, [2, 3, 5, 10]);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(a, variable)},\\; R(f)`,
            `(0, +\\infty)`,
            `${a}^${variable}`,
          );
        },

        // 2^x + 2^x = 2^{x+1}
        () => {
          return problem(
            "simplify",
            `${pow(2, variable)} + ${pow(2, variable)}`,
            pow(2, `${variable} + 1`),
            `2^${variable}`,
          );
        },

        // (1/2)^x = 1/8
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "solve",
            `${half()}^{${variable}} = ${powVal(2, -k)}`,
            `${variable} = ${k}`,
            `(1/2)^${variable}`,
          );
        },

        // 5^x = 1/25
        () => {
          const k = randInt(rng, 1, 3);
          return problem(
            "solve",
            `${pow(5, variable)} = ${powVal(5, -k)}`,
            `${variable} = ${-k}`,
            `5^${variable}`,
          );
        },

        // 3^{x+1} = 3^n
        () => {
          const n = randInt(rng, 2, 5);
          return problem(
            "solve",
            `${pow(3, linear(1, 1, variable))} = ${ipow(3, n)}`,
            `${variable} = ${n - 1}`,
            `3^(${variable}+1)`,
          );
        },

        // f(n)/f(n-1) = base
        () => {
          const a = pick(rng, [2, 3, 5]);
          const n = randInt(rng, 2, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(a, variable)},\\; \\dfrac{f(${n})}{f(${n - 1})}`,
            `${a}`,
            `${a}^${variable}`,
          );
        },

        // 9^x = 3^{x+k} → 2x = x+k
        () => {
          const k = nonzero(rng, 1, 5);
          return problem(
            "solve",
            `${pow(9, variable)} = ${pow(3, linear(1, k, variable))}`,
            `${variable} = ${k}`,
            `9^${variable}`,
          );
        },

        // 2^x > 2^k, base > 1
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "solve",
            `${pow(2, variable)} > ${ipow(2, k)}`,
            `${variable} > ${k}`,
            `2^${variable}`,
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // 8^x = 32 → 3x = 5
        () => {
          return problem(
            "solve",
            `${pow(8, variable)} = 32`,
            `${variable} = ${texFrac(5, 3)}`,
            `8^${variable}`,
          );
        },

        // 4^{x+1} = 8^{x-1} → x = 5
        () => {
          return problem(
            "solve",
            `${pow(4, linear(1, 1, variable))} = ${pow(8, linear(1, -1, variable))}`,
            `${variable} = 5`,
            `4^(${variable}+1)`,
          );
        },

        // 2^x + 2^{x+1} = 3 · 2^k
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "solve",
            `${pow(2, variable)} + ${pow(2, linear(1, 1, variable))} = ${3 * ipow(2, k)}`,
            `${variable} = ${k}`,
            `2^${variable}`,
          );
        },

        // 2^x + 2^{-x} at a small integer
        () => {
          const n = randInt(rng, 1, 3);
          const twoN = ipow(2, n);
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(2, variable)} + ${pow(2, `-${variable}`)},\\; f(${n})`,
            texFrac(twoN * twoN + 1, twoN),
            `2^${variable}+2^(-${variable})`,
          );
        },

        // 2^{2x} − 5 · 2^x + 4 = 0 → 2^x = 1 or 4
        () => {
          return problem(
            "solve",
            `${pow(2, `2${variable}`)} - 5 \\cdot ${pow(2, variable)} + 4 = 0`,
            `${variable} = 0,\\; ${variable} = 2`,
            `2^${variable}`,
          );
        },

        // 3^x · 9^x = 3^{3k}
        () => {
          const k = randInt(rng, 1, 3);
          return problem(
            "solve",
            `${pow(3, variable)} \\cdot ${pow(9, variable)} = ${ipow(3, 3 * k)}`,
            `${variable} = ${k}`,
            `3^${variable}`,
          );
        },

        // 2^x − 2^{x−1} = 2^k
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "solve",
            `${pow(2, variable)} - ${pow(2, linear(1, -1, variable))} = ${ipow(2, k)}`,
            `${variable} = ${k + 1}`,
            `2^${variable}`,
          );
        },

        // 5^{2x} = 5^{-3} → x = −3/2
        () => {
          return problem(
            "solve",
            `${pow(5, `2${variable}`)} = ${powVal(5, -3)}`,
            `${variable} = ${texFrac(-3, 2)}`,
            `5^(2${variable})`,
          );
        },

        // 4^x − 2^{x+1} − 8 = 0 → 2^x = 4
        () => {
          return problem(
            "solve",
            `${pow(4, variable)} - ${pow(2, linear(1, 1, variable))} - 8 = 0`,
            `${variable} = 2`,
            `4^${variable}`,
          );
        },

        // (1/2)^x < (1/2)^k, 0 < base < 1
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "solve",
            `${half()}^{${variable}} < ${powVal(2, -k)}`,
            `${variable} > ${k}`,
            `(1/2)^${variable}`,
          );
        },

        // 16^x = 8^{x+1} → 4x = 3x+3
        () => {
          return problem(
            "solve",
            `${pow(16, variable)} = ${pow(8, linear(1, 1, variable))}`,
            `${variable} = 3`,
            `16^${variable}`,
          );
        },

        // 2^{x−h} + k evaluated
        () => {
          const h = nonzero(rng, -4, 4);
          const k = nonzero(rng, -6, 6);
          const t = h + randInt(rng, 0, 4);
          const val = ipow(2, t - h) + k;
          return problem(
            "evaluate",
            `f(${variable}) = ${pow(2, linear(1, -h, variable))} ${signed(k)},\\; f(${t})`,
            `${val}`,
            `2^(${variable}${h > 0 ? "-" : "+"}${Math.abs(h)})${k > 0 ? "+" : ""}${k}`,
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
