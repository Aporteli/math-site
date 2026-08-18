import type { GeneratedProblem } from "../types";
import { defineAlgebraProblem, texFrac } from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function ipow(base: number, exp: number): number {
  if (exp === 0) return 1;
  return base ** exp;
}

function term(a1: number, q: number, n: number): number {
  return a1 * ipow(q, n - 1);
}

function sumN(a1: number, q: number, n: number): number {
  if (q === 1) return n * a1;
  return (a1 * (ipow(q, n) - 1)) / (q - 1);
}

function qTex(q: number): string {
  if (q < 0) return `(${q})`;
  return String(q);
}

function general(a1: number, q: number): string {
  const pow = `${qTex(q)}^{n-1}`;
  if (a1 === 1) return pow;
  if (a1 === -1) return `-${pow}`;
  return `${a1} \\cdot ${pow}`;
}

function listed(values: readonly number[]): string {
  return values.map(String).join(",\\; ");
}

function smallQ(rng: () => number): number {
  return pick(rng, [2, 3, -2, -3]);
}

function posQ(rng: () => number): number {
  return pick(rng, [2, 3]);
}

function prodN(a1: number, q: number, n: number): number {
  let p = 1;
  for (let i = 1; i <= n; i += 1) p *= term(a1, q, i);
  return p;
}

/** a1 + a3 + ⋯ + a_{2n−1} */
function sumOdd(a1: number, q: number, n: number): number {
  return (a1 * (ipow(q * q, n) - 1)) / (q * q - 1);
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

export const geometricProgressionsProblem = defineAlgebraProblem(
  "geometric-progressions",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // a_n from a1, q, n
        () => {
          const q = posQ(rng);
          const n = q === 3 ? randInt(rng, 3, 5) : randInt(rng, 3, 7);
          const a1 = nonzero(rng, 1, 6);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; a_{${n}}`,
            `${term(a1, q, n)}`,
          );
        },

        // q from a1, a2
        () => {
          const a1 = nonzero(rng, 2, 8);
          const q = smallQ(rng);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{2} = ${a1 * q},\\; q`,
            `${q}`,
          );
        },

        // a1 from a_n, q, n
        () => {
          const q = posQ(rng);
          const n = q === 3 ? randInt(rng, 3, 5) : randInt(rng, 3, 6);
          const a1 = nonzero(rng, 1, 5);
          return problem(
            "evaluate",
            `a_{${n}} = ${term(a1, q, n)},\\; q = ${q},\\; a_{1}`,
            `${a1}`,
          );
        },

        // listed terms, later term
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 4);
          const n = q === 3 ? randInt(rng, 4, 5) : randInt(rng, 5, 7);
          return problem(
            "evaluate",
            `${listed([a1, a1 * q, a1 * q * q])},\\; \\ldots,\\; a_{${n}}`,
            `${term(a1, q, n)}`,
          );
        },

        // S_n
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 5);
          const n = q === 3 ? randInt(rng, 3, 5) : randInt(rng, 3, 6);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; S_{${n}}`,
            `${sumN(a1, q, n)}`,
          );
        },

        // general term
        () => {
          const q = smallQ(rng);
          const a1 = nonzero(rng, 1, 6);
          return problem(
            "simplify",
            `a_{1} = ${a1},\\; q = ${q},\\; a_{n}`,
            general(a1, q),
          );
        },

        // n from a_n (powers)
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 4);
          const n = q === 3 ? randInt(rng, 3, 5) : randInt(rng, 3, 7);
          return problem(
            "solve",
            `a_{1} = ${a1},\\; q = ${q},\\; a_{n} = ${term(a1, q, n)}`,
            `n = ${n}`,
          );
        },

        // geometric mean: a2^2 = a1 a3
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 6);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{3} = ${a1 * q * q},\\; a_{2}`,
            `${a1 * q}`,
          );
        },

        // a_{n+1}/a_n = q
        () => {
          const q = smallQ(rng);
          const a1 = nonzero(rng, 1, 6);
          const n = randInt(rng, 2, 4);
          return problem(
            "evaluate",
            `a_{${n}} = ${term(a1, q, n)},\\; a_{${n + 1}} = ${term(a1, q, n + 1)},\\; q`,
            `${q}`,
          );
        },

        // S_n from a1, a_n, q
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 5);
          const n = q === 3 ? randInt(rng, 3, 5) : randInt(rng, 3, 6);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{${n}} = ${term(a1, q, n)},\\; q = ${q},\\; S_{${n}}`,
            `${sumN(a1, q, n)}`,
          );
        },

        // three listed, q
        () => {
          const q = smallQ(rng);
          const a1 = nonzero(rng, 1, 5);
          return problem(
            "evaluate",
            `${listed([a1, a1 * q, a1 * q * q])},\\; q`,
            `${q}`,
          );
        },

        // a_p / a_k = q^{p-k}
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 4);
          const k = randInt(rng, 1, 3);
          const p = randInt(rng, k + 1, k + 3);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; \\dfrac{a_{${p}}}{a_{${k}}}`,
            `${ipow(q, p - k)}`,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // a_p, a_r → a_s
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 4);
          const p = 2;
          const r = 4;
          const s = q === 3 ? 5 : 6;
          return problem(
            "evaluate",
            `a_{${p}} = ${term(a1, q, p)},\\; a_{${r}} = ${term(a1, q, r)},\\; a_{${s}}`,
            `${term(a1, q, s)}`,
          );
        },

        // S_n larger n
        () => {
          const q = 2;
          const a1 = nonzero(rng, 1, 5);
          const n = randInt(rng, 6, 8);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; S_{${n}}`,
            `${sumN(a1, q, n)}`,
          );
        },

        // n from a1, q, a_n
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 3);
          const n = q === 3 ? randInt(rng, 4, 6) : randInt(rng, 5, 8);
          return problem(
            "solve",
            `a_{1} = ${a1},\\; q = ${q},\\; a_{n} = ${term(a1, q, n)}`,
            `n = ${n}`,
          );
        },

        // q = −2, a_n
        () => {
          const a1 = nonzero(rng, 1, 5);
          const n = randInt(rng, 4, 7);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = -2,\\; a_{${n}}`,
            `${term(a1, -2, n)}`,
          );
        },

        // q = 1/2, a_n integer
        () => {
          const n = randInt(rng, 3, 6);
          const a1 = ipow(2, n - 1) * nonzero(rng, 1, 4);
          const an = a1 / ipow(2, n - 1);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = \\dfrac{1}{2},\\; a_{${n}}`,
            `${an}`,
          );
        },

        // a1 from S_n, q, n
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 5);
          const n = q === 3 ? randInt(rng, 3, 5) : randInt(rng, 4, 6);
          return problem(
            "evaluate",
            `S_{${n}} = ${sumN(a1, q, n)},\\; q = ${q},\\; n = ${n},\\; a_{1}`,
            `${a1}`,
          );
        },

        // S_∞ = a1/(1−q)
        () => {
          const qDen = pick(rng, [2, 3, 4]);
          const a1 = qDen === 2 ? pick(rng, [1, 2, 3, 4]) : pick(rng, [1, 2, 4]);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = \\dfrac{1}{${qDen}},\\; S`,
            texFrac(a1 * qDen, qDen - 1),
          );
        },

        // q from a2, a3
        () => {
          const q = smallQ(rng);
          const a1 = nonzero(rng, 1, 4);
          return problem(
            "evaluate",
            `a_{2} = ${term(a1, q, 2)},\\; a_{3} = ${term(a1, q, 3)},\\; q`,
            `${q}`,
          );
        },

        // listed decreasing (q = 1/3)
        () => {
          const n = randInt(rng, 4, 6);
          const a1 = ipow(3, n - 1) * pick(rng, [1, 2]);
          const an = a1 / ipow(3, n - 1);
          return problem(
            "evaluate",
            `${listed([a1, a1 / 3, a1 / 9])},\\; \\ldots,\\; a_{${n}}`,
            `${an}`,
          );
        },

        // insert: a1, a_{k+2} → q
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 3);
          const last = q === 3 ? 4 : 5;
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{${last}} = ${term(a1, q, last)},\\; q`,
            `${q}`,
          );
        },

        // a2^2 = a1 a3, find a3
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 6);
          const a2 = a1 * q;
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{2} = ${a2},\\; a_{3}`,
            `${a1 * q * q}`,
          );
        },

        // S_n from listed start
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 4);
          const n = q === 3 ? randInt(rng, 4, 5) : randInt(rng, 5, 7);
          return problem(
            "evaluate",
            `${listed([a1, a1 * q, a1 * q * q])},\\; \\ldots,\\; S_{${n}}`,
            `${sumN(a1, q, n)}`,
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // S_{2n}/S_n = q^n + 1
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 4);
          const n = q === 3 ? randInt(rng, 3, 4) : randInt(rng, 3, 5);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; \\dfrac{S_{${2 * n}}}{S_{${n}}}`,
            `${ipow(q, n) + 1}`,
          );
        },

        // product a1⋯an = a1^n q^{n(n−1)/2}
        () => {
          const q = 2;
          const a1 = pick(rng, [1, 2]);
          const n = a1 === 1 ? randInt(rng, 5, 7) : randInt(rng, 4, 5);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; a_{1} a_{2} \\cdots a_{${n}}`,
            `${prodN(a1, q, n)}`,
          );
        },

        // odd-indexed subsum a1+a3+⋯+a_{2n−1}
        () => {
          const q = pick(rng, [2, -2, 3]);
          const a1 = nonzero(rng, 1, 3);
          const n = q === 3 ? 3 : randInt(rng, 3, 5);
          const last = 2 * n - 1;
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; a_{1} + a_{3} + \\cdots + a_{${last}}`,
            `${sumOdd(a1, q, n)}`,
          );
        },

        // weighted Σ 2^{k−1} a_k  (GP with ratio 2q)
        () => {
          const q = pick(rng, [2, 3, -2]);
          const a1 = 1;
          const n = q === 3 ? 4 : randInt(rng, 4, 5);
          const ratio = 2 * q;
          const s = (a1 * (ipow(ratio, n) - 1)) / (ratio - 1);
          return problem(
            "evaluate",
            `a_{k} = ${qTex(q)}^{k-1},\\; \\sum_{k=1}^{${n}} 2^{k-1} a_{k}`,
            `${s}`,
          );
        },

        // hybrid of two GPs: a_n = A·2^{n−1} + B·3^{n−1}
        () => {
          const A = pick(rng, [1, 2, 3]);
          const B = pick(rng, [1, 2]);
          const n = randInt(rng, 4, 6);
          const s =
            (A * (ipow(2, n) - 1)) / 1 + (B * (ipow(3, n) - 1)) / 2;
          const aTex =
            A === 1 && B === 1
              ? `2^{n-1} + 3^{n-1}`
              : A === 1
                ? `2^{n-1} + ${B} \\cdot 3^{n-1}`
                : B === 1
                  ? `${A} \\cdot 2^{n-1} + 3^{n-1}`
                  : `${A} \\cdot 2^{n-1} + ${B} \\cdot 3^{n-1}`;
          return problem(
            "evaluate",
            `a_{n} = ${aTex},\\; S_{${n}}`,
            `${s}`,
          );
        },

        // middle term of a three-term GP written in x
        () => {
          const q = posQ(rng);
          const x = q * pick(rng, [4, 6, 8, 9, 12]);
          const a1 = x / q;
          const a3 = x * q;
          const u = x - a1;
          const v = a3 - x;
          return problem(
            "solve",
            `a_{1} = x ${u >= 0 ? `- ${u}` : `+ ${-u}`},\\; a_{2} = x,\\; a_{3} = x ${v >= 0 ? `+ ${v}` : `- ${-v}`},\\; x^{2} = a_{1} a_{3},\\; x`,
            `${x}`,
          );
        },

        // S_{2n}, S_n → a_{n+1} = a1 q^n = a1 (S_{2n}/S_n − 1)
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 4);
          const n = q === 3 ? 3 : randInt(rng, 3, 5);
          const sN = sumN(a1, q, n);
          const s2 = sumN(a1, q, 2 * n);
          return problem(
            "evaluate",
            `S_{${n}} = ${sN},\\; S_{${2 * n}} = ${s2},\\; a_{1} = ${a1},\\; a_{${n + 1}}`,
            `${term(a1, q, n + 1)}`,
          );
        },

        // q from S_n, a1, a_n: q = (S−a1)/(S−a_n)
        () => {
          const q = pick(rng, [2, 3, -2, -3]);
          const a1 = nonzero(rng, 1, 4);
          const n = q === 3 || q === -3 ? randInt(rng, 4, 5) : randInt(rng, 4, 6);
          const an = term(a1, q, n);
          const s = sumN(a1, q, n);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{${n}} = ${an},\\; S_{${n}} = ${s},\\; q`,
            `${q}`,
          );
        },

        // Σ 1/a_k  (reciprocal GP)
        () => {
          const q = 2;
          const n = randInt(rng, 4, 6);
          const a1 = 1;
          const num = ipow(q, n) - 1;
          const den = ipow(q, n - 1) * (q - 1);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; \\dfrac{1}{a_{1}} + \\dfrac{1}{a_{2}} + \\cdots + \\dfrac{1}{a_{${n}}}`,
            texFrac(num, den),
          );
        },

        // (a_{n+1} + a_{n−1}) / a_n = q + 1/q
        () => {
          const q = pick(rng, [2, 3, -2, -3]);
          const a1 = nonzero(rng, 1, 4);
          const n = randInt(rng, 3, 5);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; \\dfrac{a_{${n + 1}} + a_{${n - 1}}}{a_{${n}}}`,
            texFrac(q * q + 1, q),
          );
        },

        // three-term GP: sum S, product P → middle = ∛P
        () => {
          const q = posQ(rng);
          const mid = q * pick(rng, [2, 3, 4]);
          const a = mid / q;
          const c = mid * q;
          return problem(
            "evaluate",
            `b,\\; bq,\\; bq^{2},\\; b + bq + bq^{2} = ${a + mid + c},\\; b \\cdot bq \\cdot bq^{2} = ${a * mid * c},\\; bq`,
            `${mid}`,
          );
        },

        // S_n / a_n = (q^n − 1) / ((q − 1) q^{n−1})
        () => {
          const q = posQ(rng);
          const a1 = nonzero(rng, 1, 3);
          const n = q === 3 ? randInt(rng, 4, 5) : randInt(rng, 4, 7);
          const an = term(a1, q, n);
          const s = sumN(a1, q, n);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; q = ${q},\\; n = ${n},\\; \\dfrac{S_{${n}}}{a_{${n}}}`,
            texFrac(s, an),
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
