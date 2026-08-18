import { formatLinearTex, formatQuadraticTex } from "../../tex";
import type { ProblemDifficulty, ProblemYear } from "../../types";
import { gcd as rngGcd, nonzero, pick, randInt } from "../rng";
import type { GeneratedProblem, ProblemAlgorithm } from "../types";

// ============================================================================
// 1. ტიპები და კონსტანტები
// ============================================================================

export const UNKNOWN_LETTERS = [
  "x",
  "y",
  "z",
  "t",
  "n",
  "m",
  "a",
  "b",
] as const;

export type UnknownLetter = (typeof UNKNOWN_LETTERS)[number];

export interface Rational {
  n: number;
  d: number;
}

/** წილადური ან მთელი წევრის უნივერსალური სტრუქტურა: k * (a*variable + b) / d */
export interface FractionalLinearTerm {
  k?: number; // კოეფიციენტი ფრჩხილებს გარეთ (default: 1)
  a?: number; // ცვლადის კოეფიციენტი (default: 0)
  b?: number; // თავისუფალი წევრი (default: 0)
  d?: number; // მნიშვნელი (default: 1)
}

// ============================================================================
// 2. მათემატიკური და არითმეტიკული ჰელპერები
// ============================================================================

export const gcd = (a: number, b: number): number =>
  rngGcd ? rngGcd(a, b) : !b ? Math.abs(a) : gcd(b, a % b);

export const lcm = (a: number, b: number): number =>
  !a || !b ? 1 : Math.abs(a * b) / gcd(a, b);

export function reduce(n: number, d: number): Rational {
  if (d === 0) return { n: 0, d: 1 };
  const g = gcd(n, d);
  let num = n / g;
  let den = d / g;
  if (den < 0) {
    num = -num;
    den = -den;
  }
  return { n: num, d: den };
}

export function addRational(r1: Rational, r2: Rational): Rational {
  return reduce(r1.n * r2.d + r2.n * r1.d, r1.d * r2.d);
}

export function multRational(r1: Rational, r2: Rational): Rational {
  return reduce(r1.n * r2.n, r1.d * r2.d);
}

export function timesRational(a: number, unknown: Rational): number {
  return Math.round((a * unknown.n) / unknown.d);
}

// ============================================================================
// 3. რანდომიზაცია და სირთულის კონტროლი
// ============================================================================

export function isHard(difficulty: ProblemDifficulty): boolean {
  return difficulty === "hard" || difficulty === "olympiad";
}

export function selectVariable(
  rng: () => number,
  difficulty: ProblemDifficulty = "medium",
): UnknownLetter {
  if (difficulty === "easy") return pick(rng, ["x", "y"] as const);
  if (difficulty === "medium") return pick(rng, ["x", "y", "z", "t"] as const);
  return pick(rng, UNKNOWN_LETTERS);
}

export function otherVariable(variable: string): UnknownLetter {
  for (const letter of UNKNOWN_LETTERS) {
    if (letter !== variable) return letter;
  }
  return "x";
}

export function distinctNonzero(
  rng: () => number,
  min: number,
  max: number,
  banned: readonly number[] = [],
): number {
  let value = nonzero(rng, min, max);
  while (banned.includes(value)) value = nonzero(rng, min, max);
  return value;
}

export function negChance(difficulty: ProblemDifficulty): number {
  if (difficulty === "easy") return 0.15;
  if (difficulty === "medium") return 0.45;
  return 0.8;
}

export function leadCoef(
  rng: () => number,
  minAbs: number,
  maxAbs: number,
  difficulty: ProblemDifficulty,
): number {
  const multiplier = difficulty === "hard" ? 3 : difficulty === "medium" ? 1.5 : 1;
  const lo = difficulty === "hard" ? Math.max(minAbs, 3) : minAbs;
  const hi = Math.max(lo, Math.floor(maxAbs * multiplier));

  const mag = randInt(rng, lo, hi);
  return rng() < negChance(difficulty) ? -mag : mag;
}

export function randomUnknown(
  rng: () => number,
  difficulty: ProblemDifficulty,
): Rational {
  if (difficulty === "easy") {
    return { n: nonzero(rng, -8, 8), d: 1 };
  }
  if (difficulty === "medium") {
    if (rng() < 0.35) {
      const d = pick(rng, [2, 3, 4, 5]);
      let n = nonzero(rng, -15, 15);
      while (n % d === 0) n = nonzero(rng, -15, 15);
      return reduce(n, d);
    }
    return { n: nonzero(rng, -12, 12), d: 1 };
  }
  const d = pick(rng, [2, 3, 4, 5, 6, 7, 8, 9]);
  let n = nonzero(rng, -25, 25);
  while (n % d === 0) n = nonzero(rng, -25, 25);
  return reduce(n, d);
}

/** Leading coefficient so that `a * (n/d)` is an integer. */
export function leadForUnknown(
  rng: () => number,
  unknown: Rational,
  minAbs: number,
  maxAbs: number,
  difficulty: ProblemDifficulty,
): number {
  return leadCoef(rng, minAbs, maxAbs, difficulty) * unknown.d;
}

// ============================================================================
// 4. LaTeX და ტექსტის ფორმატირება
// ============================================================================

export function texFrac(n: number, d: number): string {
  const r = reduce(n, d);
  if (r.d === 1) return String(r.n);
  const sign = r.n < 0 ? "-" : "";
  return `${sign}\\dfrac{${Math.abs(r.n)}}{${r.d}}`;
}

export function texRational(value: Rational): string {
  return texFrac(value.n, value.d);
}

export function aligned(lines: string[]): string {
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0]!;
  return `\\begin{aligned} ${lines.join(" \\\\ ")} \\end{aligned}`;
}

export function signed(n: number): string {
  return n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`;
}

export function monomial(coef: number, body = ""): string {
  const abs = Math.abs(coef);
  if (body === "") return String(abs);
  if (abs === 1) return body;
  return `${abs}${body}`;
}

export interface PolyTerm {
  coef: number;
  body: string;
}

export function joinTerms(parts: readonly PolyTerm[]): string {
  const out: string[] = [];
  for (const part of parts) {
    if (part.coef === 0) continue;
    const piece = monomial(part.coef, part.body);
    if (out.length === 0) {
      out.push(part.coef < 0 ? `-${piece}` : piece);
    } else {
      out.push(part.coef < 0 ? `- ${piece}` : `+ ${piece}`);
    }
  }
  return out.join(" ") || "0";
}

export function parenTerms(parts: readonly PolyTerm[]): string {
  return `(${joinTerms(parts)})`;
}

/** Coefficients from highest degree down to the constant. */
export function polyTex(variable: string, coeffs: readonly number[]): string {
  const degree = coeffs.length - 1;
  return joinTerms(
    coeffs.map((coef, i) => {
      const power = degree - i;
      const body =
        power === 0
          ? ""
          : power === 1
            ? variable
            : `${variable}^{${power}}`;
      return { coef, body };
    }),
  );
}

export function linear(a: number, b: number, variable: string): string {
  return formatLinearTex(a, b, variable);
}

export function quadratic(a: number, b: number, c: number, variable: string): string {
  return formatQuadraticTex(a, b, c, variable);
}

export function parenLinear(a: number, b: number, variable: string): string {
  return `(${linear(a, b, variable)})`;
}

export function term(coef: number, variable: string): string {
  return formatLinearTex(coef, 0, variable);
}

export function ineq(rng: () => number) {
  return pick(rng, ["<", ">", "\\le", "\\ge"] as const);
}

export function flipIneq(symbol: string): string {
  switch (symbol) {
    case "<": return ">";
    case ">": return "<";
    case "\\le": return "\\ge";
    case "\\ge": return "\\le";
    default: return symbol;
  }
}

// ============================================================================
// 5. უნივერსალური წრფივი / LCD გენერატორი
// ============================================================================

export function termToTex(t: FractionalLinearTerm, variable: string): { isNeg: boolean; tex: string } {
  let k = t.k ?? 1;
  let a = t.a ?? 0;
  let b = t.b ?? 0;
  const d = t.d ?? 1;

  let isNeg = k < 0;
  k = Math.abs(k);

  if (a === 0 && b < 0) {
    isNeg = !isNeg;
    b = Math.abs(b);
  }

  let inner = "";
  if (a !== 0 && b !== 0) {
    inner = k !== 1 ? `${k}${parenLinear(a, b, variable)}` : linear(a, b, variable);
  } else if (a !== 0) {
    inner = term(k * a, variable);
  } else {
    inner = `${k * b}`;
  }

  const fraction = d === 1 ? inner : `\\dfrac{${inner}}{${d}}`;
  return { isNeg, tex: fraction };
}

export function sideToTex(terms: FractionalLinearTerm[], variable: string): string {
  return terms
    .map((t, i) => {
      const { isNeg, tex } = termToTex(t, variable);
      if (i === 0) return isNeg ? `-${tex}` : tex;
      return isNeg ? ` - ${tex}` : ` + ${tex}`;
    })
    .join("");
}

export function buildFractionLinearProblem(
  variable: string,
  solution: number,
  lhsTerms: FractionalLinearTerm[],
  rhsTerms?: FractionalLinearTerm[],
): GeneratedProblem {
  const allDens = [...lhsTerms, ...(rhsTerms || [])].map((t) => t.d ?? 1);
  const lcdVal = allDens.reduce((acc, d) => lcm(acc, d), 1);

  let promptTex = "";

  if (!rhsTerms || rhsTerms.length === 0) {
    const lhsNumSum = lhsTerms.reduce((sum, t) => {
      const mult = lcdVal / (t.d ?? 1);
      return sum + mult * (t.k ?? 1) * ((t.a ?? 0) * solution + (t.b ?? 0));
    }, 0);

    const rhs = reduce(lhsNumSum, lcdVal);
    promptTex = `${sideToTex(lhsTerms, variable)} = ${texRational(rhs)}`;
  } else {
    promptTex = `${sideToTex(lhsTerms, variable)} = ${sideToTex(rhsTerms, variable)}`;
  }

  return {
    instructionId: "solve",
    promptTex,
    solutionTex: aligned([
      `\\text{Multiply through by the LCD, } ${lcdVal}:`,
      `${variable} &= ${solution}`,
    ]),
  } as GeneratedProblem;
}

// ============================================================================
// 6. ალგორითმის რეგისტრაცია
// ============================================================================

export function defineAlgebraProblem(
  id: string,
  difficulties: readonly ProblemDifficulty[],
  years: readonly ProblemYear[],
  generate: ProblemAlgorithm["generate"],
): ProblemAlgorithm {
  return { id, topic: "algebra", difficulties, years, generate };
}