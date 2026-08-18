import type { GeneratedProblem } from "../types";
import {
  defineAlgebraProblem,
  linear,
  selectVariable,
  signed,
} from "./helpers";
import { nonzero, pick, randInt } from "../rng";

function plusK(expr: string, k: number): string {
  if (k === 0) return expr;
  return k > 0 ? `${expr} + ${k}` : `${expr} - ${-k}`;
}

function scaleBody(a: number, body: string): string {
  if (a === 1) return body;
  if (a === -1) return `-${body}`;
  return `${a}${body}`;
}

function absTex(inner: string): string {
  return `\\lvert ${inner} \\rvert`;
}

function sqrt(inner: string | number): string {
  return `\\sqrt{${inner}}`;
}

function sqShift(variable: string, h: number): string {
  return h === 0 ? `${variable}^{2}` : `(${linear(1, -h, variable)})^{2}`;
}

function cubeShift(variable: string, h: number): string {
  return h === 0 ? `${variable}^{3}` : `(${linear(1, -h, variable)})^{3}`;
}

function jsInner(variable: string, h: number): string {
  if (h === 0) return variable;
  return h > 0 ? `${variable}-${h}` : `${variable}+${-h}`;
}

function jsPlus(expr: string, k: number): string {
  if (k === 0) return expr;
  return k > 0 ? `${expr}+${k}` : `${expr}${k}`;
}

function jsScale(a: number, body: string): string {
  if (a === 1) return body;
  if (a === -1) return `-${body}`;
  return `${a}*${body}`;
}

function vertexPt(h: number, k: number): string {
  return `(${h}, ${k})`;
}

function gOfF(variable: string, a: number, h: number, k: number): string {
  const arg = h === 0 ? variable : linear(1, -h, variable);
  const call = `f(${arg})`;
  return plusK(scaleBody(a, call), k);
}

function problem(
  instructionId: GeneratedProblem["instructionId"],
  promptTex: string,
  answer: string,
  graphExpr = "",
): GeneratedProblem {
  return {
    instructionId,
    promptTex,
    solutionTex: answer,
    graphExpr,
  } as GeneratedProblem;
}

export const graphicalTransformationsProblem = defineAlgebraProblem(
  "graphical-transformations",
  ["easy", "medium", "hard"],
  ["7", "8", "9", "10", "11", "12"],
  ({ rng, difficulty }): GeneratedProblem => {
    const variable = selectVariable(rng, difficulty);

    const templatesByDifficulty = {
      // ==========================================
      // --- 1. მარტივი დონე ---
      // ==========================================
      easy: [
        // y = x² + k
        () => {
          const k = nonzero(rng, -8, 8);
          const ans = plusK(`${variable}^{2}`, k);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = f(${variable}) ${signed(k)},\\; g(${variable})`,
            ans,
            jsPlus(`${variable}^2`, k),
          );
        },

        // y = (x - h)²
        () => {
          const h = nonzero(rng, -8, 8);
          const ans = sqShift(variable, h);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = f(${linear(1, -h, variable)}),\\; g(${variable})`,
            ans,
            `(${jsInner(variable, h)})^2`,
          );
        },

        // y = |x| + k
        () => {
          const k = nonzero(rng, -8, 8);
          const ans = plusK(absTex(variable), k);
          return problem(
            "simplify",
            `f(${variable}) = ${absTex(variable)},\\; g(${variable}) = f(${variable}) ${signed(k)},\\; g(${variable})`,
            ans,
            jsPlus(`abs(${variable})`, k),
          );
        },

        // y = |x - h|
        () => {
          const h = nonzero(rng, -8, 8);
          const inner = linear(1, -h, variable);
          const ans = absTex(inner);
          return problem(
            "simplify",
            `f(${variable}) = ${absTex(variable)},\\; g(${variable}) = f(${inner}),\\; g(${variable})`,
            ans,
            `abs(${jsInner(variable, h)})`,
          );
        },

        // y = √x + k
        () => {
          const k = nonzero(rng, -8, 8);
          const ans = plusK(sqrt(variable), k);
          return problem(
            "simplify",
            `f(${variable}) = ${sqrt(variable)},\\; g(${variable}) = f(${variable}) ${signed(k)},\\; g(${variable})`,
            ans,
            jsPlus(`sqrt(${variable})`, k),
          );
        },

        // y = x + k
        () => {
          const k = nonzero(rng, -9, 9);
          const ans = linear(1, k, variable);
          return problem(
            "simplify",
            `f(${variable}) = ${variable},\\; g(${variable}) = f(${variable}) ${signed(k)},\\; g(${variable})`,
            ans,
            jsPlus(variable, k),
          );
        },

        // y = -x²
        () => {
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = -f(${variable}),\\; g(${variable})`,
            `-${variable}^{2}`,
            `-${variable}^2`,
          );
        },

        // f(p)=q, g = f + k, g(p)
        () => {
          const p = randInt(rng, -8, 8);
          const q = randInt(rng, -8, 8);
          const k = nonzero(rng, -8, 8);
          return problem(
            "evaluate",
            `f(${p}) = ${q},\\; g(${variable}) = f(${variable}) ${signed(k)},\\; g(${p})`,
            `${q + k}`,
          );
        },

        // V of (x - h)² + k
        () => {
          const h = nonzero(rng, -6, 6);
          const k = nonzero(rng, -6, 6);
          const expr = plusK(sqShift(variable, h), k);
          return problem(
            "evaluate",
            `y = ${expr},\\; V`,
            vertexPt(h, k),
            jsPlus(`(${jsInner(variable, h)})^2`, k),
          );
        },

        // g(t) for x² + k
        () => {
          const k = nonzero(rng, -8, 8);
          const t = randInt(rng, -6, 6);
          return problem(
            "evaluate",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = f(${variable}) ${signed(k)},\\; g(${t})`,
            `${t * t + k}`,
            jsPlus(`${variable}^2`, k),
          );
        },

        // y = -|x|
        () => {
          return problem(
            "simplify",
            `f(${variable}) = ${absTex(variable)},\\; g(${variable}) = -f(${variable}),\\; g(${variable})`,
            `-${absTex(variable)}`,
            `-abs(${variable})`,
          );
        },

        // V of x² + k
        () => {
          const k = nonzero(rng, -8, 8);
          return problem(
            "evaluate",
            `y = ${plusK(`${variable}^{2}`, k)},\\; V`,
            vertexPt(0, k),
            jsPlus(`${variable}^2`, k),
          );
        },
      ],

      // ==========================================
      // --- 2. საშუალო დონე ---
      // ==========================================
      medium: [
        // y = (x - h)² + k
        () => {
          const h = nonzero(rng, -6, 6);
          const k = nonzero(rng, -6, 6);
          const ans = plusK(sqShift(variable, h), k);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = ${gOfF(variable, 1, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(`(${jsInner(variable, h)})^2`, k),
          );
        },

        // y = |x - h| + k
        () => {
          const h = nonzero(rng, -6, 6);
          const k = nonzero(rng, -6, 6);
          const inner = linear(1, -h, variable);
          const ans = plusK(absTex(inner), k);
          return problem(
            "simplify",
            `f(${variable}) = ${absTex(variable)},\\; g(${variable}) = ${gOfF(variable, 1, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(`abs(${jsInner(variable, h)})`, k),
          );
        },

        // y = √(x - h) + k
        () => {
          const h = nonzero(rng, -6, 6);
          const k = nonzero(rng, -6, 6);
          const inner = linear(1, -h, variable);
          const ans = plusK(sqrt(inner), k);
          return problem(
            "simplify",
            `f(${variable}) = ${sqrt(variable)},\\; g(${variable}) = ${gOfF(variable, 1, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(`sqrt(${jsInner(variable, h)})`, k),
          );
        },

        // y = a x², |a| ≥ 2
        () => {
          const a = distinctStretch(rng);
          const ans = scaleBody(a, `${variable}^{2}`);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = ${a}f(${variable}),\\; g(${variable})`,
            ans,
            jsScale(a, `${variable}^2`),
          );
        },

        // y-axis: f(-x) for x³
        () => {
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{3},\\; g(${variable}) = f(-${variable}),\\; g(${variable})`,
            `-${variable}^{3}`,
            `-${variable}^3`,
          );
        },

        // V of a(x - h)² + k
        () => {
          const a = distinctStretch(rng);
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -5, 5);
          const expr = plusK(scaleBody(a, sqShift(variable, h)), k);
          return problem(
            "evaluate",
            `y = ${expr},\\; V`,
            vertexPt(h, k),
            jsPlus(jsScale(a, `(${jsInner(variable, h)})^2`), k),
          );
        },

        // g(t) for (x - h)² + k
        () => {
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          const t = randInt(rng, -5, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = ${gOfF(variable, 1, h, k)},\\; g(${t})`,
            `${(t - h) * (t - h) + k}`,
            jsPlus(`(${jsInner(variable, h)})^2`, k),
          );
        },

        // y = (x - h)³
        () => {
          const h = nonzero(rng, -6, 6);
          const ans = cubeShift(variable, h);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{3},\\; g(${variable}) = f(${linear(1, -h, variable)}),\\; g(${variable})`,
            ans,
            `(${jsInner(variable, h)})^3`,
          );
        },

        // V of |x - h| + k
        () => {
          const h = nonzero(rng, -6, 6);
          const k = nonzero(rng, -6, 6);
          const expr = plusK(absTex(linear(1, -h, variable)), k);
          return problem(
            "evaluate",
            `y = ${expr},\\; V`,
            vertexPt(h, k),
            jsPlus(`abs(${jsInner(variable, h)})`, k),
          );
        },

        // y = a x² + k
        () => {
          const a = distinctStretch(rng);
          const k = nonzero(rng, -6, 6);
          const ans = plusK(scaleBody(a, `${variable}^{2}`), k);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = ${a}f(${variable}) ${signed(k)},\\; g(${variable})`,
            ans,
            jsPlus(jsScale(a, `${variable}^2`), k),
          );
        },

        // f(p)=q, g(x)=f(x-h), g(p+h)=q
        () => {
          const p = randInt(rng, -6, 6);
          const q = randInt(rng, -8, 8);
          const h = nonzero(rng, -6, 6);
          return problem(
            "evaluate",
            `f(${p}) = ${q},\\; g(${variable}) = f(${linear(1, -h, variable)}),\\; g(${p + h})`,
            `${q}`,
          );
        },

        // y = -√x + k
        () => {
          const k = nonzero(rng, -6, 6);
          const ans = plusK(`-${sqrt(variable)}`, k);
          return problem(
            "simplify",
            `f(${variable}) = ${sqrt(variable)},\\; g(${variable}) = -f(${variable}) ${signed(k)},\\; g(${variable})`,
            ans,
            jsPlus(`-sqrt(${variable})`, k),
          );
        },
      ],

      // ==========================================
      // --- 3. რთული დონე ---
      // ==========================================
      hard: [
        // y = a(x - h)² + k
        () => {
          const a = distinctStretch(rng);
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          const ans = plusK(scaleBody(a, sqShift(variable, h)), k);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = ${gOfF(variable, a, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(jsScale(a, `(${jsInner(variable, h)})^2`), k),
          );
        },

        // y = a|x - h| + k
        () => {
          const a = distinctStretch(rng);
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          const ans = plusK(scaleBody(a, absTex(linear(1, -h, variable))), k);
          return problem(
            "simplify",
            `f(${variable}) = ${absTex(variable)},\\; g(${variable}) = ${gOfF(variable, a, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(jsScale(a, `abs(${jsInner(variable, h)})`), k),
          );
        },

        // y = a√(x - h) + k
        () => {
          const a = distinctStretch(rng);
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          const ans = plusK(scaleBody(a, sqrt(linear(1, -h, variable))), k);
          return problem(
            "simplify",
            `f(${variable}) = ${sqrt(variable)},\\; g(${variable}) = ${gOfF(variable, a, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(jsScale(a, `sqrt(${jsInner(variable, h)})`), k),
          );
        },

        // y = |b x - s|  (horizontal stretch of |x - s|)
        () => {
          const b = pick(rng, [2, 3, 4, -2, -3]);
          const s = nonzero(rng, -6, 6);
          const parentInner = linear(1, -s, variable);
          const newInner = linear(b, -s, variable);
          const ans = absTex(newInner);
          return problem(
            "simplify",
            `f(${variable}) = ${absTex(parentInner)},\\; g(${variable}) = f(${linear(b, 0, variable)}),\\; g(${variable})`,
            ans,
            `abs(${b}*${variable}${s > 0 ? `-${s}` : `+${-s}`})`,
          );
        },

        // y = -(x - h)² + k
        () => {
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          const ans = plusK(`-${sqShift(variable, h)}`, k);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = ${gOfF(variable, -1, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(`-(${jsInner(variable, h)})^2`, k),
          );
        },

        // y-axis of |x - h|: |-x - h| = |x + h|
        () => {
          const h = nonzero(rng, -6, 6);
          const parentInner = linear(1, -h, variable);
          const ans = absTex(linear(1, h, variable));
          return problem(
            "simplify",
            `f(${variable}) = ${absTex(parentInner)},\\; g(${variable}) = f(-${variable}),\\; g(${variable})`,
            ans,
            `abs(${jsInner(variable, -h)})`,
          );
        },

        // y = a f(-(x - h)) + k for x³ → -a(x - h)³ + k
        () => {
          const a = distinctStretch(rng);
          const h = nonzero(rng, -4, 4);
          const k = nonzero(rng, -5, 5);
          const flipped = linear(-1, h, variable);
          const ans = plusK(scaleBody(-a, cubeShift(variable, h)), k);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{3},\\; g(${variable}) = ${plusK(scaleBody(a, `f(${flipped})`), k)},\\; g(${variable})`,
            ans,
            jsPlus(jsScale(-a, `(${jsInner(variable, h)})^3`), k),
          );
        },

        // V after a f(x-h)+k on x²
        () => {
          const a = distinctStretch(rng);
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          return problem(
            "evaluate",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = ${gOfF(variable, a, h, k)},\\; V(g)`,
            vertexPt(h, k),
            jsPlus(jsScale(a, `(${jsInner(variable, h)})^2`), k),
          );
        },

        // f(p)=q, g = a f(x-h)+k, g(p+h)
        () => {
          const p = randInt(rng, -5, 5);
          const q = randInt(rng, -6, 6);
          const a = distinctStretch(rng);
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          return problem(
            "evaluate",
            `f(${p}) = ${q},\\; g(${variable}) = ${gOfF(variable, a, h, k)},\\; g(${p + h})`,
            `${a * q + k}`,
          );
        },

        // y = 1/(x - h) + k
        () => {
          const h = nonzero(rng, -5, 5);
          const k = nonzero(rng, -6, 6);
          const inner = linear(1, -h, variable);
          const ans = plusK(`\\dfrac{1}{${inner}}`, k);
          return problem(
            "simplify",
            `f(${variable}) = \\dfrac{1}{${variable}},\\; g(${variable}) = ${gOfF(variable, 1, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(`1/(${jsInner(variable, h)})`, k),
          );
        },

        // y = a(x - h)³ + k
        () => {
          const a = distinctStretch(rng);
          const h = nonzero(rng, -4, 4);
          const k = nonzero(rng, -5, 5);
          const ans = plusK(scaleBody(a, cubeShift(variable, h)), k);
          return problem(
            "simplify",
            `f(${variable}) = ${variable}^{3},\\; g(${variable}) = ${gOfF(variable, a, h, k)},\\; g(${variable})`,
            ans,
            jsPlus(jsScale(a, `(${jsInner(variable, h)})^3`), k),
          );
        },

        // g(t) for a(x - h)² + k
        () => {
          const a = distinctStretch(rng);
          const h = nonzero(rng, -4, 4);
          const k = nonzero(rng, -6, 6);
          const t = randInt(rng, -5, 5);
          return problem(
            "evaluate",
            `f(${variable}) = ${variable}^{2},\\; g(${variable}) = ${gOfF(variable, a, h, k)},\\; g(${t})`,
            `${a * (t - h) * (t - h) + k}`,
            jsPlus(jsScale(a, `(${jsInner(variable, h)})^2`), k),
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

function distinctStretch(rng: () => number): number {
  return pick(rng, [-4, -3, -2, 2, 3, 4]);
}
