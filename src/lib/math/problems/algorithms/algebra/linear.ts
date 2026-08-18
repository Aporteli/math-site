import type { GeneratedProblem } from "../types";
import {
  buildFractionLinearProblem,
  defineAlgebraProblem,
  distinctNonzero,
  selectVariable,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

export const linearLcdDynamicProblem = defineAlgebraProblem(
  "linear-lcd-dynamic",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // x/a + b/c = RHS
        () => {
          const solution = nonzero(rng, -6, 6);
          const denX = randInt(rng, 2, 5);
          const num = nonzero(rng, -5, 5);
          const denC = randInt(rng, 2, 5);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, d: denX },
            { b: num, d: denC },
          ]);
        },

        // x/a + x/b = RHS
        () => {
          const solution = nonzero(rng, -6, 6);
          const denA = randInt(rng, 2, 4);
          const denB = randInt(rng, 5, 7);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, d: denA },
            { a: 1, d: denB },
          ]);
        },

        // ax/b - dx/e = RHS
        () => {
          const solution = nonzero(rng, -5, 5);
          const numA = randInt(rng, 2, 4);
          const denB = randInt(rng, 2, 4);
          const numD = randInt(rng, 1, 3);
          const denE = randInt(rng, 5, 6);
          return buildFractionLinearProblem(variable, solution, [
            { a: numA, d: denB },
            { k: -1, a: numD, d: denE },
          ]);
        },

        // (x + a)/b = RHS
        () => {
          const solution = randInt(rng, -6, 6);
          const shift = nonzero(rng, -8, 8);
          const den = randInt(rng, 2, 6);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, b: shift, d: den },
          ]);
        },

        // ax/b + c/d = RHS
        () => {
          const solution = nonzero(rng, -5, 5);
          const numA = randInt(rng, 2, 4);
          const denB = randInt(rng, 2, 5);
          const numC = nonzero(rng, -4, 4);
          const denD = randInt(rng, 2, 4);
          return buildFractionLinearProblem(variable, solution, [
            { a: numA, d: denB },
            { b: numC, d: denD },
          ]);
        },

        // x/a - b = RHS
        () => {
          const solution = nonzero(rng, -6, 6);
          const den = randInt(rng, 2, 6);
          const shift = nonzero(rng, -5, 5);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, d: den },
            { b: -shift },
          ]);
        },

        // a - x/b = RHS
        () => {
          const solution = nonzero(rng, -6, 6);
          const constant = nonzero(rng, -6, 6);
          const den = randInt(rng, 2, 6);
          return buildFractionLinearProblem(variable, solution, [
            { b: constant },
            { k: -1, a: 1, d: den },
          ]);
        },

        // (x - a)/b = RHS
        () => {
          const solution = randInt(rng, -6, 6);
          const shift = randInt(rng, 1, 8);
          const den = randInt(rng, 2, 6);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, b: -shift, d: den },
          ]);
        },

        // ax/b = RHS
        () => {
          const solution = nonzero(rng, -8, 8);
          const num = randInt(rng, 2, 6);
          const den = randInt(rng, 2, 7);
          return buildFractionLinearProblem(variable, solution, [
            { a: num, d: den },
          ]);
        },

        // x/a + x/a = RHS  (same denominator twice, then combine)
        () => {
          const solution = nonzero(rng, -6, 6);
          const den = randInt(rng, 2, 7);
          const extra = nonzero(rng, -5, 5);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, d: den },
            { a: 1, d: den },
            { b: extra },
          ]);
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // (x + a)/b = (x - c)/d
        () => {
          const solution = randInt(rng, -6, 6);
          const denLeft = randInt(rng, 2, 4);
          const denRight = randInt(rng, 5, 7);
          const factor = nonzero(rng, -2, 2);
          return buildFractionLinearProblem(
            variable,
            solution,
            [{ a: 1, b: factor * denLeft - solution, d: denLeft }],
            [{ a: 1, b: -(solution - factor * denRight), d: denRight }],
          );
        },

        // (ax + b)/c + d = RHS
        () => {
          const solution = nonzero(rng, -5, 5);
          const numA = randInt(rng, 2, 4);
          const constB = nonzero(rng, -5, 5);
          const denC = randInt(rng, 2, 4);
          const extra = nonzero(rng, -4, 4);
          return buildFractionLinearProblem(variable, solution, [
            { a: numA, b: constB, d: denC },
            { b: extra },
          ]);
        },

        // (x + a)/b - (x - c)/d = RHS
        () => {
          const solution = randInt(rng, -5, 5);
          const constA = nonzero(rng, -5, 5);
          const denB = randInt(rng, 2, 4);
          const constC = nonzero(rng, -5, 5);
          const denD = randInt(rng, 5, 7);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, b: constA, d: denB },
            { k: -1, a: 1, b: constC, d: denD },
          ]);
        },

        // (ax + b)/c + (dx + e)/f = RHS
        () => {
          const solution = randInt(rng, -5, 5);
          return buildFractionLinearProblem(variable, solution, [
            {
              a: randInt(rng, 1, 3),
              b: nonzero(rng, -4, 4),
              d: randInt(rng, 2, 4),
            },
            {
              a: randInt(rng, 1, 3),
              b: nonzero(rng, -4, 4),
              d: randInt(rng, 5, 6),
            },
          ]);
        },

        // x/2 + (bx + c)/3 = (ex - f)/4
        () => {
          const solution = nonzero(rng, -4, 4);
          const coefB = randInt(rng, 1, 2);
          const constC = nonzero(rng, -3, 3);
          const coefE = randInt(rng, 1, 2);
          const constF =
            coefE * solution -
            Math.round((6 * solution + 4 * (coefB * solution + constC)) / 3);
          return buildFractionLinearProblem(
            variable,
            solution,
            [
              { a: 1, d: 2 },
              { a: coefB, b: constC, d: 3 },
            ],
            [{ a: coefE, b: -constF, d: 4 }],
          );
        },

        // x/a + x/b + x/c = RHS
        () => {
          const solution = nonzero(rng, -5, 5);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, d: 2 },
            { a: 1, d: 3 },
            { a: 1, d: 6 },
          ]);
        },

        // a(x + b)/c = RHS
        () => {
          const solution = nonzero(rng, -6, 6);
          const outer = randInt(rng, 2, 4);
          const shift = nonzero(rng, -5, 5);
          const den = randInt(rng, 2, 5);
          return buildFractionLinearProblem(variable, solution, [
            { k: outer, a: 1, b: shift, d: den },
          ]);
        },

        // (x + a)/b + (x + c)/d = RHS
        () => {
          const solution = randInt(rng, -5, 5);
          const constA = distinctNonzero(rng, -5, 5, [0]);
          const constC = distinctNonzero(rng, -5, 5, [constA]);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, b: constA, d: randInt(rng, 2, 4) },
            { a: 1, b: constC, d: randInt(rng, 5, 7) },
          ]);
        },

        // x/a = (x + b)/c
        () => {
          const solution = nonzero(rng, -6, 6);
          const denA = randInt(rng, 2, 4);
          const denC = randInt(rng, 5, 8);
          const shift = nonzero(rng, -5, 5);
          return buildFractionLinearProblem(
            variable,
            solution,
            [{ a: 1, d: denA }],
            [{ a: 1, b: shift, d: denC }],
          );
        },

        // ax + b/c = RHS
        () => {
          const solution = nonzero(rng, -5, 5);
          const coef = randInt(rng, 2, 5);
          const num = nonzero(rng, -6, 6);
          const den = randInt(rng, 2, 6);
          return buildFractionLinearProblem(variable, solution, [
            { a: coef },
            { b: num, d: den },
          ]);
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // a(x + b)/c - d(x - e)/f = RHS
        () => {
          const solution = randInt(rng, -5, 5);
          return buildFractionLinearProblem(variable, solution, [
            {
              k: randInt(rng, 2, 3),
              a: 1,
              b: nonzero(rng, -4, 4),
              d: randInt(rng, 2, 4),
            },
            {
              k: -randInt(rng, 2, 3),
              a: 1,
              b: nonzero(rng, -4, 4),
              d: randInt(rng, 5, 6),
            },
          ]);
        },

        // (ax + b)/2 - (dx + e)/3 = (gx + h)/6
        () => {
          const solution = nonzero(rng, -4, 4);
          const coefA = randInt(rng, 2, 4);
          const constB = nonzero(rng, -4, 4);
          const coefD = randInt(rng, 1, 3);
          const constE = nonzero(rng, -4, 4);
          const coefG = randInt(rng, 1, 2);
          const constH =
            3 * (coefA * solution + constB) -
            2 * (coefD * solution + constE) -
            coefG * solution;
          return buildFractionLinearProblem(
            variable,
            solution,
            [
              { a: coefA, b: constB, d: 2 },
              { k: -1, a: coefD, b: constE, d: 3 },
            ],
            [{ a: coefG, b: constH, d: 6 }],
          );
        },

        // (ax + b)/c - (dx - e)/f + g = RHS
        () => {
          const solution = randInt(rng, -4, 4);
          return buildFractionLinearProblem(variable, solution, [
            {
              a: randInt(rng, 2, 4),
              b: nonzero(rng, -4, 4),
              d: randInt(rng, 2, 4),
            },
            {
              k: -1,
              a: randInt(rng, 2, 3),
              b: nonzero(rng, -4, 4),
              d: randInt(rng, 5, 6),
            },
            { b: nonzero(rng, -4, 4) },
          ]);
        },

        // a(bx + c)/2 + e(fx - g)/3 = (kx + m)/6
        () => {
          const solution = nonzero(rng, -4, 4);
          const outerA = 2;
          const coefB = randInt(rng, 1, 2);
          const constC = nonzero(rng, -3, 3);
          const outerE = 2;
          const coefF = randInt(rng, 1, 2);
          const constG = nonzero(rng, -3, 3);
          const coefK = randInt(rng, 1, 3);
          const constM =
            3 * outerA * (coefB * solution + constC) +
            2 * outerE * (coefF * solution - constG) -
            coefK * solution;
          return buildFractionLinearProblem(
            variable,
            solution,
            [
              { k: outerA, a: coefB, b: constC, d: 2 },
              { k: outerE, a: coefF, b: -constG, d: 3 },
            ],
            [{ a: coefK, b: constM, d: 6 }],
          );
        },

        // a(x + b)/c + d(x + e)/f = RHS
        () => {
          const solution = randInt(rng, -4, 4);
          return buildFractionLinearProblem(variable, solution, [
            {
              k: randInt(rng, 2, 3),
              a: randInt(rng, 1, 2),
              b: nonzero(rng, -4, 4),
              d: randInt(rng, 2, 4),
            },
            {
              k: randInt(rng, 2, 3),
              a: randInt(rng, 1, 2),
              b: nonzero(rng, -4, 4),
              d: randInt(rng, 5, 6),
            },
          ]);
        },

        // (ax + b)/c = (dx + e)/f + g
        () => {
          const solution = nonzero(rng, -4, 4);
          const extra = nonzero(rng, -3, 3);
          return buildFractionLinearProblem(
            variable,
            solution,
            [
              {
                a: randInt(rng, 2, 4),
                b: nonzero(rng, -4, 4),
                d: randInt(rng, 2, 4),
              },
            ],
            [
              {
                a: randInt(rng, 1, 3),
                b: nonzero(rng, -4, 4),
                d: randInt(rng, 5, 7),
              },
              { b: extra },
            ],
          );
        },

        // x/2 - (x + a)/3 + (x - b)/6 = RHS
        () => {
          const solution = randInt(rng, -5, 5);
          const constA = nonzero(rng, -4, 4);
          const constB = nonzero(rng, -4, 4);
          return buildFractionLinearProblem(variable, solution, [
            { a: 1, d: 2 },
            { k: -1, a: 1, b: constA, d: 3 },
            { a: 1, b: -constB, d: 6 },
          ]);
        },

        // a(x - b)/c - (dx + e)/f = (x + g)/h
        () => {
          const solution = nonzero(rng, -4, 4);
          return buildFractionLinearProblem(
            variable,
            solution,
            [
              {
                k: randInt(rng, 2, 3),
                a: 1,
                b: -randInt(rng, 1, 4),
                d: randInt(rng, 2, 4),
              },
              {
                k: -1,
                a: randInt(rng, 1, 3),
                b: nonzero(rng, -4, 4),
                d: 3,
              },
            ],
            [{ a: 1, b: nonzero(rng, -4, 4), d: 6 }],
          );
        },

        // (ax - b)/c + (dx - e)/f - g = RHS
        () => {
          const solution = randInt(rng, -4, 4);
          return buildFractionLinearProblem(variable, solution, [
            {
              a: randInt(rng, 2, 4),
              b: -randInt(rng, 1, 5),
              d: randInt(rng, 2, 4),
            },
            {
              a: randInt(rng, 1, 3),
              b: -randInt(rng, 1, 4),
              d: randInt(rng, 5, 6),
            },
            { b: -nonzero(rng, -4, 4) },
          ]);
        },

        // 2(3x + a)/4 - (x - b)/3 = (x + c)/6
        () => {
          const solution = nonzero(rng, -4, 4);
          const constA = nonzero(rng, -3, 3);
          const constB = nonzero(rng, -3, 3);
          const coefRight = 1;
          const constC =
            3 * (3 * solution + constA) -
            2 * (solution - constB) -
            coefRight * solution;
          return buildFractionLinearProblem(
            variable,
            solution,
            [
              { k: 2, a: 3, b: constA, d: 4 },
              { k: -1, a: 1, b: -constB, d: 3 },
            ],
            [{ a: coefRight, b: constC, d: 6 }],
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
