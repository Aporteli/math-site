import type { GeneratedProblem } from "../types";
import {
  addRational,
  defineAlgebraProblem,
  multRational,
  reduce,
  texFrac,
  type Rational,
} from "./helpers";
import { pick, randInt } from "../rng";

function Q(n: number, d = 1): Rational {
  return reduce(n, d);
}

function tex(r: Rational): string {
  return texFrac(r.n, r.d);
}

function parensQ(r: Rational): string {
  if (r.d === 1 && r.n >= 0) return String(r.n);
  if (r.d === 1) return `(${r.n})`;
  const body = tex(r);
  return r.n < 0 ? `\\left(${body}\\right)` : `\\left(${body}\\right)`;
}

function powQ(r: Rational, k: number): Rational {
  let out = Q(1);
  for (let i = 0; i < k; i += 1) out = multRational(out, r);
  return out;
}

function termQ(a1: Rational, q: Rational, n: number): Rational {
  return multRational(a1, powQ(q, n - 1));
}

/** S = a1 / (1 − q), |q| < 1. */
function infS(a1: Rational, q: Rational): Rational {
  const oneMinus = Q(q.d - q.n, q.d);
  return reduce(a1.n * oneMinus.d, a1.d * oneMinus.n);
}

function listed(a1: Rational, q: Rational, count: number): string {
  const parts: string[] = [];
  let t = a1;
  for (let i = 0; i < count; i += 1) {
    const piece = tex(t);
    if (i === 0) parts.push(piece);
    else if (t.n < 0) parts.push(`- ${tex(Q(-t.n, t.d))}`);
    else parts.push(`+ ${piece}`);
    t = multRational(t, q);
  }
  return `${parts.join(" ")} + \\cdots`;
}

function sumTex(index: string, start: number, body: string): string {
  return `\\sum_{${index} = ${start}}^{\\infty} ${body}`;
}

function unitQ(rng: () => number): Rational {
  return pick(rng, [
    Q(1, 2),
    Q(1, 3),
    Q(1, 4),
    Q(1, 5),
    Q(2, 3),
    Q(2, 5),
    Q(3, 4),
    Q(3, 5),
    Q(-1, 2),
    Q(-1, 3),
    Q(-2, 5),
  ]);
}

function posUnitQ(rng: () => number): Rational {
  return pick(rng, [Q(1, 2), Q(1, 3), Q(1, 4), Q(1, 5), Q(2, 3), Q(2, 5), Q(3, 5)]);
}

/** Σ n r^n = r / (1 − r)^2 */
function sumNrn(r: Rational): Rational {
  const nm = r.d - r.n;
  return Q(r.n * r.d, nm * nm);
}

/** Σ (n+1) r^n = 1 / (1 − r)^2 */
function sumNp1(r: Rational): Rational {
  const nm = r.d - r.n;
  return Q(r.d * r.d, nm * nm);
}

/** Σ n^2 r^n = r(1+r) / (1 − r)^3 */
function sumN2rn(r: Rational): Rational {
  const nm = r.d - r.n;
  return Q(r.n * (r.d + r.n) * r.d, nm * nm * nm);
}

/** Σ (2n−1) r^n = r(1+r) / (1 − r)^2 */
function sumOddCoeff(r: Rational): Rational {
  const nm = r.d - r.n;
  return Q(r.n * (r.d + r.n), nm * nm);
}

function problem(
  instructionId: GeneratedProblem["instructionId"],
  promptTex: string,
  answer: string,
): GeneratedProblem {
  return {
    instructionId,
    promptTex,
    solutionTex: answer,
    graphExpr: "",
  } as GeneratedProblem;
}

export const infiniteGeometricSeriesProblem = defineAlgebraProblem(
  "infinite-geometric-series",
  ["easy", "medium", "hard"],
  ["8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // 1/2 + 1/4 + 1/8 + ⋯
        () => {
          const q = Q(1, 2);
          const a1 = Q(1, 2);
          return problem("evaluate", `${listed(a1, q, 3)},\\; S`, tex(infS(a1, q)));
        },

        // a1, q given
        () => {
          const q = posUnitQ(rng);
          const a1 = Q(randInt(rng, 1, 6));
          return problem(
            "evaluate",
            `a_{1} = ${tex(a1)},\\; q = ${tex(q)},\\; |q| < 1,\\; S`,
            tex(infS(a1, q)),
          );
        },

        // Σ_{n=0}^∞ r^n
        () => {
          const q = pick(rng, [Q(1, 2), Q(1, 3), Q(1, 4), Q(1, 5)]);
          return problem(
            "evaluate",
            sumTex("n", 0, `${parensQ(q)}^{n}`),
            tex(infS(Q(1), q)),
          );
        },

        // 1 + q + q^2 + ⋯
        () => {
          const q = pick(rng, [Q(1, 2), Q(1, 3), Q(1, 4)]);
          return problem("evaluate", `${listed(Q(1), q, 3)},\\; S`, tex(infS(Q(1), q)));
        },

        // alternating 1 − 1/2 + 1/4 − ⋯
        () => {
          const q = Q(-1, 2);
          return problem("evaluate", `${listed(Q(1), q, 4)},\\; S`, tex(infS(Q(1), q)));
        },

        // 0.3 + 0.03 + 0.003 + ⋯
        () => {
          const a1 = Q(3, 10);
          const q = Q(1, 10);
          return problem("evaluate", `${listed(a1, q, 3)},\\; S`, tex(infS(a1, q)));
        },

        // integer a1, q = 1/k
        () => {
          const k = pick(rng, [2, 3, 4, 5, 6]);
          const a1 = Q(k - 1);
          const q = Q(1, k);
          return problem(
            "evaluate",
            `a_{1} = ${k - 1},\\; q = ${tex(q)},\\; S`,
            tex(infS(a1, q)),
          );
        },

        // 2 + 1 + 1/2 + ⋯
        () => {
          const a1 = Q(pick(rng, [2, 3, 4]));
          const q = Q(1, 2);
          return problem("evaluate", `${listed(a1, q, 3)},\\; S`, tex(infS(a1, q)));
        },

        // Σ_{n=1}^∞ r^n = r/(1−r)
        () => {
          const q = pick(rng, [Q(1, 2), Q(1, 3), Q(1, 4), Q(2, 5)]);
          return problem(
            "evaluate",
            sumTex("n", 1, `${parensQ(q)}^{n}`),
            tex(infS(q, q)),
          );
        },

        // a1 = q
        () => {
          const q = posUnitQ(rng);
          return problem(
            "evaluate",
            `a_{1} = ${tex(q)},\\; q = ${tex(q)},\\; S`,
            tex(infS(q, q)),
          );
        },

        // a1 fraction, q = 1/2
        () => {
          const a1 = Q(1, pick(rng, [2, 3, 4, 5]));
          const q = Q(1, 2);
          return problem(
            "evaluate",
            `a_{1} = ${tex(a1)},\\; q = ${tex(q)},\\; S`,
            tex(infS(a1, q)),
          );
        },

        // 5/9 + 5/27 + 5/81 + ⋯
        () => {
          const a1 = Q(pick(rng, [2, 4, 5]), 9);
          const q = Q(1, 3);
          return problem("evaluate", `${listed(a1, q, 3)},\\; S`, tex(infS(a1, q)));
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // find q from a1, S
        () => {
          const q = posUnitQ(rng);
          const a1 = Q(randInt(rng, 1, 5));
          const s = infS(a1, q);
          return problem(
            "evaluate",
            `a_{1} = ${tex(a1)},\\; S = ${tex(s)},\\; |q| < 1,\\; q`,
            tex(q),
          );
        },

        // find a1 from S, q
        () => {
          const q = unitQ(rng);
          const a1 = Q(randInt(rng, 1, 6));
          const s = infS(a1, q);
          return problem(
            "evaluate",
            `q = ${tex(q)},\\; S = ${tex(s)},\\; a_{1}`,
            tex(a1),
          );
        },

        // tail Σ_{n=k}^∞ r^n
        () => {
          const q = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 3), Q(1, 4)]);
          const k = randInt(rng, 3, 6);
          const tail = infS(powQ(q, k), q);
          return problem(
            "evaluate",
            sumTex("n", k, `${parensQ(q)}^{n}`),
            tex(tail),
          );
        },

        // two series
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 4)]);
          const s = pick(rng, [Q(1, 3), Q(1, 5)]);
          const total = addRational(infS(Q(1), r), infS(Q(1), s));
          return problem(
            "evaluate",
            `${sumTex("n", 0, `${parensQ(r)}^{n}`)} + ${sumTex("n", 0, `${parensQ(s)}^{n}`)}`,
            tex(total),
          );
        },

        // 0.d̅ repeating
        () => {
          const d = randInt(rng, 1, 9);
          const a1 = Q(d, 10);
          const q = Q(1, 10);
          return problem(
            "evaluate",
            `0.\\overline{${d}} = ${listed(a1, q, 3)},\\; S`,
            tex(infS(a1, q)),
          );
        },

        // even powers Σ r^{2n}
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5)]);
          const q2 = multRational(r, r);
          return problem(
            "evaluate",
            sumTex("n", 0, `${parensQ(r)}^{2n}`),
            tex(infS(Q(1), q2)),
          );
        },

        // remainder S − S_k
        () => {
          const q = Q(1, 2);
          const a1 = Q(randInt(rng, 1, 4));
          const k = randInt(rng, 3, 6);
          const rem = infS(termQ(a1, q, k + 1), q);
          return problem(
            "evaluate",
            `a_{1} = ${tex(a1)},\\; q = ${tex(q)},\\; S - S_{${k}}`,
            tex(rem),
          );
        },

        // negative q
        () => {
          const q = pick(rng, [Q(-1, 2), Q(-1, 3), Q(-2, 5), Q(-3, 4)]);
          const a1 = Q(randInt(rng, 1, 5));
          return problem(
            "evaluate",
            `a_{1} = ${tex(a1)},\\; q = ${tex(q)},\\; S`,
            tex(infS(a1, q)),
          );
        },

        // 1 + x + x^2 + ⋯ = s, find x
        () => {
          const x = posUnitQ(rng);
          const s = infS(Q(1), x);
          return problem(
            "solve",
            `${listed(Q(1), x, 3)} = ${tex(s)},\\; |x| < 1,\\; x`,
            tex(x),
          );
        },

        // Σ c r^n
        () => {
          const c = randInt(rng, 2, 7);
          const q = posUnitQ(rng);
          return problem(
            "evaluate",
            sumTex("n", 0, `${c} \\cdot ${parensQ(q)}^{n}`),
            tex(infS(Q(c), q)),
          );
        },

        // listed a1 = 4/3, q = 1/3
        () => {
          const a1 = Q(pick(rng, [2, 4, 5, 8]), pick(rng, [3, 5, 9]));
          const q = Q(1, pick(rng, [3, 4, 5]));
          if (Math.abs(q.n) >= q.d) {
            return problem("evaluate", `${listed(Q(4, 3), Q(1, 3), 3)},\\; S`, tex(infS(Q(4, 3), Q(1, 3))));
          }
          return problem("evaluate", `${listed(a1, q, 3)},\\; S`, tex(infS(a1, q)));
        },

        // odd powers Σ r^{2n+1}
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5)]);
          const q2 = multRational(r, r);
          const s = infS(r, q2);
          return problem(
            "evaluate",
            sumTex("n", 0, `${parensQ(r)}^{2n+1}`),
            tex(s),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // Σ n r^n = r/(1−r)^2
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(1, 4), Q(2, 5), Q(2, 3), Q(3, 5)]);
          return problem(
            "evaluate",
            sumTex("n", 1, `n ${parensQ(r)}^{n}`),
            tex(sumNrn(r)),
          );
        },

        // Σ (n+1) r^n = 1/(1−r)^2
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5), Q(3, 4), Q(-1, 2), Q(-1, 3)]);
          return problem(
            "evaluate",
            sumTex("n", 0, `(n+1)${parensQ(r)}^{n}`),
            tex(sumNp1(r)),
          );
        },

        // Σ n^2 r^n
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5), Q(1, 4), Q(2, 3)]);
          return problem(
            "evaluate",
            sumTex("n", 1, `n^{2} ${parensQ(r)}^{n}`),
            tex(sumN2rn(r)),
          );
        },

        // (Σ r^n)(Σ s^n) from n=0
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 4), Q(2, 5)]);
          let s = pick(rng, [Q(1, 3), Q(1, 5), Q(2, 3), Q(-1, 2)]);
          while (s.n === r.n && s.d === r.d) {
            s = pick(rng, [Q(1, 3), Q(1, 5), Q(2, 3), Q(-1, 2)]);
          }
          const prod = multRational(infS(Q(1), r), infS(Q(1), s));
          return problem(
            "evaluate",
            `\\left(${sumTex("n", 0, `${parensQ(r)}^{n}`)}\\right)\\left(${sumTex("k", 0, `${parensQ(s)}^{k}`)}\\right)`,
            tex(prod),
          );
        },

        // 1 + 2x + 4x^2 + ⋯ = Σ (2x)^n = c, find x
        () => {
          const twoX = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5), Q(-1, 2), Q(1, 4)]);
          const c = infS(Q(1), twoX);
          const x = Q(twoX.n, twoX.d * 2);
          return problem(
            "solve",
            `1 + 2x + 4x^{2} + 8x^{3} + \\cdots = ${tex(c)},\\; |2x| < 1,\\; x`,
            tex(x),
          );
        },

        // Σ n x^n = known, find x
        () => {
          const x = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5), Q(1, 4)]);
          const val = sumNrn(x);
          return problem(
            "solve",
            `${sumTex("n", 1, `n x^{n}`)} = ${tex(val)},\\; |x| < 1,\\; x`,
            tex(x),
          );
        },

        // 0.ab repeating as GP of two-digit blocks
        () => {
          const ab = randInt(rng, 11, 98);
          const a1 = Q(ab, 100);
          const q = Q(1, 100);
          return problem(
            "evaluate",
            `0.\\overline{${String(ab).padStart(2, "0")}} = ${listed(a1, q, 3)},\\; S`,
            tex(infS(a1, q)),
          );
        },

        // 0.1 + 6/100 + 6/1000 + ⋯  (0.1666…)
        () => {
          const lead = Q(1, 10);
          const a1 = Q(6, 100);
          const q = Q(1, 10);
          const s = addRational(lead, infS(a1, q));
          return problem(
            "evaluate",
            `${tex(lead)} + ${listed(a1, q, 3)}`,
            tex(s),
          );
        },

        // Σ (2n−1) r^n
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5), Q(1, 4), Q(-1, 2)]);
          return problem(
            "evaluate",
            sumTex("n", 1, `(2n-1)${parensQ(r)}^{n}`),
            tex(sumOddCoeff(r)),
          );
        },

        // double sum Σ_i Σ_j r^{i+j}
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5), Q(-1, 2), Q(1, 4)]);
          const s = infS(Q(1), r);
          const prod = multRational(s, s);
          return problem(
            "evaluate",
            `\\sum_{i=0}^{\\infty}\\sum_{j=0}^{\\infty} ${parensQ(r)}^{i+j}`,
            tex(prod),
          );
        },

        // mixed even/odd: Σ r^{2n} + c Σ r^{2n+1}
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5)]);
          const c = randInt(rng, 2, 5);
          const q2 = multRational(r, r);
          const even = infS(Q(1), q2);
          const odd = infS(r, q2);
          const total = addRational(even, multRational(Q(c), odd));
          return problem(
            "evaluate",
            `${sumTex("n", 0, `${parensQ(r)}^{2n}`)} + ${c}${sumTex("n", 0, `${parensQ(r)}^{2n+1}`)}`,
            tex(total),
          );
        },

        // Σ n (−r)^n  with r>0
        () => {
          const r = pick(rng, [Q(1, 2), Q(1, 3), Q(2, 5), Q(3, 4)]);
          const x = Q(-r.n, r.d);
          return problem(
            "evaluate",
            sumTex("n", 1, `n\\left(-${tex(r)}\\right)^{n}`),
            tex(sumNrn(x)),
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
