import { z } from "zod";
import { locales } from "@/i18n/config";
import { completeGeminiUserParts, classifyProviderError } from "../ai-complete";
import { repairJsonEscapes } from "../ai-json";
import { AI_MODEL_IDS, DEFAULT_AI_MODEL, getAiModel } from "../ai-models";
import { assertModelAvailable, recordModelUse } from "../ai-limits";
import { rememberProviderWallet } from "../ai-billing";
import type { DiverseGenerateError } from "../ai-schema";
import { adaptExternalTemplate, parseProblemTemplate } from "./adapt";
import type { ImportIssue } from "./audit";
import { problemTemplateSchema, type ProblemTemplate } from "./schema";
import { PROBLEM_DIFFICULTIES, PROBLEM_YEARS } from "../types";

/** Photo OCR often invents a single year/difficulty; open labels so Generate is not blocked. */
function openPhotoFamilyLabels(template: ProblemTemplate): ProblemTemplate {
  return {
    ...template,
    years: [...PROBLEM_YEARS],
    difficulties: [...PROBLEM_DIFFICULTIES],
    variants: template.variants.map((variant) => {
      const { years: _years, difficulties: _difficulties, ...rest } = variant;
      return rest;
    }),
  };
}

export const proposeTemplateSchema = z
  .object({
    locale: z.enum(locales),
    text: z.string().trim().max(4000).optional(),
    image: z
      .object({
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data: z.string().min(32).max(1_200_000),
      })
      .optional(),
    model: z.enum(AI_MODEL_IDS).default(DEFAULT_AI_MODEL),
  })
  .refine((value) => Boolean(value.text) || Boolean(value.image), {
    message: "empty",
  });

export type ProposeTemplateInput = z.infer<typeof proposeTemplateSchema>;

export type ProposeTemplateResult =
  | { ok: true; template: ProblemTemplate; json: string }
  | {
      ok: false;
      error: DiverseGenerateError | "unsupported" | "invalid";
      issues?: ImportIssue[];
      json?: string;
    };

const SOLVE_EXAMPLE = `{
  "id": "linear-one-step",
  "topic": "algebra",
  "difficulties": ["easy"],
  "years": ["7", "8"],
  "instructionId": "solve",
  "variants": [
    {
      "id": "ax-plus-b",
      "params": {
        "v": { "pick": ["x", "y", "n"] },
        "x": { "int": [-8, 8] },
        "a": { "int": [-9, 9], "nonzero": true, "exclude": [1, -1] },
        "b": { "int": [-9, 9], "nonzero": true }
      },
      "derived": { "c": "a * x + b", "rhs": "c - b" },
      "prompt": "{{linear a b v}} = {{c}}",
      "solutionSteps": [
        "{{linear a b v}} &= {{c}}",
        "{{linear a 0 v}} &= {{rhs}}",
        "{{v}} &= {{x}}"
      ]
    }
  ]
}`;

const EXPAND_LINEAR_EXAMPLE = `{
  "id": "expand-linear-both-sides",
  "topic": "algebra",
  "difficulties": ["easy", "medium"],
  "years": ["8", "9"],
  "instructionId": "solve",
  "variants": [
    {
      "id": "a-v-b-plus-c-equals-d-paren",
      "params": {
        "v": { "pick": ["x", "y", "n", "u"] },
        "x": { "int": [-8, 8] },
        "a": { "int": [2, 8], "nonzero": true },
        "b": { "int": [2, 8], "nonzero": true },
        "d": { "int": [2, 9], "nonzero": true },
        "e": { "int": [2, 6], "nonzero": true },
        "f": { "int": [-6, 6], "nonzero": true },
        "g": { "int": [-9, 9], "nonzero": true }
      },
      "derived": { "c": "d * (e * x + f) + g - a * b * x" },
      "prompt": "{{a}}{{v}} \\\\cdot {{b}} {{signed c}} = {{d}}\\\\left({{linear e f v}}\\\\right) {{signed g}}",
      "solutionSteps": [
        "{{a}}{{v}} \\\\cdot {{b}} {{signed c}} &= {{d}}\\\\left({{linear e f v}}\\\\right) {{signed g}}",
        "{{v}} &= {{x}}"
      ]
    }
  ]
}`;

const EVALUATE_EXAMPLE = `{
  "id": "fraction-sum-times",
  "topic": "algebra",
  "difficulties": ["easy"],
  "years": ["7", "8"],
  "instructionId": "evaluate",
  "variants": [
    {
      "id": "a-over-b-plus-c-over-d-times-k",
      "params": {
        "a": { "int": [1, 9], "nonzero": true },
        "b": { "int": [2, 9], "nonzero": true },
        "c": { "int": [1, 9], "nonzero": true },
        "d": { "int": [2, 9], "nonzero": true },
        "k": { "int": [2, 6], "nonzero": true }
      },
      "derived": { "ans": "(a / b + c / d) * k" },
      "constraints": ["mod(a, b)", "mod(c, d)"],
      "prompt": "\\\\left({{texFrac a b}} + {{texFrac c d}}\\\\right) \\\\cdot {{k}}",
      "solutionSteps": [
        "\\\\left({{texFrac a b}} + {{texFrac c d}}\\\\right) \\\\cdot {{k}} &= {{ans}}"
      ]
    }
  ]
}`;

const BINOMIAL_EXAMPLE = `{
  "id": "binomial-general-term",
  "topic": "algebra",
  "difficulties": ["medium", "hard"],
  "years": ["10", "11", "12"],
  "instructionId": "expand",
  "variants": [
    {
      "id": "general-term-identity",
      "params": {
        "n": { "int": [5, 8] },
        "a": { "int": [2, 5], "nonzero": true },
        "p": { "int": [1, 3], "nonzero": true },
        "q": { "int": [1, 2], "nonzero": true }
      },
      "derived": {
        "pn": "p * n",
        "coeff": "p + q"
      },
      "example": { "n": 6, "a": 2, "p": 2, "q": 1 },
      "prompt": "T_{r+1} = \\\\binom{{{n}}}{r} (x^{{{p}}})^{{{n}}-r} ({{a}}x^{-{{q}}})^r = \\\\binom{{{n}}}{r} \\\\cdot {{a}}^r \\\\cdot x^{{{pn}} - {{p}} r - {{q}} r} = \\\\binom{{{n}}}{r} \\\\cdot {{a}}^r \\\\cdot x^{{{pn}} - {{coeff}} r}",
      "solutionSteps": [
        "T_{r+1} &= \\\\binom{{{n}}}{r} (x^{{{p}}})^{{{n}}-r} ({{a}}x^{-{{q}}})^r",
        "&= \\\\binom{{{n}}}{r} \\\\cdot {{a}}^r \\\\cdot x^{{{pn}} - {{p}} r - {{q}} r}",
        "&= \\\\binom{{{n}}}{r} \\\\cdot {{a}}^r \\\\cdot x^{{{pn}} - {{coeff}} r}"
      ]
    }
  ]
}`;

function normalizeMathInput(text: string) {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0x2062 || code === 0x2063) {
      out += "*";
      continue;
    }
    if (code === 0x2061) continue;
    if (code === 0x2212 || code === 0x2013 || code === 0x2014) {
      out += "-";
      continue;
    }
    if (code === 0xd7 || code === 0xb7) {
      out += "*";
      continue;
    }
    const letter = mathLetter(code);
    if (letter) {
      out += letter;
      continue;
    }
    out += char;
  }
  return out.replace(/\s+/g, " ").trim();
}

function mathLetter(code: number): string | null {
  if (code >= 0x1d400 && code <= 0x1d419)
    return String.fromCharCode(65 + (code - 0x1d400));
  if (code >= 0x1d41a && code <= 0x1d433)
    return String.fromCharCode(97 + (code - 0x1d41a));
  if (code >= 0x1d434 && code <= 0x1d44d)
    return String.fromCharCode(65 + (code - 0x1d434));
  if (code >= 0x1d44e && code <= 0x1d467) {
    const i = code - 0x1d44e;
    if (i === 7) return "h";
    return String.fromCharCode(97 + i);
  }
  if (code === 0x210e) return "h";
  return null;
}

function looksLikeLinearSolve(text: string | undefined) {
  if (!text) return false;
  if (looksLikePhysicsFormula(text)) return false;
  return /\d/.test(text) && /=/.test(text) && /[A-Za-z]/.test(text);
}

function looksLikePhysicsFormula(text: string) {
  return /\\partial|\\nabla|\\hbar|g_s|f\^\{[a-z]{2,3}\}|G_\{\\mu|F_\{\\mu/.test(
    text,
  );
}

function looksLikeBinomial(text: string | undefined) {
  if (!text) return false;
  return /\\binom|binomial|T_\s*\{?\s*r|(x\^|x\^\{)[\s\S]{0,40}\^\s*\{?\s*\d/i.test(
    text,
  );
}

function looksLikeGeneralTermIdentity(text: string | undefined) {
  if (!text) return false;
  return /T_\s*\{\s*r\s*\+\s*1\s*\}/.test(text) && /=/.test(text);
}

function familyChangedTheTask(
  text: string | undefined,
  template: ProblemTemplate,
): boolean {
  if (!looksLikeGeneralTermIdentity(text)) return false;
  const prompt = template.variants.map((variant) => variant.prompt).join("\n");
  return /in the expansion of/i.test(prompt) || /T_\s*\{\s*\{\{/.test(prompt);
}

function looksLikeResampleable(text: string | undefined) {
  if (!text) return false;
  return /\d/.test(text) && /[=+\-*/^]|\\(frac|binom|left|cdot)/.test(text);
}

function intBand(
  value: number,
  span: number,
  min: number,
): { int: [number, number]; nonzero: true } {
  const lo = Math.max(min, value - span);
  return { int: [lo, Math.max(lo, value + span)], nonzero: true };
}

function signedIntBand(
  value: number,
  span: number,
): { int: [number, number]; nonzero: true } {
  if (value < 0) {
    return {
      int: [value - span, Math.min(-1, value + span)],
      nonzero: true,
    };
  }
  return intBand(value, span, 1);
}

function rBand(r: number, n: number): { int: [number, number]; nonzero: true } {
  return {
    int: [Math.max(1, r - 2), Math.min(n - 1, r + 2)],
    nonzero: true,
  };
}

/** Typed T_{r+1}=binom identity → family without rewriting the task. */
function tryBinomialIdentityFamily(text: string): ProblemTemplate | null {
  if (!looksLikeGeneralTermIdentity(text)) return null;
  const binom = text.match(/\\binom\s*\{\s*(\d+)\s*\}\s*\{\s*r\s*\}/);
  const power = text.match(/\(x\^\{?(\d+)\}?\)/);
  const term = text.match(/\((\d+)\s*x\^\{?-(\d+)\}?\)/);
  if (!binom || !power || !term) return null;

  const n = Number(binom[1]);
  const p = Number(power[1]);
  const a = Number(term[1]);
  const q = Number(term[2]);
  const parsed = parseProblemTemplate({
    id: "binomial-general-term",
    topic: "algebra",
    difficulties: ["medium", "hard"],
    years: ["10", "11", "12"],
    instructionId: "expand",
    variants: [
      {
        id: "general-term-identity",
        params: {
          n: { int: [Math.max(3, n - 2), n + 2] },
          a: intBand(a, 2, 1),
          p: intBand(p, 1, 1),
          q: intBand(q, 1, 1),
        },
        derived: {
          pn: "p * n",
          coeff: "p + q",
        },
        example: { n, a, p, q },
        prompt:
          "T_{r+1} = \\binom{{{n}}}{r} (x^{{{p}}})^{{{n}}-r} ({{a}}x^{-{{q}}})^r = \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{p}} r - {{q}} r} = \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{coeff}} r}",
        solutionSteps: [
          "T_{r+1} &= \\binom{{{n}}}{r} (x^{{{p}}})^{{{n}}-r} ({{a}}x^{-{{q}}})^r",
          "&= \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{p}} r - {{q}} r}",
          "&= \\binom{{{n}}}{r} \\cdot {{a}}^r \\cdot x^{{{pn}} - {{coeff}} r}",
        ],
      },
    ],
  });
  return parsed.success ? parsed.data : null;
}

/**
 * T_4 = \binom{6}{3} · 2^3 · (-1)^3 · x^3 y^3 = 20 · 8 · (-1) · x^3 y^3 = -160 x^3 y^3
 * General term of (ax + by)^n, with k = r+1.
 */
function tryBinomialTwoVarTermFamily(text: string): ProblemTemplate | null {
  const tex = stripMathDelimiters(text);
  const head = tex.match(
    /T_\{?(\d+)\}?\s*=\s*\\binom\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}\s*(?:\\cdot|\\times|\*)\s*(\d+)\s*\^\s*\{?(\d+)\}?\s*(?:\\cdot|\\times|\*)\s*\(\s*(-?\d+)\s*\)\s*\^\s*\{?(\d+)\}?\s*(?:\\cdot|\\times|\*)\s*x\s*\^\s*\{?(\d+)\}?\s*y\s*\^\s*\{?(\d+)\}?/i,
  );
  if (!head) return null;

  const n = Number(head[2]);
  const r = Number(head[3]);
  const a = Number(head[4]);
  const aExp = Number(head[5]);
  const b = Number(head[6]);
  const bExp = Number(head[7]);
  const px = Number(head[8]);
  const py = Number(head[9]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 1 || n <= r) {
    return null;
  }
  if (aExp !== n - r || px !== n - r || bExp !== r || py !== r) return null;

  const parsed = parseProblemTemplate({
    id: "binomial-two-var-term",
    topic: "algebra",
    difficulties: ["medium", "hard"],
    years: ["10", "11", "12"],
    instructionId: "expand",
    variants: [
      {
        id: "ax-plus-by",
        params: {
          n: { int: [Math.max(r + 1, n - 2), n + 2] },
          r: rBand(r, n),
          a: intBand(a, 1, 1),
          b: signedIntBand(b, 1),
        },
        derived: {
          k: "r + 1",
          nmr: "n - r",
          binom_val: "nCr(n, r)",
          apow: "pow(a, n - r)",
          bpow: "pow(b, r)",
          coef: "nCr(n, r) * pow(a, n - r) * pow(b, r)",
        },
        constraints: ["n > r"],
        example: { n, r, a, b },
        prompt:
          "T_{{{k}}} = \\binom{{{n}}}{{{r}}} \\cdot {{a}}^{{{nmr}}} \\cdot ({{b}})^{{{r}}} \\cdot x^{{{nmr}}} y^{{{r}}} = {{binom_val}} \\cdot {{apow}} \\cdot ({{bpow}}) \\cdot x^{{{nmr}}} y^{{{r}}} = \\mathbf{{{coef}} x^{{{nmr}}} y^{{{r}}}}",
        solutionSteps: [
          "T_{{{k}}} &= \\binom{{{n}}}{{{r}}} \\cdot {{a}}^{{{nmr}}} \\cdot ({{b}})^{{{r}}} \\cdot x^{{{nmr}}} y^{{{r}}}",
          "&= {{binom_val}} \\cdot {{apow}} \\cdot ({{bpow}}) \\cdot x^{{{nmr}}} y^{{{r}}}",
          "&= \\mathbf{{{coef}} x^{{{nmr}}} y^{{{r}}}}",
        ],
      },
    ],
  });
  return parsed.success ? parsed.data : null;
}

/**
 * T_4 = \binom{8}{3} · 2^3 · x^4 = 56 · 8 · x^4 = 448x^4
 * Keep T_k as a derived integer, never T_{3+1}.
 */
function tryBinomialTermFamily(text: string): ProblemTemplate | null {
  const tex = stripMathDelimiters(text);
  const head = tex.match(
    /T_\{?(\d+)\}?\s*=\s*\\binom\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}\s*(?:\\cdot|\\times|\*)\s*(\d+)\s*\^\s*\{?(\d+)\}?\s*(?:\\cdot|\\times|\*)\s*x\s*\^\s*(?:\{(-?\d+)\}|(-?\d+))/i,
  );
  if (!head) return null;

  const n = Number(head[2]);
  const r = Number(head[3]);
  const a = Number(head[4]);
  const aExp = Number(head[5]);
  const px = Number(head[6] ?? head[7]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 1 || n <= r) {
    return null;
  }
  if (aExp !== r) return null;
  if (!Number.isInteger(px) || px === 0) return null;

  const negative = px < 0;
  const parsed = parseProblemTemplate({
    id: "binomial-concrete-term",
    topic: "algebra",
    difficulties: ["medium", "hard"],
    years: ["10", "11", "12"],
    instructionId: "expand",
    variants: [
      {
        id: negative ? "t-k-neg-power" : "t-k-term",
        params: {
          n: { int: [Math.max(r + 1, n - 2), n + 2] },
          r: rBand(r, n),
          a: intBand(a, 1, 2),
          px: negative ? signedIntBand(px, 1) : intBand(px, 1, 1),
        },
        derived: negative
          ? {
              k: "r + 1",
              q: "0 - px",
              binom_val: "nCr(n, r)",
              ar: "pow(a, r)",
              coef: "nCr(n, r) * pow(a, r)",
            }
          : {
              k: "r + 1",
              binom_val: "nCr(n, r)",
              ar: "pow(a, r)",
              coef: "nCr(n, r) * pow(a, r)",
            },
        constraints: ["n > r"],
        example: { n, r, a, px },
        prompt: negative
          ? "T_{{{k}}} = \\binom{{{n}}}{{{r}}} \\cdot {{a}}^{{{r}}} \\cdot x^{{{px}}} = {{binom_val}} \\cdot {{ar}} \\cdot \\frac{1}{x^{{{q}}}} = \\mathbf{\\frac{{{coef}}}{x^{{{q}}}}}"
          : "T_{{{k}}} = \\binom{{{n}}}{{{r}}} \\cdot {{a}}^{{{r}}} \\cdot x^{{{px}}} = {{binom_val}} \\cdot {{ar}} \\cdot x^{{{px}}} = \\mathbf{{{coef}} x^{{{px}}}}",
        solutionSteps: negative
          ? [
              "T_{{{k}}} &= \\binom{{{n}}}{{{r}}} \\cdot {{a}}^{{{r}}} \\cdot x^{{{px}}}",
              "&= {{binom_val}} \\cdot {{ar}} \\cdot \\frac{1}{x^{{{q}}}}",
              "&= \\mathbf{\\frac{{{coef}}}{x^{{{q}}}}}",
            ]
          : [
              "T_{{{k}}} &= \\binom{{{n}}}{{{r}}} \\cdot {{a}}^{{{r}}} \\cdot x^{{{px}}}",
              "&= {{binom_val}} \\cdot {{ar}} \\cdot x^{{{px}}}",
              "&= \\mathbf{{{coef}} x^{{{px}}}}",
            ],
      },
    ],
  });
  return parsed.success ? parsed.data : null;
}

function stripMathDelimiters(text: string) {
  return text
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\\[|\\\]/g, "")
    .replace(/\\\(|\\\)/g, "")
    .trim();
}

function asAlignedStep(tex: string) {
  const idx = tex.indexOf("=");
  if (idx < 0) return tex;
  return `${tex.slice(0, idx).trim()} &= ${tex.slice(idx + 1).trim()}`;
}

/** Identity / definition with no school integers → keep the LaTeX as-is. */
function tryStaticFormulaFamily(text: string): ProblemTemplate | null {
  const tex = stripMathDelimiters(text);
  if (tex.length < 8 || !/=/.test(tex)) return null;
  if (looksLikeGeneralTermIdentity(text)) return null;
  if (looksLikeResampleable(text) && !looksLikePhysicsFormula(text))
    return null;

  const parsed = parseProblemTemplate({
    id: "typed-formula",
    topic: /\\partial|\\nabla|\\int/.test(tex) ? "calculus" : "algebra",
    difficulties: ["hard", "olympiad"],
    years: ["12"],
    instructionId: "simplify",
    variants: [
      {
        id: "identity",
        params: {},
        prompt: tex,
        solutionSteps: [asAlignedStep(tex)],
      },
    ],
  });
  return parsed.success ? parsed.data : null;
}

function extractObject(text: string) {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return repairJsonEscapes(stripped.slice(start, end + 1));
}

function buildPhotoPrompt(input: ProposeTemplateInput, previousError?: string) {
  const extra = input.text
    ? `\nTeacher notes / typed text:\n${input.text}`
    : "";
  const retry = previousError
    ? `\nThe previous JSON failed:\n${previousError}\nReturn a corrected object. Never return {"unsupported":true}.\n`
    : "";

  return `Read the attached image (printed stem, screenshot, handwriting, sketch).
Turn WHAT YOU CAN SEE into one JSON problem family. Never return {"unsupported":true}.

MULTIPLE PROBLEMS (critical):
- Scan the WHOLE image top to bottom and left to right.
- If the image shows 2, 3, or more distinct numbered tasks (e.g. #9 and #10), create ONE variant for EACH problem.
- Do NOT stop after the first problem. Do NOT merge different stems into one prompt.
- Use unique variant ids such as "p1", "p2", "p9", "p10" matching the printed numbers when visible.
- Keep each problem's own printed stem and its own handwritten solution with that variant.

Priority:
1. Copy each printed problem in the page language (Georgian, English, Russian, …). Keep the wording.
2. Keep numbers as written, including roots and degrees ($\\sqrt{3}$, $30^{\\circ}$).
3. If resampling is unclear, use empty params and empty derived — static variants are OK.
4. If integers clearly resample, you MAY replace them with {{slots}} and add params.
5. Put readable handwritten working into that variant's solutionSteps as short LaTeX lines (max 8 steps, each under 800 characters). Prefer the final answer over a long write-up.
6. There is no diagram field. Describe the figure briefly in the prompt.
7. Wrap math in $...$. Do not invent a different task.
8. Text / prompt language: use Georgian when the printed stem is Georgian.
9. Do NOT invent year or difficulty. Unless the page clearly prints a grade/year, set years to ["7","8","9","10","11","12"] and difficulties to ["easy","medium","hard"]. Never pin a single guessed year like ["8"] alone.
10. Prefer empty params and empty derived for geometry screenshots.


JSON shape (example with TWO problems — always emit as many variants as distinct problems you see):
{
  "id": "short-latin-slug",
  "topic": "geometry",
  "difficulties": ["easy", "medium", "hard"],
  "years": ["7", "8", "9", "10", "11", "12"],
  "instructionId": "solve",
  "variants": [
    {
      "id": "p10",
      "params": {},
      "derived": {},
      "constraints": [],
      "prompt": "first problem stem...",
      "solutionSteps": ["$m = 10 + 2\\\\sqrt{3}$"]
    },
    {
      "id": "p9",
      "params": {},
      "derived": {},
      "constraints": [],
      "prompt": "second problem stem...",
      "solutionSteps": ["$M_1N_1 = 3$"]
    }
  ]
}

topic one of: algebra, equations, geometry, functions, percent, calculus, vectors, combinatorics.
instructionId one of: solve, evaluate, findDerivative, percentOf, missingSide, expand, factor, simplify.
Keep prompt under 4000 characters and each solution step under 1600.
${retry}${extra}`;
}

function buildPrompt(input: ProposeTemplateInput, previousError?: string) {
  if (input.image) return buildPhotoPrompt(input, previousError);

  const source = "Read the math problem in the teacher text below.";
  const extra = input.text
    ? `\nTeacher notes / typed problem:\n${input.text}`
    : "";
  const localeHint =
    input.locale === "ka"
      ? "Instruction labels are not stored in JSON; keep prompt and solutionSteps as math LaTeX only."
      : "Keep prompt and solutionSteps as math LaTeX only — no spoken-language sentences.";

  const retry = previousError
    ? `\nThe previous JSON failed validation:\n${previousError}\nReturn a corrected object.\n`
    : "";

  return `${source}
Turn THAT ONE example into a reusable JSON problem FAMILY (not one frozen problem).

KEEP THE SAME TASK. The prompt must be the teacher's statement with only concrete integers replaced by {{slots}}.
Do not invent a different stem. A worked identity T_{r+1} = ... stays that identity — NEVER rewrite it as "T_k in the expansion of (...)".

Unicode / paste: treat ⁢ (invisible times) as *, italic 𝑢 as u, minus − as -.
4u2 or 4*u*2 is implicit multiplication, not a new variable u2.

SUPPORTED (do this — do NOT return unsupported):
- Arithmetic to evaluate or simplify: fractions, mixed operations, (a/b + c/d)*k, order of operations.
- Linear equations after expanding, e.g. 4*u*2 - 40 = 10*(2*u - 1) - 6.
- Linear or quadratic equations and inequalities with resampled integers.
- Binomial general term as an identity in r: T_{r+1} = binom n r (x^p)^{n-r} (a x^{-q})^r = ...
- A fully numeric term T_4 = \\binom{8}{3} · 2^3 · x^4 = 56 · 8 · x^4 = 448x^4: sample n,r,a,px; derived k = r+1, binom_val = nCr(n,r), ar = pow(a,r), coef = binom_val*ar. Prompt must be T_{{{k}}} never T_{3+1} and never \\text{raw} or an unevaluated ans.
- Two-variable term T_4 = \\binom{6}{3} · 2^3 · (-1)^3 · x^3 y^3: (ax+by)^n general term. Sample n,r,a,b; derived nmr = n-r, coef = nCr(n,r)*pow(a,nmr)*pow(b,r). Never leave ans unevaluated.
- A displayed identity or definition with no school integers (e.g. G_{\\mu\\nu}^a = \\partial_\\mu G_\\nu^a - ...): empty params, prompt is the LaTeX as written. NEVER unsupported.
- Percent, Pythagoras, expand/factor of a fixed shape.

For evaluate/simplify: replace the given numbers with named params. Keep the same operations.
For solve: sample the unknown first (param x = the answer), then derive ONE remaining coefficient so both sides match.
For binomial identities: sample only the concrete integers (n, a, p, q). Keep letters x and r as literal LaTeX — do not sample r, do not wrap r in {{}}.
instructionId for binomial/general-term is expand.
Center each int range on the example's number (6 → [5, 8], not [1, 20]).
Put those same integers in variant.example so the preview shows the teacher's instance.

Rules:
- params: int [min,max] with optional nonzero/exclude, or pick lists. Strings are only for an unknown letter.
- derived: math.js using param names only. Implicit multiply is OK: 3k, k(k+1). No words. For x^{12-3r} use derived pn = p*n and coeff = p+q, then x^{{{pn}} - {{coeff}} r}.
- Geometry params (school → olympiad): sides a b c, angles A B C or alpha beta gamma, heights ha hb hc, medians ma, bisectors wa, inradius r, circumradius R, exradii ra rb rc, semiperimeter s, area S. Greek letters are allowed as param names.
- Geometry derived helpers: heron(a,b,c), sasArea(a,b,C), inradius(a,b,c), circumradius(a,b,c), lawCosSide(b,c,A), medianTo(a,b,c), defectTriangle(A,B,C), excessTriangle(A,B,C), brahmagupta(a,b,c,d), eulerInCirc(R,r).
- constraints: a comparison (a != d, d > 0, 1 < a < 5), and/or (a > 0 and a != d), or a math.js expr that must be nonzero (mod(a,b)).
- prompt / solutionSteps: LaTeX with {{name}} or formatters {{linear a b v}}, {{signed a}}, {{texFrac n d}}, {{abs n}}, {{lead c x^3}} {{term c2 x^2}}. Do not wrap literal names like r, x, x_1 or \\text{AM} in {{}}.
- LaTeX exponents/subscripts need an extra brace around the slot: x^{{{p}}}, \\\\binom{{{n}}}{r}.
- Adjacent slots concatenate digits: never {{q}}{{r}} for a product; write {{q}}\\\\cdot{{r}} or a derived qr.
- 1–6 variants of the same family. Label each variant with years ("7"–"12") and difficulties (easy, medium, hard). Teacher cards may use grade: 8 and difficulty: "easy".
- topic must be one of: algebra, equations, geometry, functions, percent, calculus, vectors, combinatorics.
- instructionId one of: solve, evaluate, findDerivative, percentOf, missingSide, expand, factor, simplify.
- ${localeHint}
- Return {"unsupported":true} ONLY for contest construction, proofs, story word problems, or casework that cannot be written as params + derived. An equation, a binomial identity, a field-strength definition, or parentheses to expand is NEVER unsupported.

Solve-family example:
${SOLVE_EXAMPLE}

Expand-both-sides linear example (use this shape for 4u·2 - 40 = 10(2u-1) - 6):
${EXPAND_LINEAR_EXAMPLE}

Evaluate-family example (use this shape for fraction/arithmetic prompts):
${EVALUATE_EXAMPLE}

Binomial general-term identity (use this shape for T_{r+1} = \\binom{n}{r} ...; keep r as the letter r):
${BINOMIAL_EXAMPLE}
${retry}${extra}`;
}

function pathOf(path: readonly PropertyKey[]) {
  return path.map(String).filter(Boolean).join(".") || "(root)";
}

function zodIssues(raw: unknown): ImportIssue[] {
  const adapted = adaptExternalTemplate(raw);
  const parsed = problemTemplateSchema.safeParse(adapted);
  if (parsed.success) return [];
  return parsed.error.issues.slice(0, 24).map((issue) => ({
    item: "AI JSON",
    path: pathOf(issue.path),
    message: issue.message,
  }));
}

function formatIssueHint(issues: ImportIssue[]) {
  if (issues.length === 0) {
    return "JSON did not match the schema. Return a static family with empty params/derived. Create one short variant for every distinct problem. years as strings. lowercase difficulties. short solutionSteps.";
  }
  return `JSON did not match the schema:\n${issues
    .slice(0, 12)
    .map((issue) => `- ${issue.path}: ${issue.message}`)
    .join("\n")}\nFix every issue. Prefer empty params/derived. Keep solutionSteps short. Include every distinct problem as its own variant.`;
}

function parseTemplateText(text: string): ProposeTemplateResult {
  const snippet = extractObject(text);
  if (!snippet) return { ok: false, error: "bad_output" };

  let raw: unknown;
  try {
    raw = JSON.parse(snippet) as unknown;
  } catch {
    return { ok: false, error: "bad_output", json: snippet };
  }

  if (
    raw &&
    typeof raw === "object" &&
    "unsupported" in raw &&
    (raw as { unsupported?: unknown }).unsupported === true
  ) {
    return { ok: false, error: "unsupported" };
  }

  const parsed = parseProblemTemplate(raw);
  if (!parsed.success) {
    const issues = zodIssues(raw);
    return {
      ok: false,
      error: "invalid",
      issues,
      json: JSON.stringify(adaptExternalTemplate(raw), null, 2),
    };
  }

  return {
    ok: true,
    template: parsed.data,
    json: JSON.stringify(parsed.data, null, 2),
  };
}

export async function proposeTemplateFromExample(
  raw: ProposeTemplateInput,
): Promise<ProposeTemplateResult> {
  const input = {
    ...proposeTemplateSchema.parse(raw),
  };
  if (input.text) input.text = normalizeMathInput(input.text);
  if (input.text) {
    const local =
      tryBinomialIdentityFamily(input.text) ??
      tryBinomialTwoVarTermFamily(input.text) ??
      tryBinomialTermFamily(input.text) ??
      tryStaticFormulaFamily(input.text);
    if (local) {
      return {
        ok: true,
        template: local,
        json: JSON.stringify(local, null, 2),
      };
    }
  }
  const requested = getAiModel(input.model);
  const gemini =
    requested?.provider === "gemini" ? requested : getAiModel(DEFAULT_AI_MODEL);
  if (!gemini) return { ok: false, error: "failed" };

  try {
    await assertModelAvailable(gemini.id);
  } catch (error) {
    if (error instanceof Error && error.message === "missing_key") {
      return { ok: false, error: "missing_key" };
    }
    if (error instanceof Error && error.message === "limit_exceeded") {
      return { ok: false, error: "limit_exceeded" };
    }
    return { ok: false, error: "failed" };
  }

  try {
    let text = await completeGeminiUserParts({
      model: gemini,
      prompt: buildPrompt(input),
      image: input.image,
    });
    let result = parseTemplateText(text);

    if (!result.ok && result.error === "invalid") {
      const schemaHint = input.image
        ? formatIssueHint(result.issues ?? [])
        : looksLikeGeneralTermIdentity(input.text)
          ? "JSON did not match the schema. Follow the binomial identity example. Keep T_{r+1} and the letter r. Sample n,a,p,q only. instructionId expand. Use \\\\binom{{{n}}}{r} and derived pn = p*n, coeff = p+q."
          : "JSON did not match the problem family schema. Follow the example exactly.";
      text = await completeGeminiUserParts({
        model: gemini,
        prompt: buildPrompt(input, schemaHint),
        image: input.image,
      });
      result = parseTemplateText(text);
    }

    if (!result.ok && result.error === "unsupported") {
      const retryHint = input.image
        ? "Do NOT return unsupported. Return a static family with empty params. Transcribe EVERY distinct problem in the image as its own variant. Keep the page language. Put each problem's readable solution into that variant's solutionSteps."
        : looksLikeGeneralTermIdentity(input.text) ||
            looksLikeBinomial(input.text)
          ? "This is a binomial general-term IDENTITY in r. Do NOT return unsupported. Do NOT rewrite it as 'T_k in the expansion of'. Follow the binomial identity example. Keep r as a letter."
          : looksLikeLinearSolve(input.text)
            ? "This is an equation to solve after expanding. Do NOT return unsupported. Use the expand-both-sides linear example."
            : looksLikeResampleable(input.text)
              ? "This is school math with resampleable numbers. Do NOT return unsupported. Follow the closest example (evaluate, linear, or binomial)."
              : "";
      if (retryHint) {
        text = await completeGeminiUserParts({
          model: gemini,
          prompt: buildPrompt(input, retryHint),
          image: input.image,
        });
        result = parseTemplateText(text);
      }
    }

    if (
      result.ok &&
      !input.image &&
      familyChangedTheTask(input.text, result.template)
    ) {
      text = await completeGeminiUserParts({
        model: gemini,
        prompt: buildPrompt(
          input,
          "WRONG TASK. The teacher wrote T_{r+1} = binom ... as an identity in r. Return that same identity with slots for n,a,p,q. Prompt must start with T_{r+1} = and must NOT contain 'in the expansion of' or a sampled T_k.",
        ),
        image: input.image,
      });
      const retried = parseTemplateText(text);
      if (retried.ok && !familyChangedTheTask(input.text, retried.template)) {
        result = retried;
      }
    }

    if (result.ok) {
      await recordModelUse(gemini.id);
      await rememberProviderWallet(gemini.provider, "ready");
      if (input.image) {
        const opened = openPhotoFamilyLabels(result.template);
        return {
          ok: true,
          template: opened,
          json: JSON.stringify(opened, null, 2),
        };
      }
      return result;
    }

    if (input.text) {
      const fallback =
        tryBinomialTwoVarTermFamily(input.text) ??
        tryBinomialTermFamily(input.text) ??
        tryStaticFormulaFamily(input.text);
      if (fallback) {
        return {
          ok: true,
          template: fallback,
          json: JSON.stringify(fallback, null, 2),
        };
      }
    }
    return result;
  } catch (error) {
    return { ok: false, error: classifyProviderError(error) };
  }
}
