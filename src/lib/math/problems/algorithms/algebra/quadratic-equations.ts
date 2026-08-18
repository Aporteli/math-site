import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  parenLinear,
  quadratic,
  reduce,
  selectVariable,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

type Rel = "<" | ">" | "\\le" | "\\ge";

function expanded(a: number, r: number, s: number, variable: string): string {
  return quadratic(a, -a * (r + s), a * r * s, variable);
}

function factored(a: number, r: number, s: number, variable: string): string {
  const body = `${parenLinear(1, -r, variable)}${parenLinear(1, -s, variable)}`;
  if (a === 1) return body;
  if (a === -1) return `-${body}`;
  return `${a}${body}`;
}

function square(variable: string, root: number): string {
  return `${parenLinear(1, -root, variable)}^{2}`;
}

function twoRoots(
  rng: () => number,
  min = -5,
  max = 6,
): [number, number] {
  let r = randInt(rng, min, max);
  let s = randInt(rng, min, max);
  while (s === r) s = randInt(rng, min, max);
  return r < s ? [r, s] : [s, r];
}

function rootsAns(
  variable: string,
  r: string | number,
  s: string | number,
): string {
  return `${variable} = ${r},\\; ${variable} = ${s}`;
}

function betweenAns(
  lo: string | number,
  relL: string,
  variable: string,
  relR: string,
  hi: string | number,
): string {
  return `${lo} ${relL} ${variable} ${relR} ${hi}`;
}

function outsideAns(
  variable: string,
  relL: string,
  lo: string | number,
  relR: string,
  hi: string | number,
): string {
  return `${variable} ${relL} ${lo} \\lor ${variable} ${relR} ${hi}`;
}

/** Relation for `P  rel  0` so the solution is between the roots, or outside. */
function quadRel(a: number, between: boolean, closed: boolean): Rel {
  const wantPositive = a > 0 ? !between : between;
  if (wantPositive) return closed ? "\\ge" : ">";
  return closed ? "\\le" : "<";
}

function problem(
  promptTex: string,
  steps: string[],
  answer: string,
  graphExpr = "",
): GeneratedProblem {
  return {
    instructionId: "solve" as const,
    promptTex,
    solutionTex: aligned([...steps, answer]),
    graphExpr,
  } as GeneratedProblem;
}

export const quadraticEquationsInequalitiesProblem = defineAlgebraProblem(
  "quadratic-equations-inequalities",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // x^2 = k^2
        () => {
          const k = randInt(rng, 2, 9);
          const expr = `${variable}^{2}`;
          return problem(
            `${expr} = ${k * k}`,
            [`${variable} = \\pm ${k}`],
            rootsAns(variable, -k, k),
            `${expr} - ${k * k}`,
          );
        },

        // x^2 - k^2 = 0
        () => {
          const k = randInt(rng, 2, 9);
          const expr = `${variable}^{2} - ${k * k}`;
          return problem(
            `${expr} = 0`,
            [`${variable}^{2} = ${k * k}`],
            rootsAns(variable, -k, k),
            expr,
          );
        },

        // (x - r)(x - s) = 0
        () => {
          const [r, s] = twoRoots(rng);
          return problem(
            `${factored(1, r, s, variable)} = 0`,
            [],
            rootsAns(variable, r, s),
            expanded(1, r, s, variable),
          );
        },

        // x(x - r) = 0
        () => {
          const r = nonzero(rng, -8, 8);
          return problem(
            `${variable}${parenLinear(1, -r, variable)} = 0`,
            [],
            rootsAns(variable, 0, r),
            expanded(1, 0, r, variable),
          );
        },

        // (x - r)^2 = 0
        () => {
          const r = nonzero(rng, -7, 7);
          return problem(
            `${square(variable, r)} = 0`,
            [],
            `${variable} = ${r}`,
            expanded(1, r, r, variable),
          );
        },

        // (x - r)^2 = k^2
        () => {
          const r = randInt(rng, -5, 5);
          const k = randInt(rng, 1, 6);
          return problem(
            `${square(variable, r)} = ${k * k}`,
            [`${parenLinear(1, -r, variable)} = \\pm ${k}`],
            rootsAns(variable, r - k, r + k),
            expanded(1, r - k, r + k, variable),
          );
        },

        // x^2 < k^2
        () => {
          const k = randInt(rng, 2, 8);
          return problem(
            `${variable}^{2} < ${k * k}`,
            [],
            betweenAns(-k, "<", variable, "<", k),
            `${variable}^{2} - ${k * k}`,
          );
        },

        // x^2 > k^2
        () => {
          const k = randInt(rng, 2, 8);
          return problem(
            `${variable}^{2} > ${k * k}`,
            [],
            outsideAns(variable, "<", -k, ">", k),
            `${variable}^{2} - ${k * k}`,
          );
        },

        // x^2 ≤ k^2  or  x^2 ≥ k^2
        () => {
          const k = randInt(rng, 2, 8);
          const inside = rng() < 0.5;
          if (inside) {
            return problem(
              `${variable}^{2} \\le ${k * k}`,
              [],
              betweenAns(-k, "\\le", variable, "\\le", k),
              `${variable}^{2} - ${k * k}`,
            );
          }
          return problem(
            `${variable}^{2} \\ge ${k * k}`,
            [],
            outsideAns(variable, "\\le", -k, "\\ge", k),
            `${variable}^{2} - ${k * k}`,
          );
        },

        // x^2 + m = 0, m > 0 → empty
        () => {
          const m = randInt(rng, 1, 12);
          const expr = `${variable}^{2} + ${m}`;
          return problem(`${expr} = 0`, [`${variable}^{2} = -${m}`], "\\emptyset", expr);
        },

        // x^2 + m > 0 → all reals
        () => {
          const m = randInt(rng, 1, 9);
          const expr = `${variable}^{2} + ${m}`;
          return problem(
            `${expr} > 0`,
            [],
            `${variable} \\in \\mathbb{R}`,
            expr,
          );
        },

        // x^2 - r x = 0
        () => {
          const r = nonzero(rng, -8, 8);
          const expr = expanded(1, 0, r, variable);
          return problem(
            `${expr} = 0`,
            [`${variable}${parenLinear(1, -r, variable)} = 0`],
            rootsAns(variable, 0, r),
            expr,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // monic expanded = 0
        () => {
          const [r, s] = twoRoots(rng);
          const expr = expanded(1, r, s, variable);
          return problem(
            `${expr} = 0`,
            [`${factored(1, r, s, variable)} = 0`],
            rootsAns(variable, r, s),
            expr,
          );
        },

        // scaled expanded = 0
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = randInt(rng, 2, 5);
          const expr = expanded(a, r, s, variable);
          return problem(
            `${expr} = 0`,
            [`${factored(a, r, s, variable)} = 0`],
            rootsAns(variable, r, s),
            expr,
          );
        },

        // factored < 0 (between)
        () => {
          const [r, s] = twoRoots(rng);
          return problem(
            `${factored(1, r, s, variable)} < 0`,
            [],
            betweenAns(r, "<", variable, "<", s),
            expanded(1, r, s, variable),
          );
        },

        // factored > 0 (outside)
        () => {
          const [r, s] = twoRoots(rng);
          return problem(
            `${factored(1, r, s, variable)} > 0`,
            [],
            outsideAns(variable, "<", r, ">", s),
            expanded(1, r, s, variable),
          );
        },

        // expanded a > 0, between
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = randInt(rng, 1, 4);
          const closed = rng() < 0.5;
          const rel = quadRel(a, true, closed);
          const expr = expanded(a, r, s, variable);
          const relI: Rel = closed ? "\\le" : "<";
          return problem(
            `${expr} ${rel} 0`,
            [`${factored(a, r, s, variable)} ${rel} 0`],
            betweenAns(r, relI, variable, relI, s),
            expr,
          );
        },

        // expanded a > 0, outside
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = randInt(rng, 1, 4);
          const closed = rng() < 0.5;
          const rel = quadRel(a, false, closed);
          const expr = expanded(a, r, s, variable);
          const relL: Rel = closed ? "\\le" : "<";
          const relR: Rel = closed ? "\\ge" : ">";
          return problem(
            `${expr} ${rel} 0`,
            [`${factored(a, r, s, variable)} ${rel} 0`],
            outsideAns(variable, relL, r, relR, s),
            expr,
          );
        },

        // (x - h)^2 < k^2
        () => {
          const h = randInt(rng, -4, 4);
          const k = randInt(rng, 2, 6);
          return problem(
            `${square(variable, h)} < ${k * k}`,
            [`${parenLinear(1, -h, variable)} < ${k},\\; ${parenLinear(1, -h, variable)} > -${k}`],
            betweenAns(h - k, "<", variable, "<", h + k),
            expanded(1, h - k, h + k, variable),
          );
        },

        // (x - h)^2 > k^2
        () => {
          const h = randInt(rng, -4, 4);
          const k = randInt(rng, 2, 6);
          return problem(
            `${square(variable, h)} > ${k * k}`,
            [],
            outsideAns(variable, "<", h - k, ">", h + k),
            expanded(1, h - k, h + k, variable),
          );
        },

        // x^2 + b x = c  (moved constant)
        () => {
          const [r, s] = twoRoots(rng);
          const lhs = quadratic(1, -(r + s), 0, variable);
          const c = -r * s;
          return problem(
            `${lhs} = ${c}`,
            [`${expanded(1, r, s, variable)} = 0`],
            rootsAns(variable, r, s),
            expanded(1, r, s, variable),
          );
        },

        // a < 0 expanded = 0
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = -randInt(rng, 1, 4);
          const expr = expanded(a, r, s, variable);
          return problem(
            `${expr} = 0`,
            [`${factored(a, r, s, variable)} = 0`],
            rootsAns(variable, r, s),
            expr,
          );
        },

        // factored ≤ 0 (between, closed)
        () => {
          const [r, s] = twoRoots(rng);
          return problem(
            `${factored(1, r, s, variable)} \\le 0`,
            [],
            betweenAns(r, "\\le", variable, "\\le", s),
            expanded(1, r, s, variable),
          );
        },

        // factored ≥ 0 (outside, closed)
        () => {
          const [r, s] = twoRoots(rng);
          return problem(
            `${factored(1, r, s, variable)} \\ge 0`,
            [],
            outsideAns(variable, "\\le", r, "\\ge", s),
            expanded(1, r, s, variable),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // scaled expanded, between
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = randInt(rng, 2, 5);
          const closed = rng() < 0.5;
          const rel = quadRel(a, true, closed);
          const relI: Rel = closed ? "\\le" : "<";
          const expr = expanded(a, r, s, variable);
          return problem(
            `${expr} ${rel} 0`,
            [`${factored(a, r, s, variable)} ${rel} 0`],
            betweenAns(r, relI, variable, relI, s),
            expr,
          );
        },

        // a < 0 expanded inequality
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = -randInt(rng, 1, 4);
          const between = rng() < 0.5;
          const closed = rng() < 0.5;
          const rel = quadRel(a, between, closed);
          const expr = expanded(a, r, s, variable);
          const relL: Rel = closed ? "\\le" : "<";
          const relR: Rel = closed ? "\\ge" : ">";
          const ans = between
            ? betweenAns(r, relL, variable, relL, s)
            : outsideAns(variable, relL, r, relR, s);
          return problem(
            `${expr} ${rel} 0`,
            [`${factored(a, r, s, variable)} ${rel} 0`],
            ans,
            expr,
          );
        },

        // (d x - p)(x - s) = 0, one fractional root
        () => {
          const d = pick(rng, [2, 3, 4, 5]);
          let p = nonzero(rng, -9, 9);
          while (p % d === 0) p = nonzero(rng, -9, 9);
          const frac = reduce(p, d);
          let s = randInt(rng, -6, 6);
          while (s * frac.d === frac.n) s = randInt(rng, -6, 6);
          const expr = quadratic(d, -(d * s + p), p * s, variable);
          return problem(
            `${expr} = 0`,
            [`${parenLinear(d, -p, variable)}${parenLinear(1, -s, variable)} = 0`],
            rootsAns(variable, texFrac(frac.n, frac.d), s),
            expr,
          );
        },

        // (a x - p)(b x - q) = 0, two fractional roots
        () => {
          const a = pick(rng, [2, 3, 4]);
          const b = pick(rng, [2, 3, 4]);
          let p = nonzero(rng, 1, 9);
          while (p % a === 0) p = nonzero(rng, 1, 9);
          let q = nonzero(rng, 1, 9);
          while (q % b === 0 || p * b === q * a) q = nonzero(rng, 1, 9);
          const r1 = reduce(p, a);
          const r2 = reduce(q, b);
          const A = a * b;
          const B = -(a * q + b * p);
          const C = p * q;
          const expr = quadratic(A, B, C, variable);
          return problem(
            `${expr} = 0`,
            [`${parenLinear(a, -p, variable)}${parenLinear(b, -q, variable)} = 0`],
            rootsAns(
              variable,
              texFrac(r1.n, r1.d),
              texFrac(r2.n, r2.d),
            ),
            expr,
          );
        },

        // (x - h)^2 ≥ k^2
        () => {
          const h = randInt(rng, -4, 4);
          const k = randInt(rng, 2, 6);
          return problem(
            `${square(variable, h)} \\ge ${k * k}`,
            [],
            outsideAns(variable, "\\le", h - k, "\\ge", h + k),
            expanded(1, h - k, h + k, variable),
          );
        },

        // a < 0, P ≤ 0 → outside closed
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = -randInt(rng, 1, 4);
          const expr = expanded(a, r, s, variable);
          const rel = quadRel(a, false, true);
          return problem(
            `${expr} ${rel} 0`,
            [`${factored(a, r, s, variable)} ${rel} 0`],
            outsideAns(variable, "\\le", r, "\\ge", s),
            expr,
          );
        },

        // complete the square: x^2 - 2 h x = k^2 - h^2
        () => {
          const h = nonzero(rng, -5, 5);
          const k = randInt(rng, 1, 6);
          const lhs = quadratic(1, -2 * h, 0, variable);
          return problem(
            `${lhs} = ${k * k - h * h}`,
            [
              `${square(variable, h)} = ${k * k}`,
              `${parenLinear(1, -h, variable)} = \\pm ${k}`,
            ],
            rootsAns(variable, h - k, h + k),
            expanded(1, h - k, h + k, variable),
          );
        },

        // expanded a > 0, > 0 outside
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = randInt(rng, 2, 5);
          const expr = expanded(a, r, s, variable);
          return problem(
            `${expr} > 0`,
            [`${factored(a, r, s, variable)} > 0`],
            outsideAns(variable, "<", r, ">", s),
            expr,
          );
        },

        // (x - r)^2 ≤ 0 → x = r
        () => {
          const r = nonzero(rng, -6, 6);
          return problem(
            `${square(variable, r)} \\le 0`,
            [],
            `${variable} = ${r}`,
            expanded(1, r, r, variable),
          );
        },

        // (x - r)^2 < 0 → empty
        () => {
          const r = randInt(rng, -6, 6);
          return problem(
            `${square(variable, r)} < 0`,
            [],
            "\\emptyset",
            expanded(1, r, r, variable),
          );
        },

        // a (x - r)(x - s) ≥ 0
        () => {
          const [r, s] = twoRoots(rng, -5, 5);
          const a = pick(rng, [2, 3, 4, -2, -3]);
          const rel = quadRel(a, a < 0, true);
          const ans =
            a > 0
              ? outsideAns(variable, "\\le", r, "\\ge", s)
              : betweenAns(r, "\\le", variable, "\\le", s);
          return problem(
            `${factored(a, r, s, variable)} ${rel} 0`,
            [],
            ans,
            expanded(a, r, s, variable),
          );
        },

        // (d x - p)(x - s) < 0, interval with a fraction
        () => {
          const d = pick(rng, [2, 3, 4, 5]);
          let p = nonzero(rng, -9, 9);
          while (p % d === 0) p = nonzero(rng, -9, 9);
          const frac = reduce(p, d);
          let s = randInt(rng, -6, 6);
          while (s * frac.d === frac.n) s = randInt(rng, -6, 6);
          const expr = quadratic(d, -(d * s + p), p * s, variable);
          const fracVal = frac.n / frac.d;
          const loIsFrac = fracVal < s;
          const lo = loIsFrac ? texFrac(frac.n, frac.d) : s;
          const hi = loIsFrac ? s : texFrac(frac.n, frac.d);
          return problem(
            `${expr} < 0`,
            [`${parenLinear(d, -p, variable)}${parenLinear(1, -s, variable)} < 0`],
            betweenAns(lo, "<", variable, "<", hi),
            expr,
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
