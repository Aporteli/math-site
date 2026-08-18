import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  reduce,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function sqrt(n: string | number): string {
  return `\\sqrt{${n}}`;
}

function cbrt(n: string | number): string {
  return `\\sqrt[3]{${n}}`;
}

function problem(
  instructionId: GeneratedProblem["instructionId"],
  promptTex: string,
  steps: string[],
): GeneratedProblem {
  return {
    instructionId,
    promptTex,
    solutionTex: aligned(steps),
  } as GeneratedProblem;
}

const SQUARE_FREE = [2, 3, 5, 6, 7, 10, 11, 13] as const;

export const rootFindingAlgorithmsProblem = defineAlgebraProblem(
  "root-finding-algorithms",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // √(k^2)
        () => {
          const k = randInt(rng, 2, 12);
          return problem("evaluate", sqrt(k * k), [
            `${sqrt(`${k}^{2}`)}`,
            `= ${k}`,
          ]);
        },

        // x^2 = k^2
        () => {
          const k = randInt(rng, 2, 12);
          return problem("solve", `x^{2} = ${k * k}`, [
            `x = \\pm ${sqrt(k * k)}`,
            `x = \\pm ${k}`,
          ]);
        },

        // ∛(k^3)
        () => {
          const k = randInt(rng, 2, 6);
          return problem("evaluate", cbrt(k * k * k), [
            `${cbrt(`${k}^{3}`)}`,
            `= ${k}`,
          ]);
        },

        // √(a^2 b)
        () => {
          const a = randInt(rng, 2, 8);
          const b = pick(rng, SQUARE_FREE);
          return problem("simplify", sqrt(a * a * b), [
            `${sqrt(`${a}^{2} \\cdot ${b}`)}`,
            `= ${a}${sqrt(b)}`,
          ]);
        },

        // √a · √a
        () => {
          const a = randInt(rng, 2, 12);
          return problem("simplify", `${sqrt(a)} \\cdot ${sqrt(a)}`, [
            `${sqrt(`${a} \\cdot ${a}`)}`,
            `= ${a}`,
          ]);
        },

        // n < √m < n+1
        () => {
          const n = randInt(rng, 3, 10);
          const m = n * n + randInt(rng, 1, 2 * n);
          return problem("evaluate", sqrt(m), [
            `${n}^{2} = ${n * n},\\; ${n + 1}^{2} = ${(n + 1) * (n + 1)}`,
            `${n} < ${sqrt(m)} < ${n + 1}`,
          ]);
        },

        // midpoint (bisection)
        () => {
          const a = randInt(rng, 1, 8);
          const h = randInt(rng, 1, 6);
          const b = a + 2 * h;
          const m = (a + b) / 2;
          return problem(
            "evaluate",
            `\\dfrac{${a} + ${b}}{2}`,
            [`= ${m}`],
          );
        },

        // (√k)^2
        () => {
          const k = randInt(rng, 2, 15);
          return problem("simplify", `\\left(${sqrt(k)}\\right)^{2}`, [`= ${k}`]);
        },

        // x^3 = k^3
        () => {
          const k = nonzero(rng, -5, 6);
          return problem("solve", `x^{3} = ${k * k * k}`, [`x = ${k}`]);
        },

        // √(a^2 b^2)
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 8);
          return problem("simplify", sqrt(a * a * b * b), [
            `${sqrt(`${a}^{2} \\cdot ${b}^{2}`)}`,
            `= ${a * b}`,
          ]);
        },

        // |x| = k
        () => {
          const k = randInt(rng, 2, 12);
          return problem("solve", `|x| = ${k}`, [`x = \\pm ${k}`]);
        },

        // √√(k^4)
        () => {
          const k = randInt(rng, 2, 6);
          return problem("evaluate", sqrt(sqrt(k ** 4)), [
            `${sqrt(`${k}^{2}`)}`,
            `= ${k}`,
          ]);
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // Newton: x^2 - n = 0, one step
        () => {
          const k = randInt(rng, 2, 8);
          const n = randInt(rng, 2, 20);
          const x1 = reduce(k * k + n, 2 * k);
          return problem(
            "evaluate",
            `f(x) = x^{2} - ${n},\\; x_{0} = ${k},\\; x_{1} = x_{0} - \\dfrac{f(x_{0})}{f'(x_{0})}`,
            [
              `f'(x) = 2x`,
              `x_{1} = ${k} - \\dfrac{${k * k} - ${n}}{${2 * k}}`,
              `x_{1} = ${texFrac(x1.n, x1.d)}`,
            ],
          );
        },

        // bisection midpoint of [a, b]
        () => {
          const a = randInt(rng, 1, 6);
          const b = a + 2 * randInt(rng, 2, 6);
          const m = (a + b) / 2;
          return problem(
            "evaluate",
            `[${a}, ${b}],\\; m = \\dfrac{a + b}{2}`,
            [`m = ${m}`],
          );
        },

        // next bisection interval for x^2 - n
        () => {
          const a = randInt(rng, 1, 5);
          const b = a + 2 * randInt(rng, 2, 5);
          const m = (a + b) / 2;
          const lo = a * a + 1;
          const hi = b * b - 1;
          const n =
            lo <= hi ? randInt(rng, lo, hi) : a * a + 1;
          const left = m * m > n;
          const next = left ? `[${a}, ${m}]` : `[${m}, ${b}]`;
          return problem(
            "evaluate",
            `f(x) = x^{2} - ${n},\\; [${a}, ${b}]`,
            [
              `m = ${m},\\; f(m) = ${m * m - n}`,
              next,
            ],
          );
        },

        // √(p/q)
        () => {
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 6);
          const s = pick(rng, SQUARE_FREE);
          const t = pick(rng, SQUARE_FREE.filter((x) => x !== s));
          return problem("simplify", sqrt(`\\dfrac{${a * a * s}}{${b * b * t}}`), [
            `\\dfrac{${a}${sqrt(s)}}{${b}${sqrt(t)}}`,
          ]);
        },

        // like radicals
        () => {
          const b = pick(rng, SQUARE_FREE);
          const p = randInt(rng, 2, 7);
          const q = randInt(rng, 1, 6);
          return problem("simplify", `${p}${sqrt(b)} + ${q}${sqrt(b)}`, [
            `${p + q}${sqrt(b)}`,
          ]);
        },

        // Newton: x^3 - n
        () => {
          const k = randInt(rng, 2, 5);
          const n = randInt(rng, 2, 30);
          const x1 = reduce(2 * k * k * k + n, 3 * k * k);
          return problem(
            "evaluate",
            `f(x) = x^{3} - ${n},\\; x_{0} = ${k},\\; x_{1} = ?`,
            [
              `f'(x) = 3x^{2}`,
              `x_{1} = ${k} - \\dfrac{${k ** 3} - ${n}}{${3 * k * k}}`,
              `x_{1} = ${texFrac(x1.n, x1.d)}`,
            ],
          );
        },

        // x^2 = a^2 b
        () => {
          const a = randInt(rng, 2, 8);
          const b = pick(rng, SQUARE_FREE);
          return problem("solve", `x^{2} = ${a * a * b}`, [
            `x = \\pm ${sqrt(a * a * b)}`,
            `x = \\pm ${a}${sqrt(b)}`,
          ]);
        },

        // secant for x^2 - n
        () => {
          const a = randInt(rng, 1, 5);
          const b = a + randInt(rng, 1, 5);
          const n = randInt(rng, 2, 20);
          const x2 = reduce(a * b + n, a + b);
          return problem(
            "evaluate",
            `f(x) = x^{2} - ${n},\\; x_{0} = ${a},\\; x_{1} = ${b}`,
            [
              `x_{2} = x_{1} - \\dfrac{f(x_{1})(x_{1} - x_{0})}{f(x_{1}) - f(x_{0})}`,
              `x_{2} = ${texFrac(x2.n, x2.d)}`,
            ],
          );
        },

        // simplify √(k)
        () => {
          const a = randInt(rng, 2, 8);
          const b = pick(rng, SQUARE_FREE);
          return problem("simplify", sqrt(a * a * b), [
            `${sqrt(`${a}^{2} \\cdot ${b}`)}`,
            `= ${a}${sqrt(b)}`,
          ]);
        },

        // ∛(a^3 b)
        () => {
          const a = randInt(rng, 2, 5);
          const b = pick(rng, [2, 3, 5, 6, 7] as const);
          return problem("simplify", cbrt(a * a * a * b), [
            `${cbrt(`${a}^{3} \\cdot ${b}`)}`,
            `= ${a}${cbrt(b)}`,
          ]);
        },

        // √a / √b
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 8);
          const r = reduce(a, b);
          return problem("simplify", `\\dfrac{${sqrt(a * a)}}{${sqrt(b * b)}}`, [
            `\\dfrac{${a}}{${b}}`,
            `= ${texFrac(r.n, r.d)}`,
          ]);
        },

        // sign change f(a)f(b) < 0
        () => {
          const n = randInt(rng, 5, 20);
          const a = randInt(rng, 1, Math.max(1, Math.floor(Math.sqrt(n)) - 1));
          const b = Math.ceil(Math.sqrt(n)) + randInt(rng, 0, 3);
          const fa = a * a - n;
          const fb = b * b - n;
          return problem(
            "evaluate",
            `f(x) = x^{2} - ${n},\\; f(${a}) \\cdot f(${b})`,
            [`(${fa}) \\cdot (${fb}) = ${fa * fb}`],
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // Newton two steps, x^2 - n
        () => {
          const k = randInt(rng, 1, 4);
          const n = randInt(rng, 2, 10);
          const x1 = reduce(k * k + n, 2 * k);
          const x2 = reduce(
            x1.n * x1.n + n * x1.d * x1.d,
            2 * x1.n * x1.d,
          );
          return problem(
            "evaluate",
            `f(x) = x^{2} - ${n},\\; x_{0} = ${k},\\; x_{2} = ?`,
            [
              `x_{1} = ${texFrac(x1.n, x1.d)}`,
              `x_{2} = ${texFrac(x2.n, x2.d)}`,
            ],
          );
        },

        // √(p + q + 2√(pq)) = √p + √q
        () => {
          const p = pick(rng, [2, 3, 5, 6, 7] as const);
          const q = pick(
            rng,
            ([2, 3, 5, 6, 7] as const).filter((x) => x !== p),
          );
          return problem(
            "simplify",
            sqrt(`${p + q} + 2${sqrt(p * q)}`),
            [`${sqrt(p)} + ${sqrt(q)}`],
          );
        },

        // (√a + √b)(√a - √b)
        () => {
          const a = randInt(rng, 5, 15);
          const b = randInt(rng, 2, a - 1);
          return problem(
            "simplify",
            `\\left(${sqrt(a)} + ${sqrt(b)}\\right)\\left(${sqrt(a)} - ${sqrt(b)}\\right)`,
            [`${a} - ${b}`, `= ${a - b}`],
          );
        },

        // bisection: second midpoint
        () => {
          const a0 = randInt(rng, 1, 4);
          const b0 = a0 + 4 * randInt(rng, 1, 3);
          const n = randInt(rng, a0 * a0 + 1, b0 * b0 - 1);
          const m0 = (a0 + b0) / 2;
          const left = m0 * m0 > n;
          const a1 = left ? a0 : m0;
          const b1 = left ? m0 : b0;
          const m1 = (a1 + b1) / 2;
          return problem(
            "evaluate",
            `f(x) = x^{2} - ${n},\\; [${a0}, ${b0}],\\; m_{2} = ?`,
            [
              `m_{1} = ${m0}`,
              `[${a1}, ${b1}]`,
              `m_{2} = ${m1}`,
            ],
          );
        },

        // 1/√a
        () => {
          const a = pick(rng, SQUARE_FREE);
          return problem("simplify", `\\dfrac{1}{${sqrt(a)}}`, [
            `\\dfrac{${sqrt(a)}}{${a}}`,
          ]);
        },

        // quadratic integer roots
        () => {
          const p = nonzero(rng, -6, 6);
          const q = nonzero(rng, -6, 6);
          const s = p + q;
          const prod = p * q;
          const parts = ["x^{2}"];
          if (s !== 0) parts.push(s > 0 ? `- ${s}x` : `+ ${-s}x`);
          parts.push(prod >= 0 ? `+ ${prod}` : `- ${-prod}`);
          return problem("solve", `${parts.join(" ")} = 0`, [
            `x = ${p},\\; x = ${q}`,
          ]);
        },

        // a√c - b√c after simplifying
        () => {
          const r = pick(rng, [2, 3, 5] as const);
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 5);
          const p = a * a * r;
          const q = b * b * r;
          return problem("simplify", `${a}${sqrt(r)} + ${sqrt(q)}`, [
            `${a}${sqrt(r)} + ${b}${sqrt(r)}`,
            `${a + b}${sqrt(r)}`,
          ]);
        },

        // x^4 = k^4
        () => {
          const k = randInt(rng, 2, 6);
          return problem("solve", `x^{4} = ${k ** 4}`, [
            `x^{2} = ${k * k}`,
            `x = \\pm ${k}`,
          ]);
        },

        // ∛(p/q)
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 5);
          const s = pick(rng, [2, 3, 5] as const);
          return problem("simplify", cbrt(`\\dfrac{${a ** 3 * s}}{${b ** 3}}`), [
            `\\dfrac{${a}${cbrt(s)}}{${b}}`,
          ]);
        },

        // 1/√a  and  √a/(√a+√b)
        () => {
          const a = pick(rng, [5, 6, 7, 10] as const);
          const b = pick(rng, [2, 3, 5] as const);
          if (a === b) {
            return problem("simplify", `\\dfrac{1}{${sqrt(a)}}`, [
              `\\dfrac{${sqrt(a)}}{${a}}`,
            ]);
          }
          return problem(
            "simplify",
            `\\dfrac{${sqrt(a)}}{${sqrt(a)} + ${sqrt(b)}}`,
            [
              `\\dfrac{${sqrt(a)}\\left(${sqrt(a)} - ${sqrt(b)}\\right)}{${a} - ${b}}`,
              `\\dfrac{${a} - ${sqrt(a * b)}}{${a - b}}`,
            ],
          );
        },

        // √(a/b) with squares
        () => {
          const a = randInt(rng, 2, 7);
          const b = randInt(rng, 2, 7);
          const s = pick(rng, SQUARE_FREE);
          const t = pick(rng, SQUARE_FREE.filter((x) => x !== s));
          const r = reduce(a, b);
          return problem(
            "simplify",
            sqrt(`\\dfrac{${a * a * s}}{${b * b * t}}`),
            [`\\dfrac{${r.n}${sqrt(s)}}{${r.d}${sqrt(t)}}`],
          );
        },

        // Newton for x^2 + x - n
        () => {
          const k = randInt(rng, 1, 5);
          const n = randInt(rng, 2, 12);
          const fk = k * k + k - n;
          const df = 2 * k + 1;
          const x1 = reduce(k * df - fk, df);
          return problem(
            "evaluate",
            `f(x) = x^{2} + x - ${n},\\; x_{0} = ${k},\\; x_{1} = ?`,
            [
              `f'(x) = 2x + 1`,
              `x_{1} = ${k} - \\dfrac{${fk}}{${df}}`,
              `x_{1} = ${texFrac(x1.n, x1.d)}`,
            ],
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
