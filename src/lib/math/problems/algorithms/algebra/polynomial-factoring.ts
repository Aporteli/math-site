import type { GeneratedProblem } from "../types";
import {
  aligned,
  defineAlgebraProblem,
  distinctNonzero,
  gcd,
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

export const polynomialFactoringProblem = defineAlgebraProblem(
  "polynomial-factoring",
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
        // kx + kb
        () => {
          const k = randInt(rng, 2, 9);
          const b = nonzero(rng, -8, 8);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: k, body: variable },
              { coef: k * b, body: "" },
            ]),
            solutionTex: aligned([
              `${k}(${variable} ${signed(b)})`,
              `= ${k}${parenLinear(1, b, variable)}`,
            ]),
          };
        },

        // ax^2 + bx
        () => {
          const a = randInt(rng, 2, 7);
          const b = nonzero(rng, -9, 9);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [a, b, 0]),
            solutionTex: aligned([
              `${variable}(${term(a, variable)} ${signed(b)})`,
              `= ${variable}${parenLinear(a, b, variable)}`,
            ]),
          };
        },

        // x^2 - n^2
        () => {
          const n = randInt(rng, 2, 12);
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(1, 0, -(n * n), variable),
            solutionTex: aligned([
              `${variable}^2 - ${n}^2`,
              `= ${parenLinear(1, -n, variable)}${parenLinear(1, n, variable)}`,
            ]),
          };
        },

        // (x + p)(x + q), mixed signs
        () => {
          const p = nonzero(rng, -7, 7);
          const q = distinctNonzero(rng, -7, 7, [p, -p]);
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(1, p + q, p * q, variable),
            solutionTex: aligned([
              `${parenLinear(1, p, variable)}${parenLinear(1, q, variable)}`,
            ]),
          };
        },

        // k(x^2 + n), inner does not factor over the reals
        () => {
          const k = randInt(rng, 2, 6);
          const n = randInt(rng, 2, 9);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [k, 0, k * n]),
            solutionTex: aligned([`${k}(${variable}^2 + ${n})`]),
          };
        },

        // ax + ay
        () => {
          const a = randInt(rng, 2, 9);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: a, body: variable },
              { coef: a, body: u },
            ]),
            solutionTex: aligned([
              `${a}(${variable} + ${u})`,
            ]),
          };
        },

        // x^3 + a x^2
        () => {
          const a = nonzero(rng, -8, 8);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [1, a, 0, 0]),
            solutionTex: aligned([
              `${variable}^2(${variable} ${signed(a)})`,
              `= ${variable}^2${parenLinear(1, a, variable)}`,
            ]),
          };
        },

        // -(ax + b)
        () => {
          const a = randInt(rng, 1, 6);
          const b = randInt(rng, 1, 9);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: -a, body: variable },
              { coef: -b, body: "" },
            ]),
            solutionTex: aligned([
              `-(${term(a, variable)} + ${b})`,
              a === 1
                ? `= -${parenLinear(1, b, variable)}`
                : `= -${a}${parenLinear(1, b, variable)}`,
            ]),
          };
        },

        // (x ± n)^2
        () => {
          const n = randInt(rng, 2, 8);
          const sign = rng() < 0.5 ? 1 : -1;
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(1, 2 * sign * n, n * n, variable),
            solutionTex: aligned([
              `${variable}^2 ${sign > 0 ? "+" : "-"} 2\\cdot${n}${variable} + ${n}^2`,
              `= ${parenLinear(1, sign * n, variable)}^2`,
            ]),
          };
        },

        // (x - p)(x - q), both roots positive
        () => {
          const p = randInt(rng, 1, 8);
          let q = randInt(rng, 1, 8);
          while (q === p) q = randInt(rng, 1, 8);
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(1, -(p + q), p * q, variable),
            solutionTex: aligned([
              `${parenLinear(1, -p, variable)}${parenLinear(1, -q, variable)}`,
            ]),
          };
        },

        // ax^3 + bx^2
        () => {
          const g = randInt(rng, 2, 5);
          const a = randInt(rng, 1, 4);
          const b = nonzero(rng, -6, 6);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [g * a, g * b, 0, 0]),
            solutionTex: aligned([
              `${g}${variable}^2(${term(a, variable)} ${signed(b)})`,
              `= ${g}${variable}^2${parenLinear(a, b, variable)}`,
            ]),
          };
        },

        // k(x^2 + x + n) with n ≥ 2 so it stays a GCF pull
        () => {
          const k = randInt(rng, 2, 5);
          const n = randInt(rng, 3, 8);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [k, k, k * n]),
            solutionTex: aligned([
              `${k}(${variable}^2 + ${variable} + ${n})`,
            ]),
          };
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // (ax + p)(x + q)
        () => {
          const a = randInt(rng, 2, 5);
          let p = nonzero(rng, -6, 6);
          while (gcd(a, Math.abs(p)) > 1) p = nonzero(rng, -6, 6);
          const q = nonzero(rng, -6, 6);
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(a, a * q + p, p * q, variable),
            solutionTex: aligned([
              `${parenLinear(a, p, variable)}${parenLinear(1, q, variable)}`,
            ]),
          };
        },

        // (ax)^2 - b^2
        () => {
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 9);
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(a * a, 0, -(b * b), variable),
            solutionTex: aligned([
              `(${term(a, variable)})^2 - ${b}^2`,
              `= ${parenLinear(a, -b, variable)}${parenLinear(a, b, variable)}`,
            ]),
          };
        },

        // (ax ± n)^2
        () => {
          const a = randInt(rng, 2, 5);
          const n = randInt(rng, 1, 6);
          const sign = rng() < 0.5 ? 1 : -1;
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(a * a, 2 * sign * a * n, n * n, variable),
            solutionTex: aligned([
              `(${term(a, variable)})^2 ${sign > 0 ? "+" : "-"} 2\\cdot${term(a, variable)}\\cdot${n} + ${n}^2`,
              `= ${parenLinear(a, sign * n, variable)}^2`,
            ]),
          };
        },

        // (x^2 + p)(x + q) by grouping
        () => {
          const p = randInt(rng, 2, 8);
          const q = nonzero(rng, -6, 6);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [1, q, p, p * q]),
            solutionTex: aligned([
              `${variable}^2${parenLinear(1, q, variable)} + ${p}${parenLinear(1, q, variable)}`,
              `= (${variable}^2 + ${p})${parenLinear(1, q, variable)}`,
            ]),
          };
        },

        // k(x^2 - n^2)
        () => {
          const k = randInt(rng, 2, 8);
          const n = randInt(rng, 2, 7);
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(k, 0, -(k * n * n), variable),
            solutionTex: aligned([
              `${k}(${variable}^2 - ${n * n})`,
              `= ${k}${parenLinear(1, -n, variable)}${parenLinear(1, n, variable)}`,
            ]),
          };
        },

        // (ax + p)(bx + q)
        () => {
          const a = randInt(rng, 2, 4);
          const b = randInt(rng, 2, 4);
          let p = nonzero(rng, -5, 5);
          while (gcd(a, Math.abs(p)) > 1) p = nonzero(rng, -5, 5);
          let q = nonzero(rng, -5, 5);
          while (gcd(b, Math.abs(q)) > 1) q = nonzero(rng, -5, 5);
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(a * b, a * q + b * p, p * q, variable),
            solutionTex: aligned([
              `${parenLinear(a, p, variable)}${parenLinear(b, q, variable)}`,
            ]),
          };
        },

        // xy + ay + bx + ab
        () => {
          const a = nonzero(rng, -6, 6);
          const b = nonzero(rng, -6, 6);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: 1, body: `${variable}${u}` },
              { coef: a, body: u },
              { coef: b, body: variable },
              { coef: a * b, body: "" },
            ]),
            solutionTex: aligned([
              `${variable}(${u} ${signed(b)}) + ${a}(${u} ${signed(b)})`,
              `= ${parenLinear(1, b, u)}${parenLinear(1, a, variable)}`,
            ]),
          };
        },

        // k(x + p)(x + q)
        () => {
          const k = randInt(rng, 2, 6);
          const p = nonzero(rng, -6, 6);
          const q = distinctNonzero(rng, -6, 6, [p, -p]);
          return {
            instructionId: "factor" as const,
            promptTex: quadratic(k, k * (p + q), k * p * q, variable),
            solutionTex: aligned([
              `${k}\\bigl(${quadratic(1, p + q, p * q, variable)}\\bigr)`,
              `= ${k}${parenLinear(1, p, variable)}${parenLinear(1, q, variable)}`,
            ]),
          };
        },

        // x^2 + 2xy + y^2
        () => {
          const sign = rng() < 0.5 ? 1 : -1;
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: 1, body: `${variable}^2` },
              { coef: 2 * sign, body: `${variable}${u}` },
              { coef: 1, body: `${u}^2` },
            ]),
            solutionTex: aligned([
              `(${variable} ${sign > 0 ? "+" : "-"} ${u})^2`,
            ]),
          };
        },

        // x(x + p)(x + q)
        () => {
          const p = nonzero(rng, -6, 6);
          const q = distinctNonzero(rng, -6, 6, [p, -p]);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [1, p + q, p * q, 0]),
            solutionTex: aligned([
              `${variable}\\bigl(${quadratic(1, p + q, p * q, variable)}\\bigr)`,
              `= ${variable}${parenLinear(1, p, variable)}${parenLinear(1, q, variable)}`,
            ]),
          };
        },

        // x^2 - n^2 y^2
        () => {
          const n = randInt(rng, 2, 7);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: 1, body: `${variable}^2` },
              { coef: -(n * n), body: `${u}^2` },
            ]),
            solutionTex: aligned([
              `${variable}^2 - (${n}${u})^2`,
              `= (${variable} - ${n}${u})(${variable} + ${n}${u})`,
            ]),
          };
        },

        // ax + ay + bx + by
        () => {
          const a = nonzero(rng, -6, 6);
          const b = distinctNonzero(rng, -6, 6, [a, -a]);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: a, body: variable },
              { coef: a, body: u },
              { coef: b, body: variable },
              { coef: b, body: u },
            ]),
            solutionTex: aligned([
              `${a}(${variable} + ${u}) + ${b}(${variable} + ${u})`,
              `= (${a} ${signed(b)})(${variable} + ${u})`,
              `= ${
                a + b === 1
                  ? `(${variable} + ${u})`
                  : a + b === -1
                    ? `-(${variable} + ${u})`
                    : `${a + b}(${variable} + ${u})`
              }`,
            ]),
          };
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // x^3 ± n^3
        () => {
          const n = randInt(rng, 2, 6);
          const isMinus = rng() < 0.5;
          const linearFactor = parenLinear(1, isMinus ? -n : n, variable);
          const mid = isMinus ? "+" : "-";
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [1, 0, 0, isMinus ? -(n ** 3) : n ** 3]),
            solutionTex: aligned([
              `${variable}^3 ${isMinus ? "-" : "+"} ${n}^3`,
              `= ${linearFactor}(${variable}^2 ${mid} ${term(n, variable)} + ${n * n})`,
            ]),
          };
        },

        // (ax)^3 ± b^3
        () => {
          const a = randInt(rng, 2, 3);
          const b = randInt(rng, 1, 4);
          const isMinus = rng() < 0.5;
          const outer = isMinus ? -b : b;
          const mid = isMinus ? "+" : "-";
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [
              a ** 3,
              0,
              0,
              isMinus ? -(b ** 3) : b ** 3,
            ]),
            solutionTex: aligned([
              `(${term(a, variable)})^3 ${isMinus ? "-" : "+"} ${b}^3`,
              `= ${parenLinear(a, outer, variable)}(${a * a}${variable}^2 ${mid} ${term(a * b, variable)} + ${b * b})`,
            ]),
          };
        },

        // x^4 - n^4
        () => {
          const n = randInt(rng, 2, 5);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [1, 0, 0, 0, -(n ** 4)]),
            solutionTex: aligned([
              `(${variable}^2 - ${n * n})(${variable}^2 + ${n * n})`,
              `= ${parenLinear(1, -n, variable)}${parenLinear(1, n, variable)}(${variable}^2 + ${n * n})`,
            ]),
          };
        },

        // (x^2 + p)(x^2 + q)
        () => {
          const p = nonzero(rng, -8, 8);
          const q = distinctNonzero(rng, -8, 8, [p]);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [1, 0, p + q, 0, p * q]),
            solutionTex: aligned([
              `(${variable}^2 ${signed(p)})(${variable}^2 ${signed(q)})`,
            ]),
          };
        },

        // a^2 x^2 - b^2 y^2
        () => {
          const a = randInt(rng, 2, 6);
          const b = randInt(rng, 2, 7);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: a * a, body: `${variable}^2` },
              { coef: -(b * b), body: `${u}^2` },
            ]),
            solutionTex: aligned([
              `(${term(a, variable)})^2 - (${term(b, u)})^2`,
              `= (${term(a, variable)} - ${term(b, u)})(${term(a, variable)} + ${term(b, u)})`,
            ]),
          };
        },

        // (x^2 + s x + t)(x + r)
        () => {
          const s = nonzero(rng, -4, 4);
          const t = nonzero(rng, -5, 5);
          const r = nonzero(rng, -5, 5);
          const a = 1;
          const b = s + r;
          const c = t + s * r;
          const d = t * r;
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [a, b, c, d]),
            solutionTex: aligned([
              `(${quadratic(1, s, t, variable)})${parenLinear(1, r, variable)}`,
            ]),
          };
        },

        // (x^2 + p x + q)(x^2 + r x + s)
        () => {
          const p = nonzero(rng, -3, 3);
          const q = nonzero(rng, -4, 4);
          const r = distinctNonzero(rng, -3, 3, [p]);
          const s = distinctNonzero(rng, -4, 4, [q]);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [
              1,
              p + r,
              q + s + p * r,
              p * s + q * r,
              q * s,
            ]),
            solutionTex: aligned([
              `(${quadratic(1, p, q, variable)})(${quadratic(1, r, s, variable)})`,
            ]),
          };
        },

        // (x + p)(x^2 - n^2) → three linear factors
        () => {
          const n = randInt(rng, 2, 5);
          const p = distinctNonzero(rng, -6, 6, [n, -n]);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [1, p, -(n * n), -p * n * n]),
            solutionTex: aligned([
              `${parenLinear(1, p, variable)}(${variable}^2 - ${n * n})`,
              `= ${parenLinear(1, p, variable)}${parenLinear(1, -n, variable)}${parenLinear(1, n, variable)}`,
            ]),
          };
        },

        // (ax + by)(cx + dy)
        () => {
          const a = randInt(rng, 2, 5);
          const b = nonzero(rng, -5, 5);
          const c = randInt(rng, 1, 4);
          const d = nonzero(rng, -5, 5);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: a * c, body: `${variable}^2` },
              { coef: a * d + b * c, body: `${variable}${u}` },
              { coef: b * d, body: `${u}^2` },
            ]),
            solutionTex: aligned([
              `${parenTerms([
                { coef: a, body: variable },
                { coef: b, body: u },
              ])}${parenTerms([
                { coef: c, body: variable },
                { coef: d, body: u },
              ])}`,
            ]),
          };
        },

        // k(x^4 - n^4)
        () => {
          const k = randInt(rng, 2, 4);
          const n = randInt(rng, 2, 3);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [k, 0, 0, 0, -(k * n ** 4)]),
            solutionTex: aligned([
              `${k}(${variable}^4 - ${n ** 4})`,
              `= ${k}(${variable}^2 - ${n * n})(${variable}^2 + ${n * n})`,
              `= ${k}${parenLinear(1, -n, variable)}${parenLinear(1, n, variable)}(${variable}^2 + ${n * n})`,
            ]),
          };
        },

        // (x + y)^2 - n^2
        () => {
          const n = randInt(rng, 2, 6);
          return {
            instructionId: "factor" as const,
            promptTex: joinTerms([
              { coef: 1, body: `${variable}^2` },
              { coef: 2, body: `${variable}${u}` },
              { coef: 1, body: `${u}^2` },
              { coef: -(n * n), body: "" },
            ]),
            solutionTex: aligned([
              `(${variable} + ${u})^2 - ${n}^2`,
              `= (${variable} + ${u} - ${n})(${variable} + ${u} + ${n})`,
            ]),
          };
        },

        // x^6 - n^6
        () => {
          const n = pick(rng, [2, 3] as const);
          return {
            instructionId: "factor" as const,
            promptTex: polyTex(variable, [1, 0, 0, 0, 0, 0, -(n ** 6)]),
            solutionTex: aligned([
              `(${variable}^3 - ${n ** 3})(${variable}^3 + ${n ** 3})`,
              `= ${parenLinear(1, -n, variable)}(${variable}^2 + ${term(n, variable)} + ${n * n})${parenLinear(1, n, variable)}(${variable}^2 - ${term(n, variable)} + ${n * n})`,
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
