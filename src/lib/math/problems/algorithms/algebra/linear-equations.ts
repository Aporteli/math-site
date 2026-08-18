import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  flipIneq,
  ineq,
  linear,
  reduce,
  selectVariable,
  signed,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

type Rel = "<" | ">" | "\\le" | "\\ge";

function kTimes(k: number, inner: string): string {
  if (k === 1) return `(${inner})`;
  if (k === -1) return `-(${inner})`;
  return `${k}(${inner})`;
}

function plusTimes(k: number, inner: string): string {
  return k < 0 ? `- ${kTimes(-k, inner)}` : `+ ${kTimes(k, inner)}`;
}

function eqProblem(
  promptTex: string,
  steps: string[],
  variable: string,
  answer: string | number,
): GeneratedProblem {
  return {
    instructionId: "solve" as const,
    promptTex,
    solutionTex: aligned([...steps, `${variable} = ${answer}`]),
  } as GeneratedProblem;
}

function ineqProblem(
  promptTex: string,
  steps: string[],
  variable: string,
  rel: string,
  answer: string | number,
): GeneratedProblem {
  return {
    instructionId: "solve" as const,
    promptTex,
    solutionTex: aligned([...steps, `${variable} ${rel} ${answer}`]),
  } as GeneratedProblem;
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

function num(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}

function dfrac(numerator: string | number, denominator: string | number): string {
  return `\\dfrac{${numerator}}{${denominator}}`;
}

function plusK(q: number): string {
  if (q === 1) return "+ k";
  if (q === -1) return "- k";
  return q > 0 ? `+ ${q}k` : `- ${-q}k`;
}

function kNum(coeff: number): string {
  if (coeff === 1) return "k";
  if (coeff === -1) return "-k";
  return `${coeff}k`;
}

function intSet(variable: string, values: readonly number[]): string {
  return `${variable} \\in \\{ ${values.join(",\\; ")} \\}`;
}

function integersBetween(
  lo: number,
  leftOpen: boolean,
  hi: number,
  rightOpen: boolean,
): number[] {
  const start = leftOpen ? lo + 1 : lo;
  const end = rightOpen ? hi - 1 : hi;
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

export const linearEquationsInequalitiesProblem = defineAlgebraProblem(
  "linear-equations-inequalities",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // x + a = b
        () => {
          const s = randInt(rng, -8, 8);
          const a = nonzero(rng, -9, 9);
          const b = s + a;
          return eqProblem(
            `${linear(1, a, variable)} = ${b}`,
            [],
            variable,
            s,
          );
        },

        // x - a = b
        () => {
          const s = randInt(rng, -8, 8);
          const a = randInt(rng, 1, 9);
          const b = s - a;
          return eqProblem(
            `${linear(1, -a, variable)} = ${b}`,
            [],
            variable,
            s,
          );
        },

        // ax = b
        () => {
          const s = nonzero(rng, -8, 8);
          const a = nonzero(rng, 2, 9);
          return eqProblem(
            `${linear(a, 0, variable)} = ${a * s}`,
            [`${variable} = ${a * s} \\div ${a}`],
            variable,
            s,
          );
        },

        // x/k = n
        () => {
          const n = nonzero(rng, -8, 8);
          const k = randInt(rng, 2, 8);
          return eqProblem(
            `\\dfrac{${variable}}{${k}} = ${n}`,
            [`${variable} = ${n} \\cdot ${k}`],
            variable,
            n * k,
          );
        },

        // ax + b = c
        () => {
          const s = randInt(rng, -8, 8);
          const a = randInt(rng, 2, 8);
          const b = nonzero(rng, -9, 9);
          const c = a * s + b;
          return eqProblem(
            `${linear(a, b, variable)} = ${c}`,
            [`${linear(a, 0, variable)} = ${c - b}`],
            variable,
            s,
          );
        },

        // ax - b = c
        () => {
          const s = randInt(rng, -8, 8);
          const a = randInt(rng, 2, 8);
          const b = randInt(rng, 1, 9);
          const c = a * s - b;
          return eqProblem(
            `${linear(a, -b, variable)} = ${c}`,
            [`${linear(a, 0, variable)} = ${c + b}`],
            variable,
            s,
          );
        },

        // x + a  rel  b
        () => {
          const s = randInt(rng, -8, 8);
          const a = nonzero(rng, -9, 9);
          const rel = ineq(rng) as Rel;
          return ineqProblem(
            `${linear(1, a, variable)} ${rel} ${s + a}`,
            [],
            variable,
            rel,
            s,
          );
        },

        // ax  rel  b, a > 0
        () => {
          const s = nonzero(rng, -7, 7);
          const a = randInt(rng, 2, 8);
          const rel = ineq(rng) as Rel;
          return ineqProblem(
            `${linear(a, 0, variable)} ${rel} ${a * s}`,
            [],
            variable,
            rel,
            s,
          );
        },

        // a - x = b
        () => {
          const s = randInt(rng, -8, 8);
          const a = nonzero(rng, -9, 9);
          return eqProblem(
            `${a} - ${variable} = ${a - s}`,
            [`-${variable} = ${-s}`],
            variable,
            s,
          );
        },

        // (x + a)/k = n
        () => {
          const n = nonzero(rng, -6, 6);
          const k = randInt(rng, 2, 6);
          const a = nonzero(rng, -8, 8);
          const s = k * n - a;
          return eqProblem(
            `\\dfrac{${linear(1, a, variable)}}{${k}} = ${n}`,
            [`${linear(1, a, variable)} = ${k * n}`],
            variable,
            s,
          );
        },

        // ax + b  rel  c, a > 0
        () => {
          const s = randInt(rng, -7, 7);
          const a = randInt(rng, 2, 7);
          const b = nonzero(rng, -8, 8);
          const rel = ineq(rng) as Rel;
          return ineqProblem(
            `${linear(a, b, variable)} ${rel} ${a * s + b}`,
            [`${linear(a, 0, variable)} ${rel} ${a * s}`],
            variable,
            rel,
            s,
          );
        },

        // k - ax = b
        () => {
          const s = nonzero(rng, -6, 6);
          const a = randInt(rng, 2, 7);
          const k = nonzero(rng, -9, 9);
          return eqProblem(
            `${k} - ${linear(a, 0, variable)} = ${k - a * s}`,
            [`-${linear(a, 0, variable)} = ${-a * s}`],
            variable,
            s,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // ax + b = cx + d
        () => {
          const s = randInt(rng, -8, 8);
          const a = nonzero(rng, -7, 7);
          let c = nonzero(rng, -7, 7);
          if (c === a) c = a + (a > 0 ? 1 : -1);
          const b = nonzero(rng, -8, 8);
          const d = a * s + b - c * s;
          return eqProblem(
            `${linear(a, b, variable)} = ${linear(c, d, variable)}`,
            [`${linear(a - c, 0, variable)} = ${d - b}`],
            variable,
            s,
          );
        },

        // a(x + b) = c
        () => {
          const s = randInt(rng, -7, 7);
          const a = nonzero(rng, 2, 7);
          const b = nonzero(rng, -8, 8);
          const c = a * (s + b);
          return eqProblem(
            `${kTimes(a, linear(1, b, variable))} = ${c}`,
            [`${linear(1, b, variable)} = ${s + b}`],
            variable,
            s,
          );
        },

        // ax + b  rel  cx + d
        () => {
          const s = randInt(rng, -7, 7);
          const a = nonzero(rng, -6, 6);
          let c = nonzero(rng, -6, 6);
          if (c === a) c = a + (a > 0 ? 1 : -1);
          const b = nonzero(rng, -7, 7);
          const d = a * s + b - c * s;
          const rel = ineq(rng) as Rel;
          const out = a - c > 0 ? rel : flipIneq(rel);
          return ineqProblem(
            `${linear(a, b, variable)} ${rel} ${linear(c, d, variable)}`,
            [`${linear(a - c, 0, variable)} ${rel} ${d - b}`],
            variable,
            out,
            s,
          );
        },

        // -ax + b = c
        () => {
          const s = randInt(rng, -8, 8);
          const a = randInt(rng, 2, 8);
          const b = nonzero(rng, -9, 9);
          return eqProblem(
            `${linear(-a, b, variable)} = ${-a * s + b}`,
            [`${linear(-a, 0, variable)} = ${-a * s}`],
            variable,
            s,
          );
        },

        // a(x + b) = c(x + d), a = c k, k ≠ 1
        () => {
          const s = randInt(rng, -6, 6);
          const c = nonzero(rng, 2, 5);
          const k = pick(rng, [2, 3, -2]);
          const a = c * k;
          const b = nonzero(rng, -6, 6);
          const d = k * (s + b) - s;
          return eqProblem(
            `${kTimes(a, linear(1, b, variable))} = ${kTimes(c, linear(1, d, variable))}`,
            [`${linear(a, a * b, variable)} = ${linear(c, c * d, variable)}`],
            variable,
            s,
          );
        },

        // ax + b  rel  c, a < 0 (flip)
        () => {
          const s = randInt(rng, -7, 7);
          const a = -randInt(rng, 2, 8);
          const b = nonzero(rng, -8, 8);
          const rel = ineq(rng) as Rel;
          return ineqProblem(
            `${linear(a, b, variable)} ${rel} ${a * s + b}`,
            [`${linear(a, 0, variable)} ${rel} ${a * s}`],
            variable,
            flipIneq(rel),
            s,
          );
        },

        // p - bx = c
        () => {
          const s = randInt(rng, -7, 7);
          const b = randInt(rng, 2, 8);
          const p = nonzero(rng, -9, 9);
          return eqProblem(
            `${p} - ${linear(b, 0, variable)} = ${p - b * s}`,
            [`-${linear(b, 0, variable)} = ${-b * s}`],
            variable,
            s,
          );
        },

        // a(x - b) + c = d
        () => {
          const s = randInt(rng, -7, 7);
          const a = nonzero(rng, 2, 7);
          const b = nonzero(rng, -6, 6);
          const c = nonzero(rng, -8, 8);
          const d = a * (s - b) + c;
          return eqProblem(
            `${kTimes(a, linear(1, -b, variable))} ${signed(c)} = ${d}`,
            [`${kTimes(a, linear(1, -b, variable))} = ${d - c}`],
            variable,
            s,
          );
        },

        // ax - b = c - dx
        () => {
          const s = randInt(rng, -7, 7);
          const a = nonzero(rng, 2, 7);
          const d = nonzero(rng, 1, 6);
          const b = randInt(rng, 1, 8);
          const c = a * s - b + d * s;
          return eqProblem(
            `${linear(a, -b, variable)} = ${c} - ${linear(d, 0, variable)}`,
            [`${linear(a + d, 0, variable)} = ${c + b}`],
            variable,
            s,
          );
        },

        // -a(x + b) = c
        () => {
          const s = randInt(rng, -6, 6);
          const a = randInt(rng, 2, 6);
          const b = nonzero(rng, -6, 6);
          const c = -a * (s + b);
          return eqProblem(
            `${kTimes(-a, linear(1, b, variable))} = ${c}`,
            [`${linear(1, b, variable)} = ${s + b}`],
            variable,
            s,
          );
        },

        // a(x + b)  rel  c, a > 0
        () => {
          const s = randInt(rng, -6, 6);
          const a = randInt(rng, 2, 6);
          const b = nonzero(rng, -6, 6);
          const rel = ineq(rng) as Rel;
          return ineqProblem(
            `${kTimes(a, linear(1, b, variable))} ${rel} ${a * (s + b)}`,
            [`${linear(1, b, variable)} ${rel} ${s + b}`],
            variable,
            rel,
            s,
          );
        },

        // a(x + b)  rel  c, a < 0 (flip)
        () => {
          const s = randInt(rng, -6, 6);
          const a = -randInt(rng, 2, 6);
          const b = nonzero(rng, -6, 6);
          const rel = ineq(rng) as Rel;
          return ineqProblem(
            `${kTimes(a, linear(1, b, variable))} ${rel} ${a * (s + b)}`,
            [`${linear(1, b, variable)} ${flipIneq(rel)} ${s + b}`],
            variable,
            flipIneq(rel),
            s,
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // linear-fractional equality whose x² terms cancel, with domain check
        () => {
          const s = randInt(rng, -5, 7);
          let P = nonzero(rng, -5, 5);
          let Q = nonzero(rng, -5, 5);
          let guard = 0;
          while ((Q === P || s === -P || s === -Q) && guard < 40) {
            P = nonzero(rng, -5, 5);
            Q = nonzero(rng, -5, 5);
            guard += 1;
          }
          const m = pick(rng, [3, 4]);
          const A = m * (s + P) - 2 * s;
          const B = m * (s + Q) - 2 * s;
          const left = dfrac(linear(2, A, variable), linear(1, P, variable));
          const right = dfrac(linear(2, B, variable), linear(1, Q, variable));
          return problem(
            `${left} = ${right}`,
            [
              `${variable} \\ne ${-P},\\; ${variable} \\ne ${-Q}`,
              `(${linear(2, A, variable)})(${linear(1, Q, variable)}) = (${linear(2, B, variable)})(${linear(1, P, variable)})`,
              `${linear(2 * Q + A, A * Q, variable)} = ${linear(2 * P + B, B * P, variable)}`,
              `${linear(2 * Q + A - (2 * P + B), A * Q - B * P, variable)} = 0`,
              `${variable} = ${s},\\; ${s} \\ne ${-P},\\; ${s} \\ne ${-Q}`,
            ],
            `${variable} = ${s}`,
          );
        },

        // parameter k: unique solution vs empty (never identity)
        () => {
          const c = pick(rng, [2, 3, 4]);
          const p = nonzero(rng, -4, 5);
          let q = nonzero(rng, -4, 5);
          while (q === p) q = nonzero(rng, -4, 5);
          const rhs = `${linear(c, 0, variable)} ${plusK(q)}`;
          const numCoeff = q - p;
          const xExpr = dfrac(kNum(numCoeff), linear(1, -c, "k"));
          return problem(
            `k(${linear(1, p, variable)}) = ${rhs}`,
            [
              `k${variable} ${plusK(p)} = ${linear(c, 0, variable)} ${plusK(q)}`,
              `${variable}(k-${c}) = ${kNum(numCoeff)}`,
              `k = ${c} \\implies 0 = ${c * numCoeff} \\ne 0 \\implies \\varnothing`,
            ],
            `k \\ne ${c} \\implies ${variable} = ${xExpr},\\; k = ${c} \\implies \\varnothing`,
          );
        },

        // double inequality with negative x-coefficient (two flips)
        () => {
          const xLo = randInt(rng, -4, 1);
          const xHi = xLo + 2 * randInt(rng, 2, 3);
          const gamma = pick(rng, [3, 5]);
          const delta = 2;
          const L = randInt(rng, -4, 4);
          const beta = gamma * xHi + delta * L;
          const R = (beta - gamma * xLo) / delta;
          const patternA = rng() < 0.5;
          const frac = dfrac(linear(-gamma, beta, variable), delta);
          const promptIneq = patternA
            ? `${L} \\le ${frac} < ${R}`
            : `${L} < ${frac} \\le ${R}`;
          const ans = patternA
            ? `${xLo} < ${variable} \\le ${xHi}`
            : `${xLo} \\le ${variable} < ${xHi}`;
          const boundL = patternA ? beta - delta * L : beta - delta * R;
          const boundR = patternA ? beta - delta * R : beta - delta * L;
          return problem(
            promptIneq,
            [
              patternA
                ? `${delta * L} \\le ${linear(-gamma, beta, variable)} < ${delta * R}`
                : `${delta * L} < ${linear(-gamma, beta, variable)} \\le ${delta * R}`,
              patternA
                ? `${boundL} \\ge ${linear(gamma, 0, variable)} > ${boundR}`
                : `${beta - delta * L} > ${linear(gamma, 0, variable)} \\ge ${beta - delta * R}`,
              `\\div ${gamma} > 0`,
            ],
            ans,
          );
        },

        // system of two linear inequalities → intersection
        () => {
          const lo = randInt(rng, -4, 2);
          const hi = lo + randInt(rng, 3, 7);
          const p = nonzero(rng, -6, 6);
          const q = p + 2 * lo;
          const r = nonzero(rng, -6, 8);
          const t = r - 3 * hi;
          const ineqA = `${linear(3, p, variable)} > ${linear(1, q, variable)}`;
          const ineqB = `${linear(-2, r, variable)} \\ge ${linear(1, t, variable)}`;
          const ans = `${lo} < ${variable} \\le ${hi}`;
          return problem(
            `\\begin{cases} ${ineqA} \\\\ ${ineqB} \\end{cases}`,
            [
              `${linear(2, p - q, variable)} > 0 \\implies ${variable} > ${lo}`,
              `${linear(-3, r - t, variable)} \\ge 0 \\implies ${variable} \\le ${hi}`,
              `(${variable} > ${lo}) \\cap (${variable} \\le ${hi})`,
            ],
            ans,
          );
        },

        // 1/x + 1/m = 1/n  (rearrange / LCD)
        () => {
          const n = pick(rng, [4, 6, 8, 9, 10]);
          const divs = [1, 2, 3, 4, 5, 6].filter((d) => n % d === 0);
          const d = pick(rng, divs);
          const x = n + d;
          const m = n + (n * n) / d;
          return problem(
            `${dfrac(1, variable)} + ${dfrac(1, m)} = ${dfrac(1, n)}`,
            [
              `${variable} \\ne 0`,
              `${dfrac(1, variable)} = ${dfrac(1, n)} - ${dfrac(1, m)} = ${texFrac(m - n, n * m)}`,
            ],
            `${variable} = ${x}`,
          );
        },

        // three-term LCD equation
        () => {
          const s = randInt(rng, -5, 6);
          const p = nonzero(rng, -5, 5);
          const q = nonzero(rng, -5, 5);
          const t = nonzero(rng, -4, 4);
          const r = 4 * s + 3 * p + 2 * q - 6 * t;
          return problem(
            `${dfrac(linear(1, p, variable), 2)} + ${dfrac(linear(1, q, variable), 3)} = ${dfrac(linear(1, r, variable), 6)} ${signed(t)}`,
            [
              `\\times 6:\\; 3(${linear(1, p, variable)}) + 2(${linear(1, q, variable)}) = (${linear(1, r, variable)}) ${signed(6 * t)}`,
              `${linear(5, 3 * p + 2 * q, variable)} - (${linear(1, r, variable)}) = ${6 * t}`,
              `${linear(4, 3 * p + 2 * q - r, variable)} = ${6 * t}`,
            ],
            `${variable} = ${s}`,
          );
        },

        // log equality + domain
        () => {
          const base = pick(rng, [2, 3, 5, 10]);
          const a = randInt(rng, 2, 5);
          let c = randInt(rng, 1, 5);
          if (c === a) c = a + 1;
          const p = randInt(rng, 1, 7);
          const s = randInt(rng, 1, 6);
          const arg = a * s + p;
          const qq = arg - c * s;
          const left = linear(a, p, variable);
          const right = linear(c, qq, variable);
          const log = (inner: string) => `\\log_{${base}}(${inner})`;
          const bound = texFrac(-p, a);
          return problem(
            `${log(left)} = ${log(right)}`,
            [
              `${left} > 0,\\; ${right} > 0`,
              `${left} = ${right}`,
              `${linear(a - c, p - qq, variable)} = 0`,
              `${variable} = ${s},\\; ${arg} > 0 \\implies ${variable} > ${bound}`,
            ],
            `${variable} = ${s}`,
          );
        },

        // exponential, rewrite to a common base (or contradiction)
        () => {
          const empty = rng() < 0.22;
          if (empty) {
            const m = randInt(rng, 0, 3);
            return problem(
              `9^{${linear(1, m, variable)}} = 3^{${linear(2, 2 * m + 1, variable)}}`,
              [
                `9 = 3^{2} \\implies 3^{${linear(2, 2 * m, variable)}} = 3^{${linear(2, 2 * m + 1, variable)}}`,
                `${linear(2, 2 * m, variable)} = ${linear(2, 2 * m + 1, variable)}`,
                `0 = 1`,
              ],
              `\\varnothing`,
            );
          }
          const form48 = rng() < 0.5;
          if (form48) {
            const nn = randInt(rng, 1, 2);
            const mm = randInt(rng, nn + 1, 4);
            const s = 2 * mm - 3 * nn;
            return problem(
              `4^{${linear(1, mm, variable)}} = 8^{${linear(1, nn, variable)}}`,
              [
                `4 = 2^{2},\\; 8 = 2^{3}`,
                `2^{${linear(2, 2 * mm, variable)}} = 2^{${linear(3, 3 * nn, variable)}}`,
                `${linear(2, 2 * mm, variable)} = ${linear(3, 3 * nn, variable)}`,
              ],
              `${variable} = ${s}`,
            );
          }
          const nn = randInt(rng, 1, 2);
          const mm = randInt(rng, 2, 4);
          const s = 2 * mm - 3 * nn;
          return problem(
            `9^{${linear(1, mm, variable)}} = 27^{${linear(1, nn, variable)}}`,
            [
              `9 = 3^{2},\\; 27 = 3^{3}`,
              `3^{${linear(2, 2 * mm, variable)}} = 3^{${linear(3, 3 * nn, variable)}}`,
              `${linear(2, 2 * mm, variable)} = ${linear(3, 3 * nn, variable)}`,
            ],
            `${variable} = ${s}`,
          );
        },

        // substitution u = 1/(x − p)
        () => {
          const pole = nonzero(rng, -5, 5);
          const b = pick(rng, [2, 3, 4, 5]);
          const gap = nonzero(rng, 1, 3);
          const a = nonzero(rng, 1, 6);
          let cc = b * gap - a;
          if (cc === 0) cc = b * (gap + (gap > 0 ? 1 : -1)) - a;
          const usedGap = (a + cc) / b;
          const s = pole + usedGap;
          return problem(
            `${dfrac(a, linear(1, -pole, variable))} = ${b} - ${dfrac(cc, linear(1, -pole, variable))}`,
            [
              `${variable} \\ne ${pole}`,
              `u := ${dfrac(1, linear(1, -pole, variable))}`,
              `${a}u = ${b} ${signed(-cc)}u`,
              `${num(a + cc)}u = ${b} \\implies u = ${texFrac(b, a + cc)}`,
              `${linear(1, -pole, variable)} = ${usedGap}`,
            ],
            `${variable} = ${s}`,
          );
        },

        // chain of equal ratios: find x and the common value
        () => {
          const lam = nonzero(rng, 2, 6);
          const s = randInt(rng, -5, 6);
          const beta = pick(rng, [2, 3, 4, 5]);
          let delta = pick(rng, [2, 3, 4, 5, 6]);
          if (delta === beta) delta = beta + 1;
          const alpha = lam * beta - s;
          const gamma = lam * delta - s;
          return problem(
            `${dfrac(linear(1, alpha, variable), beta)} = ${dfrac(linear(1, gamma, variable), delta)} = \\lambda`,
            [
              `${delta}(${linear(1, alpha, variable)}) = ${beta}(${linear(1, gamma, variable)})`,
              `${linear(delta, delta * alpha, variable)} = ${linear(beta, beta * gamma, variable)}`,
              `${linear(delta - beta, delta * alpha - beta * gamma, variable)} = 0`,
              `\\lambda = ${dfrac(`${num(s)} ${signed(alpha)}`, beta)} = ${lam}`,
            ],
            `${variable} = ${s},\\; \\lambda = ${lam}`,
          );
        },

        // (ax+b)/(cx+d) = p/q  with pole excluded
        () => {
          const s = randInt(rng, -6, 7);
          const c = nonzero(rng, 1, 4);
          let d = nonzero(rng, -6, 6);
          if (c * s + d === 0) d += 1;
          const denAt = c * s + d;
          const aa = nonzero(rng, 1, 5);
          let b = nonzero(rng, -6, 6);
          if (aa * d === b * c) b += c === 0 ? 1 : c;
          const numAt = aa * s + b;
          const ratio = reduce(numAt, denAt);
          const pole = reduce(-d, c);
          return problem(
            `${dfrac(linear(aa, b, variable), linear(c, d, variable))} = ${texFrac(ratio.n, ratio.d)}`,
            [
              `${variable} \\ne ${texFrac(pole.n, pole.d)}`,
              `${ratio.d}(${linear(aa, b, variable)}) = ${ratio.n}(${linear(c, d, variable)})`,
              `${linear(ratio.d * aa, ratio.d * b, variable)} = ${linear(ratio.n * c, ratio.n * d, variable)}`,
              `${linear(ratio.d * aa - ratio.n * c, ratio.d * b - ratio.n * d, variable)} = 0`,
            ],
            `${variable} = ${s}`,
          );
        },

        // integer solutions of a two-sided inequality with a flip
        () => {
          const xLo = randInt(rng, -5, 0);
          const xHi = xLo + 2 * randInt(rng, 2, 3);
          const gamma = pick(rng, [3, 5]);
          const delta = 2;
          const L = randInt(rng, -3, 3);
          const beta = gamma * xHi + delta * L;
          const R = (beta - gamma * xLo) / delta;
          const patternA = rng() < 0.5;
          const frac = dfrac(linear(-gamma, beta, variable), delta);
          const promptIneq = patternA
            ? `${L} \\le ${frac} < ${R}`
            : `${L} < ${frac} \\le ${R}`;
          const intervalAns = patternA
            ? `${xLo} < ${variable} \\le ${xHi}`
            : `${xLo} \\le ${variable} < ${xHi}`;
          const ints = integersBetween(xLo, patternA, xHi, !patternA);
          return problem(
            promptIneq,
            [
              patternA
                ? `${delta * L} \\le ${linear(-gamma, beta, variable)} < ${delta * R}`
                : `${delta * L} < ${linear(-gamma, beta, variable)} \\le ${delta * R}`,
              patternA
                ? `${delta * L - beta} \\le ${linear(-gamma, 0, variable)} < ${delta * R - beta}`
                : `${delta * L - beta} < ${linear(-gamma, 0, variable)} \\le ${delta * R - beta}`,
              `\\times \\left(-\\dfrac{1}{${gamma}}\\right)`,
              intervalAns,
              `${variable} \\in \\mathbb{Z}`,
            ],
            intSet(variable, ints),
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
