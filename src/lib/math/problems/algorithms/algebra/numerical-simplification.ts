import type { GeneratedProblem } from "../types";
import {
  addRational,
  aligned,
  defineAlgebraProblem,
  lcm,
  reduce,
  texFrac,
  type Rational,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function frac(n: number, d: number): string {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  if (d === 1) return String(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}\\dfrac{${Math.abs(n)}}{${d}}`;
}

function inflate(rng: () => number, n: number, d: number): Rational {
  const g = randInt(rng, 2, 7);
  return { n: n * g, d: d * g };
}

function simp(
  promptTex: string,
  steps: string[],
  ans: Rational,
): GeneratedProblem {
  const reduced = reduce(ans.n, ans.d);
  return {
    instructionId: "simplify" as const,
    promptTex,
    solutionTex: aligned([...steps, `= ${texFrac(reduced.n, reduced.d)}`]),
  } as GeneratedProblem;
}

export const numericalSimplificationProblem = defineAlgebraProblem(
  "numerical-simplification",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // გაამარტივე a/b
        () => {
          const n = randInt(rng, 2, 9);
          const d = randInt(rng, n + 1, 12);
          const raw = inflate(rng, n, d);
          const ans = reduce(raw.n, raw.d);
          return simp(frac(raw.n, raw.d), [`${frac(raw.n, raw.d)}`], ans);
        },

        // a/d + b/d
        () => {
          const d = randInt(rng, 3, 12);
          const a = randInt(rng, 1, d - 1);
          const b = randInt(rng, 1, d - 1);
          const ans = reduce(a + b, d);
          return simp(
            `${frac(a, d)} + ${frac(b, d)}`,
            [`${frac(a + b, d)}`],
            ans,
          );
        },

        // a/d - b/d
        () => {
          const d = randInt(rng, 3, 12);
          const a = randInt(rng, 2, d);
          const b = randInt(rng, 1, a - 1);
          const ans = reduce(a - b, d);
          return simp(
            `${frac(a, d)} - ${frac(b, d)}`,
            [`${frac(a - b, d)}`],
            ans,
          );
        },

        // (a/b) * (c/d)
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 9);
          const c = randInt(rng, 2, 8);
          const d = randInt(rng, 2, 9);
          const ans = reduce(a * c, b * d);
          return simp(
            `${frac(a, b)} \\cdot ${frac(c, d)}`,
            [`${frac(a * c, b * d)}`],
            ans,
          );
        },

        // (a/b) ÷ (c/d)
        () => {
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const d = randInt(rng, 2, 8);
          const ans = reduce(a * d, b * c);
          return simp(
            `${frac(a, b)} \\div ${frac(c, d)}`,
            [`${frac(a, b)} \\cdot ${frac(d, c)}`, `${frac(a * d, b * c)}`],
            ans,
          );
        },

        // n + a/b
        () => {
          const n = randInt(rng, 2, 8);
          const b = randInt(rng, 2, 9);
          const a = randInt(rng, 1, b - 1);
          const ans = reduce(n * b + a, b);
          return simp(
            `${n} + ${frac(a, b)}`,
            [`${frac(n * b, b)} + ${frac(a, b)}`, `${frac(n * b + a, b)}`],
            ans,
          );
        },

        // n * (a/b)
        () => {
          const n = randInt(rng, 2, 9);
          const b = randInt(rng, 2, 9);
          const a = randInt(rng, 1, 8);
          const ans = reduce(n * a, b);
          return simp(
            `${n} \\cdot ${frac(a, b)}`,
            [`${frac(n * a, b)}`],
            ans,
          );
        },

        // (ag/bg) * (c/g)  — cancellation
        () => {
          const g = randInt(rng, 2, 6);
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 7);
          const c = randInt(rng, 2, 6);
          const ans = reduce(a * c, b);
          return simp(
            `${frac(a * g, b * g)} \\cdot ${frac(c, g)}`,
            [`${frac(a, b)} \\cdot ${frac(c, 1)}`, `${frac(a * c, b)}`],
            ans,
          );
        },

        // 1/a + 1/b
        () => {
          const a = randInt(rng, 2, 9);
          const b = randInt(rng, 2, 9);
          const den = lcm(a, b);
          const ans = reduce(den / a + den / b, den);
          return simp(
            `${frac(1, a)} + ${frac(1, b)}`,
            [
              `${frac(den / a, den)} + ${frac(den / b, den)}`,
              `${frac(den / a + den / b, den)}`,
            ],
            ans,
          );
        },

        // mixed + fraction: n a/b + c/b
        () => {
          const b = randInt(rng, 2, 8);
          const a = randInt(rng, 1, b - 1);
          const n = randInt(rng, 1, 5);
          const c = randInt(rng, 1, b);
          const ans = reduce(n * b + a + c, b);
          return simp(
            `${n}\\dfrac{${a}}{${b}} + ${frac(c, b)}`,
            [`${frac(n * b + a, b)} + ${frac(c, b)}`, `${frac(n * b + a + c, b)}`],
            ans,
          );
        },

        // (a/b) * n  with n multiple of b
        () => {
          const b = randInt(rng, 2, 8);
          const k = randInt(rng, 2, 6);
          const n = b * k;
          const a = randInt(rng, 2, 9);
          const ans = reduce(a * k, 1);
          return simp(
            `${frac(a, b)} \\cdot ${n}`,
            [`${frac(a * n, b)}`],
            ans,
          );
        },

        // a/b - a/c  wait keep a/d - c with integer
        () => {
          const b = randInt(rng, 3, 10);
          const a = randInt(rng, 2, b);
          const n = randInt(rng, 1, 4);
          const ans = reduce(a - n * b, b);
          return simp(
            `${frac(a, b)} - ${n}`,
            [`${frac(a, b)} - ${frac(n * b, b)}`, `${frac(a - n * b, b)}`],
            ans,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // a/b + c/d  different denoms
        () => {
          const b = randInt(rng, 2, 8);
          const d = randInt(rng, 2, 8);
          const a = randInt(rng, 1, 7);
          const c = randInt(rng, 1, 7);
          const den = lcm(b, d);
          const num = a * (den / b) + c * (den / d);
          const ans = reduce(num, den);
          return simp(
            `${frac(a, b)} + ${frac(c, d)}`,
            [
              `${frac(a * (den / b), den)} + ${frac(c * (den / d), den)}`,
              `${frac(num, den)}`,
            ],
            ans,
          );
        },

        // a/b - c/d
        () => {
          const b = randInt(rng, 2, 8);
          const d = randInt(rng, 2, 8);
          const a = randInt(rng, 3, 9);
          const c = randInt(rng, 1, 5);
          const den = lcm(b, d);
          const num = a * (den / b) - c * (den / d);
          const ans = reduce(num, den);
          return simp(
            `${frac(a, b)} - ${frac(c, d)}`,
            [
              `${frac(a * (den / b), den)} - ${frac(c * (den / d), den)}`,
              `${frac(num, den)}`,
            ],
            ans,
          );
        },

        // a/b + c/d + e/f with two sharing denom
        () => {
          const d = randInt(rng, 3, 8);
          const a = randInt(rng, 1, 6);
          const c = randInt(rng, 1, 6);
          const n = randInt(rng, 1, 5);
          const den = d;
          const num = a + c + n * d;
          const ans = reduce(num, den);
          return simp(
            `${frac(a, d)} + ${frac(c, d)} + ${n}`,
            [`${frac(a + c, d)} + ${frac(n * d, d)}`, `${frac(num, d)}`],
            ans,
          );
        },

        // (a/b) / (c/d)
        () => {
          const a = randInt(rng, 2, 9);
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const d = randInt(rng, 2, 9);
          const ans = reduce(a * d, b * c);
          return simp(
            `\\dfrac{${frac(a, b)}}{${frac(c, d)}}`,
            [`${frac(a, b)} \\cdot ${frac(d, c)}`, `${frac(a * d, b * c)}`],
            ans,
          );
        },

        // k * (a/b + c/d)
        () => {
          const k = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 6);
          const d = randInt(rng, 2, 6);
          const a = randInt(rng, 1, 5);
          const c = randInt(rng, 1, 5);
          const inner = addRational({ n: a, d: b }, { n: c, d: d });
          const ans = reduce(k * inner.n, inner.d);
          const den = lcm(b, d);
          return simp(
            `${k}\\left(${frac(a, b)} + ${frac(c, d)}\\right)`,
            [
              `${k}\\left(${frac(a * (den / b), den)} + ${frac(c * (den / d), den)}\\right)`,
              `${k} \\cdot ${frac(inner.n, inner.d)}`,
            ],
            ans,
          );
        },

        // mixed + mixed
        () => {
          const b = pick(rng, [2, 3, 4, 5] as const);
          const a = randInt(rng, 1, b - 1);
          const n = randInt(rng, 1, 4);
          const d = pick(rng, [2, 3, 4, 5] as const);
          const c = randInt(rng, 1, d - 1);
          const m = randInt(rng, 1, 4);
          const r1 = reduce(n * b + a, b);
          const r2 = reduce(m * d + c, d);
          const ans = addRational(r1, r2);
          return simp(
            `${n}\\dfrac{${a}}{${b}} + ${m}\\dfrac{${c}}{${d}}`,
            [
              `${frac(n * b + a, b)} + ${frac(m * d + c, d)}`,
              texFrac(ans.n, ans.d),
            ],
            ans,
          );
        },

        // three-factor product with cancel
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 5);
          const c = randInt(rng, 2, 5);
          const g = randInt(rng, 2, 4);
          const ans = reduce(a * c, b);
          return simp(
            `${frac(a * g, g)} \\cdot ${frac(c, b * g)} \\cdot ${g}`,
            [`${frac(a, 1)} \\cdot ${frac(c, b)}`, `${frac(a * c, b)}`],
            ans,
          );
        },

        // 1 - a/b
        () => {
          const b = randInt(rng, 3, 10);
          const a = randInt(rng, 1, b - 1);
          const ans = reduce(b - a, b);
          return simp(
            `1 - ${frac(a, b)}`,
            [`${frac(b, b)} - ${frac(a, b)}`, `${frac(b - a, b)}`],
            ans,
          );
        },

        // (a/b + c/d) * n
        () => {
          const b = randInt(rng, 2, 6);
          const d = randInt(rng, 2, 6);
          const a = randInt(rng, 1, 5);
          const c = randInt(rng, 1, 5);
          const n = randInt(rng, 2, 6);
          const inner = addRational({ n: a, d: b }, { n: c, d: d });
          const ans = reduce(inner.n * n, inner.d);
          return simp(
            `\\left(${frac(a, b)} + ${frac(c, d)}\\right) \\cdot ${n}`,
            [`${frac(inner.n, inner.d)} \\cdot ${n}`],
            ans,
          );
        },

        // a / (b/c) = a * c/b
        () => {
          const a = randInt(rng, 2, 9);
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const ans = reduce(a * c, b);
          return simp(
            `${a} \\div ${frac(b, c)}`,
            [`${a} \\cdot ${frac(c, b)}`, `${frac(a * c, b)}`],
            ans,
          );
        },

        // mixed * unit fraction
        () => {
          const b = randInt(rng, 2, 6);
          const a = randInt(rng, 1, b - 1);
          const n = randInt(rng, 2, 5);
          const c = randInt(rng, 2, 6);
          const ans = reduce((n * b + a) * 1, b * c);
          return simp(
            `${n}\\dfrac{${a}}{${b}} \\cdot ${frac(1, c)}`,
            [`${frac(n * b + a, b)} \\cdot ${frac(1, c)}`, `${frac(n * b + a, b * c)}`],
            ans,
          );
        },

        // a/b + a/c
        () => {
          const a = randInt(rng, 2, 7);
          const b = randInt(rng, 2, 8);
          const c = randInt(rng, 2, 8);
          const den = lcm(b, c);
          const num = a * (den / b) + a * (den / c);
          const ans = reduce(num, den);
          return simp(
            `${frac(a, b)} + ${frac(a, c)}`,
            [
              `${a}\\left(${frac(1, b)} + ${frac(1, c)}\\right)`,
              `${frac(num, den)}`,
            ],
            ans,
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // three different denominators
        () => {
          const b = pick(rng, [2, 3, 4, 5] as const);
          const d = pick(rng, [3, 4, 5, 6] as const);
          const f = pick(rng, [4, 5, 6, 8] as const);
          const a = randInt(rng, 1, 4);
          const c = randInt(rng, 1, 4);
          const e = randInt(rng, 1, 4);
          const r = addRational(
            addRational({ n: a, d: b }, { n: c, d: d }),
            { n: e, d: f },
          );
          const den = lcm(lcm(b, d), f);
          return simp(
            `${frac(a, b)} + ${frac(c, d)} + ${frac(e, f)}`,
            [
              `${frac(a * (den / b), den)} + ${frac(c * (den / d), den)} + ${frac(e * (den / f), den)}`,
              `${frac(a * (den / b) + c * (den / d) + e * (den / f), den)}`,
            ],
            r,
          );
        },

        // (n + a/b) / c
        () => {
          const b = randInt(rng, 2, 6);
          const a = randInt(rng, 1, b - 1);
          const n = randInt(rng, 1, 5);
          const c = randInt(rng, 2, 6);
          const ans = reduce(n * b + a, b * c);
          return simp(
            `\\dfrac{${n} + ${frac(a, b)}}{${c}}`,
            [`\\dfrac{${frac(n * b + a, b)}}{${c}}`, `${frac(n * b + a, b * c)}`],
            ans,
          );
        },

        // a/b - c/d + e/f
        () => {
          const b = pick(rng, [2, 3, 4, 6] as const);
          const d = pick(rng, [3, 4, 5] as const);
          const f = pick(rng, [2, 4, 5, 6] as const);
          const a = randInt(rng, 2, 7);
          const c = randInt(rng, 1, 4);
          const e = randInt(rng, 1, 5);
          const r = addRational(
            addRational({ n: a, d: b }, { n: -c, d: d }),
            { n: e, d: f },
          );
          const den = lcm(lcm(b, d), f);
          const num =
            a * (den / b) - c * (den / d) + e * (den / f);
          return simp(
            `${frac(a, b)} - ${frac(c, d)} + ${frac(e, f)}`,
            [`${frac(num, den)}`],
            r,
          );
        },

        // (a/b + c/d) / (e/f)
        () => {
          const b = randInt(rng, 2, 5);
          const d = randInt(rng, 2, 5);
          const a = randInt(rng, 1, 5);
          const c = randInt(rng, 1, 5);
          const e = randInt(rng, 2, 5);
          const f = randInt(rng, 2, 5);
          const top = addRational({ n: a, d: b }, { n: c, d: d });
          const ans = reduce(top.n * f, top.d * e);
          return simp(
            `\\dfrac{${frac(a, b)} + ${frac(c, d)}}{${frac(e, f)}}`,
            [
              `\\dfrac{${frac(top.n, top.d)}}{${frac(e, f)}}`,
              `${frac(top.n, top.d)} \\cdot ${frac(f, e)}`,
            ],
            ans,
          );
        },

        // negatives: -a/b + c/d
        () => {
          const b = randInt(rng, 2, 8);
          const d = randInt(rng, 2, 8);
          const a = randInt(rng, 1, 6);
          const c = randInt(rng, 2, 8);
          const ans = addRational({ n: -a, d: b }, { n: c, d: d });
          const den = lcm(b, d);
          const num = -a * (den / b) + c * (den / d);
          return simp(
            `-${frac(a, b)} + ${frac(c, d)}`,
            [`${frac(num, den)}`],
            ans,
          );
        },

        // k - (a/b + c/d)
        () => {
          const k = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 6);
          const d = randInt(rng, 2, 6);
          const a = randInt(rng, 1, 5);
          const c = randInt(rng, 1, 5);
          const inner = addRational({ n: a, d: b }, { n: c, d: d });
          const ans = addRational({ n: k, d: 1 }, { n: -inner.n, d: inner.d });
          return simp(
            `${k} - \\left(${frac(a, b)} + ${frac(c, d)}\\right)`,
            [`${k} - ${frac(inner.n, inner.d)}`],
            ans,
          );
        },

        // a + 1/(b + 1/c)
        () => {
          const c = randInt(rng, 2, 6);
          const b = randInt(rng, 1, 5);
          const a = randInt(rng, 1, 4);
          const inner = addRational({ n: b, d: 1 }, { n: 1, d: c });
          const rec = reduce(inner.d, inner.n);
          const ans = addRational({ n: a, d: 1 }, rec);
          return simp(
            `${a} + \\dfrac{1}{${b} + ${frac(1, c)}}`,
            [
              `${a} + \\dfrac{1}{${frac(inner.n, inner.d)}}`,
              `${a} + ${frac(rec.n, rec.d)}`,
            ],
            ans,
          );
        },

        // (a/b)^2 * c/d
        () => {
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 6);
          const c = randInt(rng, 2, 6);
          const d = randInt(rng, 2, 6);
          const ans = reduce(a * a * c, b * b * d);
          return simp(
            `\\left(${frac(a, b)}\\right)^{2} \\cdot ${frac(c, d)}`,
            [`${frac(a * a, b * b)} \\cdot ${frac(c, d)}`, `${frac(a * a * c, b * b * d)}`],
            ans,
          );
        },

        // three-fraction product with cancel
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 5);
          const c = randInt(rng, 2, 5);
          const g = randInt(rng, 2, 5);
          const h = randInt(rng, 2, 4);
          const ans = reduce(a * c, b);
          return simp(
            `${frac(a * g, h)} \\cdot ${frac(h, b * g)} \\cdot ${frac(c, 1)}`,
            [`${frac(a, b)} \\cdot ${c}`, `${frac(a * c, b)}`],
            ans,
          );
        },

        // mixed - mixed
        () => {
          const b = pick(rng, [2, 3, 4, 5] as const);
          const d = pick(rng, [2, 3, 4, 5] as const);
          const n = randInt(rng, 3, 6);
          const m = randInt(rng, 1, n - 1);
          const a = randInt(rng, 1, b - 1);
          const c = randInt(rng, 1, d - 1);
          const r1 = reduce(n * b + a, b);
          const r2 = reduce(m * d + c, d);
          const ans = addRational(r1, { n: -r2.n, d: r2.d });
          return simp(
            `${n}\\dfrac{${a}}{${b}} - ${m}\\dfrac{${c}}{${d}}`,
            [
              `${frac(n * b + a, b)} - ${frac(m * d + c, d)}`,
              texFrac(ans.n, ans.d),
            ],
            ans,
          );
        },

        // (1 - 1/n) * n/(n-1) = 1
        () => {
          const n = randInt(rng, 3, 9);
          const ans = reduce(1, 1);
          return simp(
            `\\left(1 - ${frac(1, n)}\\right) \\cdot ${frac(n, n - 1)}`,
            [
              `${frac(n - 1, n)} \\cdot ${frac(n, n - 1)}`,
              `${frac((n - 1) * n, n * (n - 1))}`,
            ],
            ans,
          );
        },

        // a/b ÷ (c/d + e/f)
        () => {
          const b = randInt(rng, 2, 5);
          const a = randInt(rng, 2, 6);
          const d = randInt(rng, 2, 5);
          const f = randInt(rng, 2, 5);
          const c = randInt(rng, 1, 4);
          const e = randInt(rng, 1, 4);
          const den = addRational({ n: c, d: d }, { n: e, d: f });
          const ans = reduce(a * den.d, b * den.n);
          return simp(
            `${frac(a, b)} \\div \\left(${frac(c, d)} + ${frac(e, f)}\\right)`,
            [
              `${frac(a, b)} \\div ${frac(den.n, den.d)}`,
              `${frac(a, b)} \\cdot ${frac(den.d, den.n)}`,
            ],
            ans,
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
