import { binomial, factorial, permutations, randInt } from "./rng";
import type { ProblemAlgorithm } from "./types";

export const combinatoricsAlgorithms: ProblemAlgorithm[] = [
  {
    id: "binomial-choose",
    topic: "combinatorics",
    difficulties: ["medium", "hard"],
    years: ["9", "10", "11"],
    generate({ rng }) {
      const n = randInt(rng, 6, 14);
      const k = randInt(rng, 2, Math.min(4, n - 1));
      return {
        instructionId: "evaluate",
        promptTex: `\\binom{${n}}{${k}}`,
        solutionTex: String(binomial(n, k)),
        formula: "combinations(n, k)",
        variables: { n, k },
        promptTemplate: "\\binom{{{n}}}{{{k}}}",
      };
    },
  },
  {
    id: "factorial",
    topic: "combinatorics",
    difficulties: ["easy"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const n = randInt(rng, 4, 8);
      return {
        instructionId: "evaluate",
        promptTex: `${n}!`,
        solutionTex: String(factorial(n)),
        formula: "factorial(n)",
        variables: { n },
        promptTemplate: "{{n}}!",
      };
    },
  },
  {
    id: "permutations",
    topic: "combinatorics",
    difficulties: ["medium", "hard"],
    years: ["9", "10", "11"],
    generate({ rng }) {
      const n = randInt(rng, 5, 9);
      const k = randInt(rng, 2, Math.min(4, n));
      return {
        instructionId: "evaluate",
        promptTex: `P(${n}, ${k}) = \\dfrac{${n}!}{(${n}-${k})!}`,
        solutionTex: String(permutations(n, k)),
        formula: "permutations(n, k)",
        variables: { n, k },
      };
    },
  },
  {
    id: "counting-product",
    topic: "combinatorics",
    difficulties: ["easy", "medium"],
    years: ["7", "8", "9"],
    generate({ rng }) {
      const n = randInt(rng, 3, 9);
      const m = randInt(rng, 3, 8);
      return {
        instructionId: "evaluate",
        promptTex: `${n} \\times ${m}`,
        solutionTex: String(n * m),
        formula: "n * m",
        variables: { n, m },
        promptTemplate: "{{n}} \\times {{m}}",
      };
    },
  },
];
