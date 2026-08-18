import type { GeneratedProblem } from "../types";
import {
  defineAlgebraProblem,
  linear,
  selectVariable,
  signed,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function logb(base: string | number, arg: string | number): string {
  return `\\log_{${base}}(${arg})`;
}

function pow(base: string | number, exp: string | number): string {
  return `${base}^{${exp}}`;
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

function half(): string {
  return `\\dfrac{1}{2}`;
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

export const logarithmicFunctionsProblem = defineAlgebraProblem(
  "logarithmic-functions",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // log2(2^n) = n
        () => {
          const n = randInt(rng, 0, 6);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(2, variable)},\\; f(${ipow(2, n)})`,
            `${n}`,
            `log(${variable},2)`,
          );
        },

        // log3(3^n) = n
        () => {
          const n = randInt(rng, 0, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(3, variable)},\\; f(${ipow(3, n)})`,
            `${n}`,
            `log(${variable},3)`,
          );
        },

        // log10(10^n) = n
        () => {
          const n = randInt(rng, 0, 3);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(10, variable)},\\; f(${ipow(10, n)})`,
            `${n}`,
            `log(${variable},10)`,
          );
        },

        // log_a(1) = 0
        () => {
          const a = pick(rng, [2, 3, 5, 10]);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(a, variable)},\\; f(1)`,
            `0`,
            `log(${variable},${a})`,
          );
        },

        // log_a(a) = 1
        () => {
          const a = pick(rng, [2, 3, 5, 7, 10]);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(a, variable)},\\; f(${a})`,
            `1`,
            `log(${variable},${a})`,
          );
        },

        // log2(1/2^n) = -n
        () => {
          const n = randInt(rng, 1, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(2, variable)},\\; f(${powVal(2, -n)})`,
            `${-n}`,
            `log(${variable},2)`,
          );
        },

        // log2(x) = k ⇒ x = 2^k
        () => {
          const k = randInt(rng, 1, 6);
          return problem(
            "solve",
            `${logb(2, variable)} = ${k}`,
            `${variable} = ${ipow(2, k)}`,
            `log(${variable},2)`,
          );
        },

        // log5(5^n)
        () => {
          const n = randInt(rng, 0, 4);
          return problem(
            "evaluate",
            `${logb(5, ipow(5, n))}`,
            `${n}`,
          );
        },

        // log_a(a^k) = k
        () => {
          const a = pick(rng, [2, 3, 4, 5]);
          const k = randInt(rng, 2, 5);
          return problem(
            "evaluate",
            `${logb(a, pow(a, k))}`,
            `${k}`,
          );
        },

        // D(log) = (0, ∞)
        () => {
          const a = pick(rng, [2, 3, 5, 10]);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(a, variable)},\\; D(f)`,
            `(0, +\\infty)`,
            `log(${variable},${a})`,
          );
        },

        // f^{-1}(k) for log2
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(2, variable)},\\; f^{-1}(${k})`,
            `${ipow(2, k)}`,
            `log(${variable},2)`,
          );
        },

        // log3(x) = k
        () => {
          const k = randInt(rng, 1, 4);
          return problem(
            "solve",
            `${logb(3, variable)} = ${k}`,
            `${variable} = ${ipow(3, k)}`,
            `log(${variable},3)`,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // log(M) + log(N) = log(MN)
        () => {
          const a = pick(rng, [2, 3, 5]);
          const m = randInt(rng, 1, 3);
          const n = randInt(rng, 1, 3);
          return problem(
            "evaluate",
            `${logb(a, ipow(a, m))} + ${logb(a, ipow(a, n))}`,
            `${m + n}`,
          );
        },

        // log(M) − log(N)
        () => {
          const a = pick(rng, [2, 3, 5]);
          const m = randInt(rng, 2, 5);
          const n = randInt(rng, 1, m);
          return problem(
            "evaluate",
            `${logb(a, ipow(a, m))} - ${logb(a, ipow(a, n))}`,
            `${m - n}`,
          );
        },

        // k log(M) = log(M^k)
        () => {
          const a = pick(rng, [2, 3, 5]);
          const k = randInt(rng, 2, 4);
          const m = randInt(rng, 1, 3);
          return problem(
            "evaluate",
            `${k}${logb(a, ipow(a, m))}`,
            `${k * m}`,
          );
        },

        // log_{a^2}(a) = 1/2
        () => {
          const a = pick(rng, [2, 3, 5]);
          return problem(
            "evaluate",
            `${logb(a * a, a)}`,
            texFrac(1, 2),
          );
        },

        // log2(x) = log2(c) ⇒ x = c
        () => {
          const c = randInt(rng, 2, 16);
          return problem(
            "solve",
            `${logb(2, variable)} = ${logb(2, c)}`,
            `${variable} = ${c}`,
            `log(${variable},2)`,
          );
        },

        // R(log) = ℝ
        () => {
          const a = pick(rng, [2, 3, 5, 10]);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(a, variable)},\\; R(f)`,
            `\\mathbb{R}`,
            `log(${variable},${a})`,
          );
        },

        // log_{1/2}(2^k) = -k
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "evaluate",
            `${logb(half(), ipow(2, k))}`,
            `${-k}`,
          );
        },

        // log4(8) = 3/2
        () => {
          return problem(
            "evaluate",
            `${logb(4, 8)}`,
            texFrac(3, 2),
          );
        },

        // D(log(x − h))
        () => {
          const h = nonzero(rng, -5, 5);
          const inner = linear(1, -h, variable);
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(2, inner)},\\; D(f)`,
            `${variable} > ${h}`,
            `log(${variable}${h > 0 ? "-" : "+"}${Math.abs(h)},2)`,
          );
        },

        // log2(x) > k, base > 1
        () => {
          const k = randInt(rng, 1, 5);
          return problem(
            "solve",
            `${logb(2, variable)} > ${k}`,
            `${variable} > ${ipow(2, k)}`,
            `log(${variable},2)`,
          );
        },

        // log2(4x) = 2 + log2(x)
        () => {
          return problem(
            "simplify",
            `${logb(2, `4${variable}`)}`,
            `2 + ${logb(2, variable)}`,
            `log(${variable},2)`,
          );
        },

        // 9^{log_9 k} wait  a^{log_a k} = k
        () => {
          const a = pick(rng, [2, 3, 5, 10]);
          const k = randInt(rng, 2, 12);
          return problem(
            "evaluate",
            `${pow(a, logb(a, k))}`,
            `${k}`,
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // log2(x) + log2(x − a) = k
        () => {
          const p = randInt(rng, 2, 4);
          const q = randInt(rng, 1, p - 1);
          const x = ipow(2, p);
          const v = ipow(2, q);
          const a = x - v;
          const k = p + q;
          return problem(
            "solve",
            `${logb(2, variable)} + ${logb(2, linear(1, -a, variable))} = ${k}`,
            `${variable} = ${x}`,
            `log(${variable},2)`,
          );
        },

        // log_a b · log_b a = 1
        () => {
          const a = pick(rng, [2, 3, 4, 5]);
          let b = pick(rng, [2, 3, 4, 5, 8, 9]);
          while (b === a) b = pick(rng, [2, 3, 4, 5, 8, 9]);
          return problem(
            "evaluate",
            `${logb(a, b)} \\cdot ${logb(b, a)}`,
            `1`,
          );
        },

        // log2(x^2) = 2k ⇒ x = ±2^k
        () => {
          const k = randInt(rng, 1, 4);
          return problem(
            "solve",
            `${logb(2, `${variable}^{2}`)} = ${2 * k}`,
            `${variable} = ${-ipow(2, k)},\\; ${variable} = ${ipow(2, k)}`,
            `log(${variable}^2,2)`,
          );
        },

        // log2(x) − log2(x − a) = 1 ⇒ x = 2a
        () => {
          const a = randInt(rng, 2, 8);
          return problem(
            "solve",
            `${logb(2, variable)} - ${logb(2, linear(1, -a, variable))} = 1`,
            `${variable} = ${2 * a}`,
            `log(${variable},2)`,
          );
        },

        // log4(x) = log2(x)/2 = k/2 wait log4(2^k)=k/2
        () => {
          const k = randInt(rng, 1, 6);
          return problem(
            "evaluate",
            `${logb(4, ipow(2, k))}`,
            texFrac(k, 2),
          );
        },

        // log_{1/2}(x) < −k ⇒ x > 2^k
        () => {
          const k = randInt(rng, 1, 4);
          return problem(
            "solve",
            `${logb(half(), variable)} < ${-k}`,
            `${variable} > ${ipow(2, k)}`,
            `log(${variable},0.5)`,
          );
        },

        // log2(x−1)+log2(x+1)=k, x^2−1=2^k, pick k even? 2^k+1 square
        // k=3: x^2=9, x=3
        () => {
          return problem(
            "solve",
            `${logb(2, linear(1, -1, variable))} + ${logb(2, linear(1, 1, variable))} = 3`,
            `${variable} = 3`,
            `log(${variable},2)`,
          );
        },

        // log2(4^x) = 2x
        () => {
          return problem(
            "simplify",
            `${logb(2, pow(4, variable))}`,
            `2${variable}`,
            `2*${variable}`,
          );
        },

        // log3(x) + log9(x) = c → (3/2) log3(x) = c
        () => {
          const t = randInt(rng, 1, 4);
          const cN = 3 * t;
          const cD = 2;
          return problem(
            "solve",
            `${logb(3, variable)} + ${logb(9, variable)} = ${texFrac(cN, cD)}`,
            `${variable} = ${ipow(3, t)}`,
            `log(${variable},3)`,
          );
        },

        // log2(x−h) + k evaluated at 2^n + h
        () => {
          const h = nonzero(rng, -4, 4);
          const k = nonzero(rng, -5, 5);
          const n = randInt(rng, 1, 5);
          const t = ipow(2, n) + h;
          return problem(
            "evaluate",
            `f(${variable}) = ${logb(2, linear(1, -h, variable))} ${signed(k)},\\; f(${t})`,
            `${n + k}`,
            `log(${variable}${h > 0 ? "-" : "+"}${Math.abs(h)},2)${k > 0 ? "+" : ""}${k}`,
          );
        },

        // log8(16) = 4/3
        () => {
          return problem(
            "evaluate",
            `${logb(8, 16)}`,
            texFrac(4, 3),
          );
        },

        // 2 log5(x) − log5(x) = log5(4) ⇒ x = 4
        () => {
          const a = pick(rng, [2, 3, 5]);
          const m = randInt(rng, 2, 5);
          const val = ipow(a, m);
          return problem(
            "solve",
            `2${logb(a, variable)} = ${logb(a, val)} + ${logb(a, variable)}`,
            `${variable} = ${val}`,
            `log(${variable},${a})`,
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
