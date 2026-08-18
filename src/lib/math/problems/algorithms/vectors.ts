import { pick, randInt, nonzero } from "./rng";
import type { ProblemAlgorithm } from "./types";

const PYTHAGOREAN_TRIPLES = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
] as const;

export const vectorsAlgorithms: ProblemAlgorithm[] = [
  {
    id: "vector-magnitude",
    topic: "vectors",
    difficulties: ["easy", "medium"],
    years: ["9", "10"],
    generate({ rng, difficulty }) {
      const triple = pick(rng, PYTHAGOREAN_TRIPLES);
      const k = difficulty === "medium" ? randInt(rng, 2, 3) : 1;
      const a = triple[0] * k;
      const b = triple[1] * k;
      const c = triple[2] * k;
      return {
        instructionId: "evaluate",
        promptTex: `\\lVert (${a}, ${b}) \\rVert = ?`,
        solutionTex: String(c),
        formula: "hypot(a, b)",
        variables: { a, b },
        promptTemplate: "\\lVert ({{a}}, {{b}}) \\rVert = ?",
      };
    },
  },
  {
    id: "vector-dot",
    topic: "vectors",
    difficulties: ["medium", "hard"],
    years: ["9", "10", "11"],
    generate({ rng }) {
      const ax = nonzero(rng, -6, 6);
      const ay = nonzero(rng, -6, 6);
      const bx = nonzero(rng, -6, 6);
      const by = nonzero(rng, -6, 6);
      return {
        instructionId: "evaluate",
        promptTex: `\\vec{a} = (${ax}, ${ay}),\\; \\vec{b} = (${bx}, ${by}),\\; \\vec{a}\\cdot\\vec{b} = ?`,
        solutionTex: String(ax * bx + ay * by),
        formula: "ax * bx + ay * by",
        variables: { ax, ay, bx, by },
        promptTemplate:
          "\\vec{a} = ({{ax}}, {{ay}}),\\; \\vec{b} = ({{bx}}, {{by}}),\\; \\vec{a}\\cdot\\vec{b} = ?",
      };
    },
  },
  {
    id: "vector-add",
    topic: "vectors",
    difficulties: ["easy"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const ax = randInt(rng, -8, 8);
      const ay = randInt(rng, -8, 8);
      const bx = randInt(rng, -8, 8);
      const by = randInt(rng, -8, 8);
      return {
        instructionId: "evaluate",
        promptTex: `(${ax}, ${ay}) + (${bx}, ${by})`,
        solutionTex: `(${ax + bx}, ${ay + by})`,
      };
    },
  },
  {
    id: "vector-scalar",
    topic: "vectors",
    difficulties: ["easy", "medium"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const k = nonzero(rng, -5, 5);
      const x = randInt(rng, -8, 8);
      const y = randInt(rng, -8, 8);
      return {
        instructionId: "evaluate",
        promptTex: `${k}\\, (${x}, ${y})`,
        solutionTex: `(${k * x}, ${k * y})`,
      };
    },
  },
  {
    id: "midpoint",
    topic: "vectors",
    difficulties: ["easy", "medium"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const x1 = randInt(rng, -10, 10);
      const y1 = randInt(rng, -10, 10);
      const x2 = randInt(rng, -10, 10);
      const y2 = randInt(rng, -10, 10);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const fmt = (n: number) =>
        Number.isInteger(n) ? String(n) : `\\dfrac{${n * 2}}{2}`;
      return {
        instructionId: "evaluate",
        promptTex: `A(${x1}, ${y1}),\\; B(${x2}, ${y2}),\\; M = ?`,
        solutionTex: `M\\left(${fmt(mx)}, ${fmt(my)}\\right)`,
      };
    },
  },
];
