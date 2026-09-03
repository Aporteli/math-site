import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  linear,
  reduce,
  selectVariable,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function dfrac(num: string | number, den: string | number): string {
  return `\\dfrac{${num}}{${den}}`;
}

function den(variable: string, pole: number): string {
  return linear(1, -pole, variable);
}

function pickDistinct(
  rng: () => number,
  count: number,
  min: number,
  max: number,
  banned: readonly number[] = [],
): number[] {
  const xs: number[] = [];
  let guard = 0;
  while (xs.length < count && guard < 120) {
    guard += 1;
    const x = randInt(rng, min, max);
    if (!xs.includes(x) && !banned.includes(x)) xs.push(x);
  }
  return xs;
}

function eqAns(
  variable: string,
  sols: readonly (string | number)[],
): string {
  return sols.map((sol) => `${variable} = ${sol}`).join(",\\; ");
}

/** Sign of (x - zero)/(x - pole). */
function ratioSign(
  variable: string,
  zero: number,
  pole: number,
  wantPos: boolean,
  closed: boolean,
): string {
  const lo = Math.min(zero, pole);
  const hi = Math.max(zero, pole);
  const zeroIsLo = zero === lo;
  if (wantPos && !closed) {
    return `${variable} < ${lo} \\lor ${variable} > ${hi}`;
  }
  if (wantPos && closed) {
    return zeroIsLo
      ? `${variable} \\le ${lo} \\lor ${variable} > ${hi}`
      : `${variable} < ${lo} \\lor ${variable} \\ge ${hi}`;
  }
  if (!closed) {
    return `${lo} < ${variable} < ${hi}`;
  }
  return zeroIsLo
    ? `${lo} \\le ${variable} < ${hi}`
    : `${lo} < ${variable} \\le ${hi}`;
}

function startRel(
  end: number,
  zero: number,
  poles: readonly number[],
  closed: boolean,
): string {
  if (poles.includes(end)) return "<";
  if (end === zero && closed) return "\\le";
  return "<";
}

function rayGt(
  end: number,
  zero: number,
  poles: readonly number[],
  closed: boolean,
): string {
  if (poles.includes(end)) return ">";
  if (end === zero && closed) return "\\ge";
  return ">";
}

function rayLt(
  end: number,
  zero: number,
  poles: readonly number[],
  closed: boolean,
): string {
  if (poles.includes(end)) return "<";
  if (end === zero && closed) return "\\le";
  return "<";
}

/** Sign of (x - zero)/((x - p)(x - q)). */
function cubicRationalAns(
  variable: string,
  zero: number,
  pole1: number,
  pole2: number,
  wantPos: boolean,
  closed: boolean,
): string {
  const poles = [pole1, pole2];
  const pts = [zero, pole1, pole2].sort((a, b) => a - b);
  const a = pts[0]!;
  const b = pts[1]!;
  const c = pts[2]!;
  if (wantPos) {
    return `${a} ${startRel(a, zero, poles, closed)} ${variable} ${startRel(b, zero, poles, closed)} ${b} \\lor ${variable} ${rayGt(c, zero, poles, closed)} ${c}`;
  }
  return `${variable} ${rayLt(a, zero, poles, closed)} ${a} \\lor ${b} ${startRel(b, zero, poles, closed)} ${variable} ${startRel(c, zero, poles, closed)} ${c}`;
}

function doubleOverLinear(
  variable: string,
  doubleRoot: number,
  pole: number,
  strict: boolean,
): string {
  if (strict) {
    return doubleRoot < pole
      ? `${variable} > ${pole}`
      : `${pole} < ${variable} < ${doubleRoot} \\lor ${variable} > ${doubleRoot}`;
  }
  return doubleRoot < pole
    ? `${variable} = ${doubleRoot} \\lor ${variable} > ${pole}`
    : `${variable} > ${pole}`;
}

function problem(
  promptTex: string,
  steps: string[],
  answer: string,
): GeneratedProblem {
  return {
    instructionId: "solve" as const,
    promptTex,
    solutionTex: aligned([...steps, answer]),
  } as GeneratedProblem;
}

export const rationalEquationsInequalitiesProblem = defineAlgebraProblem(
  "rational-equations-inequalities",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // 1/x = 1/k
        () => {
          const k = nonzero(rng, -8, 8);
          return problem(
            `${dfrac(1, variable)} = ${dfrac(1, k)}`,
            [],
            `${variable} = ${k}`,
          );
        },

        // a/x = b
        () => {
          const t = nonzero(rng, -8, 8);
          const b = nonzero(rng, -6, 6);
          const a = t * b;
          return problem(
            `${dfrac(a, variable)} = ${b}`,
            [`${variable} \\ne 0`],
            `${variable} = ${t}`,
          );
        },

        // 1/(x - s) = 1/k
        () => {
          const s = randInt(rng, -6, 6);
          const k = nonzero(rng, -6, 6);
          return problem(
            `${dfrac(1, den(variable, s))} = ${dfrac(1, k)}`,
            [`${variable} \\ne ${s}`],
            `${variable} = ${s + k}`,
          );
        },

        // x/(x - s) = 0
        () => {
          const s = nonzero(rng, -8, 8);
          return problem(
            `${dfrac(variable, den(variable, s))} = 0`,
            [`${variable} \\ne ${s}`],
            `${variable} = 0`,
          );
        },

        // (x - r)/(x - s) = 0
        () => {
          const [r, s] = pickDistinct(rng, 2, -6, 6);
          return problem(
            `${dfrac(den(variable, r!), den(variable, s!))} = 0`,
            [`${variable} \\ne ${s}`],
            `${variable} = ${r}`,
          );
        },

        // k/x = 1
        () => {
          const k = nonzero(rng, -8, 8);
          return problem(
            `${dfrac(k, variable)} = 1`,
            [`${variable} \\ne 0`],
            `${variable} = ${k}`,
          );
        },

        // (x - r)/(x - s) = m, m ≠ 0, 1
        () => {
          const s = randInt(rng, -5, 5);
          let t = randInt(rng, -6, 6);
          while (t === s) t = randInt(rng, -6, 6);
          const m = pick(rng, [2, 3, 4, 5, -2, -3]);
          const r = t - m * (t - s);
          return problem(
            `${dfrac(den(variable, r), den(variable, s))} = ${m}`,
            [`${variable} \\ne ${s}`],
            `${variable} = ${t}`,
          );
        },

        // 1/x + 1/a = 0
        () => {
          const a = nonzero(rng, -8, 8);
          return problem(
            `${dfrac(1, variable)} + ${dfrac(1, a)} = 0`,
            [`${variable} \\ne 0`],
            `${variable} = ${-a}`,
          );
        },

        // a/(x - s) = b
        () => {
          const s = randInt(rng, -6, 6);
          const b = nonzero(rng, -6, 6);
          let t = randInt(rng, -6, 6);
          while (t === s) t = randInt(rng, -7, 7);
          const a = b * (t - s);
          return problem(
            `${dfrac(a, den(variable, s))} = ${b}`,
            [`${variable} \\ne ${s}`],
            `${variable} = ${t}`,
          );
        },

        // (x - r)/(x - s) > 0
        () => {
          const [r, s] = pickDistinct(rng, 2, -6, 6);
          return problem(
            `${dfrac(den(variable, r!), den(variable, s!))} > 0`,
            [`${variable} \\ne ${s}`],
            ratioSign(variable, r!, s!, true, false),
          );
        },

        // 1/x > 0
        () => {
          return problem(
            `${dfrac(1, variable)} > 0`,
            [`${variable} \\ne 0`],
            `${variable} > 0`,
          );
        },

        // 1/x < 0
        () => {
          return problem(
            `${dfrac(1, variable)} < 0`,
            [`${variable} \\ne 0`],
            `${variable} < 0`,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // 1/(x - s) + 1/(x - u) = 0
        () => {
          const s = randInt(rng, -6, 4);
          const u = s + 2 * nonzero(rng, 1, 4);
          return problem(
            `${dfrac(1, den(variable, s))} + ${dfrac(1, den(variable, u))} = 0`,
            [`${variable} \\ne ${s},\\; ${variable} \\ne ${u}`],
            `${variable} = ${(s + u) / 2}`,
          );
        },

        // A/(x - s) + B/(x - u) = 0
        () => {
          const [s, u, t] = pickDistinct(rng, 3, -6, 6);
          const A = t! - s!;
          const B = u! - t!;
          return problem(
            `${dfrac(A, den(variable, s!))} + ${dfrac(B, den(variable, u!))} = 0`,
            [`${variable} \\ne ${s},\\; ${variable} \\ne ${u}`],
            `${variable} = ${t}`,
          );
        },

        // (x - r)/(x - s) = k
        () => {
          const s = randInt(rng, -5, 5);
          let t = randInt(rng, -6, 6);
          while (t === s) t = randInt(rng, -6, 6);
          const k = pick(rng, [2, 3, 4, -2, -3, -4]);
          const r = t - k * (t - s);
          return problem(
            `${dfrac(den(variable, r), den(variable, s))} = ${k}`,
            [`${variable} \\ne ${s}`],
            `${variable} = ${t}`,
          );
        },

        // (x - r)/(x - s) < 0
        () => {
          const [r, s] = pickDistinct(rng, 2, -6, 6);
          return problem(
            `${dfrac(den(variable, r!), den(variable, s!))} < 0`,
            [`${variable} \\ne ${s}`],
            ratioSign(variable, r!, s!, false, false),
          );
        },

        // (x - r)/(x - s) ≥ 0
        () => {
          const [r, s] = pickDistinct(rng, 2, -6, 6);
          return problem(
            `${dfrac(den(variable, r!), den(variable, s!))} \\ge 0`,
            [`${variable} \\ne ${s}`],
            ratioSign(variable, r!, s!, true, true),
          );
        },

        // x = a + b/x
        () => {
          const [t1, t2] = pickDistinct(rng, 2, -6, 6, [0]);
          const a = t1! + t2!;
          const prod = t1! * t2!;
          const rhs =
            prod >= 0
              ? `${a} - ${dfrac(prod, variable)}`
              : `${a} + ${dfrac(-prod, variable)}`;
          return problem(
            `${variable} = ${rhs}`,
            [`${variable} \\ne 0`],
            eqAns(variable, [t1!, t2!].sort((x, y) => x - y)),
          );
        },

        // a/x + b = c/x
        () => {
          const t = nonzero(rng, -7, 7);
          const a = nonzero(rng, -6, 6);
          const b = nonzero(rng, -6, 6);
          const c = a + b * t;
          return problem(
            `${dfrac(a, variable)} + ${b} = ${dfrac(c, variable)}`,
            [`${variable} \\ne 0`],
            `${variable} = ${t}`,
          );
        },

        // (ax + b)/(x - s) = k
        () => {
          const s = randInt(rng, -5, 5);
          let t = randInt(rng, -6, 6);
          while (t === s) t = randInt(rng, -6, 6);
          const k = nonzero(rng, -5, 5);
          let coef = nonzero(rng, -5, 5);
          while (coef === k) coef = nonzero(rng, -5, 5);
          const b = k * (t - s) - coef * t;
          return problem(
            `${dfrac(linear(coef, b, variable), den(variable, s))} = ${k}`,
            [`${variable} \\ne ${s}`],
            `${variable} = ${t}`,
          );
        },

        // 1/x > 1/k, k > 0 → 0 < x < k
        () => {
          const k = randInt(rng, 2, 8);
          return problem(
            `${dfrac(1, variable)} > ${dfrac(1, k)}`,
            [`${variable} \\ne 0`],
            `0 < ${variable} < ${k}`,
          );
        },

        // (x^2 - k^2)/x = 0
        () => {
          const k = randInt(rng, 2, 8);
          return problem(
            `${dfrac(`${variable}^{2} - ${k * k}`, variable)} = 0`,
            [`${variable} \\ne 0`],
            eqAns(variable, [-k, k]),
          );
        },

        // (x - r)/((x - s)(x - t)) = 0
        () => {
          const [r, s, t] = pickDistinct(rng, 3, -6, 6);
          return problem(
            `${dfrac(den(variable, r!), `${den(variable, s!)}${den(variable, t!)}`)} = 0`,
            [`${variable} \\ne ${s},\\; ${variable} \\ne ${t}`],
            `${variable} = ${r}`,
          );
        },

        // (x - r)/(x - s) ≤ 0
        () => {
          const [r, s] = pickDistinct(rng, 2, -6, 6);
          return problem(
            `${dfrac(den(variable, r!), den(variable, s!))} \\le 0`,
            [`${variable} \\ne ${s}`],
            ratioSign(variable, r!, s!, false, true),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // A/(x - s) + B/(x - u) = 1, two integer roots
        () => {
          const s = randInt(rng, -5, 4);
          const u = s + 1;
          const t1 = s + pick(rng, [2, 3, 4]);
          let t2 = s - pick(rng, [1, 2, 3]);
          while (t2 === s || t2 === u || t2 === t1) t2 -= 1;
          const A = (t1 - s) * (t2 - s);
          let B = t1 + t2 - 2 * s - 1 - A;
          if (B === 0) {
            t2 -= 1;
            B = t1 + t2 - 2 * s - 1 - (t1 - s) * (t2 - s);
          }
          const lead = (t1 - s) * (t2 - s);
          return problem(
            `${dfrac(lead, den(variable, s))} + ${dfrac(B, den(variable, u))} = 1`,
            [`${variable} \\ne ${s},\\; ${variable} \\ne ${u}`],
            eqAns(variable, [t1, t2].sort((x, y) => x - y)),
          );
        },

        // (x - r)/((x - s)(x - t)) > 0
        () => {
          const [r, s, t] = pickDistinct(rng, 3, -5, 5);
          return problem(
            `${dfrac(den(variable, r!), `${den(variable, s!)}${den(variable, t!)}`)} > 0`,
            [`${variable} \\ne ${s},\\; ${variable} \\ne ${t}`],
            cubicRationalAns(variable, r!, s!, t!, true, false),
          );
        },

        // (x - r)/((x - s)(x - t)) ≤ 0
        () => {
          const [r, s, t] = pickDistinct(rng, 3, -5, 5);
          return problem(
            `${dfrac(den(variable, r!), `${den(variable, s!)}${den(variable, t!)}`)} \\le 0`,
            [`${variable} \\ne ${s},\\; ${variable} \\ne ${t}`],
            cubicRationalAns(variable, r!, s!, t!, false, true),
          );
        },

        // (x - r)^2 / (x - s) > 0
        () => {
          const [r, s] = pickDistinct(rng, 2, -5, 6);
          return problem(
            `${dfrac(`(${den(variable, r!)})^{2}`, den(variable, s!))} > 0`,
            [`${variable} \\ne ${s}`],
            doubleOverLinear(variable, r!, s!, true),
          );
        },

        // A/(x - s) = B, fractional x
        () => {
          const s = randInt(rng, -5, 5);
          const B = nonzero(rng, 2, 5);
          let A = nonzero(rng, -9, 9);
          while (A % B === 0) A = nonzero(rng, -9, 9);
          const shift = reduce(A, B);
          const ans = reduce(s * shift.d + shift.n, shift.d);
          return problem(
            `${dfrac(A, den(variable, s))} = ${B}`,
            [`${variable} \\ne ${s}`],
            `${variable} = ${texFrac(ans.n, ans.d)}`,
          );
        },

        // (x - r)/(x - s) > 1
        () => {
          const [r, s] = pickDistinct(rng, 2, -6, 6);
          const pos = s - r > 0;
          const ans = pos ? `${variable} > ${s}` : `${variable} < ${s}`;
          return problem(
            `${dfrac(den(variable, r!), den(variable, s!))} > 1`,
            [`${variable} \\ne ${s}`],
            ans,
          );
        },

        // (ax + b)/(x - s) rel k  →  (x - r)/(x - s) rel 0
        () => {
          const [r, s] = pickDistinct(rng, 2, -5, 6);
          const k = nonzero(rng, -4, 4);
          const wantPos = rng() < 0.5;
          const closed = rng() < 0.5;
          const rel = wantPos ? (closed ? "\\ge" : ">") : closed ? "\\le" : "<";
          const num = linear(1 + k, -(r! + k * s!), variable);
          return problem(
            `${dfrac(num, den(variable, s!))} ${rel} ${k}`,
            [
              `${dfrac(den(variable, r!), den(variable, s!))} ${rel} 0`,
            ],
            ratioSign(variable, r!, s!, wantPos, closed),
          );
        },

        // x/(x - a) + a/(x - a) = b
        () => {
          const a = nonzero(rng, -6, 6);
          const t = a + 2;
          const b = a + 1;
          return problem(
            `${dfrac(variable, den(variable, a))} + ${dfrac(a, den(variable, a))} = ${b}`,
            [`${variable} \\ne ${a}`],
            `${variable} = ${t}`,
          );
        },

        // (x - r)/(x - s) < 1
        () => {
          const [r, s] = pickDistinct(rng, 2, -6, 6);
          const pos = s! - r! > 0;
          const ans = pos ? `${variable} < ${s}` : `${variable} > ${s}`;
          return problem(
            `${dfrac(den(variable, r!), den(variable, s!))} < 1`,
            [`${variable} \\ne ${s}`],
            ans,
          );
        },

        // (ax + b)/(x - s) = (ax + d)/(x - u)
        () => {
          const [s, u, t] = pickDistinct(rng, 3, -5, 6);
          const coef = nonzero(rng, 1, 5);
          const b = t! - s! - coef * t!;
          const d = t! - u! - coef * t!;
          return problem(
            `${dfrac(linear(coef, b, variable), den(variable, s!))} = ${dfrac(linear(coef, d, variable), den(variable, u!))}`,
            [`${variable} \\ne ${s},\\; ${variable} \\ne ${u}`],
            `${variable} = ${t}`,
          );
        },

        // 1/x < 1/k, k > 0 → x < 0 ∨ x > k
        () => {
          const k = randInt(rng, 2, 8);
          return problem(
            `${dfrac(1, variable)} < ${dfrac(1, k)}`,
            [`${variable} \\ne 0`],
            `${variable} < 0 \\lor ${variable} > ${k}`,
          );
        },

        // (x - r)^2 / (x - s) ≥ 0
        () => {
          const [r, s] = pickDistinct(rng, 2, -5, 6);
          return problem(
            `${dfrac(`(${den(variable, r!)})^{2}`, den(variable, s!))} \\ge 0`,
            [`${variable} \\ne ${s}`],
            doubleOverLinear(variable, r!, s!, false),
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
