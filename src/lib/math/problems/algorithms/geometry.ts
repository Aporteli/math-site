import { pick, randInt } from "./rng";
import type { ProblemAlgorithm } from "./types";

const PYTHAGOREAN_TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
] as const;

export const geometryAlgorithms: ProblemAlgorithm[] = [
  {
    id: "pythagoras-hyp",
    topic: "geometry",
    difficulties: ["easy", "medium"],
    years: ["8", "9"],
    generate({ rng, difficulty }) {
      const triple = pick(rng, PYTHAGOREAN_TRIPLES);
      const k = difficulty === "medium" ? randInt(rng, 2, 3) : 1;
      const a = triple[0] * k;
      const b = triple[1] * k;
      const c = triple[2] * k;
      return {
        instructionId: "missingSide",
        promptTex: `a = ${a},\\; b = ${b},\\; c = ?`,
        solutionTex: `c = ${c}`,
        formula: "hypot(a, b)",
        variables: { a, b },
        promptTemplate: "a = {{a}},\\; b = {{b}},\\; c = ?",
      };
    },
  },
  {
    id: "pythagoras-leg",
    topic: "geometry",
    difficulties: ["medium", "hard"],
    years: ["8", "9", "10"],
    generate({ rng, difficulty }) {
      const triple = pick(rng, PYTHAGOREAN_TRIPLES);
      const k = difficulty === "hard" ? randInt(rng, 2, 4) : 1;
      const a = triple[0] * k;
      const b = triple[1] * k;
      const c = triple[2] * k;
      return {
        instructionId: "missingSide",
        promptTex: `a = ${a},\\; c = ${c},\\; b = ?`,
        solutionTex: `b = ${b}`,
        formula: "sqrt(c^2 - a^2)",
        variables: { a, c },
        promptTemplate: "a = {{a}},\\; c = {{c}},\\; b = ?",
      };
    },
  },
  {
    id: "rectangle-area",
    topic: "geometry",
    difficulties: ["easy"],
    years: ["7", "8"],
    generate({ rng }) {
      const length = randInt(rng, 3, 18);
      const width = randInt(rng, 2, 12);
      return {
        instructionId: "evaluate",
        promptTex: `A = ${length} \\times ${width}`,
        solutionTex: String(length * width),
        formula: "length * width",
        variables: { length, width },
        promptTemplate: "A = {{length}} \\times {{width}}",
      };
    },
  },
  {
    id: "triangle-area",
    topic: "geometry",
    difficulties: ["easy", "medium"],
    years: ["7", "8", "9"],
    generate({ rng }) {
      const base = randInt(rng, 4, 16);
      const height = randInt(rng, 3, 14);
      const area = (base * height) / 2;
      const solution = Number.isInteger(area)
        ? String(area)
        : `\\dfrac{${base * height}}{2}`;
      return {
        instructionId: "evaluate",
        promptTex: `A = \\tfrac{1}{2} \\cdot ${base} \\cdot ${height}`,
        solutionTex: solution,
        formula: "base * height / 2",
        variables: { base, height },
        promptTemplate: "A = \\tfrac{1}{2} \\cdot {{base}} \\cdot {{height}}",
      };
    },
  },
  {
    id: "circle-circumference",
    topic: "geometry",
    difficulties: ["easy", "medium"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const r = randInt(rng, 2, 12);
      return {
        instructionId: "evaluate",
        promptTex: `r = ${r},\\; C = 2\\pi r`,
        solutionTex: `${2 * r}\\pi`,
        formula: "2 * r",
        variables: { r },
        promptTemplate: "r = {{r}},\\; C = 2\\pi r",
      };
    },
  },
  {
    id: "similar-ratio",
    topic: "geometry",
    difficulties: ["medium", "hard"],
    years: ["9", "10", "11"],
    generate({ rng }) {
      const k = randInt(rng, 2, 5);
      const a = randInt(rng, 3, 9);
      const b = randInt(rng, 4, 10);
      const a2 = a * k;
      const x = b * k;
      return {
        instructionId: "evaluate",
        promptTex: `\\dfrac{${a}}{${a2}} = \\dfrac{${b}}{x}`,
        solutionTex: `x = ${x}`,
        formula: "a2 * b / a",
        variables: { a, a2, b },
        promptTemplate: "\\dfrac{{{a}}}{{{a2}}} = \\dfrac{{{b}}}{x}",
      };
    },
  },
];
