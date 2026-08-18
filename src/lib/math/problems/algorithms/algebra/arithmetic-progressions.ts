import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  gcd,
  lcm,
  linear,
  polyTex,
  quadratic,
  signed,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function term(a1: number, d: number, n: number): number {
  return a1 + (n - 1) * d;
}

function sumN(a1: number, d: number, n: number): number {
  return (n * (2 * a1 + (n - 1) * d)) / 2;
}

function listed(values: readonly number[]): string {
  return values.map(String).join(",\\; ");
}

function num(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}

function firstCommon(
  a1: number,
  d1: number,
  b1: number,
  d2: number,
): { c0: number; D: number } | null {
  const g = gcd(d1, d2);
  if ((a1 - b1) % g !== 0) return null;
  const D = lcm(d1, d2);
  const start = Math.max(a1, b1);
  for (let x = start; x < start + D; x += 1) {
    if ((x - a1) % d1 === 0 && (x - b1) % d2 === 0) return { c0: x, D };
  }
  return null;
}

function sumSq(a1: number, d: number, n: number): number {
  let s = 0;
  for (let k = 1; k <= n; k += 1) s += term(a1, d, k) ** 2;
  return s;
}

function sumKA(a1: number, d: number, n: number): number {
  let s = 0;
  for (let k = 1; k <= n; k += 1) s += k * term(a1, d, k);
  return s;
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

export const arithmeticProgressionsProblem = defineAlgebraProblem(
  "arithmetic-progressions",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // a_n from a1, d, n
        () => {
          const a1 = randInt(rng, -8, 12);
          const d = nonzero(rng, -6, 6);
          const n = randInt(rng, 4, 12);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; d = ${d},\\; a_{${n}}`,
            `${term(a1, d, n)}`,
          );
        },

        // d from a1, a2
        () => {
          const a1 = randInt(rng, -10, 12);
          const d = nonzero(rng, -8, 8);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{2} = ${a1 + d},\\; d`,
            `${d}`,
          );
        },

        // a1 from a_n, d, n
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -6, 6);
          const n = randInt(rng, 4, 10);
          return problem(
            "evaluate",
            `a_{${n}} = ${term(a1, d, n)},\\; d = ${d},\\; a_{1}`,
            `${a1}`,
          );
        },

        // listed terms, later term
        () => {
          const a1 = randInt(rng, -6, 10);
          const d = nonzero(rng, -5, 5);
          const n = randInt(rng, 6, 12);
          return problem(
            "evaluate",
            `${listed([a1, a1 + d, a1 + 2 * d])},\\; \\ldots,\\; a_{${n}}`,
            `${term(a1, d, n)}`,
          );
        },

        // S_n
        () => {
          const a1 = randInt(rng, -6, 10);
          const d = nonzero(rng, -5, 5);
          const n = randInt(rng, 4, 10);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; d = ${d},\\; S_{${n}}`,
            `${sumN(a1, d, n)}`,
          );
        },

        // general term a_n
        () => {
          const a1 = randInt(rng, -6, 10);
          const d = nonzero(rng, -6, 6);
          return problem(
            "simplify",
            `a_{1} = ${a1},\\; d = ${d},\\; a_{n}`,
            linear(d, a1 - d, "n"),
          );
        },

        // n from a_n
        () => {
          const a1 = randInt(rng, -6, 10);
          const d = nonzero(rng, -5, 5);
          const n = randInt(rng, 4, 12);
          return problem(
            "solve",
            `a_{1} = ${a1},\\; d = ${d},\\; a_{n} = ${term(a1, d, n)}`,
            `n = ${n}`,
          );
        },

        // middle term a2 of three
        () => {
          const a1 = randInt(rng, -10, 12);
          const d = nonzero(rng, -8, 8);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{3} = ${a1 + 2 * d},\\; a_{2}`,
            `${a1 + d}`,
          );
        },

        // a_{n+1} − a_n = d
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -6, 6);
          const n = randInt(rng, 3, 8);
          return problem(
            "evaluate",
            `a_{${n}} = ${term(a1, d, n)},\\; a_{${n + 1}} = ${term(a1, d, n + 1)},\\; d`,
            `${d}`,
          );
        },

        // S_n from a1 and a_n
        () => {
          const a1 = randInt(rng, -6, 10);
          const d = nonzero(rng, -5, 5);
          const n = randInt(rng, 4, 10);
          const an = term(a1, d, n);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{${n}} = ${an},\\; n = ${n},\\; S_{${n}}`,
            `${sumN(a1, d, n)}`,
          );
        },

        // three listed terms, d
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -7, 7);
          return problem(
            "evaluate",
            `${listed([a1, a1 + d, a1 + 2 * d])},\\; d`,
            `${d}`,
          );
        },

        // a_p − a_q = (p − q)d
        () => {
          const a1 = randInt(rng, -6, 8);
          const d = nonzero(rng, -5, 5);
          const q = randInt(rng, 2, 5);
          const p = randInt(rng, q + 2, 12);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; d = ${d},\\; a_{${p}} - a_{${q}}`,
            `${(p - q) * d}`,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // a_p, a_q → a_r
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -6, 6);
          const p = randInt(rng, 2, 5);
          const q = randInt(rng, p + 2, 9);
          const r = randInt(rng, 10, 15);
          return problem(
            "evaluate",
            `a_{${p}} = ${term(a1, d, p)},\\; a_{${q}} = ${term(a1, d, q)},\\; a_{${r}}`,
            `${term(a1, d, r)}`,
          );
        },

        // S_n from a1, d (larger n)
        () => {
          const a1 = randInt(rng, -10, 12);
          const d = nonzero(rng, -7, 7);
          const n = randInt(rng, 10, 20);
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; d = ${d},\\; S_{${n}}`,
            `${sumN(a1, d, n)}`,
          );
        },

        // n from a1, d, a_n
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -6, 6);
          const n = randInt(rng, 8, 18);
          return problem(
            "solve",
            `a_{1} = ${a1},\\; d = ${d},\\; a_{n} = ${term(a1, d, n)}`,
            `n = ${n}`,
          );
        },

        // k terms between A and B: d
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -5, 5);
          const k = randInt(rng, 3, 7);
          const last = k + 2;
          return problem(
            "evaluate",
            `a_{1} = ${a1},\\; a_{${last}} = ${term(a1, d, last)},\\; d`,
            `${d}`,
          );
        },

        // a1 from S_n, d, n
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -5, 5);
          const n = randInt(rng, 5, 12);
          return problem(
            "evaluate",
            `S_{${n}} = ${sumN(a1, d, n)},\\; d = ${d},\\; n = ${n},\\; a_{1}`,
            `${a1}`,
          );
        },

        // d from S_n, a1, n
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -6, 6);
          const n = randInt(rng, 5, 12);
          return problem(
            "evaluate",
            `S_{${n}} = ${sumN(a1, d, n)},\\; a_{1} = ${a1},\\; n = ${n},\\; d`,
            `${d}`,
          );
        },

        // a_n = pn + q, evaluate a_k
        () => {
          const p = nonzero(rng, -6, 6);
          const q = randInt(rng, -8, 8);
          const k = randInt(rng, 4, 12);
          return problem(
            "evaluate",
            `a_{n} = ${linear(p, q, "n")},\\; a_{${k}}`,
            `${p * k + q}`,
          );
        },

        // listed decreasing, a_n
        () => {
          const a1 = randInt(rng, 8, 20);
          const d = randInt(rng, -7, -2);
          const n = randInt(rng, 6, 12);
          return problem(
            "evaluate",
            `${listed([a1, a1 + d, a1 + 2 * d])},\\; \\ldots,\\; a_{${n}}`,
            `${term(a1, d, n)}`,
          );
        },

        // a3, a7 → a5 (mid)
        () => {
          const a1 = randInt(rng, -8, 10);
          const d = nonzero(rng, -6, 6);
          return problem(
            "evaluate",
            `a_{3} = ${term(a1, d, 3)},\\; a_{7} = ${term(a1, d, 7)},\\; a_{5}`,
            `${term(a1, d, 5)}`,
          );
        },

        // n from a1, a_n, d
        () => {
          const a1 = randInt(rng, -6, 10);
          const d = nonzero(rng, -5, 5);
          const n = randInt(rng, 6, 16);
          return problem(
            "solve",
            `a_{1} = ${a1},\\; a_{n} = ${term(a1, d, n)},\\; d = ${d}`,
            `n = ${n}`,
          );
        },

        // missing middle of three
        () => {
          const p = randInt(rng, -12, 12);
          const d = nonzero(rng, -8, 8);
          const q = p + 2 * d;
          return problem(
            "evaluate",
            `a_{n} = ${p},\\; a_{n+2} = ${q},\\; a_{n+1}`,
            `${p + d}`,
          );
        },

        // S_n from listed start
        () => {
          const a1 = randInt(rng, -6, 10);
          const d = nonzero(rng, -5, 5);
          const n = randInt(rng, 6, 12);
          return problem(
            "evaluate",
            `${listed([a1, a1 + d, a1 + 2 * d])},\\; \\ldots,\\; S_{${n}}`,
            `${sumN(a1, d, n)}`,
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // S_n = p n² + q n → a_n = S_n − S_{n−1}
        () => {
          const p = nonzero(rng, -4, 4);
          const q = nonzero(rng, -5, 5);
          const k = randInt(rng, 7, 14);
          const val = p * (2 * k - 1) + q;
          const sn = quadratic(p, q, 0, "n");
          const an = linear(2 * p, q - p, "n");
          return problem(
            "evaluate",
            `S_{n} = ${sn},\\; a_{${k}}`,
            aligned([
              `S_{n} &= ${sn},\\; S_{0} := 0`,
              `a_{n} &= S_{n}-S_{n-1}`,
              `&= ${num(p)}\\bigl(n^{2}-(n-1)^{2}\\bigr) + ${num(q)}\\bigl(n-(n-1)\\bigr)`,
              `&= ${num(p)}(2n-1)+${num(q)} = ${an}`,
              `a_{${k}} &= ${num(p)}(2\\cdot ${k}-1) ${signed(q)} = ${val}`,
            ]),
          );
        },

        // common subsequence of two APs (CRT / lcm)
        () => {
          const d1 = pick(rng, [3, 4, 5, 6, 8]);
          const d2 = pick(
            rng,
            [4, 6, 9, 10, 12, 15].filter((x) => x !== d1),
          );
          const D = lcm(d1, d2);
          let c0 = randInt(rng, 3, 16);
          let a1 = c0 - D + d1;
          let b1 = c0 - D + d2;
          if (a1 <= 0 || b1 <= 0) {
            c0 += D;
            a1 = c0 - D + d1;
            b1 = c0 - D + d2;
          }
          const found = firstCommon(a1, d1, b1, d2);
          if (found) c0 = found.c0;
          const K = randInt(rng, 4, 6);
          const cK = c0 + (K - 1) * D;
          return problem(
            "evaluate",
            `a_{n} = ${linear(d1, a1 - d1, "n")},\\; b_{m} = ${linear(d2, b1 - d2, "m")},\\; c_{k} = a_{i} = b_{j},\\; c_{1} < c_{2} < \\cdots,\\; c_{${K}}`,
            aligned([
              `a_{n} \\equiv ${a1} \\pmod{${d1}},\\; b_{m} \\equiv ${b1} \\pmod{${d2}}`,
              `c \\equiv ${a1} \\pmod{${d1}},\\; c \\equiv ${b1} \\pmod{${d2}}`,
              `\\gcd(${d1},${d2}) = ${gcd(d1, d2)} \\mid (${a1}-${b1})`,
              `c_{t} = ${c0} + (t-1)\\operatorname{lcm}(${d1},${d2}) = ${c0} + (t-1)\\cdot ${D}`,
              `c_{${K}} &= ${c0} + ${K - 1}\\cdot ${D} = ${cK}`,
            ]),
          );
        },

        // \binom{n}{1}, \binom{n}{2}, \binom{n}{3} in AP → evaluate at n=7
        () => {
          const ask = pick(rng, ["c4", "c5", "pow"] as const);
          const val = ask === "c4" ? 35 : ask === "c5" ? 21 : 128;
          const target =
            ask === "c4"
              ? `\\binom{n}{4}`
              : ask === "c5"
                ? `\\binom{n}{5}`
                : `2^{n}`;
          return problem(
            "evaluate",
            `2\\binom{n}{2} = \\binom{n}{1} + \\binom{n}{3},\\; n > 2,\\; ${target}`,
            aligned([
              `2\\cdot \\dfrac{n(n-1)}{2} = n + \\dfrac{n(n-1)(n-2)}{6}`,
              `n(n-1) = n + \\dfrac{n(n-1)(n-2)}{6}`,
              `n \\ne 0 \\implies n-1 = 1 + \\dfrac{(n-1)(n-2)}{6}`,
              `6(n-2) = (n-1)(n-2)`,
              `(n-2)\\bigl(6-(n-1)\\bigr) = (n-2)(7-n) = 0`,
              `n > 2 \\implies n = 7`,
              ask === "pow"
                ? `2^{7} = ${val}`
                : `\\binom{7}{${ask === "c4" ? 4 : 5}} = ${val}`,
            ]),
          );
        },

        // Σ k a_k  via Σ k and Σ k²
        () => {
          const a1 = randInt(rng, -4, 6);
          const d = nonzero(rng, -4, 5);
          const n = randInt(rng, 6, 10);
          const val = sumKA(a1, d, n);
          const a1md = a1 - d;
          const sumK = (n * (n + 1)) / 2;
          const sumK2 = (n * (n + 1) * (2 * n + 1)) / 6;
          return problem(
            "evaluate",
            `a_{k} = ${linear(d, a1 - d, "k")},\\; \\sum_{k=1}^{${n}} k a_{k}`,
            aligned([
              `a_{k} = ${linear(d, a1 - d, "k")}`,
              `k a_{k} = k\\bigl(${linear(d, a1 - d, "k")}\\bigr) = ${polyTex("k", [d, a1md, 0])}`,
              `\\sum_{k=1}^{n} k = \\dfrac{n(n+1)}{2},\\; \\sum_{k=1}^{n} k^{2} = \\dfrac{n(n+1)(2n+1)}{6}`,
              `\\sum_{k=1}^{${n}} k a_{k} = ${num(a1md)}\\cdot ${sumK} ${signed(d)}\\cdot ${sumK2} = ${val}`,
            ]),
          );
        },

        // cubic whose roots form an AP
        () => {
          const r = randInt(rng, -5, 6);
          const d = randInt(rng, 2, 6);
          const sum = 3 * r;
          const pairs = 3 * r * r - d * d;
          const prod = r * (r * r - d * d);
          const poly = polyTex("x", [1, -sum, pairs, -prod]);
          const gap = 2 * d;
          return problem(
            "evaluate",
            `${poly} = 0,\\; x_{1} < x_{2} < x_{3},\\; 2x_{2} = x_{1} + x_{3},\\; x_{3} - x_{1}`,
            aligned([
              `x_{1}+x_{2}+x_{3} = ${sum},\\; 2x_{2} = x_{1}+x_{3}`,
              `3x_{2} = ${sum} \\implies x_{2} = ${r}`,
              `x_{1} = ${r}-\\delta,\\; x_{3} = ${r}+\\delta,\\; \\delta > 0`,
              `x_{1}x_{2}+x_{2}x_{3}+x_{3}x_{1} = ${pairs}`,
              `3\\cdot ${r * r} - \\delta^{2} = ${pairs} \\implies \\delta^{2} = ${d * d}`,
              `\\delta = ${d},\\; x_{3}-x_{1} = 2\\delta = ${gap}`,
            ]),
          );
        },

        // selected AP terms in GP: a_3² = a_2 a_6 ⇒ a_1 = −d/2
        () => {
          const half = nonzero(rng, 2, 6);
          const d = 2 * half;
          const a1 = -half;
          const n = randInt(rng, 6, 10);
          const s = sumN(a1, d, n);
          return problem(
            "evaluate",
            `a_{3}^{2} = a_{2} a_{6},\\; d = ${d},\\; a_{1} \\ne 0,\\; S_{${n}}`,
            aligned([
              `a_{2} = a_{1} ${signed(d)},\\; a_{3} = a_{1} ${signed(2 * d)},\\; a_{6} = a_{1} ${signed(5 * d)}`,
              `(a_{1} ${signed(2 * d)})^{2} = (a_{1} ${signed(d)})(a_{1} ${signed(5 * d)})`,
              `a_{1}^{2} ${signed(4 * d)} a_{1} ${signed(4 * d * d)} = a_{1}^{2} ${signed(6 * d)} a_{1} ${signed(5 * d * d)}`,
              `0 = ${2 * d} a_{1} ${signed(d * d)}`,
              `a_{1} = -\\dfrac{1}{2}d = ${a1}`,
              `S_{${n}} = \\dfrac{${n}}{2}\\bigl(2\\cdot ${num(a1)} + ${n - 1}\\cdot ${num(d)}\\bigr) = ${s}`,
            ]),
          );
        },

        // trig: cos θ, cos 2θ, cos 3θ (or sin) in AP
        () => {
          const useCos = pick(rng, [true, false]);
          const twoPi = pick(rng, [true, false]);
          const upper = twoPi ? "2\\pi" : "\\pi";
          if (useCos) {
            const sum = twoPi ? "4\\pi" : "\\pi";
            return problem(
              "evaluate",
              `2\\cos 2\\theta = \\cos\\theta + \\cos 3\\theta,\\; 0 < \\theta < ${upper},\\; \\sum \\theta`,
              aligned([
                `\\cos\\theta + \\cos 3\\theta = 2\\cos 2\\theta \\, \\cos\\theta`,
                `2\\cos 2\\theta = 2\\cos 2\\theta \\, \\cos\\theta`,
                `2\\cos 2\\theta\\,(1-\\cos\\theta) = 0`,
                `\\cos 2\\theta = 0 \\;\\lor\\; \\cos\\theta = 1`,
                `\\cos\\theta = 1 \\implies \\theta \\notin (0,${upper})`,
                twoPi
                  ? `\\cos 2\\theta = 0 \\implies \\theta = \\dfrac{\\pi}{4}+\\dfrac{k\\pi}{2},\\; k=0,1,2,3`
                  : `\\cos 2\\theta = 0 \\implies \\theta = \\dfrac{\\pi}{4},\\; \\dfrac{3\\pi}{4}`,
                `\\sum \\theta = ${sum}`,
              ]),
            );
          }
          const sum = twoPi ? "3\\pi" : "\\dfrac{\\pi}{2}";
          return problem(
            "evaluate",
            `2\\sin 2\\theta = \\sin\\theta + \\sin 3\\theta,\\; 0 < \\theta < ${upper},\\; \\sum \\theta`,
            aligned([
              `\\sin\\theta + \\sin 3\\theta = 2\\sin 2\\theta \\, \\cos\\theta`,
              `2\\sin 2\\theta = 2\\sin 2\\theta \\, \\cos\\theta`,
              `2\\sin 2\\theta\\,(1-\\cos\\theta) = 0`,
              `\\sin 2\\theta = 0 \\;\\lor\\; \\cos\\theta = 1`,
              `\\cos\\theta = 1 \\implies \\theta \\notin (0,${upper})`,
              twoPi
                ? `\\sin 2\\theta = 0 \\implies \\theta = \\dfrac{\\pi}{2},\\; \\pi,\\; \\dfrac{3\\pi}{2}`
                : `\\sin 2\\theta = 0 \\implies \\theta = \\dfrac{\\pi}{2}`,
              `\\sum \\theta = ${sum}`,
            ]),
          );
        },

        // Σ a_k² via Σ j and Σ j²
        () => {
          const a1 = randInt(rng, -3, 5);
          const d = nonzero(rng, -4, 4);
          const n = randInt(rng, 6, 9);
          const val = sumSq(a1, d, n);
          const jMax = n - 1;
          const sumJ = (jMax * (jMax + 1)) / 2;
          const sumJ2 = (jMax * (jMax + 1) * (2 * jMax + 1)) / 6;
          return problem(
            "evaluate",
            `a_{k} = ${linear(d, a1 - d, "k")},\\; \\sum_{k=1}^{${n}} a_{k}^{2}`,
            aligned([
              `a_{k} = a_{1}+(k-1)d,\\; a_{1} = ${a1},\\; d = ${d}`,
              `\\sum_{k=1}^{${n}} a_{k}^{2} = \\sum_{j=0}^{${jMax}} (${num(a1)}+j\\cdot ${num(d)})^{2}`,
              `= ${n}\\cdot ${num(a1)}^{2} + 2\\cdot ${num(a1)}\\cdot ${num(d)}\\sum_{j=1}^{${jMax}} j + ${num(d)}^{2}\\sum_{j=1}^{${jMax}} j^{2}`,
              `\\sum j = ${sumJ},\\; \\sum j^{2} = ${sumJ2}`,
              `= ${n * a1 * a1} ${signed(2 * a1 * d)}\\cdot ${sumJ} ${signed(d * d)}\\cdot ${sumJ2} = ${val}`,
            ]),
          );
        },

        // logs in AP: 2 log x = log p + log q
        () => {
          const b = pick(rng, [2, 3, 4, 5]);
          const e1 = b >= 4 ? 1 : randInt(rng, 1, 3);
          const e2 = e1 + 2 * (b >= 4 ? 1 : randInt(rng, 1, 2));
          const pVal = b ** e1;
          const qVal = b ** e2;
          const x = b ** ((e1 + e2) / 2);
          return problem(
            "solve",
            `2\\log x = \\log ${pVal} + \\log ${qVal},\\; x > 0,\\; x`,
            aligned([
              `2\\log x = \\log(${pVal}\\cdot ${qVal}) = \\log ${pVal * qVal}`,
              `\\log x^{2} = \\log ${pVal * qVal}`,
              `x^{2} = ${pVal * qVal}`,
              `x > 0 \\implies x = ${x}`,
            ]),
          );
        },

        // identity S_{2n} − 2 S_n = n² d, recover d without a_1
        () => {
          const a1 = randInt(rng, -6, 8);
          const d = nonzero(rng, -6, 6);
          const n = randInt(rng, 4, 8);
          const s = sumN(a1, d, n);
          const s2 = sumN(a1, d, 2 * n);
          return problem(
            "evaluate",
            `S_{${n}} = ${s},\\; S_{${2 * n}} = ${s2},\\; d`,
            aligned([
              `S_{2n} = n\\bigl(2a_{1}+(2n-1)d\\bigr)`,
              `2S_{n} = n\\bigl(2a_{1}+(n-1)d\\bigr)`,
              `S_{2n}-2S_{n} = n\\bigl((2n-1)d-(n-1)d\\bigr) = n^{2} d`,
              `d = \\dfrac{S_{${2 * n}}-2S_{${n}}}{${n}^{2}} = \\dfrac{${s2 - 2 * s}}{${n * n}} = ${d}`,
            ]),
          );
        },

        // 1/a_n is an AP (harmonic sequence)
        () => {
          const A = randInt(rng, 2, 5);
          const D = randInt(rng, 1, 3);
          const k = randInt(rng, 6, 10);
          const Mk = A + (k - 1) * D;
          return problem(
            "evaluate",
            `\\dfrac{2}{a_{n}} = \\dfrac{1}{a_{n-1}} + \\dfrac{1}{a_{n+1}},\\; a_{1} = ${texFrac(1, A)},\\; a_{2} = ${texFrac(1, A + D)},\\; a_{${k}}`,
            aligned([
              `\\dfrac{2}{a_{n}} = \\dfrac{a_{n-1}+a_{n+1}}{a_{n-1}a_{n+1}} \\implies 2 a_{n-1} a_{n+1} = a_{n}(a_{n-1}+a_{n+1})`,
              `b_{n} := \\dfrac{1}{a_{n}} \\implies 2b_{n} = b_{n-1}+b_{n+1}`,
              `b_{1} = ${A},\\; b_{2} = ${A + D},\\; b_{n} = ${A}+(n-1)\\cdot ${D}`,
              `b_{${k}} = ${A}+${k - 1}\\cdot ${D} = ${Mk}`,
              `a_{${k}} = ${texFrac(1, Mk)}`,
            ]),
          );
        },

        // S_p = S_q (p ≠ q) ⇒ a_{p+q} = 0
        () => {
          const p = randInt(rng, 3, 6);
          const q = randInt(rng, p + 2, 11);
          return problem(
            "evaluate",
            `S_{${p}} = S_{${q}},\\; ${p} \\ne ${q},\\; a_{${p + q}}`,
            aligned([
              `\\dfrac{${p}}{2}\\bigl(2a_{1}+${p - 1}d\\bigr) = \\dfrac{${q}}{2}\\bigl(2a_{1}+${q - 1}d\\bigr)`,
              `2a_{1}(${p}-${q}) + d\\bigl(${p}(${p}-1)-${q}(${q}-1)\\bigr) = 0`,
              `2a_{1}(${p}-${q}) + d\\bigl((${p}^{2}-${q}^{2})-(${p}-${q})\\bigr) = 0`,
              `${p} \\ne ${q} \\implies 2a_{1} + d(${p}+${q}-1) = 0`,
              `a_{${p + q}} = a_{1}+(${p}+${q}-1)d = 0`,
            ]),
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
