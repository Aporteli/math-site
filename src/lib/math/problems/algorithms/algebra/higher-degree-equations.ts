import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  linear,
  parenLinear,
  polyTex,
  quadratic,
  selectVariable,
  signed,
  texFrac,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function fromRoots(lead: number, roots: readonly number[]): number[] {
  let coeffs = [lead];
  for (const root of roots) {
    const next = Array.from({ length: coeffs.length + 1 }, () => 0);
    for (let i = 0; i < coeffs.length; i += 1) {
      next[i]! += coeffs[i]!;
      next[i + 1]! -= root * coeffs[i]!;
    }
    coeffs = next;
  }
  return coeffs;
}

function expanded(
  lead: number,
  roots: readonly number[],
  variable: string,
): string {
  return polyTex(variable, fromRoots(lead, roots));
}

function factored(
  lead: number,
  roots: readonly number[],
  variable: string,
): string {
  const counts = new Map<number, number>();
  const order: number[] = [];
  for (const root of roots) {
    if (!counts.has(root)) order.push(root);
    counts.set(root, (counts.get(root) ?? 0) + 1);
  }
  const body = order
    .map((root) => {
      const mult = counts.get(root)!;
      const lin = parenLinear(1, -root, variable);
      return mult === 1 ? lin : `${lin}^{${mult}}`;
    })
    .join("");
  if (lead === 1) return body;
  if (lead === -1) return `-${body}`;
  return `${lead}${body}`;
}

function distinctRoots(
  rng: () => number,
  count: number,
  min = -4,
  max = 5,
): number[] {
  const xs: number[] = [];
  while (xs.length < count) {
    const x = randInt(rng, min, max);
    if (!xs.includes(x)) xs.push(x);
  }
  return xs.sort((a, b) => a - b);
}

function rootsAns(
  variable: string,
  roots: readonly (string | number)[],
): string {
  return roots.map((root) => `${variable} = ${root}`).join(",\\; ");
}

function cubicSignAns(
  variable: string,
  r: string | number,
  s: string | number,
  t: string | number,
  negative: boolean,
  closed: boolean,
): string {
  const lt = closed ? "\\le" : "<";
  const gt = closed ? "\\ge" : ">";
  if (negative) {
    return `${variable} ${lt} ${r} \\lor ${s} ${lt} ${variable} ${lt} ${t}`;
  }
  return `${r} ${lt} ${variable} ${lt} ${s} \\lor ${variable} ${gt} ${t}`;
}

function quarticSignAns(
  variable: string,
  r: string | number,
  s: string | number,
  t: string | number,
  u: string | number,
  negative: boolean,
  closed: boolean,
): string {
  const lt = closed ? "\\le" : "<";
  const gt = closed ? "\\ge" : ">";
  if (negative) {
    return `${r} ${lt} ${variable} ${lt} ${s} \\lor ${t} ${lt} ${variable} ${lt} ${u}`;
  }
  return `${variable} ${lt} ${r} \\lor ${s} ${lt} ${variable} ${lt} ${t} \\lor ${variable} ${gt} ${u}`;
}

/** P = (x - d)^2 (x - s), lead 1. */
function doubleSimpleIneq(
  variable: string,
  doubleRoot: number,
  simple: number,
  rel: "<" | "\\le" | ">" | "\\ge",
): string {
  const d = doubleRoot;
  const s = simple;
  if (rel === "<") {
    return d < s
      ? `${variable} < ${d} \\lor ${d} < ${variable} < ${s}`
      : `${variable} < ${s}`;
  }
  if (rel === "\\le") {
    return d < s
      ? `${variable} \\le ${s}`
      : `${variable} \\le ${s} \\lor ${variable} = ${d}`;
  }
  if (rel === ">") {
    return d < s
      ? `${variable} > ${s}`
      : `${s} < ${variable} < ${d} \\lor ${variable} > ${d}`;
  }
  return d < s
    ? `${variable} = ${d} \\lor ${variable} \\ge ${s}`
    : `${variable} \\ge ${s}`;
}

function problem(
  promptTex: string,
  steps: string[],
  answer: string,
  graphExpr = "",
  instructionId: GeneratedProblem["instructionId"] = "solve",
): GeneratedProblem {
  return {
    instructionId,
    promptTex,
    solutionTex: aligned([...steps, answer]),
    graphExpr,
  } as GeneratedProblem;
}

function num(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}

function vietaCubic(r: number, s: number, t: number): {
  A: number;
  B: number;
  C: number;
  coeffs: number[];
} {
  const A = r + s + t;
  const B = r * s + s * t + t * r;
  const C = r * s * t;
  return { A, B, C, coeffs: [1, -A, B, -C] };
}

export const higherDegreeEquationsInequalitiesProblem = defineAlgebraProblem(
  "higher-degree-equations-inequalities",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // x^3 = k^3
        () => {
          const k = nonzero(rng, 2, 6);
          return problem(
            `${variable}^{3} = ${k * k * k}`,
            [],
            `${variable} = ${k}`,
            `${variable}^{3} - ${k * k * k}`,
          );
        },

        // x^3 - k^3 = 0
        () => {
          const k = nonzero(rng, 2, 6);
          const expr = `${variable}^{3} - ${k * k * k}`;
          return problem(
            `${expr} = 0`,
            [
              `${parenLinear(1, -k, variable)}(${variable}^{2} + ${k}${variable} + ${k * k}) = 0`,
            ],
            `${variable} = ${k}`,
            expr,
          );
        },

        // (x - r)(x - s)(x - t) = 0
        () => {
          const roots = distinctRoots(rng, 3);
          return problem(
            `${factored(1, roots, variable)} = 0`,
            [],
            rootsAns(variable, roots),
            expanded(1, roots, variable),
          );
        },

        // x(x - r)(x - s) = 0
        () => {
          const pos = distinctRoots(rng, 2, 1, 6);
          const r = pos[0]!;
          const s = rng() < 0.5 ? pos[1]! : -pos[1]!;
          const roots = [0, r, s];
          return problem(
            `${variable}${parenLinear(1, -r, variable)}${parenLinear(1, -s, variable)} = 0`,
            [],
            rootsAns(variable, roots),
            expanded(1, roots, variable),
          );
        },

        // (x - r)^3 = 0
        () => {
          const r = nonzero(rng, -6, 6);
          const roots = [r, r, r];
          return problem(
            `${factored(1, roots, variable)} = 0`,
            [],
            `${variable} = ${r}`,
            expanded(1, roots, variable),
          );
        },

        // x^3 > 0
        () => {
          return problem(
            `${variable}^{3} > 0`,
            [],
            `${variable} > 0`,
            `${variable}^{3}`,
          );
        },

        // x^3 < k^3
        () => {
          const k = nonzero(rng, -5, 5);
          return problem(
            `${variable}^{3} < ${k * k * k}`,
            [],
            `${variable} < ${k}`,
            `${variable}^{3} - ${k * k * k}`,
          );
        },

        // x^3 ≥ k^3
        () => {
          const k = nonzero(rng, -5, 5);
          return problem(
            `${variable}^{3} \\ge ${k * k * k}`,
            [],
            `${variable} \\ge ${k}`,
            `${variable}^{3} - ${k * k * k}`,
          );
        },

        // (x - r)^3 > 0
        () => {
          const r = randInt(rng, -5, 5);
          return problem(
            `${factored(1, [r, r, r], variable)} > 0`,
            [],
            `${variable} > ${r}`,
            expanded(1, [r, r, r], variable),
          );
        },

        // (x^2 - k^2)(x - r) = 0
        () => {
          const k = randInt(rng, 2, 6);
          let r = randInt(rng, -5, 6);
          while (r === k || r === -k) r = randInt(rng, -5, 6);
          const roots = [-k, k, r].sort((a, b) => a - b);
          return problem(
            `(${variable}^{2} - ${k * k})${parenLinear(1, -r, variable)} = 0`,
            [],
            rootsAns(variable, roots),
            expanded(1, [-k, k, r], variable),
          );
        },

        // x^2 (x - r) = 0
        () => {
          const r = nonzero(rng, -7, 7);
          return problem(
            `${variable}^{2}${parenLinear(1, -r, variable)} = 0`,
            [],
            rootsAns(variable, [0, r]),
            expanded(1, [0, 0, r], variable),
          );
        },

        // x^3 + a x^2 = 0
        () => {
          const a = nonzero(rng, -7, 7);
          const r = -a;
          const expr = expanded(1, [0, 0, r], variable);
          return problem(
            `${expr} = 0`,
            [`${variable}^{2}${parenLinear(1, -r, variable)} = 0`],
            rootsAns(variable, [0, r]),
            expr,
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // expanded cubic = 0
        () => {
          const roots = distinctRoots(rng, 3);
          const expr = expanded(1, roots, variable);
          return problem(
            `${expr} = 0`,
            [`${factored(1, roots, variable)} = 0`],
            rootsAns(variable, roots),
            expr,
          );
        },

        // (x - r)^2 (x - s) = 0
        () => {
          const [d, s] = distinctRoots(rng, 2, -5, 5);
          const roots = [d!, d!, s!];
          return problem(
            `${factored(1, roots, variable)} = 0`,
            [],
            rootsAns(variable, [d!, s!]),
            expanded(1, roots, variable),
          );
        },

        // factored cubic < 0
        () => {
          const [r, s, t] = distinctRoots(rng, 3);
          return problem(
            `${factored(1, [r!, s!, t!], variable)} < 0`,
            [],
            cubicSignAns(variable, r!, s!, t!, true, false),
            expanded(1, [r!, s!, t!], variable),
          );
        },

        // factored cubic > 0
        () => {
          const [r, s, t] = distinctRoots(rng, 3);
          return problem(
            `${factored(1, [r!, s!, t!], variable)} > 0`,
            [],
            cubicSignAns(variable, r!, s!, t!, false, false),
            expanded(1, [r!, s!, t!], variable),
          );
        },

        // expanded cubic inequality
        () => {
          const [r, s, t] = distinctRoots(rng, 3, -4, 4);
          const wantNeg = rng() < 0.5;
          const closed = rng() < 0.5;
          const rel = wantNeg ? (closed ? "\\le" : "<") : closed ? "\\ge" : ">";
          const expr = expanded(1, [r!, s!, t!], variable);
          return problem(
            `${expr} ${rel} 0`,
            [`${factored(1, [r!, s!, t!], variable)} ${rel} 0`],
            cubicSignAns(variable, r!, s!, t!, wantNeg, closed),
            expr,
          );
        },

        // quartic factored = 0
        () => {
          const roots = distinctRoots(rng, 4, -4, 5);
          return problem(
            `${factored(1, roots, variable)} = 0`,
            [],
            rootsAns(variable, roots),
            expanded(1, roots, variable),
          );
        },

        // (x^2 - k^2)(x^2 - m^2) = 0
        () => {
          const k = randInt(rng, 1, 4);
          let m = randInt(rng, 1, 5);
          while (m === k) m = randInt(rng, 1, 5);
          const roots = [-m, -k, k, m].sort((a, b) => a - b);
          return problem(
            `(${variable}^{2} - ${k * k})(${variable}^{2} - ${m * m}) = 0`,
            [],
            rootsAns(variable, roots),
            expanded(1, [-k, k, -m, m], variable),
          );
        },

        // x(x - r)(x - s) < 0 with roots s < 0 < r
        () => {
          const pos = distinctRoots(rng, 2, 1, 6);
          const r = pos[0]!;
          const s = -pos[1]!;
          const sorted = [s, 0, r];
          return problem(
            `${variable}${parenLinear(1, -r, variable)}${parenLinear(1, -s, variable)} < 0`,
            [],
            cubicSignAns(
              variable,
              sorted[0]!,
              sorted[1]!,
              sorted[2]!,
              true,
              false,
            ),
            expanded(1, [0, r, s], variable),
          );
        },

        // scaled cubic = 0
        () => {
          const roots = distinctRoots(rng, 3, -4, 4);
          const a = randInt(rng, 2, 4);
          const expr = expanded(a, roots, variable);
          return problem(
            `${expr} = 0`,
            [`${factored(a, roots, variable)} = 0`],
            rootsAns(variable, roots),
            expr,
          );
        },

        // x^3 = k^2 x
        () => {
          const k = randInt(rng, 2, 6);
          const expr = `${variable}^{3} - ${k * k}${variable}`;
          return problem(
            `${variable}^{3} = ${k * k}${variable}`,
            [`${variable}(${variable}^{2} - ${k * k}) = 0`],
            rootsAns(variable, [-k, 0, k]),
            expr,
          );
        },

        // quartic factored < 0
        () => {
          const [r, s, t, u] = distinctRoots(rng, 4, -4, 5);
          return problem(
            `${factored(1, [r!, s!, t!, u!], variable)} < 0`,
            [],
            quarticSignAns(variable, r!, s!, t!, u!, true, false),
            expanded(1, [r!, s!, t!, u!], variable),
          );
        },

        // cubic ≤ 0 factored
        () => {
          const [r, s, t] = distinctRoots(rng, 3);
          return problem(
            `${factored(1, [r!, s!, t!], variable)} \\le 0`,
            [],
            cubicSignAns(variable, r!, s!, t!, true, true),
            expanded(1, [r!, s!, t!], variable),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // cubic roots in AP via Vieta
        () => {
          const mid = randInt(rng, -3, 5);
          const d = randInt(rng, 2, 4);
          const r = mid - d;
          const t = mid + d;
          const { A, B, coeffs } = vietaCubic(r, mid, t);
          const expr = polyTex(variable, coeffs);
          return problem(
            `${expr} = 0,\\; x_{1} < x_{2} < x_{3},\\; 2x_{2} = x_{1} + x_{3},\\; x_{3} - x_{1}`,
            [
              `x_{1}+x_{2}+x_{3} = ${A},\\; 2x_{2} = x_{1}+x_{3}`,
              `3x_{2} = ${A} \\implies x_{2} = ${mid}`,
              `x_{1} = ${mid}-\\delta,\\; x_{3} = ${mid}+\\delta,\\; \\delta > 0`,
              `x_{1}x_{2}+x_{2}x_{3}+x_{3}x_{1} = ${B}`,
              `3\\cdot ${mid * mid} - \\delta^{2} = ${B} \\implies \\delta^{2} = ${d * d}`,
              `\\delta = ${d},\\; x_{3}-x_{1} = 2\\delta = ${2 * d}`,
            ],
            `x_{3}-x_{1} = ${2 * d}`,
            expr,
            "evaluate",
          );
        },

        // cubic roots in GP via Vieta
        () => {
          const q = pick(rng, [2, 3, -2]);
          const a0 = q === 3 ? 1 : pick(rng, [1, 2]);
          const r = a0;
          const mid = a0 * q;
          const t = a0 * q * q;
          const { A, C, coeffs } = vietaCubic(r, mid, t);
          const expr = polyTex(variable, coeffs);
          const sumOthers = A - mid;
          const prodOthers = C / mid;
          const ordered = [r, mid, t].sort((a, b) => a - b);
          return problem(
            `${expr} = 0,\\; x_{2}^{2} = x_{1} x_{3},\\; x_{1} x_{2} x_{3} \\ne 0`,
            [
              `x_{1}+x_{2}+x_{3} = ${A},\\; x_{1}x_{2}x_{3} = ${C}`,
              `x_{2}^{2} = x_{1}x_{3} \\implies x_{2}^{3} = ${C}`,
              `x_{2} = ${mid}`,
              `x_{1}+x_{3} = ${sumOthers},\\; x_{1}x_{3} = ${prodOthers}`,
              `${quadratic(1, -sumOthers, prodOthers, "u")} = 0`,
              `u = ${r},\\; u = ${t}`,
            ],
            rootsAns(variable, ordered),
            expr,
          );
        },

        // ∑ x_i³ by Newton / Vieta (do not solve)
        () => {
          const roots = distinctRoots(rng, 3, -4, 5);
          const r = roots[0]!;
          const s = roots[1]!;
          const t = roots[2]!;
          const { A, B, C, coeffs } = vietaCubic(r, s, t);
          const p3 = r ** 3 + s ** 3 + t ** 3;
          const expr = polyTex(variable, coeffs);
          return problem(
            `${expr} = 0,\\; x_{1}^{3} + x_{2}^{3} + x_{3}^{3}`,
            [
              `e_{1} = ${A},\\; e_{2} = ${B},\\; e_{3} = ${C}`,
              `p_{1} = e_{1} = ${A}`,
              `p_{2} = e_{1}^{2} - 2e_{2} = ${A * A} ${signed(-2 * B)} = ${A * A - 2 * B}`,
              `p_{3} = e_{1} p_{2} - e_{2} p_{1} + 3e_{3}`,
              `p_{3} = ${A}\\cdot ${num(A * A - 2 * B)} ${signed(-B)}\\cdot ${num(A)} ${signed(3 * C)} = ${p3}`,
            ],
            `${p3}`,
            expr,
            "evaluate",
          );
        },

        // ∑ 1/x_i² by Vieta
        () => {
          let r = nonzero(rng, -5, 5);
          let s = nonzero(rng, -5, 5);
          let t = nonzero(rng, -5, 5);
          while (s === r) s = nonzero(rng, -5, 5);
          while (t === r || t === s) t = nonzero(rng, -5, 5);
          const { A, B, C, coeffs } = vietaCubic(r, s, t);
          const numer = B * B - 2 * A * C;
          const den = C * C;
          const expr = polyTex(variable, coeffs);
          return problem(
            `${expr} = 0,\\; x_{i} \\ne 0,\\; \\dfrac{1}{x_{1}^{2}} + \\dfrac{1}{x_{2}^{2}} + \\dfrac{1}{x_{3}^{2}}`,
            [
              `e_{1} = ${A},\\; e_{2} = ${B},\\; e_{3} = ${C}`,
              `\\sum \\dfrac{1}{x_{i}} = \\dfrac{e_{2}}{e_{3}} = ${texFrac(B, C)}`,
              `\\sum_{i < j} \\dfrac{1}{x_{i} x_{j}} = \\dfrac{e_{1}}{e_{3}} = ${texFrac(A, C)}`,
              `\\sum \\dfrac{1}{x_{i}^{2}} = \\left(\\sum \\dfrac{1}{x_{i}}\\right)^{2} - 2\\sum_{i<j}\\dfrac{1}{x_{i}x_{j}}`,
              `= ${texFrac(numer, den)}`,
            ],
            texFrac(numer, den),
            expr,
            "evaluate",
          );
        },

        // two-parameter factor theorem: f(r)=f(s)=0
        () => {
          const r = pick(rng, [-2, -1, 1, 2, 3]);
          let s = pick(rng, [-3, -2, -1, 1, 2, 3, 4]);
          while (s === r) s = pick(rng, [-3, -1, 2, 4]);
          let t = nonzero(rng, -5, 5);
          while (t === r || t === s) t = nonzero(rng, -5, 5);
          const C = -r * s * t;
          const k = -(r + s + t);
          const m = r * s + s * t + t * r;
          const fTex = `${variable}^{3} + k${variable}^{2} + m${variable} ${signed(C)}`;
          return problem(
            `f(${variable}) = ${fTex},\\; f(${r}) = 0,\\; f(${s}) = 0,\\; k,\\; m,\\; f(${variable})=0`,
            [
              `${num(r)}^{3} + k\\cdot ${num(r)}^{2} + m\\cdot ${num(r)} ${signed(C)} = 0`,
              `${num(s)}^{3} + k\\cdot ${num(s)}^{2} + m\\cdot ${num(s)} ${signed(C)} = 0`,
              `k = ${k},\\; m = ${m}`,
              `x_{3} = \\dfrac{${-C}}{${num(r)}\\cdot ${num(s)}} = ${t}`,
              `${parenLinear(1, -r, variable)}${parenLinear(1, -s, variable)}${parenLinear(1, -t, variable)} = 0`,
            ],
            `k = ${k},\\; m = ${m},\\; ${rootsAns(variable, [r, s, t].sort((a, b) => a - b))}`,
            `${variable}^{3} ${signed(k)}${variable}^{2} ${signed(m)}${variable} ${signed(C)}`,
          );
        },

        // remainder on division by x² − 1 is linear ax + b
        () => {
          const A = randInt(rng, -4, 4);
          const B = randInt(rng, -5, 5);
          const C = randInt(rng, -4, 4);
          const coeffs = [1, A, B, C];
          const expr = polyTex(variable, coeffs);
          const p1 = 1 + A + B + C;
          const pm1 = -1 + A - B + C;
          const a = (p1 - pm1) / 2;
          const b = (p1 + pm1) / 2;
          return problem(
            `(${expr}) \\div (${variable}^{2} - 1),\\; R(${variable}) = a${variable} + b`,
            [
              `${variable}^{2}-1 = (${variable}-1)(${variable}+1)`,
              `f(${variable}) = (${variable}^{2}-1)q(${variable}) + a${variable} + b`,
              `f(1) = a+b = ${p1},\\; f(-1) = -a+b = ${pm1}`,
              `a = ${a},\\; b = ${b}`,
            ],
            `R(${variable}) = ${linear(a, b, variable)}`,
            expr,
            "evaluate",
          );
        },

        // (x − r) is a factor; determine k, then all roots
        () => {
          const r = nonzero(rng, -4, 4);
          let s = nonzero(rng, -5, 5);
          let t = nonzero(rng, -5, 5);
          while (s === r) s = nonzero(rng, -5, 5);
          while (t === r || t === s) t = nonzero(rng, -5, 5);
          const B = r * s + s * t + t * r;
          const C = -r * s * t;
          const k = -(r + s + t);
          const kRhs = -(r * r * r) - B * r - C;
          const fTex = `${variable}^{3} + k${variable}^{2} ${signed(B)}${variable} ${signed(C)}`;
          const qp = -(s + t);
          const qq = s * t;
          return problem(
            `f(${variable}) = ${fTex},\\; f(${r}) = 0,\\; k,\\; f(${variable})=0`,
            [
              `${num(r)}^{3} + k\\cdot ${num(r)}^{2} ${signed(B * r)} ${signed(C)} = 0`,
              `k \\cdot ${r * r} = ${kRhs} \\implies k = ${k}`,
              `f(${variable}) = (${variable} ${signed(-r)})(${quadratic(1, qp, qq, variable)})`,
              `${quadratic(1, qp, qq, variable)} = 0 \\implies ${variable} = ${s},\\; ${variable} = ${t}`,
            ],
            `k = ${k},\\; ${rootsAns(variable, [r, s, t].sort((a, b) => a - b))}`,
            `${variable}^{3} ${signed(k)}${variable}^{2} ${signed(B)}${variable} ${signed(C)}`,
          );
        },

        // repeated root in the family x³ + k x² + k x + 1
        () => {
          const fTex = `${variable}^{3} + k${variable}^{2} + k${variable} + 1`;
          return problem(
            `f(${variable}) = ${fTex},\\; f(\\alpha)=f'(\\alpha)=0,\\; k,\\; \\alpha`,
            [
              `f(-1) = -1 + k - k + 1 = 0`,
              `f(${variable}) = (${variable}+1)(${variable}^{2} + (k-1)${variable} + 1)`,
              `(k-1)^{2} - 4 = 0 \\implies k-1 = \\pm 2`,
              `k = 3 \\implies (${variable}+1)^{3} = 0,\\; \\alpha = -1`,
              `k = -1 \\implies (${variable}+1)(${variable}-1)^{2} = 0,\\; \\alpha = 1`,
            ],
            `k = -1:\\; \\alpha = 1,\\; k = 3:\\; \\alpha = -1`,
            "",
          );
        },

        // quartic roots in AP, palindromic (sum = 0)
        () => {
          const d = pick(rng, [1, 2]);
          const roots = [-3 * d, -d, d, 3 * d];
          const expr = expanded(1, roots, variable);
          const pair = -10 * d * d;
          const prod = 9 * d ** 4;
          return problem(
            `${expr} = 0,\\; x_{1} < x_{2} < x_{3} < x_{4},\\; 2x_{2} = x_{1}+x_{3},\\; 2x_{3} = x_{2}+x_{4}`,
            [
              `x_{1}+x_{2}+x_{3}+x_{4} = 0 \\implies x_{1} = -x_{4},\\; x_{2} = -x_{3}`,
              `2x_{2} = x_{1}+x_{3},\\; 2x_{3} = x_{2}+x_{4} \\implies x_{2}-x_{1} = x_{3}-x_{2} = x_{4}-x_{3} = 2\\delta`,
              `x_{1} = -3\\delta,\\; x_{2} = -\\delta,\\; x_{3} = \\delta,\\; x_{4} = 3\\delta`,
              `\\sum_{i<j} x_{i}x_{j} = ${pair} = -10\\delta^{2} \\implies \\delta^{2} = ${d * d}`,
              `\\delta = ${d},\\; x_{1}x_{2}x_{3}x_{4} = ${prod}`,
            ],
            rootsAns(variable, roots),
            expr,
          );
        },

        // ∑ x_i² for a cubic, Vieta only
        () => {
          const roots = distinctRoots(rng, 3, -4, 5);
          const r = roots[0]!;
          const s = roots[1]!;
          const t = roots[2]!;
          const { A, B, coeffs } = vietaCubic(r, s, t);
          const p2 = A * A - 2 * B;
          const expr = polyTex(variable, coeffs);
          return problem(
            `${expr} = 0,\\; x_{1}^{2} + x_{2}^{2} + x_{3}^{2}`,
            [
              `e_{1} = ${A},\\; e_{2} = ${B}`,
              `\\sum x_{i}^{2} = e_{1}^{2} - 2e_{2} = ${A * A} ${signed(-2 * B)} = ${p2}`,
            ],
            `${p2}`,
            expr,
            "evaluate",
          );
        },

        // (x2+x3)(x3+x1)(x1+x2) = e1 e2 − e3
        () => {
          let r = 0;
          let s = 1;
          let t = 2;
          let A = 0;
          let B = 0;
          let C = 0;
          let coeffs = [1, 0, 0, 0];
          let val = 0;
          for (let i = 0; i < 24 && val === 0; i += 1) {
            const roots = distinctRoots(rng, 3, -4, 5);
            r = roots[0]!;
            s = roots[1]!;
            t = roots[2]!;
            ({ A, B, C, coeffs } = vietaCubic(r, s, t));
            val = A * B - C;
          }
          if (val === 0) {
            ({ A, B, C, coeffs } = vietaCubic(1, 2, 4));
            val = A * B - C;
          }
          const expr = polyTex(variable, coeffs);
          return problem(
            `${expr} = 0,\\; (x_{1}+x_{2})(x_{2}+x_{3})(x_{3}+x_{1})`,
            [
              `x_{1}+x_{2} = e_{1}-x_{3},\\; e_{1} = ${A},\\; e_{2} = ${B},\\; e_{3} = ${C}`,
              `(e_{1}-x_{1})(e_{1}-x_{2})(e_{1}-x_{3}) = e_{1} e_{2} - e_{3}`,
              `= ${A}\\cdot ${num(B)} ${signed(-C)} = ${val}`,
            ],
            `${val}`,
            expr,
            "evaluate",
          );
        },

        // ∑_{i≠j} x_i² x_j  and / or remainder+k combined: use e1 e2 − 3 e3
        () => {
          let r = nonzero(rng, -5, 5);
          let s = nonzero(rng, -5, 5);
          let t = nonzero(rng, -5, 5);
          while (s === r) s = nonzero(rng, -5, 5);
          while (t === r || t === s) t = nonzero(rng, -5, 5);
          const { A, B, C, coeffs } = vietaCubic(r, s, t);
          const val = A * B - 3 * C;
          const expr = polyTex(variable, coeffs);
          return problem(
            `${expr} = 0,\\; \\sum_{i \\ne j} x_{i}^{2} x_{j}`,
            [
              `\\sum_{i \\ne j} x_{i}^{2} x_{j} = \\sum_{i} x_{i}^{2}(e_{1}-x_{i}) = e_{1}\\sum x_{i}^{2} - \\sum x_{i}^{3}`,
              `= e_{1}(e_{1}^{2}-2e_{2}) - (e_{1}^{3}-3e_{1}e_{2}+3e_{3})`,
              `= e_{1} e_{2} - 3e_{3} = ${A}\\cdot ${num(B)} - 3\\cdot ${num(C)} = ${val}`,
            ],
            `${val}`,
            expr,
            "evaluate",
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
