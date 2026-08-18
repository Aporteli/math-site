import { localeNames, type Locale } from "@/i18n/config";
import { casVerifiedPromptGuide } from "./cas";
import type { AiCheckMode } from "./ai-schema";
import type { ProblemDifficulty } from "./types";

const PROMPT_LANGUAGE: Record<Locale, string> = {
  ka: "Georgian",
  en: "English",
  ru: "Russian",
};

export interface ProposeInput {
  request: string;
  topic?: string;
  difficulty?: ProblemDifficulty;
  year?: string;
  count: number;
  locale: Locale;
  check: AiCheckMode;
}

function hintLines(input: ProposeInput) {
  return [
    input.topic
      ? `Preferred catalog topic (hint only): ${input.topic}.`
      : "No catalog topic filter.",
    input.difficulty
      ? `REQUIRED difficulty for EVERY problem: ${input.difficulty}. Emitting an easier task and tagging it ${input.difficulty} is forbidden.`
      : "Choose easy, medium, hard, or olympiad to match THIS problem — and the teacher request if it names a difficulty.",
    input.year
      ? `Preferred year group (hint only): ${input.year}.`
      : "Choose year 7–12 to match THIS problem.",
  ];
}

function contestHardGuide(input: ProposeInput) {
  if (input.difficulty !== "hard") return [];
  return [
    "VERY HARD means year-11/12 contest work, several non-obvious steps. Tagging an easy item as hard is forbidden.",
    "FORBIDDEN as the whole problem: solve a small integer quadratic; find only the discriminant; evaluate only f(k); find only the vertex of a tiny parabola.",
    "Each item must be a DIFFERENT hard TASK. Prefer: a parameter k (how many real/positive roots); t=x+1/x; x1^2+x2^2 or 1/x1+1/x2 from Vieta; nested f(f(x)); a fraction or system that reduces to a quadratic; integer-root constraints.",
    "promptTex is a full student stem with concrete numbers, not a one-line drill. year must be 11 or 12.",
    "solutionTex shows the main steps (substitution, Vieta, cases), not only the final number.",
  ];
}

export function askCount(input: ProposeInput, compact = false) {
  if (input.difficulty === "hard") return input.count;
  if (compact) return Math.min(8, input.count + 2);
  return Math.min(12, input.count + 5);
}

export function temperatureFor(input: ProposeInput) {
  return input.difficulty === "hard" ? 0.9 : 0.7;
}

function compactVerifiedGuide(input: ProposeInput) {
  const hard =
    input.difficulty === "hard"
      ? "VERY HARD: parameter k, t=x+1/x, x1^2+x2^2, nested f(f(x)), a system that reduces to a quadratic. NEVER only discriminant, f(k), or solve x^2-5x+6=0. year 11 or 12. solutionTex shows steps."
      : input.difficulty === "easy"
        ? "Easy: one-step plug-in. GOOD formula: a*k^2+b*k+c or discriminant(a,b,c)."
        : "Match the named difficulty. Vary the task.";
  return [
    "Every problem MUST include: kind, topic, difficulty, year, instructionId, promptTex, formula, variables.",
    "kind: short unique English slug (eval-at-point, discriminant, vertex, vieta-sum, …).",
    "topic: lowercase English slug such as quadratic-equation.",
    'year: string "7" "8" "9" "10" "11" or "12".',
    "instructionId: solve, evaluate, findDerivative, percentOf, missingSide, expand, factor, or simplify.",
    "promptTex: student LaTeX only. Write $4k^{2}+6k-5=0$, NEVER 4k * k or 4*k*k.",
    "formula: math.js, NOT LaTeX. Use * for multiply. Example: a*k^2 + b*k + c",
    "Never write 2x^{2}, \\frac, or digits 2 or 3 inside formula. 0 and 1 are allowed if needed.",
    'variables: [{"name":"a","value":2},{"name":"b","value":-5},{"name":"k","value":4}]. At least 3 names.',
    "GOOD formula: a*k^2+b*k+c or discriminant(a,b,c) or pow(-b/a,2)-2*(c/a).",
    "kind MUST be unique for each problem (eval-at-point, discriminant, vertex, vieta-sum, …).",
    "promptTex MUST show the same concrete integers as the variable values.",
    "Never omit formula or variables. Never use ax^2+bx+c letters as the whole problem.",
    hard,
  ].join("\n");
}

function compactPlainGuide(input: ProposeInput) {
  return [
    "Every problem MUST include: kind, topic, difficulty, year, instructionId, promptTex, solutionTex.",
    "promptTex: readable stem, maths only inside $...$. Write $4x^{2}-7x=0$, never 4x * x.",
    "solutionTex: the answer or short working, same rules.",
    input.difficulty === "hard"
      ? "VERY HARD contest stems: parameter, substitution t=x+1/x, Vieta extras, nested f(f(x)). NEVER only discriminant, f(4), or a tiny solve-the-quadratic. year 11 or 12. solutionTex is stepped working."
      : input.difficulty === "easy"
        ? "Easy means one-step."
        : "Match the named difficulty.",
    "instructionId: solve, evaluate, findDerivative, percentOf, missingSide, expand, factor, or simplify.",
  ].join("\n");
}

/** Unchecked AI: deep contest thinking, then a fast JSON wrap. */
export function buildUncheckedChatPrompt(input: ProposeInput) {
  const language = PROMPT_LANGUAGE[input.locale];
  const count = Math.min(12, Math.max(1, input.count));
  const request = input.request.trim();

  return [
    "Think at contest/olympiad depth AND at speed: complete the hard reasoning in private, then write JSON immediately. Do not ramble. Do not skip steps in the maths.",
    "Do not dumb the request down. Do not replace it with a different, easier topic.",
    "If they asked for hard or very hard problems, each item needs several non-obvious steps. Forbidden as the whole problem: $x^2-5x+6=0$, $2x^2-5x-3=0$, only the discriminant, or only f(k).",
    "",
    `Teacher request: ${request}`,
    `Exactly ${count} different problems. Language: ${language} (${localeNames[input.locale].label}).`,
    input.topic ? `Topic hint: ${input.topic}` : "",
    input.difficulty ? `Difficulty: ${input.difficulty}` : "",
    input.year ? `Year hint: ${input.year}` : "",
    "",
    "JSON only:",
    '{"problems":[{"kind":"short-slug","topic":"quadratic-equation","difficulty":"hard","year":"12","instructionId":"evaluate","promptTex":"...","solutionTex":"..."}]}',
    "promptTex = full student stem, maths in $...$.",
    "solutionTex = the main reasoning steps (tight, not an essay).",
    "kind unique. year 7-12. difficulty easy|medium|hard|olympiad. Double LaTeX backslashes (\\\\frac).",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildProblemPrompt(
  input: ProposeInput,
  options: { compact?: boolean } = {},
) {
  const verified = input.check === "verified";
  const compact = Boolean(options.compact);
  const language = PROMPT_LANGUAGE[input.locale];
  const ask = askCount(input, compact);

  return [
    `Teacher request (MUST follow): ${input.request}`,
    `Return exactly ${ask} problems. Every problem must be about that request — the same subject the teacher named.`,
    `Write promptTex in ${language} (${localeNames[input.locale].label}).`,
    "Do not replace the request with an unrelated topic.",
    ...hintLines(input),
    "Each problem must be a DIFFERENT kind of TASK, not the same identity rewritten.",
    "topic is a lowercase English slug for THIS problem (quadratic-equation, number-theory, combinatorics, …), not a copy of the filter bar.",
    "difficulty must be easy, medium, hard, or olympiad — and MUST equal the required difficulty when one is set.",
    "year must be one of: 7, 8, 9, 10, 11, 12.",
    ...contestHardGuide(input),
    compact
      ? verified
        ? compactVerifiedGuide(input)
        : compactPlainGuide(input)
      : verified
        ? casVerifiedPromptGuide(input.difficulty)
        : [
            "This is the unchecked path: no math engine will verify the answer.",
            "promptTex is a readable problem statement in the teacher's language, with NORMAL spaces between words.",
            "Never glue words together. Never put the whole sentence in one LaTeX math blob.",
            "Write ordinary sentences. Put ONLY formulae inside $...$ (inline) or $$...$$ (display).",
            "Use concrete numbers, never the general form ax^2+bx+c as the whole problem.",
            input.difficulty === "hard"
              ? "VERY HARD: contest-style, several steps. FORBIDDEN: only discriminant, only f(k), only vertex, or solve a small integer quadratic with no parameter. REQUIRED variety: parameter k; t=x+1/x; x1^2+x2^2; nested f(f(x)); a fraction/system reducing to a quadratic. year 11 or 12. solutionTex shows the working."
              : input.difficulty === "easy"
                ? "Easy means one-step: plug into a formula or a small integer quadratic."
                : "Match the named difficulty in the teacher request.",
            "solutionTex is the answer or short working, same rules: readable text, maths in $...$.",
            "Stay on school mathematics matching the teacher request. Do not switch to unrelated trivia.",
            "instructionId if present must be one of: solve, evaluate, findDerivative, percentOf, missingSide, expand, factor, simplify.",
          ].join("\n"),
    'Return ONLY a JSON object: {"problems":[...]} with no markdown fences.',
    "In JSON, double every LaTeX backslash: write \\\\frac and \\\\( not \\frac or \\(.",
  ].join("\n");
}
