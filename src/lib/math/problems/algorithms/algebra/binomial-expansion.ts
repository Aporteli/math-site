import type { GeneratedProblem } from "../types";
import {
  defineAlgebraProblem,
  gcd,
  joinTerms,
  otherVariable,
  parenLinear,
  polyTex,
  selectVariable,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let kk = Math.min(k, n - k);
  let num = 1;
  let den = 1;
  for (let i = 1; i <= kk; i += 1) {
    num *= n - kk + i;
    den *= i;
    const g = gcd(num, den);
    num /= g;
    den /= g;
  }
  return num / den;
}

function ipow(base: number, exp: number): number {
  if (exp === 0) return 1;
  return base ** exp;
}

/** (a x + b)^n, coefficients of x^n … x^0. */
function binomCoeffs(a: number, b: number, n: number): number[] {
  const out: number[] = [];
  for (let k = 0; k <= n; k += 1) {
    out.push(binom(n, k) * ipow(a, n - k) * ipow(b, k));
  }
  return out;
}

function pascalRow(n: number): string {
  const parts: string[] = [];
  for (let k = 0; k <= n; k += 1) parts.push(String(binom(n, k)));
  return parts.join(",\\; ");
}

function xyTerm(
  coef: number,
  x: string,
  px: number,
  y: string,
  py: number,
): string {
  let body = "";
  if (px === 1) body += x;
  else if (px > 1) body += `${x}^{${px}}`;
  if (py === 1) body += y;
  else if (py > 1) body += `${y}^{${py}}`;
  return joinTerms([{ coef, body }]);
}

function expandXY(
  x: string,
  y: string,
  n: number,
  ax = 1,
  by = 1,
): string {
  const parts: { coef: number; body: string }[] = [];
  for (let k = 0; k <= n; k += 1) {
    const coef = binom(n, k) * ipow(ax, n - k) * ipow(by, k);
    let body = "";
    const px = n - k;
    if (px === 1) body += x;
    else if (px > 1) body += `${x}^{${px}}`;
    if (k === 1) body += y;
    else if (k > 1) body += `${y}^{${k}}`;
    parts.push({ coef, body });
  }
  return joinTerms(parts);
}

/** Lowest-degree-first coefficients of (c0 + c1 x + c2 x^2 + …)^n, up to degree maxDeg. */
function polyPowCoeffs(
  base: readonly number[],
  n: number,
  maxDeg: number,
): number[] {
  let dp = Array.from({ length: maxDeg + 1 }, () => 0);
  dp[0] = 1;
  for (let i = 0; i < n; i += 1) {
    const next = Array.from({ length: maxDeg + 1 }, () => 0);
    for (let s = 0; s <= maxDeg; s += 1) {
      if (dp[s] === 0) continue;
      for (let j = 0; j < base.length; j += 1) {
        const t = s + j;
        if (t > maxDeg) continue;
        next[t] += dp[s]! * base[j]!;
      }
    }
    dp = next;
  }
  return dp;
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

export const binomialExpansionProblem = defineAlgebraProblem(
  "binomial-expansion",
  ["easy", "medium", "hard"],
  ["8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);
    const y = otherVariable(variable);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // (x+1)^2
        () => {
          const n = 2;
          const coeffs = binomCoeffs(1, 1, n);
          return problem(
            "expand",
            `(${variable} + 1)^{${n}}`,
            polyTex(variable, coeffs),
          );
        },

        // (x−1)^2
        () => {
          const coeffs = binomCoeffs(1, -1, 2);
          return problem(
            "expand",
            `(${variable} - 1)^{2}`,
            polyTex(variable, coeffs),
          );
        },

        // (x+1)^3
        () => {
          return problem(
            "expand",
            `(${variable} + 1)^{3}`,
            polyTex(variable, binomCoeffs(1, 1, 3)),
          );
        },

        // (x+a)^3, a>1
        () => {
          const a = randInt(rng, 2, 5);
          return problem(
            "expand",
            `${parenLinear(1, a, variable)}^{3}`,
            polyTex(variable, binomCoeffs(1, a, 3)),
          );
        },

        // Pascal C(n,k)
        () => {
          const n = randInt(rng, 4, 8);
          const k = randInt(rng, 1, n - 1);
          return problem("evaluate", `\\binom{${n}}{${k}}`, `${binom(n, k)}`);
        },

        // Pascal row
        () => {
          const n = randInt(rng, 3, 6);
          return problem(
            "evaluate",
            `\\binom{${n}}{0},\\; \\binom{${n}}{1},\\; \\ldots,\\; \\binom{${n}}{${n}}`,
            pascalRow(n),
          );
        },

        // [x^k] (x+1)^n
        () => {
          const n = randInt(rng, 3, 6);
          const k = randInt(rng, 1, n - 1);
          return problem(
            "evaluate",
            `(${variable} + 1)^{${n}},\\; [${variable}^{${k}}]`,
            `${binom(n, n - k)}`,
          );
        },

        // (2x+1)^2
        () => {
          const a = randInt(rng, 2, 5);
          return problem(
            "expand",
            `(${a}${variable} + 1)^{2}`,
            polyTex(variable, binomCoeffs(a, 1, 2)),
          );
        },

        // middle term of (x+y)^4
        () => {
          const n = 4;
          const k = 2;
          const c = binom(n, k);
          return problem(
            "simplify",
            `(${variable} + ${y})^{${n}},\\; T_{${k + 1}}`,
            xyTerm(c, variable, n - k, y, k),
          );
        },

        // (x−y)^2
        () => {
          return problem(
            "expand",
            `(${variable} - ${y})^{2}`,
            expandXY(variable, y, 2, 1, -1),
          );
        },

        // C(n,1)=n
        () => {
          const n = randInt(rng, 5, 12);
          return problem("evaluate", `\\binom{${n}}{1}`, `${n}`);
        },

        // (x+y)^3
        () => {
          return problem(
            "expand",
            `(${variable} + ${y})^{3}`,
            expandXY(variable, y, 3),
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // (x+1)^5
        () => {
          const n = pick(rng, [5, 6]);
          return problem(
            "expand",
            `(${variable} + 1)^{${n}}`,
            polyTex(variable, binomCoeffs(1, 1, n)),
          );
        },

        // (x−a)^4
        () => {
          const a = randInt(rng, 2, 4);
          return problem(
            "expand",
            `${parenLinear(1, -a, variable)}^{4}`,
            polyTex(variable, binomCoeffs(1, -a, 4)),
          );
        },

        // [x^k] (ax+b)^n
        () => {
          const a = nonzero(rng, 2, 4);
          const b = nonzero(rng, -4, 4);
          const n = randInt(rng, 4, 6);
          const k = randInt(rng, 1, n - 1);
          const coef = binom(n, k) * ipow(a, k) * ipow(b, n - k);
          return problem(
            "evaluate",
            `(${a}${variable} ${b >= 0 ? `+ ${b}` : `- ${-b}`})^{${n}},\\; [${variable}^{${k}}]`,
            `${coef}`,
          );
        },

        // (1−x)^n coefficient
        () => {
          const n = randInt(rng, 5, 8);
          const k = randInt(rng, 1, n - 1);
          const coef = binom(n, k) * ipow(-1, k);
          return problem(
            "evaluate",
            `(1 - ${variable})^{${n}},\\; [${variable}^{${k}}]`,
            `${coef}`,
          );
        },

        // T_{r} of (x+y)^n
        () => {
          const n = randInt(rng, 6, 8);
          const k = randInt(rng, 2, n - 2);
          const c = binom(n, k);
          return problem(
            "simplify",
            `(${variable} + ${y})^{${n}},\\; T_{${k + 1}}`,
            xyTerm(c, variable, n - k, y, k),
          );
        },

        // C(n,k) larger
        () => {
          const n = randInt(rng, 8, 12);
          const k = randInt(rng, 2, 5);
          return problem("evaluate", `\\binom{${n}}{${k}}`, `${binom(n, k)}`);
        },

        // Pascal identity C(n,k)+C(n,k+1)=C(n+1,k+1)
        () => {
          const n = randInt(rng, 6, 10);
          const k = randInt(rng, 1, n - 2);
          return problem(
            "evaluate",
            `\\binom{${n}}{${k}} + \\binom{${n}}{${k + 1}}`,
            `${binom(n + 1, k + 1)}`,
          );
        },

        // (ax+b)^5 one coefficient
        () => {
          const a = pick(rng, [2, 3]);
          const b = nonzero(rng, -3, 3);
          const n = 5;
          const k = randInt(rng, 1, 4);
          const coef = binom(n, k) * ipow(a, k) * ipow(b, n - k);
          return problem(
            "evaluate",
            `(${a}${variable} ${b >= 0 ? `+ ${b}` : `- ${-b}`})^{${n}},\\; [${variable}^{${k}}]`,
            `${coef}`,
          );
        },

        // middle term (x+y)^{2m}
        () => {
          const m = pick(rng, [3, 4]);
          const n = 2 * m;
          const k = m;
          const c = binom(n, k);
          return problem(
            "simplify",
            `(${variable} + ${y})^{${n}},\\; T_{${k + 1}}`,
            xyTerm(c, variable, n - k, y, k),
          );
        },

        // consecutive ratio C(n,k+1)/C(n,k)
        () => {
          const n = randInt(rng, 7, 12);
          const k = randInt(rng, 2, 5);
          const val = binom(n, k + 1) / binom(n, k);
          const ans = Number.isInteger(val)
            ? String(val)
            : texFrac(n - k, k + 1);
          return problem(
            "evaluate",
            `\\dfrac{\\binom{${n}}{${k + 1}}}{\\binom{${n}}{${k}}}`,
            ans,
          );
        },

        // (2x−1)^n [x^k]
        () => {
          const n = randInt(rng, 5, 7);
          const k = randInt(rng, 2, n - 2);
          const coef = binom(n, k) * ipow(2, k) * ipow(-1, n - k);
          return problem(
            "evaluate",
            `(2${variable} - 1)^{${n}},\\; [${variable}^{${k}}]`,
            `${coef}`,
          );
        },

        // row sum 2^n
        () => {
          const n = randInt(rng, 5, 10);
          return problem(
            "evaluate",
            `\\binom{${n}}{0} + \\binom{${n}}{1} + \\cdots + \\binom{${n}}{${n}}`,
            `${2 ** n}`,
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // [x^p] (1+x)^n (1+2x)^m
        () => {
          const n = randInt(rng, 4, 7);
          const m = randInt(rng, 3, 6);
          const p = randInt(rng, 3, Math.min(n + m - 1, 8));
          let coef = 0;
          for (let j = 0; j <= p; j += 1) {
            coef += binom(n, j) * binom(m, p - j) * ipow(2, p - j);
          }
          return problem(
            "evaluate",
            `(1 + ${variable})^{${n}}(1 + 2${variable})^{${m}},\\; [${variable}^{${p}}]`,
            `${coef}`,
          );
        },

        // [x^r] (1+x+x^2)^n
        () => {
          const n = randInt(rng, 4, 7);
          const r = randInt(rng, 3, Math.min(2 * n, 10));
          const c = polyPowCoeffs([1, 1, 1], n, r);
          return problem(
            "evaluate",
            `(1 + ${variable} + ${variable}^{2})^{${n}},\\; [${variable}^{${r}}]`,
            `${c[r]}`,
          );
        },

        // [x^r] (1+2x−x^2)^n
        () => {
          const n = randInt(rng, 4, 6);
          const r = randInt(rng, 3, Math.min(2 * n, 9));
          const c = polyPowCoeffs([1, 2, -1], n, r);
          return problem(
            "evaluate",
            `(1 + 2${variable} - ${variable}^{2})^{${n}},\\; [${variable}^{${r}}]`,
            `${c[r]}`,
          );
        },

        // constant term of (a x + b/x)^n, n even
        () => {
          const n = pick(rng, [6, 8, 10]);
          const a = nonzero(rng, 2, 4);
          const b = nonzero(rng, -4, 4);
          const k = n / 2;
          const coef = binom(n, k) * ipow(a, n - k) * ipow(b, k);
          return problem(
            "evaluate",
            `\\left(${a}${variable} + \\dfrac{${b}}{${variable}}\\right)^{${n}},\\; [${variable}^{0}]`,
            `${coef}`,
          );
        },

        // [x^m] (x^2 + c/x)^n with 2n−3k = m
        () => {
          const n = pick(rng, [5, 6, 7, 8]);
          const c = nonzero(rng, 2, 5);
          const ks: number[] = [];
          for (let k = 1; k <= n - 1; k += 1) ks.push(k);
          const k = pick(rng, ks);
          const m = 2 * n - 3 * k;
          const coef = binom(n, k) * ipow(c, k);
          const powerAsk = m === 0 ? `[${variable}^{0}]` : `[${variable}^{${m}}]`;
          return problem(
            "evaluate",
            `\\left(${variable}^{2} + \\dfrac{${c}}{${variable}}\\right)^{${n}},\\; ${powerAsk}`,
            `${coef}`,
          );
        },

        // hockey-stick
        () => {
          const k = randInt(rng, 2, 4);
          const start = k;
          const end = randInt(rng, start + 3, start + 6);
          const ans = binom(end + 1, k + 1);
          return problem(
            "evaluate",
            `\\binom{${start}}{${k}} + \\binom{${start + 1}}{${k}} + \\cdots + \\binom{${end}}{${k}}`,
            `${ans}`,
          );
        },

        // (1+x)^n + (1−x)^n, even power
        () => {
          const n = pick(rng, [6, 7, 8, 9]);
          const evenPowers: number[] = [];
          for (let p = 0; p <= n; p += 2) evenPowers.push(p);
          const p = pick(rng, evenPowers.filter((e) => e > 0));
          const coef = 2 * binom(n, p);
          return problem(
            "evaluate",
            `(1 + ${variable})^{${n}} + (1 - ${variable})^{${n}},\\; [${variable}^{${p}}]`,
            `${coef}`,
          );
        },

        // multinomial (x+y+z)^n [x^a y^b z^c]
        () => {
          const n = randInt(rng, 5, 7);
          const a = randInt(rng, 1, n - 2);
          const b = randInt(rng, 1, n - a - 1);
          const c = n - a - b;
          const z =
            variable !== "z" && y !== "z"
              ? "z"
              : variable !== "w" && y !== "w"
                ? "w"
                : "t";
          const coef = binom(n, a) * binom(n - a, b);
          return problem(
            "evaluate",
            `(${variable} + ${y} + ${z})^{${n}},\\; [${variable}^{${a}}${y}^{${b}}${z}^{${c}}]`,
            `${coef}`,
          );
        },

        // constant term (√x − d/√x)^n, n even
        () => {
          const n = pick(rng, [6, 8]);
          const d = randInt(rng, 2, 5);
          const k = n / 2;
          const coef = binom(n, k) * ipow(-d, k);
          return problem(
            "evaluate",
            `\\left(\\sqrt{${variable}} - \\dfrac{${d}}{\\sqrt{${variable}}}\\right)^{${n}},\\; [${variable}^{0}]`,
            `${coef}`,
          );
        },

        // Σ C(n,k)^2 = C(2n,n)
        () => {
          const n = pick(rng, [5, 6, 7, 8]);
          return problem(
            "evaluate",
            `\\binom{${n}}{0}^{2} + \\binom{${n}}{1}^{2} + \\cdots + \\binom{${n}}{${n}}^{2}`,
            `${binom(2 * n, n)}`,
          );
        },

        // C(n,3)/C(n,1) = (n-1)(n-2)/6, find n from value
        () => {
          const n = randInt(rng, 8, 14);
          const val = binom(n, 3) / n;
          const ans = Number.isInteger(val)
            ? String(val)
            : texFrac((n - 1) * (n - 2), 6);
          return problem(
            "evaluate",
            `\\dfrac{\\binom{${n}}{3}}{\\binom{${n}}{1}}`,
            ans,
          );
        },

        // T_{k+1} of (2x − 3y)^n
        () => {
          const n = pick(rng, [6, 7, 8]);
          const k = randInt(rng, 2, n - 2);
          const coef = binom(n, k) * ipow(2, n - k) * ipow(-3, k);
          return problem(
            "simplify",
            `(2${variable} - 3${y})^{${n}},\\; T_{${k + 1}}`,
            xyTerm(coef, variable, n - k, y, k),
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
