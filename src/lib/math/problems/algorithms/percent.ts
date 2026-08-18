import { formatNumber } from "../tex";
import { gcd, pick, randInt } from "./rng";
import type { ProblemAlgorithm } from "./types";

const EASY_PERCENTS = [10, 20, 25, 40, 50, 75] as const;
const SIMPLE_PERCENTS = [10, 20, 25, 50] as const;

export const percentAlgorithms: ProblemAlgorithm[] = [
  {
    id: "percent-of",
    topic: "percent",
    difficulties: ["easy"],
    years: ["7", "8"],
    generate({ rng }) {
      const p = pick(rng, EASY_PERCENTS);
      const n = randInt(rng, 2, 16) * (100 / gcd(p, 100));
      const value = (p / 100) * n;
      return {
        instructionId: "percentOf",
        promptTex: `${p}\\% \\cdot ${n}`,
        solutionTex: formatNumber(value),
        formula: "p / 100 * n",
        variables: { p, n },
        promptTemplate: "{{p}}\\% \\cdot {{n}}",
      };
    },
  },
  {
    id: "percent-whole",
    topic: "percent",
    difficulties: ["medium"],
    years: ["7", "8", "9"],
    generate({ rng }) {
      const p = pick(rng, SIMPLE_PERCENTS);
      const whole = randInt(rng, 2, 12) * (100 / p);
      const part = (p / 100) * whole;
      return {
        instructionId: "percentOf",
        promptTex: `${formatNumber(part)} = ${p}\\% \\cdot x`,
        solutionTex: `x = ${formatNumber(whole)}`,
      };
    },
  },
  {
    id: "percent-increase",
    topic: "percent",
    difficulties: ["medium"],
    years: ["7", "8", "9"],
    generate({ rng }) {
      const p = pick(rng, SIMPLE_PERCENTS);
      const n = randInt(rng, 4, 20) * 10;
      const value = n * (1 + p / 100);
      return {
        instructionId: "evaluate",
        promptTex: `${n} + ${p}\\%`,
        solutionTex: formatNumber(value),
        formula: "n * (1 + p / 100)",
        variables: { n, p },
        promptTemplate: "{{n}} + {{p}}\\%",
      };
    },
  },
  {
    id: "percent-decrease",
    topic: "percent",
    difficulties: ["medium", "hard"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const p = pick(rng, SIMPLE_PERCENTS);
      const n = randInt(rng, 4, 20) * 10;
      const value = n * (1 - p / 100);
      return {
        instructionId: "evaluate",
        promptTex: `${n} - ${p}\\%`,
        solutionTex: formatNumber(value),
        formula: "n * (1 - p / 100)",
        variables: { n, p },
        promptTemplate: "{{n}} - {{p}}\\%",
      };
    },
  },
  {
    id: "percent-successive",
    topic: "percent",
    difficulties: ["hard"],
    years: ["9", "10", "11"],
    generate({ rng }) {
      const p = pick(rng, SIMPLE_PERCENTS);
      const q = pick(rng, SIMPLE_PERCENTS);
      const n = randInt(rng, 8, 20) * 10;
      const value = n * (1 + p / 100) * (1 - q / 100);
      return {
        instructionId: "evaluate",
        promptTex: `${n} \\xrightarrow{+${p}\\%} \\xrightarrow{-${q}\\%}`,
        solutionTex: formatNumber(Math.round(value * 1000) / 1000),
      };
    },
  },
];
