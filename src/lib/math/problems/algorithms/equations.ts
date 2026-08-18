import { formatQuadraticTex } from "../tex";
import { nonzero, randInt } from "./rng";
import type { ProblemAlgorithm } from "./types";

function linearXY(a: number, b: number, c: number) {
  const xPart = a === 1 ? "x" : a === -1 ? "-x" : `${a}x`;
  const yAbs = Math.abs(b);
  const yBody = yAbs === 1 ? "y" : `${yAbs}y`;
  const yPart = b < 0 ? `- ${yBody}` : `+ ${yBody}`;
  return `${xPart} ${yPart} = ${c}`;
}

export const equationsAlgorithms: ProblemAlgorithm[] = [
  {
    id: "quadratic-monic",
    topic: "equations",
    difficulties: ["medium"],
    years: ["9", "10"],
    generate({ rng }) {
      const p = nonzero(rng, -6, 6);
      let q = nonzero(rng, -6, 6);
      if (p === q) q = p + (rng() < 0.5 ? 1 : -1);
      const b = -(p + q);
      const c = p * q;
      return {
        instructionId: "solve",
        promptTex: `${formatQuadraticTex(1, b, c)} = 0`,
        solutionTex: `x = ${p},\\; x = ${q}`,
        graphExpr: formatQuadraticTex(1, b, c),
      };
    },
  },
  {
    id: "quadratic-scaled",
    topic: "equations",
    difficulties: ["hard"],
    years: ["10", "11"],
    generate({ rng }) {
      const p = nonzero(rng, -6, 6);
      let q = nonzero(rng, -6, 6);
      if (p === q) q = p + (rng() < 0.5 ? 1 : -1);
      const scale = randInt(rng, 2, 4);
      const a = scale;
      const b = -scale * (p + q);
      const c = scale * p * q;
      return {
        instructionId: "solve",
        promptTex: `${formatQuadraticTex(a, b, c)} = 0`,
        solutionTex: `x = ${p},\\; x = ${q}`,
        graphExpr: formatQuadraticTex(a, b, c),
      };
    },
  },
  {
    id: "quadratic-pure",
    topic: "equations",
    difficulties: ["easy", "medium"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const k = randInt(rng, 2, 12);
      if (rng() < 0.5) {
        return {
          instructionId: "solve",
          promptTex: `x^{2} = ${k * k}`,
          solutionTex: `x = ${k},\\; x = ${-k}`,
          graphExpr: `x^2 - ${k * k}`,
        };
      }
      const c = k * k;
      return {
        instructionId: "solve",
        promptTex: `x^{2} - ${c} = 0`,
        solutionTex: `x = ${k},\\; x = ${-k}`,
        graphExpr: `x^2 - ${c}`,
      };
    },
  },
  {
    id: "vieta-squares",
    topic: "equations",
    difficulties: ["medium", "hard"],
    years: ["10", "11", "12"],
    generate({ rng, difficulty }) {
      const p = nonzero(rng, -7, 7);
      let q = nonzero(rng, -7, 7);
      if (p === q) q += 1;
      const sum = p + q;
      const prod = p * q;
      const expr = formatQuadraticTex(1, -sum, prod);
      if (difficulty === "hard") {
        return {
          instructionId: "evaluate",
          promptTex: `${expr} = 0,\\; x_{1}^{2} + x_{2}^{2} = ?`,
          solutionTex: String(p * p + q * q),
          graphExpr: expr,
        };
      }
      return {
        instructionId: "evaluate",
        promptTex: `${expr} = 0,\\; x_{1} + x_{2} = ?`,
        solutionTex: String(sum),
        graphExpr: expr,
      };
    },
  },
  {
    id: "system-2x2",
    topic: "equations",
    difficulties: ["medium", "hard"],
    years: ["8", "9", "10"],
    generate({ rng }) {
      const x = randInt(rng, -6, 6);
      const y = randInt(rng, -6, 6);
      let a1 = nonzero(rng, 1, 5);
      let b1 = nonzero(rng, 1, 5);
      let a2 = nonzero(rng, 1, 5);
      let b2 = nonzero(rng, 1, 5);
      if (a1 * b2 === a2 * b1) b2 += 1;
      const c1 = a1 * x + b1 * y;
      const c2 = a2 * x + b2 * y;
      return {
        instructionId: "solve",
        promptTex: `\\begin{cases} ${linearXY(a1, b1, c1)} \\\\ ${linearXY(a2, b2, c2)} \\end{cases}`,
        solutionTex: `x = ${x},\\; y = ${y}`,
      };
    },
  },
];
