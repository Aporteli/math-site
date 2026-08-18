import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  distinctNonzero,
  joinTerms,
  otherVariable,
  parenLinear,
  parenTerms,
  polyTex,
  quadratic,
  selectVariable,
  signed,
  term,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

export const polynomialSimplificationProblem = defineAlgebraProblem(
  "polynomial-simplification",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);
    const u = otherVariable(variable);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // ax + bx + c
        () => {
          const a = randInt(rng, 2, 8);
          const b = nonzero(rng, -7, 7);
          const c = nonzero(rng, -9, 9);
          return {
            instructionId: "simplify" as const,
            promptTex: joinTerms([
              { coef: a, body: variable },
              { coef: b, body: variable },
              { coef: c, body: "" },
            ]),
            solutionTex: aligned([
              `(${a} ${signed(b)})${variable} ${signed(c)}`,
              `= ${polyTex(variable, [a + b, c])}`,
            ]),
          };
        },

        // k(ax + b)
        () => {
          const k = randInt(rng, 2, 7);
          const a = randInt(rng, 1, 6);
          const b = nonzero(rng, -8, 8);
          return {
            instructionId: "expand" as const,
            promptTex: `${k}${parenLinear(a, b, variable)}`,
            solutionTex: aligned([
              `${k}\\cdot${term(a, variable)} + ${k}\\cdot(${b})`,
              `= ${polyTex(variable, [k * a, k * b])}`,
            ]),
          };
        },

        // -(ax - b) + cx
        () => {
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 1, 9);
          const c = randInt(rng, 2, 8);
          return {
            instructionId: "simplify" as const,
            promptTex: `-(${term(a, variable)} - ${b}) + ${term(c, variable)}`,
            solutionTex: aligned([
              `-${term(a, variable)} + ${b} + ${term(c, variable)}`,
              `= ${polyTex(variable, [c - a, b])}`,
            ]),
          };
        },

        // ax^2 + bx + cx^2
        () => {
          const a = randInt(rng, 2, 6);
          const c = nonzero(rng, -6, 6);
          const b = nonzero(rng, -7, 7);
          return {
            instructionId: "simplify" as const,
            promptTex: joinTerms([
              { coef: a, body: `${variable}^2` },
              { coef: b, body: variable },
              { coef: c, body: `${variable}^2` },
            ]),
            solutionTex: aligned([
              `(${a} ${signed(c)})${variable}^2 ${signed(b)}${variable}`,
              `= ${polyTex(variable, [a + c, b, 0])}`,
            ]),
          };
        },

        // (ax + b) + (cx + d)
        () => {
          const a = randInt(rng, 2, 6);
          const b = nonzero(rng, -7, 7);
          const c = nonzero(rng, -6, 6);
          const d = nonzero(rng, -7, 7);
          return {
            instructionId: "simplify" as const,
            promptTex: `${parenLinear(a, b, variable)} + ${parenLinear(c, d, variable)}`,
            solutionTex: aligned([
              `${term(a, variable)} ${signed(b)} + ${term(c, variable)} ${signed(d)}`,
              `= ${polyTex(variable, [a + c, b + d])}`,
            ]),
          };
        },

        // (ax + b) - (cx + d)
        () => {
          const a = randInt(rng, 2, 6);
          const b = nonzero(rng, -7, 7);
          const c = randInt(rng, 1, 6);
          const d = nonzero(rng, -7, 7);
          return {
            instructionId: "simplify" as const,
            promptTex: `${parenLinear(a, b, variable)} - ${parenLinear(c, d, variable)}`,
            solutionTex: aligned([
              `${term(a, variable)} ${signed(b)} - ${term(c, variable)} ${signed(d)}`,
              `= ${polyTex(variable, [a - c, b - d])}`,
            ]),
          };
        },

        // ax^2 + b + cx^2
        () => {
          const a = randInt(rng, 2, 7);
          const b = nonzero(rng, -9, 9);
          const c = nonzero(rng, -6, 6);
          return {
            instructionId: "simplify" as const,
            promptTex: joinTerms([
              { coef: a, body: `${variable}^2` },
              { coef: b, body: "" },
              { coef: c, body: `${variable}^2` },
            ]),
            solutionTex: aligned([
              `(${a} ${signed(c)})${variable}^2 ${signed(b)}`,
              `= ${polyTex(variable, [a + c, 0, b])}`,
            ]),
          };
        },

        // k(x + a) + m
        () => {
          const k = randInt(rng, 2, 6);
          const a = nonzero(rng, -8, 8);
          const m = nonzero(rng, -9, 9);
          return {
            instructionId: "simplify" as const,
            promptTex: `${k}${parenLinear(1, a, variable)} ${signed(m)}`,
            solutionTex: aligned([
              `${term(k, variable)} ${signed(k * a)} ${signed(m)}`,
              `= ${polyTex(variable, [k, k * a + m])}`,
            ]),
          };
        },

        // ax + b + cx + d
        () => {
          const a = randInt(rng, 2, 7);
          const b = nonzero(rng, -8, 8);
          const c = nonzero(rng, -7, 7);
          const d = nonzero(rng, -8, 8);
          return {
            instructionId: "simplify" as const,
            promptTex: joinTerms([
              { coef: a, body: variable },
              { coef: b, body: "" },
              { coef: c, body: variable },
              { coef: d, body: "" },
            ]),
            solutionTex: aligned([
              `(${a} ${signed(c)})${variable} + (${b} ${signed(d)})`,
              `= ${polyTex(variable, [a + c, b + d])}`,
            ]),
          };
        },

        // ax + by + cx + dy
        () => {
          const a = randInt(rng, 2, 6);
          const b = nonzero(rng, -6, 6);
          const c = nonzero(rng, -6, 6);
          const d = nonzero(rng, -6, 6);
          return {
            instructionId: "simplify" as const,
            promptTex: joinTerms([
              { coef: a, body: variable },
              { coef: b, body: u },
              { coef: c, body: variable },
              { coef: d, body: u },
            ]),
            solutionTex: aligned([
              `(${a} ${signed(c)})${variable} + (${b} ${signed(d)})${u}`,
              `= ${joinTerms([
                { coef: a + c, body: variable },
                { coef: b + d, body: u },
              ])}`,
            ]),
          };
        },

        // k(x^2 + n)
        () => {
          const k = randInt(rng, 2, 7);
          const n = nonzero(rng, -8, 8);
          return {
            instructionId: "expand" as const,
            promptTex: `${k}(${variable}^2 ${signed(n)})`,
            solutionTex: aligned([
              `${k}${variable}^2 ${signed(k * n)}`,
              `= ${polyTex(variable, [k, 0, k * n])}`,
            ]),
          };
        },

        // k - (ax + b)
        () => {
          const k = randInt(rng, 2, 12);
          const a = randInt(rng, 1, 6);
          const b = nonzero(rng, -8, 8);
          return {
            instructionId: "simplify" as const,
            promptTex: `${k} - ${parenLinear(a, b, variable)}`,
            solutionTex: aligned([
              `${k} - ${term(a, variable)} ${signed(-b)}`,
              `= ${polyTex(variable, [-a, k - b])}`,
            ]),
          };
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // (x + a)(x + b)
        () => {
          const a = nonzero(rng, -6, 6);
          const b = distinctNonzero(rng, -6, 6, [a]);
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(1, a, variable)}${parenLinear(1, b, variable)}`,
            solutionTex: aligned([
              `${variable}^2 ${signed(b)}${variable} ${signed(a)}${variable} + (${a})(${b})`,
              `= ${quadratic(1, a + b, a * b, variable)}`,
            ]),
          };
        },

        // (ax ± b)^2
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 1, 6);
          const isMinus = rng() < 0.5;
          const s = isMinus ? -1 : 1;
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(a, s * b, variable)}^2`,
            solutionTex: aligned([
              `(${term(a, variable)})^2 ${isMinus ? "-" : "+"} 2(${term(a, variable)})(${b}) + ${b}^2`,
              `= ${quadratic(a * a, 2 * s * a * b, b * b, variable)}`,
            ]),
          };
        },

        // (ax - b)(ax + b)
        () => {
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 7);
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(a, -b, variable)}${parenLinear(a, b, variable)}`,
            solutionTex: aligned([
              `(${term(a, variable)})^2 - ${b}^2`,
              `= ${polyTex(variable, [a * a, 0, -(b * b)])}`,
            ]),
          };
        },

        // a(x + b) - c(x - d)
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 1, 6);
          const c = randInt(rng, 2, 5);
          const d = randInt(rng, 1, 6);
          return {
            instructionId: "simplify" as const,
            promptTex: `${a}${parenLinear(1, b, variable)} - ${c}${parenLinear(1, -d, variable)}`,
            solutionTex: aligned([
              `${term(a, variable)} ${signed(a * b)} - ${term(c, variable)} ${signed(c * d)}`,
              `= ${polyTex(variable, [a - c, a * b + c * d])}`,
            ]),
          };
        },

        // x(ax^2 + bx - c)
        () => {
          const a = randInt(rng, 2, 5);
          const b = nonzero(rng, -6, 6);
          const c = randInt(rng, 1, 8);
          return {
            instructionId: "expand" as const,
            promptTex: `${variable}(${polyTex(variable, [a, b, -c])})`,
            solutionTex: aligned([
              `${a}${variable}^3 ${signed(b)}${variable}^2 - ${c}${variable}`,
              `= ${polyTex(variable, [a, b, -c, 0])}`,
            ]),
          };
        },

        // (ax + b)(cx + d)
        () => {
          const a = randInt(rng, 2, 5);
          const b = nonzero(rng, -6, 6);
          const c = randInt(rng, 2, 5);
          const d = nonzero(rng, -6, 6);
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(a, b, variable)}${parenLinear(c, d, variable)}`,
            solutionTex: aligned([
              `${term(a, variable)}\\cdot${term(c, variable)} + ${term(a, variable)}\\cdot(${d}) + (${b})\\cdot${term(c, variable)} + (${b})(${d})`,
              `= ${quadratic(a * c, a * d + b * c, b * d, variable)}`,
            ]),
          };
        },

        // (x + a)^2 + (x + b)
        () => {
          const a = nonzero(rng, -5, 5);
          const b = nonzero(rng, -6, 6);
          return {
            instructionId: "simplify" as const,
            promptTex: `${parenLinear(1, a, variable)}^2 + ${parenLinear(1, b, variable)}`,
            solutionTex: aligned([
              `${variable}^2 ${signed(2 * a)}${variable} ${signed(a * a)} + ${variable} ${signed(b)}`,
              `= ${quadratic(1, 2 * a + 1, a * a + b, variable)}`,
            ]),
          };
        },

        // k(x + a)(x + b)
        () => {
          const k = randInt(rng, 2, 5);
          const a = nonzero(rng, -5, 5);
          const b = distinctNonzero(rng, -5, 5, [a]);
          return {
            instructionId: "expand" as const,
            promptTex: `${k}${parenLinear(1, a, variable)}${parenLinear(1, b, variable)}`,
            solutionTex: aligned([
              `${k}\\bigl(${quadratic(1, a + b, a * b, variable)}\\bigr)`,
              `= ${quadratic(k, k * (a + b), k * a * b, variable)}`,
            ]),
          };
        },

        // x(x + a) - b(x - c)
        () => {
          const a = nonzero(rng, -6, 6);
          const b = randInt(rng, 2, 5);
          const c = randInt(rng, 1, 6);
          return {
            instructionId: "simplify" as const,
            promptTex: `${variable}${parenLinear(1, a, variable)} - ${b}${parenLinear(1, -c, variable)}`,
            solutionTex: aligned([
              `${variable}^2 ${signed(a)}${variable} - ${term(b, variable)} ${signed(b * c)}`,
              `= ${quadratic(1, a - b, b * c, variable)}`,
            ]),
          };
        },

        // (x + y)(x - y)
        () => {
          return {
            instructionId: "expand" as const,
            promptTex: `(${variable} + ${u})(${variable} - ${u})`,
            solutionTex: aligned([
              `${variable}^2 - ${u}^2`,
            ]),
          };
        },

        // k(ax^2 + bx + c)
        () => {
          const k = randInt(rng, 2, 6);
          const a = randInt(rng, 1, 4);
          const b = nonzero(rng, -6, 6);
          const c = nonzero(rng, -7, 7);
          return {
            instructionId: "expand" as const,
            promptTex: `${k}(${quadratic(a, b, c, variable)})`,
            solutionTex: aligned([
              `${quadratic(k * a, k * b, k * c, variable)}`,
            ]),
          };
        },

        // (x + a)^2 - b^2
        () => {
          const a = nonzero(rng, -5, 5);
          const b = randInt(rng, 2, 7);
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(1, a, variable)}^2 - ${b}^2`,
            solutionTex: aligned([
              `${variable}^2 ${signed(2 * a)}${variable} ${signed(a * a)} - ${b * b}`,
              `= ${quadratic(1, 2 * a, a * a - b * b, variable)}`,
            ]),
          };
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // (x + a)(bx^2 + cx + d)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = randInt(rng, 1, 4);
          const c = nonzero(rng, -4, 4);
          const d = nonzero(rng, -5, 5);
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(1, a, variable)}(${quadratic(b, c, d, variable)})`,
            solutionTex: aligned([
              `${variable}(${quadratic(b, c, d, variable)}) ${signed(a)}(${quadratic(b, c, d, variable)})`,
              `= ${polyTex(variable, [b, c + a * b, d + a * c, a * d])}`,
            ]),
          };
        },

        // (ax ± b)^3
        () => {
          const a = randInt(rng, 1, 3);
          const b = randInt(rng, 1, 4);
          const isMinus = rng() < 0.5;
          const s = isMinus ? -1 : 1;
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(a, s * b, variable)}^3`,
            solutionTex: aligned([
              `(${term(a, variable)})^3 ${isMinus ? "-" : "+"} 3(${term(a, variable)})^2(${b}) + 3(${term(a, variable)})(${b})^2 ${isMinus ? "-" : "+"} ${b}^3`,
              `= ${polyTex(variable, [
                a ** 3,
                3 * s * a * a * b,
                3 * a * b * b,
                s * b ** 3,
              ])}`,
            ]),
          };
        },

        // (ax + b)^2 - (ax - b)^2
        () => {
          const a = randInt(rng, 2, 5);
          const b = randInt(rng, 2, 6);
          return {
            instructionId: "simplify" as const,
            promptTex: `${parenLinear(a, b, variable)}^2 - ${parenLinear(a, -b, variable)}^2`,
            solutionTex: aligned([
              `[${quadratic(a * a, 2 * a * b, b * b, variable)}] - [${quadratic(a * a, -2 * a * b, b * b, variable)}]`,
              `= ${term(4 * a * b, variable)}`,
            ]),
          };
        },

        // (ax + by)(cx - dy)
        () => {
          const a = randInt(rng, 2, 5);
          const b = nonzero(rng, -5, 5);
          const c = randInt(rng, 1, 4);
          const d = randInt(rng, 1, 5);
          return {
            instructionId: "expand" as const,
            promptTex: `${parenTerms([
              { coef: a, body: variable },
              { coef: b, body: u },
            ])}${parenTerms([
              { coef: c, body: variable },
              { coef: -d, body: u },
            ])}`,
            solutionTex: aligned([
              `${a * c}${variable}^2 ${signed(-a * d)}${variable}${u} ${signed(b * c)}${variable}${u} ${signed(-b * d)}${u}^2`,
              `= ${joinTerms([
                { coef: a * c, body: `${variable}^2` },
                { coef: -a * d + b * c, body: `${variable}${u}` },
                { coef: -b * d, body: `${u}^2` },
              ])}`,
            ]),
          };
        },

        // a[x^2 - b(x - c)] - d x^2
        () => {
          const a = randInt(rng, 2, 4);
          const b = randInt(rng, 2, 5);
          const c = randInt(rng, 1, 5);
          const d = randInt(rng, 1, 4);
          return {
            instructionId: "simplify" as const,
            promptTex: `${a}[${variable}^2 - ${b}${parenLinear(1, -c, variable)}] - ${d}${variable}^2`,
            solutionTex: aligned([
              `${a}[${variable}^2 - ${b}${variable} ${signed(b * c)}] - ${d}${variable}^2`,
              `= ${polyTex(variable, [a - d, -a * b, a * b * c])}`,
            ]),
          };
        },

        // (x + a)(x + b)(x + c)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = distinctNonzero(rng, -4, 4, [a]);
          const c = distinctNonzero(rng, -4, 4, [a, b]);
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(1, a, variable)}${parenLinear(1, b, variable)}${parenLinear(1, c, variable)}`,
            solutionTex: aligned([
              `\\bigl(${quadratic(1, a + b, a * b, variable)}\\bigr)${parenLinear(1, c, variable)}`,
              `= ${polyTex(variable, [
                1,
                a + b + c,
                a * b + a * c + b * c,
                a * b * c,
              ])}`,
            ]),
          };
        },

        // (x^2 + p)(x^2 + q)
        () => {
          const p = nonzero(rng, -7, 7);
          const q = distinctNonzero(rng, -7, 7, [p]);
          return {
            instructionId: "expand" as const,
            promptTex: `(${variable}^2 ${signed(p)})(${variable}^2 ${signed(q)})`,
            solutionTex: aligned([
              `${variable}^4 ${signed(q)}${variable}^2 ${signed(p)}${variable}^2 + (${p})(${q})`,
              `= ${polyTex(variable, [1, 0, p + q, 0, p * q])}`,
            ]),
          };
        },

        // (x + a)^2 (x + b)
        () => {
          const a = nonzero(rng, -4, 4);
          const b = nonzero(rng, -5, 5);
          return {
            instructionId: "expand" as const,
            promptTex: `${parenLinear(1, a, variable)}^2${parenLinear(1, b, variable)}`,
            solutionTex: aligned([
              `\\bigl(${quadratic(1, 2 * a, a * a, variable)}\\bigr)${parenLinear(1, b, variable)}`,
              `= ${polyTex(variable, [
                1,
                2 * a + b,
                a * a + 2 * a * b,
                a * a * b,
              ])}`,
            ]),
          };
        },

        // (ax + b)^2 - (cx + d)^2
        () => {
          const a = randInt(rng, 2, 4);
          const b = nonzero(rng, -5, 5);
          const c = randInt(rng, 1, 3);
          const d = nonzero(rng, -5, 5);
          return {
            instructionId: "simplify" as const,
            promptTex: `${parenLinear(a, b, variable)}^2 - ${parenLinear(c, d, variable)}^2`,
            solutionTex: aligned([
              `[${quadratic(a * a, 2 * a * b, b * b, variable)}] - [${quadratic(c * c, 2 * c * d, d * d, variable)}]`,
              `= ${quadratic(
                a * a - c * c,
                2 * a * b - 2 * c * d,
                b * b - d * d,
                variable,
              )}`,
            ]),
          };
        },

        // (x + y)^3
        () => {
          const isMinus = rng() < 0.5;
          const op = isMinus ? "-" : "+";
          const s = isMinus ? -1 : 1;
          return {
            instructionId: "expand" as const,
            promptTex: `(${variable} ${op} ${u})^3`,
            solutionTex: aligned([
              `${variable}^3 ${op} 3${variable}^2${u} + 3${variable}${u}^2 ${op} ${u}^3`,
              `= ${joinTerms([
                { coef: 1, body: `${variable}^3` },
                { coef: 3 * s, body: `${variable}^2${u}` },
                { coef: 3, body: `${variable}${u}^2` },
                { coef: s, body: `${u}^3` },
              ])}`,
            ]),
          };
        },

        // a(x + b)(cx + d)
        () => {
          const k = randInt(rng, 2, 4);
          const b = nonzero(rng, -5, 5);
          const c = randInt(rng, 2, 4);
          const d = nonzero(rng, -5, 5);
          return {
            instructionId: "expand" as const,
            promptTex: `${k}${parenLinear(1, b, variable)}${parenLinear(c, d, variable)}`,
            solutionTex: aligned([
              `${k}\\bigl(${quadratic(c, d + b * c, b * d, variable)}\\bigr)`,
              `= ${quadratic(k * c, k * (d + b * c), k * b * d, variable)}`,
            ]),
          };
        },

        // (x^2 + p x + q)(x + r)
        () => {
          const p = nonzero(rng, -4, 4);
          const q = nonzero(rng, -5, 5);
          const r = nonzero(rng, -5, 5);
          return {
            instructionId: "expand" as const,
            promptTex: `(${quadratic(1, p, q, variable)})${parenLinear(1, r, variable)}`,
            solutionTex: aligned([
              `${variable}(${quadratic(1, p, q, variable)}) ${signed(r)}(${quadratic(1, p, q, variable)})`,
              `= ${polyTex(variable, [1, p + r, q + p * r, q * r])}`,
            ]),
          };
        },
      ],
    };

    const generateSelectedTemplate = pick(
      rng,
      templatesByDifficulty[difficulty],
    );
    return generateSelectedTemplate() as GeneratedProblem;
  },
);
