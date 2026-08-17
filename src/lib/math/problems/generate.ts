import { z } from "zod";
import {
  PROBLEM_DIFFICULTIES,
  PROBLEM_TOPICS,
  PROBLEM_YEARS,
  type BankProblem,
  type ProblemDifficulty,
  type ProblemTemplateId,
  type ProblemTopic,
  type ProblemYear,
} from "./types";
import {
  formatLinearTex,
  formatNumber,
  formatQuadraticTex,
} from "./tex";

export const generateProblemsSchema = z.object({
  topic: z.enum(PROBLEM_TOPICS),
  difficulty: z.enum(PROBLEM_DIFFICULTIES),
  year: z.enum(PROBLEM_YEARS),
  count: z.number().int().min(1).max(12),
  seed: z.number().int().optional(),
});

export type GenerateProblemsInput = z.infer<typeof generateProblemsSchema>;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

function nonzero(rng: () => number, min: number, max: number) {
  let n = 0;
  while (n === 0) n = randInt(rng, min, max);
  return n;
}

const PYTHAGOREAN_TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
] as const;

function templateFor(
  topic: ProblemTopic,
  difficulty: ProblemDifficulty,
): ProblemTemplateId {
  switch (topic) {
    case "algebra":
      if (difficulty === "easy") return "linear-one-step";
      if (difficulty === "medium") return "linear-two-step";
      return "linear-both-sides";
    case "equations":
      if (difficulty === "easy") return "linear-two-step";
      if (difficulty === "medium") return "quadratic-monic";
      return "quadratic-scaled";
    case "geometry":
      return difficulty === "easy" ? "pythagoras-hyp" : "pythagoras-leg";
    case "functions":
      return difficulty === "hard" ? "function-quadratic" : "function-linear";
    case "percent":
      if (difficulty === "easy") return "percent-of";
      if (difficulty === "medium") return "percent-whole";
      return "percent-increase";
    case "calculus":
      if (difficulty === "easy") return "derivative-power";
      if (difficulty === "medium") return "derivative-quadratic";
      return "derivative-at";
    case "vectors":
      return difficulty === "easy" ? "vector-magnitude" : "vector-dot";
  }
}

function buildProblem(
  templateId: ProblemTemplateId,
  rng: () => number,
  meta: {
    topic: ProblemTopic;
    difficulty: ProblemDifficulty;
    year: ProblemYear;
    seed: number;
  },
): BankProblem {
  const base = {
    templateId,
    topic: meta.topic,
    difficulty: meta.difficulty,
    year: meta.year,
    source: "generated" as const,
    seed: meta.seed,
    id: `gen-${templateId}-${meta.seed}`,
  };

  switch (templateId) {
    case "linear-one-step": {
      const a = nonzero(rng, 2, 9);
      const x = randInt(rng, -12, 12);
      if (rng() < 0.5) {
        const b = a * x;
        return {
          ...base,
          instructionId: "solve",
          promptTex: `${a}x = ${b}`,
          solutionTex: `x = ${x}`,
        };
      }
      const b = nonzero(rng, -15, 15);
      const c = x + b;
      return {
        ...base,
        instructionId: "solve",
        promptTex: `${formatLinearTex(1, b)} = ${c}`,
        solutionTex: `x = ${x}`,
      };
    }
    case "linear-two-step": {
      const a = nonzero(rng, 2, 8);
      const x = randInt(rng, -10, 10);
      const b = nonzero(rng, -12, 12);
      const c = a * x + b;
      return {
        ...base,
        instructionId: "solve",
        promptTex: `${formatLinearTex(a, b)} = ${c}`,
        solutionTex: `x = ${x}`,
      };
    }
    case "linear-both-sides": {
      const a = nonzero(rng, 2, 7);
      let c = nonzero(rng, 1, 6);
      if (a === c) c += 1;
      const x = randInt(rng, -8, 8);
      const b = randInt(rng, -10, 10);
      const d = a * x + b - c * x;
      return {
        ...base,
        instructionId: "solve",
        promptTex: `${formatLinearTex(a, b)} = ${formatLinearTex(c, d)}`,
        solutionTex: `x = ${x}`,
      };
    }
    case "quadratic-monic":
    case "quadratic-scaled": {
      const p = nonzero(rng, -6, 6);
      let q = nonzero(rng, -6, 6);
      if (p === q) q = p + (rng() < 0.5 ? 1 : -1);
      const scale = templateId === "quadratic-scaled" ? randInt(rng, 2, 4) : 1;
      const a = scale;
      const b = -scale * (p + q);
      const c = scale * p * q;
      return {
        ...base,
        instructionId: "solve",
        promptTex: `${formatQuadraticTex(a, b, c)} = 0`,
        solutionTex: `x = ${p},\\; x = ${q}`,
        graphExpr: formatQuadraticTex(a, b, c),
      };
    }
    case "percent-of": {
      const p = [10, 20, 25, 40, 50, 75][randInt(rng, 0, 5)]!;
      const n = randInt(rng, 2, 16) * (100 / gcd(p, 100));
      const value = (p / 100) * n;
      return {
        ...base,
        instructionId: "percentOf",
        promptTex: `${p}\\% \\cdot ${n}`,
        solutionTex: formatNumber(value),
      };
    }
    case "percent-whole": {
      const p = [10, 20, 25, 50][randInt(rng, 0, 3)]!;
      const whole = randInt(rng, 2, 12) * (100 / p);
      const part = (p / 100) * whole;
      return {
        ...base,
        instructionId: "percentOf",
        promptTex: `${formatNumber(part)} = ${p}\\% \\cdot x`,
        solutionTex: `x = ${formatNumber(whole)}`,
      };
    }
    case "percent-increase": {
      const p = [10, 20, 25, 50][randInt(rng, 0, 3)]!;
      const n = randInt(rng, 4, 20) * 10;
      const value = n * (1 + p / 100);
      return {
        ...base,
        instructionId: "evaluate",
        promptTex: `${n} + ${p}\\%`,
        solutionTex: formatNumber(value),
      };
    }
    case "pythagoras-hyp":
    case "pythagoras-leg": {
      const triple = PYTHAGOREAN_TRIPLES[randInt(rng, 0, PYTHAGOREAN_TRIPLES.length - 1)]!;
      const k = meta.difficulty === "hard" ? randInt(rng, 2, 4) : 1;
      const a = triple[0] * k;
      const b = triple[1] * k;
      const c = triple[2] * k;
      if (templateId === "pythagoras-hyp") {
        return {
          ...base,
          instructionId: "missingSide",
          promptTex: `a = ${a},\\; b = ${b},\\; c = ?`,
          solutionTex: `c = ${c}`,
        };
      }
      return {
        ...base,
        instructionId: "missingSide",
        promptTex: `a = ${a},\\; c = ${c},\\; b = ?`,
        solutionTex: `b = ${b}`,
      };
    }
    case "function-linear": {
      const a = nonzero(rng, -5, 5);
      const b = randInt(rng, -8, 8);
      const k = randInt(rng, -6, 6);
      const value = a * k + b;
      const expr = formatLinearTex(a, b);
      return {
        ...base,
        instructionId: "evaluate",
        promptTex: `f(x) = ${expr},\\; f(${k}) = ?`,
        solutionTex: `f(${k}) = ${value}`,
        graphExpr: expr,
      };
    }
    case "function-quadratic": {
      const a = nonzero(rng, -3, 3);
      const b = randInt(rng, -5, 5);
      const c = randInt(rng, -6, 6);
      const k = randInt(rng, -4, 4);
      const value = a * k * k + b * k + c;
      const expr = formatQuadraticTex(a, b, c);
      return {
        ...base,
        instructionId: "evaluate",
        promptTex: `f(x) = ${expr},\\; f(${k}) = ?`,
        solutionTex: `f(${k}) = ${value}`,
        graphExpr: expr,
      };
    }
    case "derivative-power": {
      const n = randInt(rng, 2, 6);
      const coef = nonzero(rng, 1, 7);
      const prompt =
        coef === 1 ? `f(x) = x^{${n}}` : `f(x) = ${coef}x^{${n}}`;
      const newCoef = coef * n;
      const newPow = n - 1;
      const solution =
        newPow === 1
          ? `f'(x) = ${newCoef}x`
          : newPow === 0
            ? `f'(x) = ${newCoef}`
            : `f'(x) = ${newCoef}x^{${newPow}}`;
      return {
        ...base,
        instructionId: "findDerivative",
        promptTex: prompt,
        solutionTex: solution,
        graphExpr: coef === 1 ? `x^${n}` : `${coef}x^${n}`,
      };
    }
    case "derivative-quadratic":
    case "derivative-at": {
      const a = nonzero(rng, -4, 4);
      const b = randInt(rng, -6, 6);
      const c = randInt(rng, -5, 5);
      const expr = formatQuadraticTex(a, b, c);
      const deriv = formatLinearTex(2 * a, b);
      if (templateId === "derivative-at") {
        const k = randInt(rng, -4, 4);
        const value = 2 * a * k + b;
        return {
          ...base,
          instructionId: "findDerivative",
          promptTex: `f(x) = ${expr},\\; f'(${k}) = ?`,
          solutionTex: `f'(${k}) = ${value}`,
          graphExpr: expr,
        };
      }
      return {
        ...base,
        instructionId: "findDerivative",
        promptTex: `f(x) = ${expr}`,
        solutionTex: `f'(x) = ${deriv}`,
        graphExpr: expr,
      };
    }
    case "vector-magnitude": {
      const triple =
        PYTHAGOREAN_TRIPLES[randInt(rng, 0, PYTHAGOREAN_TRIPLES.length - 1)]!;
      const k = meta.difficulty === "hard" ? randInt(rng, 2, 3) : 1;
      const a = triple[0] * k;
      const b = triple[1] * k;
      const c = triple[2] * k;
      return {
        ...base,
        instructionId: "evaluate",
        promptTex: `\\lVert (${a}, ${b}) \\rVert = ?`,
        solutionTex: String(c),
      };
    }
    case "vector-dot": {
      const ax = nonzero(rng, -6, 6);
      const ay = nonzero(rng, -6, 6);
      const bx = nonzero(rng, -6, 6);
      const by = nonzero(rng, -6, 6);
      return {
        ...base,
        instructionId: "evaluate",
        promptTex: `\\vec{a} = (${ax}, ${ay}),\\; \\vec{b} = (${bx}, ${by}),\\; \\vec{a}\\cdot\\vec{b} = ?`,
        solutionTex: String(ax * bx + ay * by),
      };
    }
    case "ai-verified":
      throw new Error("ai-verified problems come from the CAS pipeline");
    }
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function generateProblems(raw: GenerateProblemsInput): BankProblem[] {
  const input = generateProblemsSchema.parse(raw);
  const root =
    input.seed ??
    (Date.now() ^ Math.floor(Math.random() * 0x7fffffff));
  const templateId = templateFor(input.topic, input.difficulty);
  const problems: BankProblem[] = [];

  for (let i = 0; i < input.count; i += 1) {
    const seed = root + i * 9973;
    const rng = mulberry32(seed);
    problems.push(
      buildProblem(templateId, rng, {
        topic: input.topic,
        difficulty: input.difficulty,
        year: input.year,
        seed,
      }),
    );
  }

  return problems;
}
